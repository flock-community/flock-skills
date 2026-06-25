// Render HTML cards/labels to PNG for branded intro/outro + chapter overlays.
// CARDS=/path/to/cards.json node "$SKILL_DIR/scripts/render-cards.mjs"  (run from the project root)
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname, isAbsolute, join } from 'node:path';
import fs from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
// Prefer the project's (cwd) Playwright; fall back to one installed near this script.
const req = createRequire(process.cwd() + '/');
function loadChromium() {
  for (const pkg of ['@playwright/test', 'playwright']) {
    try {
      const mod = req(req.resolve(pkg, { paths: [process.cwd(), HERE] }));
      if (mod.chromium) return mod.chromium;
    } catch { /* try next */ }
  }
  throw new Error(
    'Playwright not found. Run from the project root (or `npm i -D @playwright/test`), ' +
    'then `npx playwright install chromium`.',
  );
}

const manifestPath = process.env.CARDS || process.argv[2];
if (!manifestPath) { console.error('Set CARDS=/path/to/cards.json'); process.exit(2); }
const cfg = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const dir = cfg.dir || '.';
const width = cfg.width || 1080, height = cfg.height || 1920;
const abs = (p) => (isAbsolute(p) ? p : join(dir, p));

const launchArgs = (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean);
const noSandbox = process.env.CHROMIUM_NO_SANDBOX === '1'
  || (typeof process.getuid === 'function' && process.getuid() === 0)
  || !!process.env.CI;
if (noSandbox) launchArgs.push('--no-sandbox', '--disable-dev-shm-usage');

const chromium = loadChromium();
const browser = await chromium.launch({ args: launchArgs });
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
for (const c of cfg.cards) {
  await page.goto(pathToFileURL(abs(c.html)).href, { waitUntil: 'networkidle' });
  await page.screenshot({ path: resolve(abs(c.out)), omitBackground: !!c.transparent });
  console.log('rendered', c.out);
}
await browser.close();
