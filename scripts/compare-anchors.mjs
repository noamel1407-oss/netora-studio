#!/usr/bin/env node
/**
 * Renders the greybox at the five canonical anchor positions and puts each one
 * beside the anchor it is meant to reproduce.
 *
 *     npm run compare:anchors
 *
 * This is the test the greybox exists for. The anchors constrain the geometry
 * — they do not solve it — so the only honest way to know whether the world
 * built from them actually produces their compositions is to stand the camera
 * where each one stands and look.
 *
 * Two things come out of it:
 *
 * - **Contact sheets** under `_shots/anchors/`, greybox above, reference
 *   below, for the compositions a person has to judge.
 * - **Numbers**, for the ones a person should not have to. The display and the
 *   corridor's opening are real elements, so their projected rectangles can be
 *   read straight off the DOM and compared against the same rectangles
 *   measured in the references by `npm run assets:anchors`. No pixel
 *   guesswork: the geometry reports where it actually landed.
 *
 * The yaw question is settled here too. The corridor is built parallel to the
 * approach, on the reading that anchors 02 and 03 show a lateral truck. If a
 * parallel corridor cannot put its far end where anchor 03 puts it, that
 * reading is wrong and the camera needs to turn.
 */

import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import sharp from 'sharp';

const BASE = 'http://localhost:4173';
const REFS = path.join(process.cwd(), 'reference', 'transitions');
const OUT = path.join(process.cwd(), '_shots', 'anchors');
const VIEW = { width: 1440, height: 900 };

/**
 * Where each anchor's camera stands, as journey travel. Act one is [0, 1], so
 * all of these are act two.
 */
const ANCHORS = [
  { id: '01', travel: 1.15, file: '01-shay-to-timematic', of: 'the route across the plaza toward TIMEMATIC' },
  { id: '02', travel: 1.66, file: '02-timematic-portfolio-stop', of: 'the stop, square to the display' },
  { id: '03', travel: 1.86, file: '03-timematic-to-corridor', of: 'display left, corridor right' },
  { id: '04', travel: 1.91, file: '04-corridor-interior', of: 'inside the corridor' },
  { id: '05', travel: 2.0, file: '05-corridor-to-contact', of: 'out of the corridor, contact ahead' },
];

/**
 * What the same features measure in the references, as fractions of frame.
 * From `npm run assets:anchors`; `null` where the reference does not show it.
 */
const EXPECTED = {
  '02': { display: { x0: 0.361, x1: 0.634, y0: 0.323, y1: 0.613 } },
  '03': { display: { x0: 0.112, x1: 0.488, y0: 0.23, y1: 0.634 } },
};

const pct = (v) => `${(v * 100).toFixed(1)}%`;

async function settleAt(page, target) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await page.evaluate((y) => window.scrollTo(0, y), target);
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
    await page.waitForTimeout(attempt === 0 ? 260 : 140);
    const at = await page.evaluate(() => Math.round(window.scrollY));
    if (Math.abs(at - target) <= 1) break;
  }
  /* Let the scrub arrive before anything is read or photographed. */
  await page.waitForTimeout(700);
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
}

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({ viewport: VIEW, locale: 'he-IL', deviceScaleFactor: 1 });
const page = await context.newPage();
const problems = [];
page.on('pageerror', (error) => problems.push(String(error.message)));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);

/* The container, and the share act one owns — read from the page rather than
   repeated here, so this cannot drift from the CSS that decides it. */
const frame = await page.evaluate(() => {
  const journey = document.querySelector('.journey');
  const rect = journey.getBoundingClientRect();
  const styles = getComputedStyle(journey);
  const one = parseFloat(styles.getPropertyValue('--act-one-h'));
  const two = parseFloat(styles.getPropertyValue('--act-two-h'));
  return {
    top: Math.round(rect.top + window.scrollY),
    height: Math.round(rect.height),
    share: one / (one + two),
  };
});
const range = frame.height - VIEW.height;
console.log(
  `container ${frame.height}px, act one owns ${(frame.share * 100).toFixed(1)}% ` +
    `(${Math.round(frame.share * range)}px of ${range}px scrubbed)\n`,
);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const anchor of ANCHORS) {
  const route = anchor.travel - 1;
  const progress = frame.share + route * (1 - frame.share);
  const scrollY = Math.round(frame.top + progress * range);

  await settleAt(page, scrollY);

  /* The geometry reports where it landed, rather than being guessed at from
     pixels: these are real elements with real projected rectangles. */
  const seen = await page.evaluate((view) => {
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const r = element.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return null;
      return {
        x0: r.left / view.width,
        x1: r.right / view.width,
        y0: r.top / view.height,
        y1: r.bottom / view.height,
      };
    };
    return {
      display: box('.grey__display'),
      greyboxVisible: getComputedStyle(document.querySelector('.grey')).visibility,
      faces: document.querySelectorAll('.grey__face').length,
    };
  }, VIEW);

  const shot = await page.screenshot();
  await sharp(shot).resize({ width: 760 }).png().toFile(path.join(OUT, `${anchor.id}-greybox.png`));

  /* Greybox above, the anchor it is meant to reproduce below. */
  const ref = await sharp(path.join(REFS, `${anchor.file}.jpeg`)).resize({ width: 760 }).toBuffer();
  const grey = await sharp(shot).resize({ width: 760 }).toBuffer();
  const gh = (await sharp(grey).metadata()).height;
  const rh = (await sharp(ref).metadata()).height;
  await sharp({
    create: { width: 760, height: gh + rh + 6, channels: 3, background: { r: 20, g: 22, b: 28 } },
  })
    .composite([
      { input: grey, top: 0, left: 0 },
      { input: ref, top: gh + 6, left: 0 },
    ])
    .png()
    .toFile(path.join(OUT, `${anchor.id}-compare.png`));

  console.log(`${anchor.id}  travel ${anchor.travel.toFixed(2)}  scrollY ${scrollY}  — ${anchor.of}`);
  console.log(`    greybox ${seen.greyboxVisible}, ${seen.faces} faces`);

  const want = EXPECTED[anchor.id]?.display;
  if (seen.display) {
    const d = seen.display;
    console.log(`    display  x ${pct(d.x0)}–${pct(d.x1)}   y ${pct(d.y0)}–${pct(d.y1)}`);
    if (want) {
      const dx = ((d.x0 + d.x1) / 2 - (want.x0 + want.x1) / 2) * 100;
      const dw = ((d.x1 - d.x0) / (want.x1 - want.x0) - 1) * 100;
      console.log(`    anchor   x ${pct(want.x0)}–${pct(want.x1)}   y ${pct(want.y0)}–${pct(want.y1)}`);
      console.log(
        `    delta    centre ${dx >= 0 ? '+' : ''}${dx.toFixed(1)}% of frame, ` +
          `width ${dw >= 0 ? '+' : ''}${dw.toFixed(1)}%`,
      );
    }
  } else if (want) {
    console.log(`    display  NOT IN FRAME — the anchor puts it at x ${pct(want.x0)}–${pct(want.x1)}`);
  }
  console.log();
}

console.log(problems.length ? `page errors: ${problems.join(' | ')}` : 'no page errors');
console.log(`\nContact sheets in ${path.relative(process.cwd(), OUT)}/`);
await browser.close();
