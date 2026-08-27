#!/usr/bin/env node
/**
 * The route, walked.
 *
 *     npm run audit:route
 *
 * `baseline-act-one.mjs` protects act one and stops at its end, which left the
 * whole of act two asserted by nothing. This is the other half: it scrubs the
 * route from the arrival at SHAY out to the TIMEMATIC stop and checks the
 * things the route is *for*.
 *
 * Requires a server on :4173 — `npm run build && npm run preview` first.
 *
 * ## What it asserts, and why each one is here
 *
 * **The camera keeps its own position.** `routeCameraAt` used to return act
 * one's arrival as the camera's travel, so everything reading it was frozen at
 * the platform for the length of the route. `--air` is the visible symptom —
 * the plaza's haze sat at exactly 0.500 from SHAY to the stop — so that is
 * what is measured: it has to fall, and reach nothing, before the camera is
 * inside the building.
 *
 * **The camera never reverses, and never reaches the work.** These are the
 * route's own rules, and both are readable off the DOM: `.travel__world`'s
 * `translate3d` carries the dolly, so the world tells you where the camera is
 * without being asked. The display's plane stands at `ROUTE.wall.z` and
 * nothing on the route may cross it: that is what "the screens are surfaces"
 * means once it is geometry rather than a promise.
 *
 * **The greybox belongs to act two.** It is held hidden for the whole of act
 * one — that is the invariance guarantee it is mounted under — and it has to
 * actually appear once the route starts, or the route is being walked through
 * an empty world.
 */

import process from 'node:process';

import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

/** Where the far wall stands, in world z. Mirrors `ROUTE.wall.z`. */
const WALL_Z = -24400;
/** How many places along the route to look. */
const STEPS = 40;

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

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
  await page.waitForTimeout(1200);

  console.log(`\n=== ${viewport.name} ===`);

  /* Act one's own length, measured the way the site measures it. */
  const span = await page.evaluate(() => {
    const journey = document.querySelector('.journey');
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:absolute;visibility:hidden;pointer-events:none;inline-size:0;' +
      'block-size:var(--act-one-h, var(--journey-h, 100%))';
    journey.append(probe);
    const actOne = probe.getBoundingClientRect().height;
    probe.remove();
    const height = journey.getBoundingClientRect().height;
    return {
      actOneEnd: Math.round(actOne - window.innerHeight),
      routeEnd: Math.round(height - window.innerHeight),
    };
  });

  check(
    'act two has scroll of its own',
    span.routeEnd > span.actOneEnd,
    `act one ends at ${span.actOneEnd}px, the journey at ${span.routeEnd}px`,
  );

  const read = async (scrollY) => {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    /* Read until the scrub has arrived rather than after a fixed wait — the
       same reason `baseline-act-one.mjs` does. */
    let previous = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await page.evaluate(
        () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
      );
      await page.waitForTimeout(120);
      const now = await page.evaluate(() => {
        const travel = document.querySelector('.travel');
        const world = document.querySelector('.travel__world');
        const grey = document.querySelector('.grey');
        const matrix = new DOMMatrixReadOnly(getComputedStyle(world).transform);
        return {
          air: Number(getComputedStyle(travel).getPropertyValue('--air').trim()),
          /* `.travel__world`'s translate3d carries the dolly; a camera's world
             position is its negative. */
          worldZ: Number((-matrix.m43).toFixed(1)),
          greyVisible: grey ? getComputedStyle(grey).visibility === 'visible' : null,
        };
      });
      if (previous && JSON.stringify(previous) === JSON.stringify(now)) return now;
      previous = now;
    }
    return previous;
  };

  const atActOneEnd = await read(span.actOneEnd);
  check(
    'the greybox is out of act one',
    atActOneEnd.greyVisible === false,
    `visibility at act one's last pixel: ${atActOneEnd.greyVisible ? 'visible' : 'hidden'}`,
  );

  const walk = [];
  for (let i = 0; i <= STEPS; i += 1) {
    const scrollY = Math.round(span.actOneEnd + ((span.routeEnd - span.actOneEnd) * i) / STEPS);
    walk.push({ scrollY, ...(await read(scrollY)) });
  }

  const air = walk.map((step) => step.air);
  const worldZ = walk.map((step) => step.worldZ);

  check(
    'the greybox is standing once the route begins',
    walk.slice(1).every((step) => step.greyVisible === true),
    `${walk.slice(1).filter((s) => s.greyVisible).length}/${walk.length - 1} samples`,
  );

  check(
    'the air is act one\'s at the hand-off',
    Math.abs(air[0] - 0.5) < 0.005,
    `--air = ${air[0].toFixed(3)}`,
  );

  const falls = air.every((value, i) => i === 0 || value <= air[i - 1] + 1e-6);
  check('the air never thickens along the route', falls, `${air[0].toFixed(3)} → ${air.at(-1).toFixed(3)}`);

  const distinct = new Set(air.map((v) => v.toFixed(3))).size;
  check(
    'the air actually varies through act two',
    distinct > 3,
    `${distinct} distinct values across ${air.length} samples`,
  );

  const clearsAt = walk.find((step) => step.air <= 0.0005);
  check(
    'the air is spent before the camera is inside',
    Boolean(clearsAt) && clearsAt.worldZ <= -19900,
    clearsAt
      ? `reaches 0 at world z ${clearsAt.worldZ} (the facade stands at -19900)`
      : `never reaches 0; lowest ${Math.min(...air).toFixed(3)}`,
  );

  const forward = worldZ.every((value, i) => i === 0 || value <= worldZ[i - 1] + 0.5);
  check(
    'the camera never reverses',
    forward,
    `world z ${worldZ[0]} → ${worldZ.at(-1)}`,
  );

  const closest = Math.min(...worldZ.map((z) => Math.abs(z - WALL_Z)));
  check(
    'the camera never reaches the work',
    Math.min(...worldZ) > WALL_Z,
    /* Of the sampled positions, so it is an upper bound on the margin rather
       than the margin: the true closest approach falls between two samples. */
    `nearest of ${walk.length} samples is ${Math.round(closest)} units short of the display's plane`,
  );

  check('no page errors during the walk', problems.length === 0, problems.join(' | '));

  await context.close();
}

await browser.close();
console.log(failures === 0 ? '\nAll route checks pass.\n' : `\n${failures} failed.\n`);
process.exit(failures === 0 ? 0 : 1);
