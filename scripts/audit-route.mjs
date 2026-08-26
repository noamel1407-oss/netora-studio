#!/usr/bin/env node
/**
 * Asserts the things the route past the first platform must not stop being.
 *
 *     npm run audit:route
 *
 * Unlike the other two audits this one needs no browser and no server: the
 * camera in `src/journey/route.ts` is a pure function of scroll position, so
 * the honest way to check it is to walk it. Everything below samples
 * `plateAt()` across the whole promenade and asserts properties of what it
 * actually returns, rather than restating the configuration back at itself.
 *
 * Three of these are here because they were once wrong, and one because it is
 * the rule the whole route exists to keep:
 *
 * - **Screens are not doorways.** The camera may stop in front of a portfolio
 *   screen. It may never travel into one, and the way out of each building is
 *   its architecture.
 * - **Every anchor is reached at the framing it was approved at.** A leg that
 *   starts pushing before the plate in front of it has gone is a third of the
 *   way through its move by the time anyone can see it, and the composition
 *   its anchor fixes is one nobody is ever shown.
 * - **A stop is a stop.** Not a slow bit.
 * - **The camera never reverses.** A dolly that eases backwards mid-leg reads
 *   as the world being pulled away rather than as an approach.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { LEGS, plateAt, screenBreaches } from '../src/journey/route.ts';

/** The canonical anchors, in the only order they are ever followed. */
const CANON = ['01', '02', '03', '04', '05'];

/** Fine enough that a boundary is never missed by more than a hair. */
const STEP = 0.0005;
const FRAME = { width: 1440, height: 900 };

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

/* Walk it once and keep everything; every assertion below reads off this. */
const walk = [];
for (let p = 0; p <= 1 + 1e-9; p += STEP) {
  const at = Math.min(1, p);
  walk.push({ at, plates: LEGS.map((_, index) => plateAt(index, at, FRAME.width, FRAME.height)) });
}

// --- the anchors, in order ------------------------------------------------
check(
  'the route is the five canonical anchors, in order',
  LEGS.length === CANON.length && LEGS.every((leg, i) => leg.anchor === CANON[i]),
  LEGS.map((leg) => leg.anchor).join(' → '),
);

for (const leg of LEGS) {
  const file = path.join(process.cwd(), 'public', leg.plate.replace(/^\//, ''));
  check(`anchor ${leg.anchor} has its plate`, existsSync(file), leg.plate);
}

// --- the screens are surfaces --------------------------------------------
const breaches = screenBreaches();
check(
  'no portfolio screen has become a doorway',
  breaches.length === 0,
  breaches.map((b) => `${b.anchor} ${b.leg}: ${b.reason}`).join('; '),
);

// --- one walk, not five views --------------------------------------------
// Every aim sits at the same eye level in its own frame. That is what makes
// these five pictures one journey, and it is why nothing on the route tilts.
const heights = LEGS.map((leg) => leg.aim.y);
check(
  'the camera stays at one eye height across all five anchors',
  Math.max(...heights) - Math.min(...heights) <= 0.12,
  `aims span ${Math.min(...heights).toFixed(3)}–${Math.max(...heights).toFixed(3)} of frame`,
);

// --- the timeline is continuous ------------------------------------------
for (let i = 0; i < LEGS.length; i += 1) {
  const leg = LEGS[i];
  check(
    `leg ${leg.anchor} is well ordered`,
    leg.at < leg.leaves && leg.leaves <= leg.gone,
    `at ${leg.at} → leaves ${leg.leaves} → gone ${leg.gone}`,
  );
  if (i > 0) {
    check(
      `leg ${leg.anchor} takes over exactly as ${LEGS[i - 1].anchor} starts leaving`,
      Math.abs(leg.at - LEGS[i - 1].leaves) < 1e-9,
      `${leg.at} vs ${LEGS[i - 1].leaves}`,
    );
  }
}
check('the route runs to the end of its container', LEGS[LEGS.length - 1].leaves === 1);

// --- every anchor is reached at its authored framing ---------------------
// The first moment a leg is both unobstructed (nothing in front of it is
// still on screen) and unwashed (the threshold has cleared). Whatever the
// camera is doing then is the first thing anyone sees of that anchor.
for (let i = 0; i < LEGS.length; i += 1) {
  const leg = LEGS[i];
  const clear = walk.find(
    (row) =>
      row.plates[i].adaptIn === 0 &&
      row.plates.slice(0, i).every((plate) => plate.opacity === 0 || !plate.live),
  );

  if (!clear) {
    check(`anchor ${leg.anchor} is ever seen unobstructed`, false);
    continue;
  }

  const scale = clear.plates[i].scale;
  check(
    `anchor ${leg.anchor} is first seen at the framing it was approved at`,
    Math.abs(scale - leg.zoom[0]) <= 0.03,
    `${scale.toFixed(3)}× at progress ${clear.at.toFixed(3)} (anchor is ${leg.zoom[0]}×)`,
  );
}

// --- a stop is a stop ----------------------------------------------------
for (let i = 0; i < LEGS.length; i += 1) {
  const leg = LEGS[i];
  if (!leg.still) continue;
  const [from, to] = leg.still;
  const held = walk.filter((row) => row.at >= from && row.at <= to).map((row) => row.plates[i]);
  const moved = held.some(
    (plate) =>
      Math.abs(plate.scale - held[0].scale) > 1e-9 ||
      Math.abs(plate.x - held[0].x) > 1e-6 ||
      Math.abs(plate.y - held[0].y) > 1e-6,
  );
  check(
    `the camera is genuinely still at anchor ${leg.anchor}`,
    !moved,
    `${(to - from).toFixed(3)} of the route, held at ${held[0].scale.toFixed(3)}×`,
  );
}

// --- the camera never reverses -------------------------------------------
for (let i = 0; i < LEGS.length; i += 1) {
  const leg = LEGS[i];
  const seen = walk.filter((row) => row.plates[i].live && row.plates[i].opacity > 0);
  let worst = 0;
  for (let n = 1; n < seen.length; n += 1) {
    worst = Math.min(worst, seen[n].plates[i].scale - seen[n - 1].plates[i].scale);
  }
  check(
    `the camera only ever moves forward through anchor ${leg.anchor}`,
    worst >= -1e-9,
    worst < 0 ? `pulls back by ${(-worst).toFixed(5)}× in one step` : '',
  );
}

// --- exactly one plate is ever the subject -------------------------------
// Two plates at full opacity with nothing washing over them is a crossfade,
// which is the thing every handoff on this route is built to avoid.
const crossfading = walk.filter((row) => {
  const live = row.plates.filter((plate) => plate.live);
  const blending = live.some((plate) => plate.opacity > 0.04 && plate.opacity < 0.96);
  if (!blending) return false;
  /* Under a threshold the swap is covered and a soft overlap is invisible. A
     plate that has not been reached yet reports a full arrival wash it is not
     showing anyone — it is behind everything — so only live plates count. */
  return live.every((plate) => plate.adaptIn < 0.5 && plate.adaptOut < 0.5);
});
check(
  'no handoff crossfades in the open',
  crossfading.length * STEP <= 0.02,
  `${(crossfading.length * STEP).toFixed(3)} of the route is an uncovered blend`,
);

console.log();
process.exit(failures === 0 ? 0 : 1);
