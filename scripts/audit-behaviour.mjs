/**
 * Smoke-tests the interactive behaviour that accessibility depends on: skip
 * link, carousel controls (pointer + keyboard), form validation and focus
 * handling, and the laptop's poster fallback.
 *
 * Requires a server on :4173 — `npm run build && npm run preview` first.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'he-IL',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(`PAGEERROR ${e.message}`));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const check = (label, ok, detail = '') =>
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);

// --- skip link -----------------------------------------------------------
await page.keyboard.press('Tab');
const skip = await page.evaluate(() => {
  const el = document.activeElement;
  return { text: el?.textContent?.trim(), visible: el?.getBoundingClientRect().top ?? -999 };
});
check('skip link is first tab stop and visible', skip.text === 'דילוג לתוכן הראשי' && skip.visible >= 0, JSON.stringify(skip));

// --- carousel: arrows ----------------------------------------------------
const live = () => page.locator('[aria-live="polite"]').innerText();
const before = await live();
await page.locator('.reviews__arrow--next').click();
await page.waitForTimeout(400);
const afterNext = await live();
check('next arrow advances the carousel', before !== afterNext, `${before.trim()} -> ${afterNext.trim()}`);

await page.locator('.reviews__arrow--prev').click();
await page.waitForTimeout(400);
check('prev arrow returns to the first review', (await live()) === before);

// --- carousel: keyboard --------------------------------------------------
await page.locator('.reviews__stage').focus();
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(400);
check('ArrowLeft advances (RTL)', (await live()) !== before);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
check('ArrowRight goes back (RTL)', (await live()) === before);

// --- carousel: dots ------------------------------------------------------
await page.locator('.reviews__dot').nth(2).click();
await page.waitForTimeout(400);
check('dots jump to a review', (await live()).includes('3 מתוך'), (await live()).trim());

// --- form validation -----------------------------------------------------
await page.locator('.contact-form__submit').click();
await page.waitForTimeout(400);
const alertVisible = await page.locator('.contact-form__summary').isVisible();
const focused = await page.evaluate(() => document.activeElement?.getAttribute('autocomplete'));
const nameInvalid = await page.locator('input[autocomplete="name"]').getAttribute('aria-invalid');
const describedBy = await page.locator('input[autocomplete="name"]').getAttribute('aria-describedby');
const errorText = await page.locator(`#${describedBy}`).innerText().catch(() => '');
check('empty submit shows an alert summary', alertVisible);
check('focus moves to the first invalid field', focused === 'name', String(focused));
check('invalid field is marked aria-invalid', nameInvalid === 'true');
check('error text is linked via aria-describedby', errorText.length > 0, errorText);

// --- form: valid submit --------------------------------------------------
await page.fill('input[autocomplete="name"]', 'נועם ישראלי');
await page.fill('input[autocomplete="tel"]', '050-1234567');
await page.fill('input[type="email"]', 'not-an-email');
await page.locator('.contact-form__submit').click();
await page.waitForTimeout(400);
const emailInvalid = await page.locator('input[type="email"]').getAttribute('aria-invalid');
check('bad email is rejected', emailInvalid === 'true');

await page.fill('input[type="email"]', 'test@example.com');
const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
await page.locator('.contact-form__submit').click();
await popupPromise;
await page.waitForTimeout(600);
check('valid submit reaches the confirmation state', await page.locator('.contact-form--done').isVisible());

// --- video fallback ------------------------------------------------------
const laptop = await page.evaluate(() => {
  const img = document.querySelector('.laptop__screen img');
  return { poster: Boolean(img), alt: img?.getAttribute('alt')?.slice(0, 30) };
});
check('missing video falls back to a described still', laptop.poster, laptop.alt ?? '');

// --- headings ------------------------------------------------------------
const headings = await page.evaluate(() =>
  [...document.querySelectorAll('h1,h2,h3')].map((h) => `${h.tagName}: ${h.textContent.trim().slice(0, 34)}`),
);
console.log('\nheading outline:\n  ' + headings.join('\n  '));

console.log(problems.length ? `\nproblems:\n${problems.join('\n')}` : '\nno page errors');
await browser.close();
