#!/usr/bin/env node
/**
 * Act one's behaviour, frozen.
 *
 *     npm run baseline:capture   # record what act one does today
 *     npm run baseline:verify    # assert it still does exactly that
 *
 * Appending a second act to the journey means making the scrubbed container
 * longer, and everything in act one is positioned as a *fraction* of that
 * container. Get the isolation wrong by a hair and the vault opens over a
 * different stretch of scroll, the statement lands somewhere else, the arrival
 * at SHAY drifts — all of it invisible in a diff and obvious to anyone who has
 * seen the site.
 *
 * So it is measured rather than reasoned about, and measured the way a reader
 * experiences it: **at the same physical scrollY**, not at the same normalized
 * progress. Normalized progress is exactly the thing that is allowed to change
 * meaning when the container grows; pixels are not.
 *
 * Three things are recorded at every sample:
 *
 * - the computed transform and opacity of every element the journey moves,
 * - the gold rail's actual path data,
 * - and a 32x18 luminance grid of the rendered frame.
 *
 * That last one is the backstop. The state dump catches anything that moves;
 * the grid catches anything that changes and *doesn't* show up in a transform
 * — a layer that stopped painting, a z-order that flipped, a fallback that
 * kicked in. It is small enough to commit and exact enough to diff.
 *
 * Full screenshots are kept at a few checkpoints as well, for the case where
 * a number has moved and a person needs to see what it did.
 *
 * ## What this cannot cover
 *
 * Headless Chromium has no H.264 decoder, so the vault video never becomes
 * seekable and `VaultHero` takes its non-scrubbable branch. The scrubbable
 * branch has its own tween positions and they are not exercised here. Their
 * arithmetic is checked separately and without a browser — see
 * `scripts/audit-act-one-timing.mjs`.
 */

import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import sharp from 'sharp';

const BASE = 'http://localhost:4173';
const OUT = path.join(process.cwd(), 'baselines', 'act-one');

/** Both matter: act one's container is a different height on each. */
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

/** How many places along act one to look. */
const SAMPLES = 160;

/**
 * Where a person would notice. Fractions of act one's own scroll length,
 * named after what is happening there rather than after a number.
 */
const CHECKPOINTS = [
  ['closed-vault', 0.0],
  ['door-opening', 0.12],
  ['doorway-passing', 0.24],
  ['statement-rising', 0.3],
  ['statement-held', 0.39],
  ['statement-leaving', 0.46],
  ['travel-underway', 0.66],
  ['arrival-at-shay', 0.888],
  ['journey-end', 1.0],
];

/** Everything the journey moves, and what about it is worth remembering. */
const WATCHED = [
  '.journey__vault',
  '.journey__city',
  '.city__bg',
  '.city__content',
  '.city__scrim',
  '.travel',
  '.travel__stage',
  '.travel__world',
  '.platform',
  '.station',
  '.gold--far',
  '.gold--near',
];

/** Coarse enough to commit, fine enough that nothing meaningful hides in it. */
const GRID = { w: 32, h: 18 };

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* --------------------------------------------------------------------------
   Landing on an exact scrollY.

   ScrollTrigger refreshes when lazy images land and can move the page out from
   under a programmatic scroll, and `scrub` means the rendered state trails the
   scroll position by a fraction of a second. Both are handled the same way:
   ask, settle, check, ask again.
   -------------------------------------------------------------------------- */
async function settleAt(page, target) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await page.evaluate((y) => window.scrollTo(0, y), target);
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
    await page.waitForTimeout(attempt === 0 ? 200 : 140);
    const at = await page.evaluate(() => Math.round(window.scrollY));
    if (Math.abs(at - target) <= 1) return at;
  }
  return page.evaluate(() => Math.round(window.scrollY));
}

/**
 * The scrubbed timeline trails the scroll position by a fraction of a second,
 * and it approaches asymptotically — so "wait long enough" is a guess that is
 * wrong often enough to make a baseline useless. A first pass at this compared
 * runs after a fixed delay and produced forty differences on an unchanged
 * build, every one of them the tail of that easing: a rail at 0.14 against
 * 0.15, a scrim at 0.39 against 0.44, on frames that were pixel-identical.
 *
 * So the state is read until it stops moving instead. Two consecutive reads
 * that agree mean the timeline has arrived, whatever the machine was doing.
 */
async function stableState(page, watched) {
  let previous = await readState(page, watched);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.waitForTimeout(130);
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
    const current = await readState(page, watched);
    if (JSON.stringify(current) === JSON.stringify(previous)) return current;
    previous = current;
  }
  return { ...previous, unsettled: true };
}

const readState = (page, watched) =>
  page.evaluate((selectors) => {
    const round = (value) => {
      /* Transforms come back as matrices of floats; the last digit is noise
         from the compositor, not from the journey. */
      const asNumber = Number(value);
      return Number.isFinite(asNumber) ? Number(asNumber.toFixed(2)) : value;
    };

    const tidy = (transform) =>
      transform && transform !== 'none'
        ? transform.replace(/-?\d+\.?\d*(e-?\d+)?/g, (n) => String(round(n)))
        : 'none';

    const state = {
      lightWorld: document.documentElement.classList.contains('is-light-world'),
      docHeight: document.documentElement.scrollHeight,
      elements: {},
    };

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) {
        state.elements[selector] = null;
        continue;
      }
      const style = getComputedStyle(element);
      const entry = {
        transform: tidy(style.transform),
        opacity: round(style.opacity),
        visibility: style.visibility,
      };
      /* The scene's own published numbers, where a component parks one. */
      for (const property of ['--air', '--haze', '--rail-body', '--rail-core']) {
        const value = style.getPropertyValue(property).trim();
        if (value) entry[property] = round(value);
      }
      /* The rail is geometry rather than a transform, so it is compared as
         geometry: its actual drawn path. */
      const body = element.querySelector?.('.gold__body');
      if (body) entry.path = body.getAttribute('d') ?? '';
      state.elements[selector] = entry;
    }

    return state;
  }, watched);

/** A tiny luminance grid — the backstop for anything a transform would miss. */
async function gridOf(buffer) {
  const { data } = await sharp(buffer)
    .resize({ width: GRID.w, height: GRID.h, fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return Array.from(data);
}

async function walk(page, viewport, wantShots) {
  const measured = await page.evaluate(() => {
    const journey = document.querySelector('.journey');
    if (!journey) return null;
    const styles = getComputedStyle(journey);
    /* Before act two existed there was no `--act-one-h` and the container was
       act one — so fall back to its own length rather than to a number that
       makes the share 0/0. This has to keep working against the unchanged
       site: a harness that cannot measure the thing it is protecting is not
       protecting anything. */
    const one =
      parseFloat(styles.getPropertyValue('--act-one-h')) ||
      parseFloat(styles.getPropertyValue('--journey-h')) ||
      100;
    const two = parseFloat(styles.getPropertyValue('--act-two-h')) || 0;
    return {
      height: Math.round(journey.getBoundingClientRect().height),
      /* Act one's share of the scrolled length — see `shareOfScroll` in
         VaultHero. Sampling the container instead would compare act one before
         against act two after, which is how the first run of this reported
         "identical" while silently checking nothing. */
      share: (one - 100) / (one + two - 100),
    };
  });
  if (!measured) throw new Error('no .journey on the page');

  const { height, share } = measured;
  /* The pixels act one is scrubbed over. This is the number that must not
     change, whatever the container does around it. */
  const range = Math.round(share * (height - viewport.height));
  const samples = [];
  const shots = [];

  const checkpointAt = new Map(
    CHECKPOINTS.map(([name, at]) => [Math.round(clamp01(at) * range), name]),
  );
  const stops = new Set([
    ...Array.from({ length: SAMPLES + 1 }, (_, i) => Math.round((i / SAMPLES) * range)),
    ...checkpointAt.keys(),
  ]);

  for (const target of [...stops].sort((a, b) => a - b)) {
    const at = await settleAt(page, target);
    const state = await stableState(page, WATCHED);
    const buffer = await page.screenshot();
    samples.push({ scrollY: target, landed: at, ...state, grid: await gridOf(buffer) });

    const name = checkpointAt.get(target);
    if (name && wantShots) shots.push({ name, scrollY: target, buffer });
  }

  return { height, range, share, samples, shots };
}

async function run(mode) {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  const captured = {};
  const shotsByViewport = {};

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      locale: 'he-IL',
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (error) => problems.push(String(error.message)));

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);

    const result = await walk(page, viewport, viewport.name === 'desktop');
    captured[viewport.name] = {
      viewport,
      height: result.height,
      range: result.range,
      share: result.share,
      samples: result.samples,
      pageErrors: problems,
    };
    shotsByViewport[viewport.name] = result.shots;

    await context.close();
  }

  await browser.close();
  return { captured, shotsByViewport };
}

/* --------------------------------------------------------------------------
   Capture and verify
   -------------------------------------------------------------------------- */

const jsonPath = path.join(OUT, 'state.json');

async function capture() {
  const { captured, shotsByViewport } = await run();

  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, 'frames'), { recursive: true });

  await writeFile(
    jsonPath,
    `${JSON.stringify({ grid: GRID, samples: SAMPLES, act: captured }, null, 1)}\n`,
  );

  for (const shot of shotsByViewport.desktop ?? []) {
    await sharp(shot.buffer)
      .resize({ width: 720 })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, 'frames', `${shot.name}.png`));
  }

  const total = Object.values(captured).reduce((n, act) => n + act.samples.length, 0);
  console.log(`Captured ${total} samples across ${VIEWPORTS.length} viewports.`);
  for (const [name, act] of Object.entries(captured)) {
    console.log(
      `  ${name.padEnd(8)} container ${act.height}px, act one scrubbed over ${act.range}px ` +
        `(${(act.share * 100).toFixed(1)}%)`,
    );
    if (act.pageErrors.length) console.log(`    page errors: ${act.pageErrors.join(' | ')}`);
  }
  console.log(`  frames: ${(await readdir(path.join(OUT, 'frames'))).length}`);
  console.log(`\nWritten to ${path.relative(process.cwd(), OUT)}/`);
}

/**
 * Two readings of the same state.
 *
 * Compared numerically rather than as strings, because a scrubbed timeline
 * approaches its target asymptotically and the last hundredth of a pixel is
 * still moving when everything else has arrived. A hundredth of a pixel is not
 * a regression; the tolerance is well under what a compositor can draw, and
 * the luminance grid is what catches anything that actually changed.
 */
function sameEnough(a, b) {
  if (a === null || b === null) return a === b;
  if (!a || !b) return false;

  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key];
    const y = b[key];
    if (x === y) continue;

    if (typeof x === 'number' && typeof y === 'number') {
      if (Math.abs(x - y) > 0.05) return false;
      continue;
    }

    if (typeof x === 'string' && typeof y === 'string') {
      /* `none` and the identity matrix are the same transform written two
         ways, and which one a browser reports depends on whether anything ever
         wrote to it. */
      const same = (value) =>
        value === 'matrix(1, 0, 0, 1, 0, 0)' || value === 'none' ? 'none' : value;
      const a2 = same(x);
      const b2 = same(y);
      if (a2 === b2) continue;

      const numbers = (value) => (value.match(/-?\d+\.?\d*/g) ?? []).map(Number);
      const nx = numbers(a2);
      const ny = numbers(b2);
      if (nx.length !== ny.length) return false;
      if (a2.replace(/-?\d+\.?\d*/g, '#') !== b2.replace(/-?\d+\.?\d*/g, '#')) return false;
      /* The rail's path is quantised to a tenth of a pixel, so a value sitting
         on a rounding boundary can legitimately land either side of it. A
         tenth of a pixel is not a regression; the luminance grid is what
         catches anything that is. */
      if (nx.some((n, i) => Math.abs(n - ny[i]) > 0.12)) return false;
      continue;
    }

    return false;
  }

  return true;
}

/** The first thing that actually differs, said in one line. */
function describeDiff(a, b) {
  if (!a || !b) return `${a ? 'present' : 'absent'} → ${b ? 'present' : 'absent'}`;

  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key];
    const y = b[key];
    if (x === y) continue;

    if (typeof x === 'string' && typeof y === 'string') {
      const nx = (x.match(/-?\d+\.?\d*/g) ?? []).map(Number);
      const ny = (y.match(/-?\d+\.?\d*/g) ?? []).map(Number);
      if (nx.length === ny.length) {
        let worst = 0;
        let at = -1;
        nx.forEach((n, i) => {
          const d = Math.abs(n - ny[i]);
          if (d > worst) (worst = d), (at = i);
        });
        if (at >= 0) return `${key}[${at}] ${nx[at]} → ${ny[at]} (${worst.toFixed(3)})`;
      }
      return `${key} shape changed`;
    }

    return `${key} ${JSON.stringify(x)} → ${JSON.stringify(y)}`;
  }

  return 'equal';
}

async function verify() {
  const before = JSON.parse(await readFile(jsonPath, 'utf8'));
  const { captured } = await run();

  let failures = 0;
  const fail = (message) => {
    failures += 1;
    console.log(`FAIL  ${message}`);
  };

  for (const [name, was] of Object.entries(before.act)) {
    const now = captured[name];
    if (!now) {
      fail(`${name}: viewport missing from this run`);
      continue;
    }

    /* The container is allowed to grow — that is what appending an act means.
       What must not move is how far act one is scrubbed over. */
    if (was.range !== now.range) {
      fail(`${name}: act one is scrubbed over ${now.range}px, was ${was.range}px`);
    }

    let moved = 0;
    let repainted = 0;
    let worstGrid = 0;

    for (let i = 0; i < was.samples.length; i += 1) {
      const a = was.samples[i];
      const b = now.samples[i];
      if (!b || a.scrollY !== b.scrollY) {
        fail(`${name}: sample ${i} is at ${b?.scrollY ?? '(missing)'}px, was ${a.scrollY}px`);
        moved += 1;
        break;
      }

      if (a.lightWorld !== b.lightWorld) {
        fail(`${name} @${a.scrollY}px: the header chrome flips at a different place`);
      }

      for (const selector of WATCHED) {
        const x = a.elements[selector];
        const y = b.elements[selector];
        if (!sameEnough(x, y)) {
          if (moved < 6) fail(`${name} @${a.scrollY}px: ${selector} — ${describeDiff(x, y)}`);
          moved += 1;
        }
      }

      /* Sampling and compositing are not bit-exact across runs; a real change
         moves a cell by far more than this. */
      const delta = Math.max(...a.grid.map((v, n) => Math.abs(v - b.grid[n])));
      worstGrid = Math.max(worstGrid, delta);
      if (delta > 6) {
        if (repainted < 3) fail(`${name} @${a.scrollY}px: the frame renders differently (${delta}/255)`);
        repainted += 1;
      }
    }

    if (moved === 0 && repainted === 0) {
      console.log(
        `PASS  ${name}: ${was.samples.length} samples identical, ` +
          `act one scrubbed over ${now.range}px of a ${now.height}px container, ` +
          `worst pixel drift ${worstGrid}/255`,
      );
    } else {
      console.log(`      ${name}: ${moved} state diffs, ${repainted} frames repainted`);
    }
  }

  console.log();
  process.exit(failures === 0 ? 0 : 1);
}

const mode = process.argv.includes('--capture') ? 'capture' : 'verify';
await (mode === 'capture' ? capture() : verify());
