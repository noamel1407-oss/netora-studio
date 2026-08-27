#!/usr/bin/env node
/**
 * Measures the canonical transition anchors, so the numbers in
 * `src/journey/route.ts` are read off the artwork rather than guessed at.
 *
 *     npm run assets:anchors
 *
 * This prints; nothing is written and nothing is edited. The anchors are
 * canonical, and a tool that rewrote the route from them would be a way to
 * change the journey by re-running a script. What the route does with these
 * numbers is a decision; what the numbers are is a measurement.
 *
 * Four families are reported, because the route needs four different things
 * out of a plate:
 *
 * - **Lit openings.** Every threshold on this route is the camera passing
 *   through a real opening, and on an interior plate an opening is by far the
 *   brightest thing in frame because it is full of the same sunset. The
 *   corridor's far end in 03 and the arch at the end of 04 come out of this.
 * - **Dark openings.** Not every doorway is lit. The TIMEMATIC entrance in 01
 *   is a shaded arch in a sunlit facade, so it is found by looking for the
 *   dark rather than the bright.
 * - **Screens.** A website on a wall is bright but flat and neutral, where
 *   everything around it is warm. Their rectangles matter twice over: they are
 *   where a real capture would have to sit, and they are the regions the
 *   camera must never travel into.
 * - **Rails.** The gold inlay is more saturated than the marble it is cut
 *   into, so it can be traced row by row. This is the one that decides where a
 *   leg aims: on a plate with a road in it, the aim belongs where the road
 *   converges, not where a composition would like it.
 */

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const DIR = path.join(process.cwd(), 'reference', 'transitions');

/** Blobs are hundreds of pixels across, so half size loses nothing. */
const WORK_WIDTH = 836;
/**
 * Screens are found on a coarser copy, and deliberately. A website has dark
 * things on it — a navy watch on a pale page — and at full working resolution
 * those punch the bright region into pieces, so the screen stops being one
 * blob and stops being found at all. Halving it again closes those holes
 * without moving the edges that matter.
 */
const SCREEN_WIDTH = 418;

/** Sunset coming through a hole, and the same one leaning on the threshold. */
const LIT = 0.82;
const LIT_WARM = 0.76;
/** Shade inside a sunlit facade. */
const DARK = 0.3;
/** Bright, but flat and neutral rather than sun-coloured. */
const SCREEN_LUMA = 0.55;
const SCREEN_CHROMA = 0.22;

/** How much of the frame a blob must fill to be worth naming. */
const MIN_AREA = 0.003;
/** ...and how solid a bright rectangle must be before it is called a screen. */
const SCREEN_SOLIDITY = 0.7;

const rec709 = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Distance from grey, 0…1 — a sunset is warm, a website is not. */
const chromaOf = (r, g, b) => {
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
};

/**
 * Connected components over a boolean mask, four-connected, iterative — a
 * recursive flood fill blows the stack on a blob this size.
 */
function blobsOf(mask, width, height) {
  const seen = new Uint8Array(mask.length);
  const found = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue;

    const stack = [start];
    seen[start] = 1;
    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;

    while (stack.length) {
      const at = stack.pop();
      const x = at % width;
      const y = (at - x) / width;

      area += 1;
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      if (x > 0 && mask[at - 1] && !seen[at - 1]) (seen[at - 1] = 1), stack.push(at - 1);
      if (x < width - 1 && mask[at + 1] && !seen[at + 1]) (seen[at + 1] = 1), stack.push(at + 1);
      if (y > 0 && mask[at - width] && !seen[at - width]) (seen[at - width] = 1), stack.push(at - width);
      if (y < height - 1 && mask[at + width] && !seen[at + width])
        (seen[at + width] = 1), stack.push(at + width);
    }

    found.push({
      cx: sumX / area / width,
      cy: sumY / area / height,
      x0: minX / width,
      x1: (maxX + 1) / width,
      y0: minY / height,
      y1: (maxY + 1) / height,
      solidity: area / ((maxX - minX + 1) * (maxY - minY + 1)),
      of: area / mask.length,
    });
  }

  return found.sort((a, b) => b.of - a.of);
}

/**
 * The gold rails, row by row.
 *
 * An inlay is a narrow run of pixels more saturated than the stone either side
 * of it, so each row is compared against its own median rather than a fixed
 * threshold — the light changes enormously from the top of a plate to the
 * bottom, and the rails are legible against all of it.
 */
function railsAt(data, width, height, channels, atY) {
  const y = Math.min(height - 1, Math.round(atY * height));
  const saturation = [];

  for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * channels;
    saturation.push(chromaOf(data[i], data[i + 1], data[i + 2]));
  }

  const median = [...saturation].sort((a, b) => a - b)[saturation.length >> 1];
  const runs = [];
  let run = null;

  const close = () => {
    if (run && run.to > run.from) {
      run.strength /= run.to - run.from + 1;
      runs.push(run);
    }
    run = null;
  };

  for (let x = 0; x < width; x += 1) {
    const over = saturation[x] - median;
    if (over > 0.1) {
      if (run) {
        run.to = x;
        run.strength += over;
      } else {
        run = { from: x, to: x, strength: over };
      }
    } else {
      close();
    }
  }
  close();

  /* A rail is a line, not a wall: anything wide is architecture. Only the
     brightest few are reported — a saturated sunset lights up a great deal of
     marble, and a dump of every warm run is not a measurement of anything. */
  return runs
    .filter((r) => r.to - r.from <= width * 0.04)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 4)
    .map((r) => (r.from + r.to) / 2 / width)
    .sort((a, b) => a - b);
}

const pct = (value) => `${(value * 100).toFixed(1)}%`;

const describe = (blob) =>
  `centre ${pct(blob.cx)}, ${pct(blob.cy)}   ` +
  `box x ${pct(blob.x0)}–${pct(blob.x1)}  y ${pct(blob.y0)}–${pct(blob.y1)}   ` +
  `area ${pct(blob.of)}  solidity ${blob.solidity.toFixed(2)}`;

async function measure(file) {
  const image = sharp(path.join(DIR, file));
  const source = await image.metadata();
  const { data, info } = await image
    .resize({ width: WORK_WIDTH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const count = width * height;

  const lit = new Uint8Array(count);
  const litWarm = new Uint8Array(count);
  const dark = new Uint8Array(count);

  for (let i = 0; i < count; i += 1) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    const luma = rec709(r, g, b);

    if (luma > LIT) lit[i] = 1;
    if (luma > LIT_WARM) litWarm[i] = 1;
    if (luma < DARK) dark[i] = 1;
  }

  const coarse = await sharp(path.join(DIR, file))
    .resize({ width: SCREEN_WIDTH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const screen = new Uint8Array(coarse.info.width * coarse.info.height);
  for (let i = 0; i < screen.length; i += 1) {
    const r = coarse.data[i * coarse.info.channels];
    const g = coarse.data[i * coarse.info.channels + 1];
    const b = coarse.data[i * coarse.info.channels + 2];
    if (rec709(r, g, b) > SCREEN_LUMA && chromaOf(r, g, b) < SCREEN_CHROMA) screen[i] = 1;
  }

  const big = (blob) => blob.of >= MIN_AREA;
  const rectangular = (blob) =>
    blob.of >= MIN_AREA * 2 &&
    blob.solidity > SCREEN_SOLIDITY &&
    /* Wider than it is tall — and measured in pixels, not in fractions of the
       frame. On a 16:9 plate a landscape screen is taller than it is wide as a
       fraction, which is how this test came to reject every screen it was
       written to find. */
    (blob.x1 - blob.x0) * source.width > (blob.y1 - blob.y0) * source.height &&
    /* Sky is bright and neutral too. It is not mounted on anything, and it
       runs off the top of the frame — a screen has a wall above it. */
    blob.y0 > 0.04;

  const rails = [];
  for (let y = 0.98; y >= 0.6; y -= 0.06) rails.push({ y, at: railsAt(data, width, height, channels, y) });

  return {
    file,
    source: `${source.width}×${source.height}`,
    lit: blobsOf(lit, width, height).filter(big).slice(0, 3),
    litWarm: blobsOf(litWarm, width, height).filter(big).slice(0, 3),
    dark: blobsOf(dark, width, height).filter(big).slice(0, 3),
    screens: blobsOf(screen, coarse.info.width, coarse.info.height).filter(rectangular).slice(0, 2),
    rails,
  };
}

const files = (await readdir(DIR)).filter((name) => /^\d\d-.*\.jpe?g$/i.test(name)).sort();

if (files.length === 0) {
  console.error(`No anchors under ${path.relative(process.cwd(), DIR)}/`);
  process.exit(1);
}

for (const file of files) {
  const result = await measure(file);
  console.log(`\n${result.file}  (${result.source})`);

  const family = (label, blobs) => {
    if (blobs.length === 0) return;
    blobs.forEach((blob, index) => {
      console.log(`  ${index === 0 ? label.padEnd(14) : ''.padEnd(14)}${describe(blob)}`);
    });
  };

  family('lit opening', result.lit);
  family('warm opening', result.litWarm);
  family('shaded', result.dark);
  family('screen', result.screens);

  const traced = result.rails.filter((row) => row.at.length > 0);
  if (traced.length) {
    console.log('  rails');
    for (const row of traced) {
      console.log(`    y ${pct(row.y).padStart(6)}   x ${row.at.map(pct).join('  ')}`);
    }
  }
}

console.log(
  '\nAims in src/journey/route.ts are taken from these: the opening a leg leaves\n' +
    'through, or — where the plate has a road in it — the point its rails run to.\n' +
    'Screen boxes are the regions the camera must never travel into.\n',
);
