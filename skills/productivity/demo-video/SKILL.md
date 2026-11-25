---
name: demo-video
description: Produce a polished, flicker-free demo video (or GIF) of a running web app by driving it with headless Playwright, injecting an on-screen caption bar, recording 1440x900 webm, transcoding to mp4, and frame-verifying. Use when the user wants to record an app demo, screencast, product walkthrough, or feature showcase of a live local/staging web app, or convert a screen recording to a shareable mp4/GIF. Also records a Tauri desktop app's native window (macOS or Linux; a WKWebView/WebKitGTK window that Playwright cannot drive) through an embedded WebDriver server and an ffmpeg screen capture, and puts a music bed from the project's own song under a finished demo mp4. Use for those too, for example "record the desktop app", "show the Tauri app" or "add music to the demo". Pulls project specifics (login, dev-data seeding, ports, demo launch env, song) from agent memory/notes or the user at use-time.
---

# demo-video — record a running web app

A repeatable pipeline: **record** the live app with Playwright (live caption bar) → optionally **concat** segments → **transcode** webm→mp4 flicker-free → **verify** frames. The app must already be running.

Agent- and environment-agnostic: it shells out to bundled scripts (no Claude-only tools), records **headless** so it runs on a laptop, server, container, or CI box, and needs only Node + Playwright (Chromium) + `ffmpeg` on `PATH` — step 1 checks for them.

**A Tauri desktop app?** Its native window has a DOM, but Playwright cannot attach to it. Follow [TAURI.md](TAURI.md): the app is launched with an embedded WebDriver server, driven with WebdriverIO, and its window region is captured with ffmpeg. Transcode, verify and deliver are the steps below.

**Not a web app?** Compose Multiplatform / Flutter / Unity / native apps render to a canvas with no DOM — Playwright can't drive them. Drive with the platform's UI-test runner (Maestro / XCUITest) + `simctl recordVideo` (iOS) or `adb screenrecord` (Android), and point the Playwright harness only at the genuinely-web parts (a Mailpit inbox, a confirm page) as separate segments to composite. See "Native / canvas apps" in [REFERENCE.md](REFERENCE.md).

## The one trap that matters: `-qp`, not `-crf`

Transcoding a UI screen recording with `-crf` makes flat areas (solid backgrounds, a blinking caret) **pulse/flicker** — x264 re-picks a per-frame QP from frame complexity and re-quantizes the flat background each frame. Use a **constant `-qp`** and disable adaptive bit reallocation. The bundled `scripts/to-mp4.sh` already bakes this in — use it instead of hand-writing ffmpeg. Full explanation: [REFERENCE.md](REFERENCE.md).

If something *still* seems to flicker after `-qp`, diagnose in order — most of it isn't the transcode: (1) **Check the real player first.** A clean mp4 can *look* flickery in **QuickTime** while the webm and the same mp4 in Signal/a browser are fine — a player artifact, not in the file (the bt709 tag in `to-mp4.sh` helps it). Verify in the actual share target before touching anything. (2) **Only then suspect the source:** VP8 lightly dithers large **semi-transparent/mid-tone overlays** (a modal backdrop), but it's usually sub-perceptible — confirm *visible* shimmer in the webm itself (not just QuickTime) before "fixing" it. Flattening the overlay to a solid colour (`INJECT_CSS`) does kill it, and makes dialogs pop, but as a flicker fix it's a last resort, not a default.

## Record calm, legible takes

- **Drive it like a person, via the injected helpers.** The harness passes `click`, `type`, `scrollTo`, `moveTo`, `pan` into your steps and renders a **visible pointer** (Chromium shows none otherwise) with a click-ring pulse. Prefer `click(page, locator)` over raw `locator.click()`: it smooth-scrolls the target into view, **places** the pointer on it (a snap — *not* a slow traced glide, which reads as robotic), pulses, then clicks. Use `type(page, locator, text)` for fields and `scrollTo`/`pan` to bring a result into view before the caption lands on it. Give `click` a *precise* target (a `getByRole`/`getByText` anchor, or a leaf element), not a broad container like `.MuiCard-root.first()`: the helper clicks the bounding-box center, which on a large wrapper lands in a gap and silently no-ops (a raw `.click()` may still hit a child, so it can pass a quick probe yet fail the real take). When a click "succeeds" but the next locator times out, suspect the click missed. Name your target precisely too: accessible-name and text matching are **case-insensitive substring** by default, so `getByRole('button', { name: 'Filters' })` also matches a "Clear filters" button and `getByText("You're in")` also matches "4 going · you're in" — pass `exact: true` for any short name or phrase that could be a substring of another.
- **Mocking the network of a PWA? Block the service worker** (`SERVICE_WORKERS=block`). `page.route()` does not reach a page a worker controls, so every mocked call sails past your fixture. It fails on a delay that will mislead you: the first load has no controller and works fine, so only the *second* navigation — often the reload your demo exists to show — comes up dead. Serving an empty `sw.js` is **not** enough; that script still registers and activates.
- **Prefer a fixture backend to a live stack, and record a production build.** Intercepting the app's API calls removes seed drift, per-session setup and the "did the data change under me" class of failure entirely — and it makes resetting state between segments structurally impossible to forget. Record the built app (e.g. `vite preview`), not the dev server: a hard reload on a dev server spends ~0.7s on a blank inter-document canvas while unbundled modules are re-served, which on video is indistinguishable from a state-loss bug.
- **Pace for causality — the #1 lever for "natural".** A human needs a beat after every *significant* change to register what happened and why. Structure each beat as **caption the cause → do the action → pause → reveal the result → hold**. After a state change that has a visible consequence (a value updates, rows clear, a total recomputes), hold **≥2s** (a hero/“aha” change ≥3s) with the *result on screen* — never cut away mid-transition. Rushing changes is what makes a take feel chaotic.
- **Keep the result in frame.** If a change happens off-screen (the control you toggled is far from the thing that changes), `scrollTo` the consequence into view and hold there — don't leave the viewer staring at the trigger while the effect scrolls past unseen.
- **Navigate in-app (SPA), not `page.goto`.** A hard reload flashes white (reads as restless) and wipes injected styles/caption/cursor. Click the app's own nav after the first entry/login.
- **Show what opens each window.** Caption the action and show the click before a dialog appears (`'Click "Add"…'` then click) — otherwise modals seem to materialize from nowhere.

## Demoing a change you can't see

Hit areas, spacing, z-order, focus rings: before and after are the same screenshot, so a straight take shows nothing. Record **two segments of the same app**, flipping the code between them (`git show origin/main:<file> > <file>` → record → `git checkout HEAD -- <file>`, and leave the tree clean), and annotate both from the live DOM with **`scripts/annotate.mjs`**: `box()` returns the rect it drew, so the same measured number lands in the on-screen label *and* the caption — the video becomes evidence rather than narration. Tap with `tapAt(page, x, y)`, a coordinate: the `click()` helper aims at an element's centre and so can never reproduce a near-miss. Reset app state before *every* segment (a take that mutates data leaves the next one opening in the wrong state), and end segment 1 on a `titleCard()` so the cut into segment 2's `page.goto` is dark-to-dark instead of a white flash. Full recipe and traps: [REFERENCE.md](REFERENCE.md) "Before/after".

## Pipeline

1. **Check the toolchain** — run `scripts/check-deps.sh` from the project root and install whatever it flags: Node.js, `ffmpeg`/`ffprobe`, and Playwright + its Chromium browser (`npx playwright install chromium`; it also removes older browser builds from the shared Playwright cache). The project has no Playwright and should not get one? Install it in a scratch folder (`npm init -y && npm i playwright`), pass that folder to `check-deps.sh`, and run the harness with that folder as working directory; the project's `package.json` stays untouched. Recording is **headless** by default, so a server / container / CI box is fine; if Chromium won't launch there, set `CHROMIUM_NO_SANDBOX=1` (auto-on as root or when `CI` is set).

2. **Pull project specifics — don't hardcode.** You need the login user/creds, dev-data seeding steps, the app's port / `BASE_URL`, and the brand accent colour (pass it as `ACCENT=#rrggbb`; it colours the caption border and the click ring). If your agent keeps persistent memory or a project notes file, recall them from there (and save them back once found); otherwise ask the user. Confirm the app is up (backend + frontend) before recording — **and that the server on that port is serving YOUR build.** On a shared or multi-session machine a dev-server port can belong to a *different* checkout/worktree, so you'd silently record the wrong code; verify the listener's working dir (`lsof -a -p <pid> -d cwd` — the `-a` is required; the pid comes from `lsof -nP -iTCP:<port> -sTCP:LISTEN -t`) or curl a served source file and grep your change. If the defaults are taken, boot your own backend + frontend on free ports and point the frontend dev-server's API proxy at your backend. Also check that the checkout itself is current (`git fetch`, then `git status -sb` shows how far it is behind): a build of a checkout that is months behind its remote records an app that no longer looks like that. When it is behind, record from a fresh worktree of the remote branch and leave the user's checkout alone. The worktree has no dependencies or build output: install and build there before serving it.

3. **Write the steps module** — copy `scripts/steps.template.mjs` next to your work and fill in the real selectors/captions. It default-exports `async ({ page, caption, section, sleep, env, BASE, click, type, scrollTo, moveTo, pan }) => {…}`. Wrap each logical beat in `section('name', …)` so one bad selector doesn't abort the whole take; narrate with `caption(page, '…')` (re-inject after every full navigation).

   **Probe before the full take.** When selectors are uncertain or the data is seed-dependent, run a throwaway headless script first (login → navigate → `page.screenshot` + dump `innerText`) and look at the shot: it confirms the selectors resolve AND that the seed actually has what the demo shows — a take against an empty table/list is the expensive failure. Probe the **state each selector will actually run in**, not just the landing screen: a control that appears only once the app is in some state (a "Clear filters" button, an edit-mode toolbar) can make an earlier selector ambiguous halfway through the take, so a probe that stops at the first screen passes and the real run dies on a strict-mode violation. Run the probe `.mjs` from the project root (or inside the worktree): ESM `import` ignores `NODE_PATH`, so node finds `playwright` only by walking up from the script's own directory — one parked in /tmp won't resolve it (the record-harness sidesteps this via `createRequire(cwd)`, so run *it* from the project root too).

4. **Record** — from the **project root** (so Playwright resolves), run the harness by its installed path. `$SKILL_DIR` is wherever this skill lives for your agent:
   ```bash
   STEPS=./my-demo.mjs BASE_URL=http://localhost:3001 VIDEO_DIR=/tmp/sc-seg1 \
     node "$SKILL_DIR/scripts/record-harness.mjs"
   ```
   It records 1440×900 webm and prints `VIDEO_FILES=[…]`. For multi-segment demos (e.g. one beat needs a temporary code flip), set a different `VIDEO_DIR` per segment and pass `SEGMENT=2`. On a sandboxed/cloud box add `CHROMIUM_NO_SANDBOX=1`. The harness prints nothing until the take ends, and each failing section waits the full `TIMEOUT` (20 s) first: a take with several bad selectors runs minutes longer than the storyboard. Read all its output (do not pipe it through `tail`), and use a lower `TIMEOUT=` for probes.

5. **Transcode (flicker-free)** — single take or concat several:
   ```bash
   scripts/to-mp4.sh out.mp4 /tmp/sc-seg1/video.webm                      # single
   scripts/to-mp4.sh out.mp4 /tmp/sc-seg1/a.webm /tmp/sc-seg2/b.webm      # concat
   START=3.1 scripts/to-mp4.sh out.mp4 /tmp/sc-seg1/video.webm            # without the first 3.1 s
   ```
   The recording starts when the page is created, so a take opens with a white frame and the app's loading state. Find the first good frame in step 6 and transcode again with `START=<s>`. Trim before adding music: the music is fitted to the video's length.

6. **Verify** — extract frames and actually look at them (catch flicker, blank pages, caption overlap, cut-off UI):
   ```bash
   scripts/verify-frames.sh out.mp4 /tmp/sc-frames 12
   ```
   Then Read the PNGs. Don't ship without eyeballing frames.

7. **Deliver** — move the mp4 to where the user expects it (usually the project root), then reveal it in their file manager so it's one click away:
   ```bash
   scripts/reveal.sh /path/to/project/demo.mp4
   ```
   `reveal.sh` is best-effort and cross-platform (macOS Finder / Linux / WSL Explorer); it no-ops on a headless box. Skip it in an unattended run: it opens a file-manager window on the user's screen. When the user is away, also hand them the file through whatever attachment/file-send mechanism your agent has, or just print its absolute path.

## mp4 or GIF?

Default to **mp4** (`to-mp4.sh`). It's the safe cross-platform share format (webm won't play inline on iOS/Signal) and PRs render it inline. Reach for **GIF** (`scripts/to-gif.sh`) only for **short** clips (≤10–15s), small regions, autoplay-inline contexts (GitHub markdown, email). GIF's 256-color palette bands gradients/brand chrome and softens text, and long/high-res GIFs balloon past embed limits. GIF avoids the `-qp` flicker entirely but trades it for palette banding.

## Pacing & captions

One idea per caption; lead with the verb. Variable dwell beats uniform: snappy ~100–300ms during actions, **600–800ms pause** after a small result lands (a menu opens, a field fills). A state change with a visible consequence gets the longer holds from "Record calm, legible takes": ≥2s, and ≥3s on a hero/summary beat. `slowMo` (default 300ms, `SLOWMO=`) is added to every Playwright call, so it spaces clicks automatically.

## Music bed (optional)

A song under the finished mp4, no voice-over: the song starts at 0, a stretch of its middle is skipped on the beat, and its real ending lands on the last frame. The skill ships no song; the project keeps its own song file and names it in its notes. Steps, the listening round for the cut, and the rules: [MUSIC.md](MUSIC.md).

## Branded cards (optional polish)

A cheap, high-impact finish: intro/outro cards + per-chapter labels on one brand canvas (real logo, theme colors, rounded font). Author them as HTML, render with `scripts/render-cards.mjs` (run from the project root so Playwright resolves), overlay/concat with the segments. Recipe + ffmpeg snippets in [REFERENCE.md](REFERENCE.md) ("Branded intro/outro + chapter cards").

## Self-improvement (do this without being asked)

Scope: this is **only** for learnings about the **demo-recording craft itself** — screen capture, Playwright-driving reliability, caption/overlay rendering, video encoding/quality, ffmpeg recipes, format choice, pacing. Not general coding lessons, not facts about the app you happened to record (those are the app's concern). When such a learning surfaces, fold it back in before you finish:

- **Generalizable recording craft → this skill.** A reusable recipe or fix goes in `scripts/` (so it can't be mis-typed next time) and/or a line in [REFERENCE.md](REFERENCE.md); a short rule goes in SKILL.md. If it changed a script's behavior, re-run the relevant validation (synthetic-webm transcode or a smoke record) before trusting it.
- **Project-specific quirk → your agent's memory or a project notes file, not this skill.** Login users, seeding flags, ports, brand color, app-specific selectors get *recalled* in step 2 and saved back there, never hardcoded here. The skill stays project-agnostic. (No persistent store? Just tell the user the quirk.)

Two tests, both must pass: (1) is it about recording/encoding/capture, not the app or general coding? (2) would it help record a *different* app? Both yes → skill. About this repo only → memory/notes. Neither → it's not for this skill at all. Don't bloat the skill with one-off notes. Only persist a change to this skill after the user asks, and skip it when the skill install is read-only or ephemeral (a cloud sandbox) — there's nowhere durable to write.

## Details

- Recipes (transcode/concat/gif), the `-qp` trap, frame-verify, MUI helper snippets, multi-segment design, troubleshooting: [REFERENCE.md](REFERENCE.md).
- Tauri desktop apps (app prep, capture on macOS and Linux, driving differences, troubleshooting): [TAURI.md](TAURI.md), scripts in `scripts/tauri/`.
- Music bed: [MUSIC.md](MUSIC.md), scripts in `scripts/music/` (`analyse.py` once per song, `add-music.py` per video).
- Engine: `scripts/record-harness.mjs` (rarely edited). Per-demo: `scripts/steps.template.mjs` (copy + edit). Annotation overlays (measured boxes, hatched bands, crosshairs, coordinate taps, title cards): `scripts/annotate.mjs`. Steps receive `{ page, caption, section, sleep, env, BASE, click, type, scrollTo, moveTo, pan }` — the last five drive the visible pointer / smooth scroll (see "Record calm, legible takes"). `STORAGE_STATE=` reuses auth across segments (load if present; steps can save to it to skip re-login). `INJECT_CSS=` re-injects CSS on every load (flatten flickery backdrops, etc.).
