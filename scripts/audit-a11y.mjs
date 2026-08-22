/**
 * Runs axe-core over the built site at desktop and mobile widths.
 *
 * Requires a server on :4173 — `npm run build && npm run preview` first.
 * "needs-review" entries are cases axe cannot evaluate on its own (gradient
 * text, content layered over the canvas) and have to be judged by eye.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const BASE = 'http://localhost:4173';

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function audit(label, path, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: 'he-IL',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await page.addScriptTag({ content: axe });

  const results = await page.evaluate(async () => {
    // @ts-ignore
    return await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    });
  });

  console.log(
    `\n=== ${label} (${width}px) — ${results.violations.length} violations, ${results.incomplete.length} needs-review ===`,
  );
  for (const v of results.incomplete) {
    console.log(`  ? ${v.id}: ${v.nodes.length} node(s) — ${v.nodes[0]?.target.join(' ')}`);
  }
  for (const v of results.violations) {
    console.log(`  [${v.impact}] ${v.id}: ${v.help}`);
    for (const node of v.nodes.slice(0, 3)) {
      console.log(`      ${node.target.join(' ')}`);
      const msg = node.failureSummary?.split('\n').filter(Boolean).slice(1).join(' | ');
      if (msg) console.log(`      -> ${msg}`);
    }
  }
  await context.close();
}

await audit('home', '/', 1440, 900);
await audit('home', '/', 390, 844);
await audit('accessibility page', '/accessibility', 1440, 900);

await browser.close();
