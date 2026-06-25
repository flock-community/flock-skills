# demo-video — reference

## The `-qp` flicker trap (read this)

Converting a screen-recording webm (Playwright `video.webm`, VP8) to H.264 mp4 can make large **flat UI areas** (solid form/page background) pulse/flicker, often periodic (~0.5s), when something tiny changes on a fixed cadence — e.g. a blinking text caret (~530ms).

**Cause:** under `-crf`, x264 picks a fresh per-frame QP from frame complexity. A small periodic change shifts the whole-frame QP and re-quantizes the flat background each time → visible pulsing. The source VP8 webm doesn't show it; the CRF re-encode introduces it.

**Fix:** constant quantizer + disable adaptive bit reallocation so every frame quantizes flat areas identically:

```bash
ffmpeg -i in.webm -c:v libx264 -preset slow -qp 16 \
  -x264-params "aq-mode=0:scenecut=0:keyint=600:no-mbtree=1" \
  -pix_fmt yuv420p -movflags +faststart -an out.mp4
```

- `QP=16` ≈ visually lossless for UI. `QP=0` = true lossless, the guaranteed-clean fallback if any pulsing remains.
- `-crf` = constant *quality*, varying QP → the QP variation is what pulses flat regions. `-qp` = constant QP → flat areas stable frame-to-frame.
- mp4/H.264 is the safe cross-platform share format; **webm has no native iOS support** (won't play inline in Signal/iMessage on iPhone).

`scripts/to-mp4.sh` bakes all of this in (single input or N-input concat). Prefer it over hand-writing ffmpeg so the trap can't recur.

## Flicker the `-qp` fix doesn't cover

`-qp` stops the *transcode* from pulsing flat areas. If something still seems to flicker, diagnose **in this order** — in practice the visible culprit is usually the player, not the file:

**1. Check the real player first — the QuickTime red herring.** A clean mp4 can *look* like it flickers **in QuickTime specifically**, while the source webm is clean and the same mp4 in Signal / a browser is fine. That's a QuickTime H.264 rendering artifact, not encoded in. **Open the file in the actual share target before changing anything.** `to-mp4.sh` tags bt709 via `setparams`, which is the real fix here; don't rabbit-hole past that.

**2. Then measure the source.** Only if there's *visible* shimmer in the webm itself (not just in QuickTime) is it worth chasing. Measure per-frame diff energy in a region that *should* be static:
```bash
ffmpeg -ss <t> -t 0.8 -i V -vf "crop=200:200:<x>:<y>,tblend=all_mode=difference,\
  signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1 | grep -o 'YAVG=[0-9.]*'
```
Near-zero = stable; periodic spikes = flicker. Run on the webm and the mp4 to localize the stage (mean-luma `YAVG` alone misses it — localized blocks pulse while the mean holds, so diff against the previous frame). Note the trap: a region can show a small non-zero diff (e.g. ~0.05/255) that is real VP8 dither yet **sub-perceptible** — if the webm looks clean to the eye, it is clean enough; don't "fix" a number you can't see.

**3. Last resort — flatten semi-transparent overlays.** A modal backdrop (`rgba(0,0,0,.5)`) or soft drop-shadow is a large **mid-tone** region VP8 re-dithers; solid flat colours quantize stably. If step 2 confirms *visible* shimmer there, make it solid during recording: `INJECT_CSS='.MuiBackdrop-root{background-color:#1b1b1b !important}.MuiDialog-paper,.MuiPopover-paper{box-shadow:none !important}'` (any framework — any big semi-transparent/gradient region is a dither risk on camera). It also makes dialogs pop (clearer triggers), so it can be worth it on those merits — but it's a visual change (opaque vs dimmed-page backdrop), not a mandatory flicker fix.

## Navigation, CSS injection, legible actions

**Navigate in-app (SPA), not `page.goto`.** A hard `goto` reloads the document: a white flash that reads as restless/jumpy, *and* it wipes any injected `<style>` and the caption pill. Clicking the app's own nav (menu/links → `history.push`) is instant, no flash, and preserves injected state. Reserve `goto` for the first entry / login; after that, drive the real UI.

**Inject persistent CSS the reliable way.** Set `INJECT_CSS=` and the harness re-injects on every `load` via `page.evaluate`. Do **not** use `addInitScript` to append a `<style>` — it runs before the real document and the element is silently discarded (the style never applies; you'll see no error). With SPA nav the injected style survives the whole take; a `goto` reload drops it and the harness re-adds it on load.

**Make the triggering action visible.** Viewers lose the thread when a dialog "just appears". Before each modal/dialog: caption the action *and* show the click — `caption(page,'Click "Add" to create an event')` then click; `caption(page,'Open the event')` then click the row. `slowMo` spaces the click so it reads. A solid opaque backdrop (above) also makes a dialog's appearance an obvious transition.

**Pace for calm.** Fewer full-page trips; combine related beats into one view (e.g. show a read-only summary *and then* change a field in the **same** dialog instead of reopening); hold longer on a settled result than during an action.

## Concat recipe (multi-segment)

`to-mp4.sh out.mp4 a.webm b.webm [...]` normalizes each input then concats in one pass:

```bash
ffmpeg -i a.webm -i b.webm -filter_complex \
 "[0:v]fps=25,scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];\
  [1:v]fps=25,scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];\
  [v0][v1]concat=n=2:v=1[v]" -map "[v]" \
 -c:v libx264 -preset slow -qp 16 -x264-params "aq-mode=0:scenecut=0:keyint=600:no-mbtree=1" \
 -pix_fmt yuv420p -movflags +faststart -an out.mp4
```

Normalizing fps/scale/sar before concat avoids judder when segments differ. Env overrides on the script: `QP=`, `FPS=`, `W=`, `H=`.

## GIF recipe & tradeoffs

`scripts/to-gif.sh out.gif in.webm [fps=15] [width=960]` does two-pass palettegen/paletteuse (far better than a naive single pass):

```bash
ffmpeg -i in.webm -vf "fps=15,scale=960:-1:flags=lanczos,palettegen=stats_mode=full" pal.png
ffmpeg -i in.webm -i pal.png -lavfi \
  "fps=15,scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" -loop 0 out.gif
```

GIF only for short (≤10–15s) clips / autoplay-inline contexts. It sidesteps the `-qp` flicker (no inter-frame quantization) but the 256-color palette bands gradients and brand chrome and softens text; long/high-res GIFs balloon past embed limits (GitHub ~10MB). For full UI walkthroughs use mp4.

## Frame-verify

`scripts/verify-frames.sh video.mp4 [outdir=/tmp/screencast-frames] [n=12]` extracts ~n evenly-spaced PNGs. **Read the PNGs** and look for: flat-area flicker (compare adjacent flat frames), blank/half-loaded pages, caption overlapping a control, UI cut off at the viewport edge, the wrong page in frame. Never ship a cut without eyeballing frames — selectors silently miss and `section()` swallows the error.

## The record harness

`scripts/record-harness.mjs` is the engine; you rarely edit it. It:
- launches headless chromium with `slowMo` (spaces clicks so the video reads),
- records webm at the viewport size via `recordVideo` (1440×900 default),
- imports your steps module from `STEPS=` and runs it with `{ page, caption, section, sleep, env, BASE, click, type, scrollTo, moveTo, pan }`,
- renders a **visible pointer** (Chromium draws none) that tracks the real mouse, plus a click-ring pulse — injected on every `load`,
- `context.close()` in `finally` to **flush the video** (skip this and the webm is empty/0-byte),
- prints `VIDEO_FILES=[…]` with **this run's** path (from `page.video().path()`, not a dir glob — re-recording into the same `VIDEO_DIR` won't pick up a stale take).

### Natural driving helpers
Use these instead of raw `locator.click()` so the take reads as a person, not a script:
- `click(page, target, opts?)` — smooth-scroll the target into view (`opts.block`, default `'center'`; `opts.scroll:false` to skip), **place** the pointer on it (a snap, not a slow traced glide — slow glides look robotic), pulse the ring, then `loc.click()` (so Playwright's actionability waits still apply). `opts.aim` (default 160ms) is the pre-click pause.
- `type(page, target, text, opts?)` — click then `pressSequentially` with `opts.delay` (default 45ms).
- `scrollTo(page, target, opts?)` — `scrollIntoView({behavior:'smooth', block})` then settle (`opts.settle`, default 700ms). Use it to bring a *result* into frame before the caption lands on it.
- `moveTo(page, target, opts?)` — just place the pointer (no click). `pan(page, dy, opts?)` — gradual wheel scroll in `opts.ticks` steps.

`target` is a CSS string or a Locator. The biggest "natural" lever isn't the cursor though — it's **pacing for causality**: caption the cause → act → pause → `scrollTo` the consequence into frame → hold ≥2s (≥3s for a hero change) so the viewer registers what changed and why.

Env: `BASE_URL`, `VIDEO_DIR`, `STEPS` (required), `SEGMENT` (free-form, read in steps via `env.SEGMENT`), `WIDTH`, `HEIGHT`, `SLOWMO`, `HEADLESS=0` to watch, `TIMEOUT`, `STORAGE_STATE` (reuse auth across segments — load if the file exists, steps can save to it to skip re-login), `INJECT_CSS` (CSS re-injected on every load — e.g. flatten flickery modal backdrops), `CHROMIUM_NO_SANDBOX=1` (add `--no-sandbox --disable-dev-shm-usage` for containers/cloud; auto-on as root or when `CI` is set), `CHROMIUM_ARGS` (extra space-separated Chromium flags).

### Caption bar
A fixed bottom-center pill (`#__demo_caption__`, brand accent left border). The DOM is wiped on every full navigation, so `caption()` re-creates the element if missing — **call it again after each `page.goto`/route change**.

### MUI helper snippets (for Material-UI apps)
Drop these into a steps module when the app uses MUI (selects/date pickers aren't plain `<select>`):

```js
// open the FormControl containing `controlText`, pick the option matching `optionRe`
async function pickSelect(page, controlText, optionRe) {
  const ctrl = page.locator('.MuiFormControl-root').filter({ hasText: controlText }).first();
  await ctrl.getByRole('combobox').click();
  await page.waitForTimeout(350);
  await page.getByRole('option', { name: optionRe }).first().click();
  await page.waitForTimeout(350);
}
async function fillDate(page, label, dd, mm, yyyy) {
  const s = `${String(dd).padStart(2,'0')}-${String(mm).padStart(2,'0')}-${yyyy}`;
  const input = page.getByLabel(label, { exact: true });
  await input.click(); await input.fill(s); await input.press('Tab');
  await page.waitForTimeout(250);
}

// In-app drawer/menu navigation (SPA) — no reload flash, and any INJECT_CSS survives.
async function menuNav(page, itemRe) {
  await page.getByRole('button', { name: 'Menu' }).click();          // hamburger / nav opener
  await page.waitForTimeout(900);                                    // let the drawer settle
  await page.locator('.MuiDrawer-root').getByRole('button', { name: itemRe }).click();
  await page.waitForLoadState('networkidle');
}
```

For MUI apps, flatten the flickery modal backdrop at record time: `INJECT_CSS='.MuiBackdrop-root{background-color:#1b1b1b !important}.MuiDialog-paper,.MuiPopover-paper{box-shadow:none !important}'`.

## Multi-segment design

When one beat needs UI the shipped build doesn't mount (e.g. an editable view gated behind a flag), split into segments:
1. Record **segment 1** against the real shipped build (`SEGMENT=1`, `VIDEO_DIR=/tmp/sc-seg1`).
2. Temporarily flip the gate (vite/HMR or a local edit), record **segment 2** (`SEGMENT=2`, different `VIDEO_DIR`), then **revert the edit** so the worktree stays clean.
3. Concat with `to-mp4.sh out.mp4 seg1.webm seg2.webm`.
Keep demo-only edits (test-data enrichment, build flags) on a throwaway branch — never merge them.

## Native / canvas apps (Compose, Flutter, games) — Playwright can't drive them

Compose Multiplatform / Flutter / Unity / SwiftUI-canvas render to a single `<canvas>` or native surface: **no DOM**, so `getByRole`/`getByText` and every harness helper no-op. Don't try to drive the app UI with Playwright.

- Drive the app with the platform's UI-test runner and screen-record the device framebuffer:
  - **iOS sim**: start `xcrun simctl io <udid> recordVideo --codec h264 --force seg.mov` in the background, run the flow (Maestro / XCUITest), then `kill -INT` the recorder to finalize — SIGKILL/SIGTERM corrupts the mov. Records the screen only (no window chrome). Keep it all in one shell call so the PID is in scope: `rec & PID=$!; maestro ...; kill -INT $PID; wait $PID`.
  - **Android emulator**: `adb shell screenrecord` (3-min cap — loop for longer).
- Only the genuinely-web parts (a Mailpit inbox, an admin page, a confirm link) get the Playwright harness. Record those as a **separate segment**, then composite. Segments with identical on-screen data can be reused across re-records — re-shoot only the segment that changed.
- **Launch overhead varies**: Maestro `launchApp` adds ~12–18s of springboard + splash before the app's first screen, and the offset differs every run. Don't hardcode the trim — after recording, sample frames (`ffmpeg -ss N -i seg.mov -frames:v 1 f.png`) to find when the first app screen lands, then `-ss` to just before it.
- **Mixed orientation** (portrait phone + landscape browser): normalize everything to one portrait canvas (e.g. `1080x1920`) with `scale=...:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=<brand>`. `to-mp4.sh`'s NORM already pads each input to the target size, so concat absorbs differing input sizes; or pad each segment yourself onto a brand-colored canvas before concat.

## Branded intro/outro + chapter cards (cheap, high-impact polish)

Bookend the demo with an intro/outro card and label each chapter. Two rules make it look intentional rather than stock:
1. **One canvas everywhere.** Use the same background for the cards *and* the per-segment letterbox/pad (`pad=...:color=<bg>`). That continuity is what makes cuts read as one piece, not stitched clips.
2. **Use the app's real identity.** Pull the actual logo (`$server/static/logo.png` or a repo asset), accent colors from the real theme, and a rounded system font (`ui-rounded`) — not generic title-slide styling.

Don't reach for `drawtext` — Homebrew ffmpeg 8.x ships without libfreetype (`No such filter: 'drawtext'`), and HTML/CSS gives better kerning + the logo for free. Author each card/label as a small HTML file and screenshot them with **`scripts/render-cards.mjs`** (full-frame cards opaque; chapter labels a transparent pill via `omitBackground`, positioned top/bottom):

```json
// cards.json  →  CARDS=cards.json node scripts/render-cards.mjs   (run from project root)
{ "width": 1080, "height": 1920, "dir": "/tmp/demo/cards",
  "cards": [ { "html": "intro.html", "out": "intro.png" },
             { "html": "lbl1.html",  "out": "lbl1.png", "transparent": true } ] }
```

Composite:
- **Intro/outro from a still** — `-loop 1 -t 2.6 -i intro.png -vf "fps=30,fade=t=in:st=0:d=0.4,fade=t=out:st=2.2:d=0.4"`. Keep cards ~2.5s with 0.4s fades.
- **Chapter label** timed to a segment's first beat — overlay the transparent PNG: `[seg][lbl]overlay=0:0:enable='lt(t\,3)'` (pill shows ~3s then gone).
- **Portrait recording onto the brand canvas** — `scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2:color=<bg>`.
- Normalize all pieces (cards + segments) to the same size/fps, `concat` them, then one final `-qp` encode (to-mp4.sh flags).

## Troubleshooting

- **Empty / 0-byte webm** → the context wasn't closed before reading; the harness handles this in `finally`. Don't read `VIDEO_DIR` before it prints `VIDEO_FILES=`.
- **Harness `sleep` no-ops / throws `waitForTimeout is not a function`** → it's `sleep(page, ms)`, not `sleep(ms)`. And steps receive only the harness's own config as `env` — read custom vars from `process.env`, not `env.MY_VAR`.
- **Showing a PDF in a recording** → headless Chromium *downloads* `file://` PDFs (`page.goto` errors "Download is starting"), it doesn't render them. Rasterize first: `pdftoppm -png -r 150 file.pdf out`, then show the PNG in a small HTML wrapper (`<img>` on a neutral bg) and record that page.
- **Caption missing after a step** → it was a full navigation; re-call `caption()` after the `goto`.
- **Flicker remains after `to-mp4.sh`** → rerun with `QP=0` (lossless). The source VP8 has minor inherent flat-area shimmer the transcode can't fully remove; recording at a *smaller* viewport raises quality-per-pixel.
- **Flicker only on modals/dialogs** → first confirm it's visible *outside* QuickTime (see below); if real in the webm, the semi-transparent backdrop is the mid-tone culprit — flatten it with `INJECT_CSS` (see "Flicker the `-qp` fix doesn't cover").
- **Flicker only in QuickTime** → a player artifact, not in the file. Check the same mp4 in Signal / a browser; if clean there, ship it. `to-mp4.sh` already tags bt709.
- **Injected CSS never applies** → you used `addInitScript`; switch to `INJECT_CSS` (harness injects per `load` via `page.evaluate`). Also confirm you're not losing it to a `page.goto` reload — navigate in-app instead.
- **Restless / flashing between screens** → full-page `page.goto`s; navigate in-app (SPA) so routes change without reload.
- **Selector flaky / beat missing from video** → check stderr for `SECTION_FAIL[name]`; `section()` logged and skipped it.
- **File too big to share** → lower viewport (`WIDTH`/`HEIGHT`) at record time, or accept `QP=18`; don't switch to `-crf` to shrink it.
- **Won't autoplay inline on iPhone** → it's webm; ship the mp4.

## Project specifics — pull at use-time, don't hardcode

Login creds, dev-data seeding steps, port(s) / `BASE_URL`, and the brand accent are per-project. Pull them at record time from your agent's persistent memory or a project notes file (saving them back once found), or ask the user. Never bake them into this skill or the harness — it stays project-agnostic so any running app can be recorded, by any agent.
