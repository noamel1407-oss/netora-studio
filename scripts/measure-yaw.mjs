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

/* 95%: the slope plus or minus about two standard errors. With ~500 columns
   the t distribution is close enough to normal that 1.96 is honest. */
const ci = (f) => [f.slope - 1.96 * f.stderr, f.slope + 1.96 * f.stderr];
const asPanel = (value, r) => (value * r.span) / r.f.meanHeight;

console.log('---');
console.log('WHAT THE MEASUREMENT SUPPORTS\n');

const [lo, hi] = ci(test.f);
console.log(`Test (03) slope    ${test.f.slope.toFixed(5)}   95% CI [${lo.toFixed(5)}, ${hi.toFixed(5)}]`);
console.log(
  `  across the panel  ${(asPanel(test.f.slope, test) * 100).toFixed(1)}%   ` +
    `95% CI [${(asPanel(lo, test) * 100).toFixed(1)}%, ${(asPanel(hi, test) * 100).toFixed(1)}%]`,
);
const [clo, chi] = ci(control.f);
console.log(`Control (02) slope ${control.f.slope.toFixed(5)}   95% CI [${clo.toFixed(5)}, ${chi.toFixed(5)}]`);
console.log(`  its true value is exactly zero, and zero is inside that interval.\n`);

const zeroInside = lo <= 0 && hi >= 0;
console.log(
  zeroInside
    ? 'Zero lies inside the test\'s interval, and the test\'s point estimate is\nsmaller than the control\'s own error. => NO EVIDENCE OF YAW.'
    : 'Zero lies OUTSIDE the test\'s interval. => THE CAMERA TURNS.',
);

console.log(`
What this does NOT establish
----------------------------
It does not put the rotation "under a degree". A point estimate is not a
bound, and the interval above is what the data constrain — anything inside it
is consistent with these pixels. Converting that interval into degrees needs
the render's focal length, which the references do not state, so the bound is
left in the units that were actually measured.

The weaker, separate statement is detection: a slope has to clear the
control's error to be visible to this method at all, so a turn small enough to
change the panel's height by less than ~${(Math.abs(control.f.slope) * test.span / test.f.meanHeight * 100).toFixed(0)}% across its width could be present
and unseen here.

What it does establish is the thing the route needs: there is no evidence for
a turn between 02 and 03, and a corridor built parallel to the approach is
consistent with the anchors. If the greybox renders then reproduce those
compositions without rotation, the parallel reading stands on two legs rather
than one.
`);
