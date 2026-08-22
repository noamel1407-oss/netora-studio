import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'http://127.0.0.1:4173/';
await mkdir('tmp/shots', { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function snap(page, name) {
  const session = await page.context().newCDPSession(page);
  const { data } = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(`tmp/shots/${name}.png`, Buffer.from(data, 'base64'));
}

async function shoot(width, height, prefix, wait) {
  const page = await browser.newPage({ viewport: { width, height }, locale: 'he-IL' });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(wait);
  await snap(page, `${prefix}-vault`);
  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await snap(page, `${prefix}-statement`);
  await page.locator('#work').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await snap(page, `${prefix}-work`);
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await snap(page, `${prefix}-contact`);
  await page.close();
}

await shoot(1440, 900, 'desktop', 5000);
await shoot(390, 844, 'mobile', 4000);
await browser.close();
console.log('shots written to tmp/shots');
