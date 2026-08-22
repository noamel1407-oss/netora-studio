/**
 * Smoke-tests the interactive behaviour that the experience depends on:
 * skip link, nav anchors, the two laptop showcases (placeholder fallbacks,
 * live links, play controls), form validation + focus handling, and the
 * light-world header flip.
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

// --- showcases -----------------------------------------------------------
const showcases = await page.locator('.showcase').count();
check('two project showcases render', showcases === 2, `count=${showcases}`);

// Watch project: no assets yet → typographic cover, no play button, no live link.
const watch = page.locator('.showcase', { hasText: 'TIMEMATIC' });
check('watch cover shows its subtitle', await watch.locator('.pvideo__cover-sub').isVisible());
check('watch has no play button while its video is missing', (await watch.locator('.pvideo__toggle').count()) === 0);
check('watch hides the live link while no URL exists', (await watch.locator('.showcase__live').count()) === 0);
check('watch shows no broken thumbnail img', (await watch.locator('.pvideo__thumb').count()) === 0);

// Jewellery project: poster exists, live link must be correct.
const jewelry = page.locator('.showcase', { hasText: 'SHAY JEWELRY' });
check('jewellery thumbnail renders', await jewelry.locator('.pvideo__thumb').isVisible());
const live = jewelry.locator('.showcase__live');
check('jewellery live link renders', (await live.count()) === 1);
check(
  'live link opens a new tab safely',
  (await live.getAttribute('target')) === '_blank' && ((await live.getAttribute('rel')) ?? '').includes('noopener'),
  `rel=${await live.getAttribute('rel')}`,
);

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
