/**
 * Smoke-tests the interactive behaviour that the experience depends on:
 * skip link, nav anchors, the first project's platform in the city, the
 * laptop showcase still on the terrace (placeholder fallbacks, play controls),
 * form validation + focus handling, and the light-world header flip.
 *
 * Requires a server on :4173 — `npm run build && npm run preview` first.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'he-IL',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(`PAGEERROR ${e.message}`));

/* Headless Chromium can starve the render pipeline after a programmatic
   scroll — no frame means no scroll event, so scroll-linked state never
   updates. Real user scrolling always produces frames; force one here so
   the audit matches what a person would see. */
const settleScroll = async (ms = 250) => {
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
  await page.waitForTimeout(ms);
};

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// --- skip link -----------------------------------------------------------
await page.keyboard.press('Tab');
const skip = await page.evaluate(() => {
  const el = document.activeElement;
  return { text: el?.textContent?.trim(), top: el?.getBoundingClientRect().top ?? -999 };
});
check('skip link is first tab stop and visible', skip.text === 'דילוג לתוכן הראשי' && skip.top >= 0, JSON.stringify(skip));

// --- nav anchors ---------------------------------------------------------
for (const id of ['work', 'about', 'contact']) {
  const exists = await page.evaluate((i) => Boolean(document.getElementById(i)), id);
  check(`anchor target #${id} exists`, exists);
}

// --- the first project, on its platform in the city ----------------------
// SHAY is no longer a laptop in a grid: it stands on the floating platform
// the journey arrives at, and its screen is a media slot rather than a
// baked-in picture. Under reduced motion that arrival is a static scene.
check('the floating platform renders', (await page.locator('.platform').count()) === 1);
check('the platform carries a computer', (await page.locator('.platform__monitor').count()) === 1);
const screen = page.locator('.pscreen');
check('the computer has a screen surface', (await screen.count()) === 1);
check('the screen shows the project\'s own opening frame', await screen.locator('.pscreen__shot').isVisible());
check('nothing plays inside the screen', (await page.locator('.pscreen video, .pscreen__toggle').count()) === 0);
check(
  'the screen clips its media to the monitor',
  await page.evaluate(() => {
    const el = document.querySelector('.pscreen');
    const well = el?.closest('.monitor__well');
    if (!el || !well) return false;
    const a = el.getBoundingClientRect();
    const b = well.getBoundingClientRect();
    return getComputedStyle(el).overflow === 'hidden' && a.width <= b.width + 1 && a.height <= b.height + 1;
  }),
);
check('the gold route is drawn', await page.evaluate(() => {
  const d = document.querySelector('.gold--near .gold__body')?.getAttribute('d') ?? '';
  return d.length > 40;
}));

// The station's one link out to the live project.
const station = page.locator('.station__cta');
check('the station offers a link to the live site', (await station.count()) === 1);
check('the link is reachable at the arrival', await station.isVisible());
check(
  'it opens the project safely in a new tab',
  (await station.getAttribute('target')) === '_blank' &&
    ((await station.getAttribute('rel')) ?? '').includes('noopener') &&
    ((await station.getAttribute('href')) ?? '').startsWith('http'),
  `href=${await station.getAttribute('href')} rel=${await station.getAttribute('rel')}`,
);
check(
  'it is big enough to hit on a phone',
  await station.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.height >= 44 && r.width >= 96;
  }),
);
check(
  'the computer itself is not the click target',
  (await page.locator('.monitor__well a, .pscreen a').count()) === 0,
);

// --- the route past the platform -----------------------------------------
// Five canonical anchors, in order, and never a camera that goes through a
// portfolio screen. Under reduced motion they are five composed scenes, which
// is the state this audit runs in.
// The plates are lazy, and under reduced motion the legs are five scenes in
// flow — so walk down to them the way a reader would before asking whether
// they arrived.
await page.locator('.leg[data-anchor="01"]').scrollIntoViewIfNeeded();
await settleScroll(400);
for (const id of ['02', '03', '04', '05']) {
  await page.locator(`.leg[data-anchor="${id}"]`).scrollIntoViewIfNeeded();
  await settleScroll(250);
}
await page.waitForFunction(
  () => [...document.querySelectorAll('.leg__plate')].every((img) => img.complete),
  null,
  { timeout: 15000 },
);

const anchors = await page.$$eval('.leg', (legs) => legs.map((leg) => leg.dataset.anchor));
check('the route renders its five canonical anchors in order', anchors.join(' ') === '01 02 03 04 05', anchors.join(' '));
check(
  'every leg stands on its plate',
  (await page.locator('.leg__plate').count()) === 5 && (await page.locator('.leg__blank').count()) === 0,
);
check(
  'no plate is a broken image',
  await page.$$eval('.leg__plate', (imgs) => imgs.every((img) => img.naturalWidth > 0)),
);
check('the route is described for a screen reader', (await page.locator('#route-title').count()) === 1);

// The stop: the camera halts and the project is presented. The work itself is
// on the wall in the artwork, so what belongs here is the caption to it.
const stop = page.locator('.leg[data-anchor="02"] .stop');
check('the portfolio stop presents its project', (await stop.locator('.stop__title').innerText()) === 'TIMEMATIC');
check('the stop is readable where the camera has stopped', await stop.locator('.stop__title').isVisible());
check(
  'the stop hides its live link while no URL exists',
  (await stop.locator('.stop__live').count()) === 0,
);
check('the stop puts no second screen in front of the work', (await stop.locator('img, video').count()) === 0);

// The corridor names the studio's three disciplines, as its walls do.
const hall = page.locator('.leg[data-anchor="04"] .hall');
check('the corridor names the three disciplines', (await hall.locator('.hall__item').count()) === 3);
check('they are given in the language the site is written in', (await hall.locator('.hall__he').first().innerText()) === 'אסטרטגיה');

// The one rule the route cannot break: a website is a surface, never a door.
check(
  'no portfolio screen is a link or a doorway',
  (await page.locator('.leg a[href*="shaijewelry"], .leg__plate a').count()) === 0,
);

// --- showcases -----------------------------------------------------------
const showcases = await page.locator('.showcase').count();
check('the terrace keeps the project the route has not reached', showcases === 1, `count=${showcases}`);

// Watch project: no assets yet → typographic cover, no play button, no live link.
const watch = page.locator('.showcase', { hasText: 'TIMEMATIC' });
check('watch cover shows its subtitle', await watch.locator('.pvideo__cover-sub').isVisible());
check('watch has no play button while its video is missing', (await watch.locator('.pvideo__toggle').count()) === 0);
check('watch hides the live link while no URL exists', (await watch.locator('.showcase__live').count()) === 0);
check('watch shows no broken thumbnail img', (await watch.locator('.pvideo__thumb').count()) === 0);

// --- reduced motion: everything readable without scroll choreography -----
const msgVisible = await page.evaluate(() => {
  const el = document.querySelector('.city__title');
  return el ? getComputedStyle(el).opacity === '1' : false;
});
check('statement fully visible under reduced motion', msgVisible);

// --- light-world header flip ---------------------------------------------
await page.evaluate(() => document.getElementById('contact')?.scrollIntoView());
await settleScroll();
check('header flips to light chrome in the bright world', await page.evaluate(() => document.documentElement.classList.contains('is-light-world')));
await page.evaluate(() => window.scrollTo(0, 0));
await settleScroll();
check('header returns to dark chrome at the vault', await page.evaluate(() => !document.documentElement.classList.contains('is-light-world')));

// --- form ----------------------------------------------------------------
await page.evaluate(() => document.getElementById('contact')?.scrollIntoView());
await settleScroll(150);
await page.locator('.contact-form__submit').click();
await page.waitForTimeout(300);
check('empty submit shows an error summary', await page.locator('.contact-form__summary').isVisible());
const focused = await page.evaluate(() => document.activeElement?.getAttribute('autocomplete'));
check('focus lands on the first invalid field (name)', focused === 'name', `autocomplete=${focused}`);

// Valid submit — window.open is stubbed so no real WhatsApp tab opens.
await page.evaluate(() => {
  window.__opened = null;
  window.open = (url, target, feats) => {
    window.__opened = { url: String(url), target, feats };
    return null;
  };
});
await page.locator('input[autocomplete="name"]').fill('בדיקה בדיקתית');
await page.locator('input[autocomplete="tel"]').fill('050-1234567');
await page.locator('.contact-form__submit').click();
await page.waitForTimeout(400);
const opened = await page.evaluate(() => window.__opened);
check('valid submit hands off the enquiry', Boolean(opened?.url), opened?.url?.slice(0, 60));
check('handoff opens away from the page', opened?.target === '_blank' && String(opened?.feats).includes('noopener'));
check('success state is announced', await page.locator('.contact-form--done').isVisible());

// --- console health ------------------------------------------------------
check('no page errors during the run', problems.length === 0, problems.join(' | '));

await browser.close();
process.exit(failures === 0 ? 0 : 1);
