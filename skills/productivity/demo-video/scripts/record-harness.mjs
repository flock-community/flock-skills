// STEPS=/path/to/steps.mjs must default-export:
//   async ({ page, caption, section, sleep, env, BASE }) => { ... }
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import fs from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
// Prefer the project's (cwd) Playwright; fall back to one installed near the harness or globally.
const req = createRequire(process.cwd() + '/');
function loadChromium() {
  for (const pkg of ['@playwright/test', 'playwright']) {
    try {
      const mod = req(req.resolve(pkg, { paths: [process.cwd(), HERE] }));
      if (mod.chromium) return mod.chromium;
    } catch { /* try next */ }
  }
  throw new Error(
    'Playwright not found. Install it (project: `npm i -D @playwright/test`, or global: ' +
    '`npm i -g playwright`), then `npx playwright install chromium`.',
  );
}
const chromium = loadChromium();

const env = {
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  VIDEO_DIR: process.env.VIDEO_DIR || '/tmp/screencast',
  STEPS: process.env.STEPS,
  SEGMENT: process.env.SEGMENT || '1',
  WIDTH: +(process.env.WIDTH || 1440),
  HEIGHT: +(process.env.HEIGHT || 900),
  SLOWMO: +(process.env.SLOWMO || 300),
  HEADLESS: process.env.HEADLESS !== '0',
  TIMEOUT: +(process.env.TIMEOUT || 20000),
  STORAGE_STATE: process.env.STORAGE_STATE, // reuse auth across segments: load if present, steps can save to it
  INJECT_CSS: process.env.INJECT_CSS, // CSS injected on every page load — e.g. flatten flickery modal backdrops
};
const VIEW = { width: env.WIDTH, height: env.HEIGHT };

const sleep = (page, ms) => page.waitForTimeout(ms);

const rand = (n) => (Math.random() * 2 - 1) * n;

// A visible pointer that tracks real mouse events, so Playwright-driven moves/clicks read as a
// person aiming a cursor (Chromium renders no pointer otherwise). Idempotent; re-run after nav.
async function ensureCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('__demo_cursor__')) return;
    const dot = document.createElement('div');
    dot.id = '__demo_cursor__';
    dot.style.cssText =
      'position:fixed;top:0;left:0;z-index:2147483646;width:24px;height:24px;' +
      'pointer-events:none;transition:transform 60ms linear;will-change:transform;' +
      'transform:translate(50vw,50vh);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))';
    dot.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none">' +
      '<path d="M5 2.5 L5 19.5 L9.6 15 L12.7 21.6 L15.2 20.5 L12.1 14 L18.6 14 Z" ' +
      'fill="#1b1b1b" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    const ring = document.createElement('div');
    ring.id = '__demo_ring__';
    ring.style.cssText =
      'position:fixed;top:0;left:0;z-index:2147483645;width:34px;height:34px;' +
      'margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #ffcc00;opacity:0;' +
      'pointer-events:none;transform:translate(50vw,50vh) scale(.3)';
    document.body.append(ring, dot);
    addEventListener(
      'mousemove',
      (e) => {
        dot.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`;
      },
      true,
    );
    addEventListener(
      'mousedown',
      (e) => {
        ring.style.transition = 'none';
        ring.style.transform = `translate(${e.clientX}px, ${e.clientY}px) scale(.3)`;
        ring.style.opacity = '.9';
        requestAnimationFrame(() => {
          ring.style.transition = 'transform .32s ease-out, opacity .32s ease-out';
          ring.style.transform = `translate(${e.clientX}px, ${e.clientY}px) scale(1.3)`;
          ring.style.opacity = '0';
        });
      },
      true,
    );
  });
}

const asLoc = (page, target) =>
  typeof target === 'string' ? page.locator(target) : target;

// Smooth-scroll a target to a comfortable spot and let the scroll settle — the "panning to keep
// the result visible" a person does. Default block 'center' so actions and results sit mid-frame.
async function scrollTo(page, target, opts = {}) {
  await asLoc(page, target)
    .evaluate(
      (el, block) => el.scrollIntoView({ behavior: 'smooth', block }),
      opts.block || 'center',
    )
    .catch(() => {});
  await page.waitForTimeout(opts.settle ?? 700);
}

// Place the pointer at the target (snap, not a slow traced glide — the CSS transition on the
// cursor element softens the jump). Keeps Playwright's real mouse and the visual cursor in sync.
async function moveTo(page, target, opts = {}) {
  await ensureCursor(page);
  const box = await asLoc(page, target).boundingBox();
  if (!box) return null;
  const x = box.x + box.width / 2 + rand(Math.min(6, box.width / 6));
  const y = box.y + box.height / 2 + rand(Math.min(4, box.height / 6));
  await page.mouse.move(x, y);
  return { x, y };
}

// Scroll into view → place the pointer → click (with the ring pulse). Replaces raw locator.click()
// for legible interaction; keeps Playwright's actionability waits (the trailing loc.click()).
async function click(page, target, opts = {}) {
  const loc = asLoc(page, target);
  if (opts.scroll !== false) await scrollTo(page, loc, opts);
  await moveTo(page, loc, opts);
  await page.waitForTimeout(opts.aim ?? 160);
  await loc.click();
  await page.waitForTimeout(90);
}

async function type(page, target, text, opts = {}) {
  await click(page, target, opts);
  const loc = asLoc(page, target);
  await loc.fill('');
  await loc.pressSequentially(String(text), { delay: opts.delay ?? 45 });
}

// Gradual wheel pan (no specific target) — several small ticks instead of one jump.
async function pan(page, dy, opts = {}) {
  const ticks = opts.ticks ?? 14;
  for (let i = 0; i < ticks; i++) {
    await page.mouse.wheel(0, dy / ticks);
    await page.waitForTimeout(opts.gap ?? 36);
  }
}

// Fixed bottom-center caption pill. The DOM is wiped on every full navigation,
// so this re-creates the element when missing — call it after each goto/route change.
async function caption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('__demo_caption__');
    if (!el) {
      el = document.createElement('div');
      el.id = '__demo_caption__';
      el.style.cssText = [
        'position:fixed', 'left:50%', 'bottom:28px', 'transform:translateX(-50%)',
        'z-index:2147483647', 'background:rgba(20,20,22,0.92)', 'color:#fff',
        'font:600 18px/1.4 -apple-system,Segoe UI,Roboto,sans-serif',
        'padding:12px 22px', 'border-radius:10px', 'max-width:82vw', 'text-align:center',
        'box-shadow:0 6px 24px rgba(0,0,0,0.35)', 'border-left:5px solid #ffcc00',
        'pointer-events:none',
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}

// Wrap a logical beat so one bad selector logs + skips instead of aborting the take.
async function section(name, fn) {
  try { await fn(); }
  catch (e) { console.error(`SECTION_FAIL[${name}]: ${e && e.message ? e.message : e}`); }
}

async function run() {
  if (!env.STEPS) { console.error('Set STEPS=/path/to/steps.mjs'); process.exit(2); }
  fs.mkdirSync(env.VIDEO_DIR, { recursive: true });
  const mod = await import(pathToFileURL(resolve(env.STEPS)).href);
  const script = mod.default || mod.script;
  if (typeof script !== 'function') {
    console.error('STEPS module must default-export an async function'); process.exit(2);
  }

  const launchArgs = (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean);
  const noSandbox = process.env.CHROMIUM_NO_SANDBOX === '1'
    || (typeof process.getuid === 'function' && process.getuid() === 0)
    || !!process.env.CI;
  if (noSandbox) launchArgs.push('--no-sandbox', '--disable-dev-shm-usage');
  const browser = await chromium.launch({ headless: env.HEADLESS, slowMo: env.SLOWMO, args: launchArgs });
  const ctxOpts = {
    viewport: VIEW,
    recordVideo: { dir: env.VIDEO_DIR, size: VIEW },
    deviceScaleFactor: 1,
  };
  if (env.STORAGE_STATE && fs.existsSync(env.STORAGE_STATE)) ctxOpts.storageState = env.STORAGE_STATE;
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  const video = page.video();
  page.setDefaultTimeout(env.TIMEOUT);
  page.on('load', () => ensureCursor(page).catch(() => {}));
  await page.mouse.move(env.WIDTH / 2, env.HEIGHT / 2);
  // Re-inject on every full load via page.evaluate, NOT addInitScript: that runs before the real
  // document and a <style> appended then gets discarded. SPA nav preserves it; page.goto drops it.
  if (env.INJECT_CSS) {
    const reinject = () =>
      page.evaluate((css) => {
        let s = document.getElementById('__sc_inject_css__');
        if (!s) { s = document.createElement('style'); s.id = '__sc_inject_css__'; document.head.appendChild(s); }
        s.textContent = css;
      }, env.INJECT_CSS).catch(() => {});
    page.on('load', reinject);
  }
  try {
    await script({
      page, caption, section, sleep, env, BASE: env.BASE_URL,
      click, moveTo, scrollTo, type, pan,
    });
  } catch (err) {
    console.error('SCREENCAST_ERROR:', err && err.message ? err.message : err);
  } finally {
    await context.close(); // flushes the video file — required, else webm is empty
    await browser.close();
  }
  // Report only THIS run's webm. Globbing VIDEO_DIR re-picks stale files from earlier
  // takes into the same dir; page.video().path() resolves to exactly the file just written.
  let files = [];
  if (video) {
    const p = await video.path().catch(() => null);
    if (p) files = [p];
  }
  if (files.length === 0) {
    files = fs.readdirSync(env.VIDEO_DIR)
      .filter((f) => f.endsWith('.webm'))
      .map((f) => `${env.VIDEO_DIR}/${f}`);
  }
  console.log('VIDEO_FILES=' + JSON.stringify(files));
}

run();
