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
 * Full screenshots are written at a few checkpoints as well, for the case
 * where a number has moved and a person needs to see what it did. They are
 * local only — nothing verifies against them, `state*.json` is what the
 * comparison reads, and eleven megabytes of PNG is not worth carrying for a
 * look someone can regenerate with `--capture`.
 *
 * ## Two axes, both stated rather than assumed
 *
 * **Mode.** Headless Chromium has no H.264 decoder, so left alone the vault
 * video never becomes seekable and `VaultHero` takes its non-scrubbable
 * branch — which means the door on the scroll wheel, the thing the opening is
 * built around, is not being measured at all. So a VP9 copy of the same render
 * is served in its place when one is available: `npm run vault:standin` writes
 * it, `VAULT_WEBM` overrides where it is read from, and the run reports
 * `scrubbable` or `poster` accordingly. The two modes have different tween
 * positions, so they have different fixtures and are never compared with each
 * other.
 *
 * `--poster` ignores the stand-in, for checking the fallback path deliberately
 * rather than by not having the file.
 *
 * **Configuration.** `--isolate` renders the site with `--act-two-h: 0`. That
 * is act one as it was before act two existed, and it is the run that proves
 * the share mapping, the route bus, `cameraAt`'s branch, the lens shift and
 * the greybox change nothing about act one. Without the flag the site is
 * rendered exactly as it ships.
 *
 * Both are recorded in the fixture and checked on the way in. A run cannot be
 * verified against a fixture taken under a different mode or a different
 * configuration, because the two would disagree for reasons that have nothing
 * to do with a regression.
 *
 * ## The fixtures
 *
 * - `state.json` — the isolation reference. Captured at `f2dd268` against the
 *   unmodified site, before the greybox existed, and **not re-recorded from
 *   this branch**: a reference regenerated from the code it is meant to check
 *   is not a reference. Verified with `--isolate`.
 * - `state-shipped-<mode>.json` — the site as it ships, one per mode. This is
 *   what catches drift from here on.
 */

import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import sharp from 'sharp';

const BASE = 'http://localhost:4173';
const OUT = path.join(process.cwd(), 'baselines', 'act-one');

/** `--isolate` collapses act two, so what is walked is act one on its own. */
const ISOLATE = process.argv.includes('--isolate');

/**
 * The decodable stand-in for the vault render.
 *
 * `VAULT_WEBM` points at one explicitly; otherwise the file
 * `npm run vault:standin` writes is used if it is there. Absent, the run is a
 * `poster` one and says so — it is still a real check of everything that is
 * not the vault's own scrub.
 */
const STAND_IN = process.argv.includes('--poster')
  ? null
  : process.env.VAULT_WEBM || path.join(process.cwd(), '.netora-work', 'vault-video.webm');

/** Which fixture a run of this shape belongs to. */
const fixtureFor = (config, mode) =>
  config === 'isolated' && mode === 'poster'
    ? path.join(OUT, 'state.json')
    : path.join(OUT, `state-${config}-${mode}.json`);

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
    /* Asked for and checked in one round trip: `scrollTo` is synchronous, so
       the interesting case is not "has it happened yet" but "did something
       move the page afterwards" — which is what the retries are for. Waiting
       before looking cost three and a half minutes a run and answered a
       question nobody had asked. */
    const at = await page.evaluate((y) => {
      window.scrollTo(0, y);
      return Math.round(window.scrollY);
    }, target);
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
    if (Math.abs(at - target) <= 1) {
      const after = await page.evaluate(() => Math.round(window.scrollY));
      if (Math.abs(after - target) <= 1) return after;
    }
    await page.waitForTimeout(140);
  }
  return page.evaluate(() => Math.round(window.scrollY));
}

/**
 * Waiting for the journey to arrive, rather than for a reading to repeat.
 *
 * The scrubbed timeline trails the scroll position by a fraction of a second
 * and approaches asymptotically, so "wait long enough" is a guess that is
 * wrong often enough to make a baseline useless: a first pass compared runs
 * after a fixed delay and produced forty differences on an unchanged build,
 * every one the tail of that easing on frames that were pixel-identical.
 *
 * Reading until two readings agreed replaced one guess with another. Headless
 * Chromium can starve the render pipeline for a moment after a programmatic
 * scroll, and a scrub that is not being ticked does not move — so two readings
 * across such a pause agree while the timeline is still on its way. On about
 * one run in four that failed a fixture the build reproduces exactly: the gold
 * rail reported a neighbouring sample's point count, on a frame whose
 * luminance grid matched. The fixture was right; the reading was early.
 *
 * So the journey is asked instead of guessed at. `VaultHero` writes two
 * numbers on the container every frame: `data-journey-to`, the position the
 * scroll says to be at, straight from ScrollTrigger, and `data-journey-at`,
 * the position the scrub has reached. They are equal exactly when the
 * smoothing has caught up. That is a condition, not a heuristic: a stalled
 * pipeline leaves them apart and the wait simply continues, where before it
 * concluded.
 *
 * Both are written to six places, so equality is asserted to the same.
 */
const ARRIVED = 2e-6;

async function arrive(page) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const where = await page.evaluate(() => {
      const journey = document.querySelector('.journey');
      return {
        at: Number(journey?.dataset.journeyAt ?? NaN),
        to: Number(journey?.dataset.journeyTo ?? NaN),
      };
    });
    /* A build that does not publish its position — nothing does today, but a
       fixture outlives the code that made it. Say so rather than spin. */
    if (!Number.isFinite(where.at) || !Number.isFinite(where.to)) return { arrived: false, blind: true };
    if (Math.abs(where.at - where.to) <= ARRIVED) return { arrived: true, ...where };
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
    await page.waitForTimeout(40);
  }
  return { arrived: false, blind: false };
}

/**
 * One confirming re-read after arrival.
 *
 * The timeline having arrived is the hard part; this catches the cheaper case
 * of something that follows it by a frame — a React commit, a class flip — and
 * costs one frame when nothing is moving.
 */
async function stableState(page, watched) {
  const landing = await arrive(page);

  let previous = await readState(page, watched);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
    if (attempt > 0) await page.waitForTimeout(60);
    const current = await readState(page, watched);
    if (JSON.stringify(current) === JSON.stringify(previous)) {
      return landing.arrived ? current : { ...current, unsettled: true };
    }
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
    /* Measured, not solved from the `svh` numbers — the same way `VaultHero`
       takes it, and for the same reason: the container's height and act one's
       are rounded to pixels separately, and act one's progress is this ratio's
       divisor. Before act two existed there was no `--act-one-h` and the
       container was act one, so the probe falls back to the container's own
       height rather than to a number that makes the share 0/0. This has to
       keep working against the unchanged site: a harness that cannot measure
       the thing it is protecting is not protecting anything. */
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:absolute;visibility:hidden;pointer-events:none;inline-size:0;' +
      'block-size:var(--act-one-h, var(--journey-h, 100%))';
    journey.append(probe);
    const actOne = probe.getBoundingClientRect().height;
    probe.remove();

    const height = journey.getBoundingClientRect().height;
    return {
      height: Math.round(height),
      /* Act one's share of the scrolled length. Sampling the container instead
         would compare act one before against act two after, which is how the
         first run of this reported "identical" while silently checking
         nothing. */
      share: Math.round(actOne - window.innerHeight) / Math.round(height - window.innerHeight),
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

async function run() {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  const standIn = STAND_IN ? await readFile(STAND_IN).catch(() => null) : null;
  const captured = {};
  const shotsByViewport = {};
  /* Assumed until a viewport proves otherwise: a stand-in that is present but
     undecodable must not be reported as though it had been scrubbed. */
  let mode = 'poster';

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      locale: 'he-IL',
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (error) => problems.push(String(error.message)));

    /*
     * Act two, collapsed to nothing.
     *
     * At document start rather than after load: act one's share is read off
     * these two custom properties once, while the timeline is being built, so
     * a stylesheet added afterwards would change what the container measures
     * without changing what the journey was laid out against.
     */
    if (ISOLATE) {
      await page.addInitScript(() => {
        const collapse = () => {
          const style = document.createElement('style');
          style.textContent = '.journey{--act-two-h:0svh !important}';
          document.documentElement.append(style);
        };
        if (document.documentElement) collapse();
        else document.addEventListener('readystatechange', collapse, { once: true });
      });
    }

    /* The same render, in a container this browser can decode. The response's
       own content type is what decides playability, so the page's `type` hint
       on the mp4 source does not have to agree with it. */
    if (standIn) {
      await page.route('**/vault-video.mp4', (route) =>
        route.fulfill({ status: 200, contentType: 'video/webm', body: standIn }),
      );
    }

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);

    /* Scrubbable is a fact about this run, not about the file being present:
       it is true only where the element actually reports a duration to seek
       within.

       Waited for either way, because the branch the vault takes is a repaint:
       without a decodable source the element is eventually pulled and the
       poster takes its place, and walking before that lands captures whichever
       of the two the run happened to be showing. */
    await page
      .waitForFunction(
        () => {
          const video = document.querySelector('.vault-video__media');
          const images = [...document.images].every((image) => image.complete);
          return images && (!video || video.readyState >= 2);
        },
        { timeout: 20000 },
      )
      .catch(() => {});
    const scrubbable = await page.evaluate(() => {
      const video = document.querySelector('.vault-video__media');
      return Boolean(video && video.readyState >= 2 && video.duration > 0);
    });
    if (scrubbable) mode = 'scrubbable';

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
  return { captured, shotsByViewport, mode, config: ISOLATE ? 'isolated' : 'shipped' };
}

/* --------------------------------------------------------------------------
   Capture and verify
   -------------------------------------------------------------------------- */

async function capture() {
  const { captured, shotsByViewport, mode, config } = await run();
  const jsonPath = fixtureFor(config, mode);
  /* One fixture per shape, so capturing a shipped run cannot quietly replace
     the isolation reference — which is the one artifact here that must not be
     regenerated from the code it checks. */
  const frames =
    config === 'isolated' && mode === 'poster'
      ? path.join(OUT, 'frames')
      : path.join(OUT, `frames-${config}-${mode}`);

  await rm(frames, { recursive: true, force: true });
  await mkdir(frames, { recursive: true });

  await writeFile(
    jsonPath,
    `${JSON.stringify({ grid: GRID, samples: SAMPLES, config, mode, act: captured }, null, 1)}\n`,
  );

  for (const shot of shotsByViewport.desktop ?? []) {
    await sharp(shot.buffer)
      .resize({ width: 720 })
      .png({ compressionLevel: 9 })
      .toFile(path.join(frames, `${shot.name}.png`));
  }

  const total = Object.values(captured).reduce((n, act) => n + act.samples.length, 0);
  console.log(`Captured ${total} samples across ${VIEWPORTS.length} viewports — ${config}, ${mode}.`);
  for (const [name, act] of Object.entries(captured)) {
    console.log(
      `  ${name.padEnd(8)} container ${act.height}px, act one scrubbed over ${act.range}px ` +
        `(${(act.share * 100).toFixed(1)}%)`,
    );
    if (act.pageErrors.length) console.log(`    page errors: ${act.pageErrors.join(' | ')}`);
  }
  console.log(`  frames: ${(await readdir(frames)).length}`);
  console.log(`\nWritten to ${path.relative(process.cwd(), jsonPath)}`);
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

    /* `visibility` is how GSAP finishes an `autoAlpha`, so it flips at the
       instant opacity reaches zero — and which side of that instant a scrubbed
       timeline has settled on is the same sub-pixel lag as everything else
       here. On something already invisible it is not a difference anyone can
       see. */
    if (key === 'visibility' && (a.opacity ?? 1) < 0.02 && (b.opacity ?? 1) < 0.02) continue;

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
      /*
       * Half a pixel.
       *
       * Tighter than this and the baseline reports the tail of the scrub's
       * easing rather than anything about the journey — a camera dolly landing
       * on 49.75 against 49.54 on frames whose luminance grids are identical.
       * Half a pixel is below what a compositor draws and far below what
       * anyone sees, and the grid is what catches a real change.
       */
      if (nx.some((n, i) => Math.abs(n - ny[i]) > 0.5)) return false;
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
      return `${key} shape changed (${nx.length} numbers → ${ny.length})`;
    }

    return `${key} ${JSON.stringify(x)} → ${JSON.stringify(y)}`;
  }

  return 'equal';
}

async function verify() {
  const { captured, mode, config } = await run();
  const jsonPath = fixtureFor(config, mode);

  let failures = 0;
  const fail = (message) => {
    failures += 1;
    console.log(`FAIL  ${message}`);
  };

  const before = await readFile(jsonPath, 'utf8')
    .then(JSON.parse)
    .catch(() => null);
  if (!before) {
    console.log(
      `No fixture for a ${config}, ${mode} run.\n` +
        `  expected ${path.relative(process.cwd(), jsonPath)}\n` +
        `  capture one with: node scripts/baseline-act-one.mjs --capture${ISOLATE ? ' --isolate' : ''}\n` +
        (mode === 'poster'
          ? '  (or `npm run vault:standin` first, to measure the scrubbable branch instead)\n'
          : ''),
    );
    process.exit(1);
  }

  /* A fixture from before these fields existed is the isolation reference, and
     nothing else was ever written to that path. */
  const taken = { config: before.config ?? 'isolated', mode: before.mode ?? 'poster' };
  if (taken.config !== config || taken.mode !== mode) {
    console.log(`FAIL  fixture is ${taken.config}/${taken.mode}, this run is ${config}/${mode}\n`);
    process.exit(1);
  }

  console.log(`Verifying ${path.relative(process.cwd(), jsonPath)} — ${config}, ${mode}.`);

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

      /* A sample the journey never arrived at is not evidence either way, and
         quietly comparing it is how a stalled reading gets recorded as a
         regression — or, worse, as a pass. */
      if (b.unsettled) {
        fail(`${name} @${a.scrollY}px: the journey had not arrived when this was read`);
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
        /* Which bands of the frame moved. A difference confined to the bottom
           rows is the container's own edge treatment; one spread through the
           middle is the journey. Saying which costs one line and saves an
           argument. */
        const rows = [];
        for (let row = 0; row < GRID.h; row += 1) {
          let worst = 0;
          for (let col = 0; col < GRID.w; col += 1) {
            const n = row * GRID.w + col;
            worst = Math.max(worst, Math.abs(a.grid[n] - b.grid[n]));
          }
          if (worst > 6) rows.push(row);
        }
        const where =
          rows.length === 0
            ? ''
            : ` — rows ${rows[0]}-${rows[rows.length - 1]} of ${GRID.h}` +
              ` (${((rows[0] / GRID.h) * 100).toFixed(0)}%-${(((rows[rows.length - 1] + 1) / GRID.h) * 100).toFixed(0)}% down the frame)`;
        if (repainted < 3) {
          fail(`${name} @${a.scrollY}px: the frame renders differently (${delta}/255)${where}`);
        }
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
