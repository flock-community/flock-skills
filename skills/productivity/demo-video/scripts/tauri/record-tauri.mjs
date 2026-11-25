#!/usr/bin/env node
// Record a demo of a Tauri app's native window: launch the app binary with its embedded WebDriver
// server (tauri-plugin-wdio-webdriver), drive the webview through WebdriverIO, and capture the
// window's screen region with ffmpeg (macOS: avfoundation, Linux: x11grab on Xvfb or $DISPLAY).
//
// Env:
//   APP_BIN       the app binary built WITH the WebDriver plugin (required)
//   APP_ENV       JSON object of extra env for the app, e.g. '{"MY_APP_DEMO_URL":"http://127.0.0.1:5179/"}'
//   REQUIRE_IN_BIN  a string that must occur in APP_BIN before it is launched (the demo env var name), so a
//                 binary built without the demo path is never started. Strongly recommended.
//   DENY_PORTS    comma-separated ports that must not appear in APP_ENV values (default 8080)
//   STEPS         steps module (default-exports async fn) (required)
//   OUT           output video, lossless H.264 in .mkv (default ./tauri-demo.mkv)
//   WIDTH/HEIGHT  window size in CSS px (default 1280x860), X/Y window position (default 40/60)
//   FPS           capture rate (default 30)
//   WD_PORT       WebDriver port (default 4445)
//   SCREEN        macOS avfoundation screen device index (default: the first "Capture screen")
//   XVFB          Linux: 1 = start a private Xvfb (default when $DISPLAY is unset)
//   CAPTION_ACCENT  caption bar accent (default #ffcc00)
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { remote } from 'webdriverio';

const env = {
  APP_BIN: process.env.APP_BIN,
  APP_ENV: JSON.parse(process.env.APP_ENV || '{}'),
  REQUIRE_IN_BIN: process.env.REQUIRE_IN_BIN || '',
  DENY_PORTS: (process.env.DENY_PORTS ?? '8080').split(',').filter(Boolean),
  STEPS: process.env.STEPS,
  OUT: resolve(process.env.OUT || 'tauri-demo.mkv'),
  WIDTH: +(process.env.WIDTH || 1280),
  HEIGHT: +(process.env.HEIGHT || 860),
  X: +(process.env.X || 40),
  Y: +(process.env.Y || 60),
  FPS: +(process.env.FPS || 30),
  WD_PORT: +(process.env.WD_PORT || 4445),
  ACCENT: process.env.CAPTION_ACCENT || '#ffcc00',
};
const mac = process.platform === 'darwin';
const die = (msg) => { console.error(msg); process.exit(2); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- preflight: never launch something that could start a real/private stack -------------------
if (!env.APP_BIN || !fs.existsSync(env.APP_BIN)) die(`APP_BIN not found: ${env.APP_BIN}`);
if (!env.STEPS) die('Set STEPS=/path/to/steps.mjs');
for (const [k, v] of Object.entries(env.APP_ENV)) {
  for (const p of env.DENY_PORTS) {
    if (new RegExp(`:${p}(\\D|$)`).test(String(v))) die(`APP_ENV ${k}=${v} uses denied port ${p}`);
  }
}
if (env.REQUIRE_IN_BIN && !fs.readFileSync(env.APP_BIN).includes(env.REQUIRE_IN_BIN)) {
  die(`"${env.REQUIRE_IN_BIN}" is not in ${env.APP_BIN}: it was built without the demo/WebDriver feature. Not launching it.`);
}
const wdUp = () => fetch(`http://127.0.0.1:${env.WD_PORT}/status`).then((r) => r.ok, () => false);
if (await wdUp()) die(`:${env.WD_PORT} already answers; another app holds the WebDriver port. Set WD_PORT.`);

// --- display (Linux) ---------------------------------------------------------------------------
const children = [];
let display = process.env.DISPLAY;
if (!mac && (process.env.XVFB === '1' || !display)) {
  display = ':99';
  const xvfb = spawn('Xvfb', [display, '-screen', '0', '1920x1200x24', '-nolisten', 'tcp'], { stdio: 'ignore' });
  children.push(xvfb);
  await wait(800);
}

// --- macOS: one throwaway frame, so a screen-capture consent prompt shows before the take, not in it
if (mac) {
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'avfoundation', '-pixel_format', 'uyvy422',
      '-i', `${macScreen()}:none`, '-frames:v', '1', '-f', 'null', '-'], { stdio: 'pipe', timeout: 20000 });
  } catch (e) {
    die(`screen capture failed; grant Screen Recording to this terminal app and answer any prompt, then re-run.\n${e.stderr ?? e.message}`);
  }
}

// --- launch the app ------------------------------------------------------------------------------
const app = spawn(env.APP_BIN, [], {
  env: {
    ...process.env, ...env.APP_ENV, TAURI_WEBDRIVER_PORT: String(env.WD_PORT),
    ...(display && !mac ? { DISPLAY: display } : {}),
  },
  stdio: ['ignore', 'inherit', 'inherit'],
});
children.push(app);
let appExited = false;
app.on('exit', (code) => { appExited = true; console.error(`app exited (${code})`); });
const cleanup = () => { for (const c of children.reverse()) c.exitCode === null && c.kill('SIGTERM'); };
process.on('SIGINT', () => { cleanup(); process.exit(130); });

const started = Date.now();
while (!(await wdUp())) {
  if (appExited) { cleanup(); die('the app exited before its WebDriver server answered'); }
  // A binary without the plugin never answers. Kill it rather than leave it running its normal startup.
  if (Date.now() - started > 60000) { cleanup(); die(`no WebDriver server on :${env.WD_PORT} after 60s`); }
  await wait(250);
}

const browser = await remote({
  hostname: '127.0.0.1', port: env.WD_PORT, capabilities: {}, logLevel: 'warn',
});
await browser.setWindowRect(env.X, env.Y, env.WIDTH, env.HEIGHT).catch((e) => console.error('setWindowRect:', e.message));
await browser.waitUntil(() => browser.execute(() => document.readyState === 'complete'), { timeout: 30000 });

// --- in-page helpers (pointer, captions); WebDriver clicks send no mouse events, so the pointer is moved explicitly
async function ensureOverlay() {
  await browser.execute((accent) => {
    if (document.getElementById('__demo_cursor__')) return;
    const dot = document.createElement('div');
    dot.id = '__demo_cursor__';
    dot.style.cssText =
      'position:fixed;top:0;left:0;z-index:2147483646;width:24px;height:24px;pointer-events:none;' +
      'transition:transform 220ms ease-out;will-change:transform;transform:translate(50vw,50vh);' +
      'filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))';
    dot.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none">' +
      '<path d="M5 2.5 L5 19.5 L9.6 15 L12.7 21.6 L15.2 20.5 L12.1 14 L18.6 14 Z" ' +
      'fill="#1b1b1b" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    const ring = document.createElement('div');
    ring.id = '__demo_ring__';
    ring.style.cssText =
      'position:fixed;top:0;left:0;z-index:2147483645;width:34px;height:34px;margin:-17px 0 0 -17px;' +
      `border-radius:50%;border:2px solid ${accent};opacity:0;pointer-events:none`;
    const cap = document.createElement('div');
    cap.id = '__demo_caption__';
    cap.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:28px', 'transform:translateX(-50%)', 'z-index:2147483647',
      'background:rgba(20,20,22,0.92)', 'color:#fff', 'font:600 18px/1.4 -apple-system,Segoe UI,Roboto,sans-serif',
      'padding:12px 22px', 'border-radius:10px', 'max-width:82vw', 'text-align:center',
      'box-shadow:0 6px 24px rgba(0,0,0,0.35)', `border-left:5px solid ${accent}`, 'pointer-events:none',
      'display:none',
    ].join(';');
    document.body.append(ring, dot, cap);
  }, env.ACCENT);
}

// Region capture records whatever covers the window, so put the app back in front before each beat (macOS).
const RAISE = `tell application "System Events" to set frontmost of (first process whose unix id is ${app.pid}) to true`;
const raise = () => { if (mac) spawn('osascript', ['-e', RAISE], { stdio: 'ignore' }).on('error', () => {}); };

const el = (target) => (typeof target === 'string' ? browser.$(target) : target);
const sleep = (ms) => wait(ms);

async function caption(text) {
  raise();
  await ensureOverlay();
  await browser.execute((t) => {
    const c = document.getElementById('__demo_caption__');
    c.textContent = t;
    c.style.display = t ? 'block' : 'none';
  }, text);
}

async function scrollTo(target, opts = {}) {
  const e = await el(target);
  await e.waitForExist({ timeout: opts.timeout ?? 10000 });
  await browser.execute((node, block) => node.scrollIntoView({ behavior: 'smooth', block }), e, opts.block || 'center');
  await sleep(opts.settle ?? 600);
}

async function moveTo(target) {
  await ensureOverlay();
  const e = await el(target);
  return browser.execute((node) => {
    const r = node.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    document.getElementById('__demo_cursor__').style.transform = `translate(${x - 4}px, ${y - 2}px)`;
    return { x, y };
  }, e);
}

async function pulse({ x, y }) {
  await browser.execute((x, y) => {
    const ring = document.getElementById('__demo_ring__');
    ring.style.transition = 'none';
    ring.style.transform = `translate(${x}px, ${y}px) scale(.3)`;
    ring.style.opacity = '.9';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ring.style.transition = 'transform .32s ease-out, opacity .32s ease-out';
      ring.style.transform = `translate(${x}px, ${y}px) scale(1.3)`;
      ring.style.opacity = '0';
    }));
  }, x, y);
}

// Scroll into view → glide the pointer → pulse → click.
async function click(target, opts = {}) {
  raise();
  const e = await el(target);
  await e.waitForClickable({ timeout: opts.timeout ?? 10000 });
  if (opts.scroll !== false) await scrollTo(e, opts);
  const at = await moveTo(e);
  await sleep(opts.aim ?? 320);
  await pulse(at);
  await e.click();
  await sleep(120);
}

async function type(target, text, opts = {}) {
  const e = await el(target);
  await click(e, opts);
  await e.clearValue();
  for (const ch of String(text)) { await e.addValue(ch); await sleep(opts.delay ?? 45); }
}

async function pan(dy, opts = {}) {
  await browser.execute((dy) => window.scrollBy({ top: dy, behavior: 'smooth' }), dy);
  await sleep(opts.settle ?? 700);
}

async function section(name, fn) {
  try { await fn(); } catch (e) { console.error(`SECTION_FAIL[${name}]: ${e?.message ?? e}`); }
}

// --- capture region --------------------------------------------------------------------------------
const rect = await browser.getWindowRect(); // outer window, CSS px (title bar included)
const scale = mac ? await browser.execute(() => window.devicePixelRatio) : 1;
const even = (n) => Math.round(n) - (Math.round(n) % 2);
const crop = { x: even(rect.x * scale), y: even(rect.y * scale), w: even(rect.width * scale), h: even(rect.height * scale) };
console.error(`window ${rect.width}x${rect.height}@${rect.x},${rect.y} css, scale ${scale}, capture ${crop.w}x${crop.h}`);

function macScreen() {
  if (process.env.SCREEN) return process.env.SCREEN;
  let out = '';
  try { execFileSync('ffmpeg', ['-hide_banner', '-f', 'avfoundation', '-list_devices', 'true', '-i', ''], { stdio: 'pipe' }); }
  catch (e) { out = String(e.stderr); }
  const m = out.match(/\[(\d+)\] Capture screen 0/);
  if (!m) die('no avfoundation "Capture screen 0"; set SCREEN= (ffmpeg -f avfoundation -list_devices true -i "")');
  return m[1];
}

if (mac) {
  try { execFileSync('osascript', ['-e', RAISE], { stdio: 'ignore' }); }
  catch { console.error('could not raise the window (grant Accessibility to the terminal); make sure nothing covers it'); }
}

const input = mac
  ? ['-f', 'avfoundation', '-pixel_format', 'uyvy422', '-capture_cursor', '0', '-framerate', String(env.FPS), '-i', `${macScreen()}:none`]
  : ['-f', 'x11grab', '-draw_mouse', '0', '-framerate', String(env.FPS), '-video_size', `${crop.w}x${crop.h}`,
    '-i', `${display}+${crop.x},${crop.y}`];
const vf = mac ? ['-vf', `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`] : [];
fs.rmSync(env.OUT, { force: true });
const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...input, ...vf,
  '-c:v', 'libx264', '-preset', 'ultrafast', '-qp', '0', '-pix_fmt', 'yuv444p', env.OUT],
{ stdio: ['pipe', 'inherit', 'inherit'] });
children.push(ffmpeg);
await sleep(1200); // ffmpeg needs a moment before its first frame

// --- run the steps -----------------------------------------------------------------------------------
await ensureOverlay();
const mod = await import(pathToFileURL(resolve(env.STEPS)).href);
const script = mod.default;
try {
  await script({ browser, $: (s) => browser.$(s), caption, section, sleep, click, type, scrollTo, moveTo, pan, env });
} catch (e) {
  console.error('SCREENCAST_ERROR:', e?.message ?? e);
} finally {
  ffmpeg.stdin.end('q'); // 'q' finalizes the file; a kill would leave it truncated
  await new Promise((r) => ffmpeg.on('exit', r));
  await browser.deleteSession().catch(() => {});
  cleanup();
}
const size = fs.existsSync(env.OUT) ? fs.statSync(env.OUT).size : 0;
if (!size) die(`no video written to ${env.OUT} (macOS: grant Screen Recording to the terminal app)`);
console.log(`VIDEO_FILE=${env.OUT}`);
