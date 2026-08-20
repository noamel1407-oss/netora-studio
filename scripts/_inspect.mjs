import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'http://127.0.0.1:4173/';
await mkdir('tmp/shots', { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined,
});

async function clip(page, name, selector, scale = 1) {
  const box = await page.locator(selector).boundingBox();
  if (!box) return null;
  const session = await page.context().newCDPSession(page);
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: box.x, y: box.y + (await page.evaluate(() => window.scrollY)), width: box.width, height: box.height, scale },
  });
  await writeFile(`tmp/shots/${name}.png`, Buffer.from(data, 'base64'));
  return box;
}

async function metrics(page) {
  return page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top + window.scrollY),
        bottom: Math.round(r.bottom + window.scrollY),
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };
    return {
      docW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      hero: rect('.hero'),
      heroCopy: rect('.hero__copy'),
      heroOrb: rect('.hero__orb'),
      work: rect('#work'),
      workCopy: rect('.work__copy'),
      laptop: rect('.laptop'),
      laptopBody: rect('.laptop__body'),
      rock: rect('.laptop__rock'),
      reviews: rect('#reviews'),
      contact: rect('#contact'),
      contactOrb: rect('.contact__orb'),
      contactTitle: rect('.contact__title'),
      contactForm: rect('.contact__form'),
      footer: rect('#site-footer'),
      gapWorkReviews: (() => {
        const a = document.querySelector('#work');
        const b = document.querySelector('#reviews');
        if (!a || !b) return null;
        return Math.round(b.getBoundingClientRect().top - a.getBoundingClientRect().bottom);
      })(),
    };
  });
}

async function run(width, height, prefix, wait) {
  const page = await browser.newPage({ viewport: { width, height }, locale: 'he-IL' });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(wait);

  const ready = await page.evaluate(
    () => !document.querySelector('.netora-stage__placeholder')?.classList.contains('is-hidden'),
  );
  console.log(`${prefix}: placeholder still visible = ${ready}`);

  const m = await metrics(page);
  await writeFile(`tmp/shots/${prefix}-metrics.json`, JSON.stringify(m, null, 2));
  console.log(`${prefix} overflowX=${m.overflowX} gapWorkReviews=${m.gapWorkReviews}`);

  await page.locator('#work').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await clip(page, `${prefix}-work-section`, '#work');
  await clip(page, `${prefix}-laptop-zoom`, '.laptop', 2);

  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await clip(page, `${prefix}-contact-section`, '#contact');

  await page.close();
}

await run(1440, 900, 'd', 22000);
await run(390, 844, 'm', 16000);
await browser.close();
console.log('inspect done');
