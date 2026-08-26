#!/usr/bin/env node
/**
 * Does the camera turn between anchors 02 and 03?
 *
 *     npm run measure:yaw
 *
 * This decides a piece of the route's architecture, so it is decided by
 * measurement with a stated error bar rather than by looking at the pictures.
 *
 * ## The test
 *
 * A pinhole camera that only translates projects any plane at constant depth
 * with a *uniform* scale. So TIMEMATIC's display — a rectangle on the hall's
 * far wall — must keep a constant height across its own width, however far the
 * camera has trucked sideways. If the camera has yawed, one end of that
 * rectangle is nearer than the other and its projected height varies linearly
 * across the frame.
 *
 * So: measure the display's height at every column, fit a straight line to it,
 * and ask whether the slope is distinguishable from zero.
 *
 * ## Why a control is not optional
 *
 * Anchor 02 is rendered with the camera square to that wall, so its true slope
 * is exactly zero and anything measured there is the method's own error — soft
 * bezel edges, a lighting gradient across the panel, JPEG ringing. Run the
 * identical measurement on 02 and the number that comes back is the noise
 * floor. Only a slope in 03 that clears it means anything.
 *
 * A first pass at this compared single heights at each end and found 5.1% on
 * the control against 5.9% on the test — which is not a result, it is two
 * numbers inside the same error. Hence the regression, and hence reporting the
 * standard error and a t-statistic rather than a difference.
 */

import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const DIR = path.join(process.cwd(), 'reference', 'transitions');
const WIDTH = 1672;

const rec709 = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const chromaOf = (r, g, b) => {
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
};

/**
 * Where the display is, per anchor: a generous search box, deliberately larger
 * than the panel so its true edges are found rather than the box's.
 */
const PANELS = [
  { file: '02-timematic-portfolio-stop', role: 'CONTROL — camera square to the wall', box: [0.3, 0.7, 0.2, 0.74] },
  { file: '03-timematic-to-corridor', role: 'TEST — camera has trucked right', box: [0.05, 0.55, 0.1, 0.78] },
];

async function heights({ file, box }) {
  const { data, info } = await sharp(path.join(DIR, `${file}.jpeg`))
    .resize({ width: WIDTH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: W, height: H, channels: C } = info;
  const lit = (x, y) => {
    const i = (y * W + x) * C;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return rec709(r, g, b) > 0.55 && chromaOf(r, g, b) < 0.22;
  };

  const x0 = Math.round(box[0] * W);
  const x1 = Math.round(box[1] * W);
  const y0 = Math.round(box[2] * H);
  const y1 = Math.round(box[3] * H);

  const columns = [];
  for (let x = x0; x <= x1; x += 1) {
    let top = -1;
    let bottom = -1;
    for (let y = y0; y <= y1; y += 1) if (lit(x, y)) { top = y; break; }
    for (let y = y1; y >= y0; y -= 1) if (lit(x, y)) { bottom = y; break; }
    /* An edge that landed on the search box is the box, not the display. */
    if (top > y0 && bottom < y1 && bottom - top > H * 0.05) {
      columns.push({ x, h: bottom - top });
    }
  }

  /* The panel's own corners are rounded and its bezel is soft; a twelfth off
     each end keeps the fit on the straight part of the edge. Applied
     identically to both anchors, so it cannot favour either. */
  const trim = Math.floor(columns.length / 12);
  return { columns: columns.slice(trim, columns.length - trim), W, H };
}

/** Ordinary least squares, with the standard error of the slope. */
function fit(points) {
  const n = points.length;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.h, 0) / n;

  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.h - my);
  }

  const slope = sxy / sxx;
  const intercept = my - slope * mx;

  let residual = 0;
  for (const p of points) residual += (p.h - (intercept + slope * p.x)) ** 2;

  /* Two parameters fitted, so n - 2 degrees of freedom. */
  const variance = residual / (n - 2);
  const stderr = Math.sqrt(variance / sxx);

  return { n, slope, intercept, stderr, meanHeight: my, rms: Math.sqrt(variance) };
}

console.log('Does the camera yaw between anchors 02 and 03?\n');
console.log('A translating camera projects a plane at constant depth at uniform');
console.log('scale, so the display\'s height must not vary across its own width.');
console.log('Slope is in pixels of height per pixel of width.\n');

const results = [];
for (const panel of PANELS) {
  const { columns } = await heights(panel);
  const f = fit(columns);
  const t = f.slope / f.stderr;
  /* Across the panel's whole width, as a fraction of its height — the number
     a person can actually picture. */
  const span = columns[columns.length - 1].x - columns[0].x;
  const acrossPanel = (f.slope * span) / f.meanHeight;

  results.push({ panel, f, t, acrossPanel, span });

  console.log(`${panel.file}`);
  console.log(`  ${panel.role}`);
  console.log(`  ${f.n} columns over ${span}px, mean height ${f.meanHeight.toFixed(1)}px`);
  console.log(`  slope    ${f.slope.toFixed(5)} +/- ${f.stderr.toFixed(5)}   t = ${t.toFixed(1)}`);
  console.log(`  residual ${f.rms.toFixed(2)}px rms`);
  console.log(`  across the panel: height changes by ${(acrossPanel * 100).toFixed(1)}%`);
  console.log();
}

const [control, test] = results;

console.log('---');
console.log(`Control (02) measures ${(control.acrossPanel * 100).toFixed(1)}% where the truth is 0.0%.`);
console.log(`That is the method's noise floor: |slope| <= ${Math.abs(control.f.slope).toFixed(5)}.`);
console.log();

const clears = Math.abs(test.f.slope) > Math.abs(control.f.slope);
const ratio = Math.abs(test.f.slope) / Math.abs(control.f.slope);

if (!clears) {
  console.log(`Test (03) measures ${Math.abs(test.f.slope).toFixed(5)}, which is BELOW the noise floor.`);
  console.log('=> No yaw is detectable. The anchors are consistent with a lateral truck.');
} else {
  console.log(`Test (03) measures ${Math.abs(test.f.slope).toFixed(5)} — ${ratio.toFixed(1)}x the control.`);
  if (ratio < 3) {
    console.log('=> Same order as the method\'s own error. NOT a demonstration of yaw:');
    console.log('   a real turn would put the test far outside the control, not beside it.');
  } else {
    console.log('=> Clears the noise floor by a wide margin. The camera DOES turn,');
    console.log('   and act two needs yaw.');
  }
}

/* What a turn would have to look like to be visible here at all. */
const detectable = 3 * Math.abs(control.f.slope) * test.span / test.f.meanHeight;
console.log();
console.log(`Sensitivity: this method could only see a turn large enough to change`);
console.log(`the panel's height by ${(detectable * 100).toFixed(1)}% across its width. Anything`);
console.log(`smaller is invisible to it, and is also invisible on screen.`);
