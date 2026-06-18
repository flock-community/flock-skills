---
name: demo-video
description: Produce a polished, flicker-free demo video (or GIF) of a running web app by driving it with headless Playwright, injecting an on-screen caption bar, recording 1440x900 webm, transcoding to mp4, and frame-verifying. Use when the user wants to record an app demo, screencast, product walkthrough, or feature showcase of a live local/staging web app, or convert a screen recording to a shareable mp4/GIF. Pulls project specifics (login, dev-data seeding, ports) from memory at use-time.
---

# demo-video — record a running web app

A repeatable pipeline: **record** the live app with Playwright (live caption bar) → optionally **concat** segments → **transcode** webm→mp4 flicker-free → **verify** frames. The app must already be running.

## The one trap that matters: `-qp`, not `-crf`

Transcoding a UI screen recording with `-crf` makes flat areas (solid backgrounds, a blinking caret) **pulse/flicker** — x264 re-picks a per-frame QP from frame complexity and re-quantizes the flat background each frame. Use a **constant `-qp`** and disable adaptive bit reallocation. The bundled `scripts/to-mp4.sh` already bakes this in — use it instead of hand-writing ffmpeg. Full explanation: [REFERENCE.md](REFERENCE.md).

If something *still* seems to flicker after `-qp`, diagnose in order — most of it isn't the transcode: (1) **Check the real player first.** A clean mp4 can *look* flickery in **QuickTime** while the webm and the same mp4 in Signal/a browser are fine — a player artifact, not in the file (the bt709 tag in `to-mp4.sh` helps it). Verify in the actual share target before touching anything. (2) **Only then suspect the source:** VP8 lightly dithers large **semi-transparent/mid-tone overlays** (a modal backdrop), but it's usually sub-perceptible — confirm *visible* shimmer in the webm itself (not just QuickTime) before "fixing" it. Flattening the overlay to a solid colour (`INJECT_CSS`) does kill it, and makes dialogs pop, but as a flicker fix it's a last resort, not a default.

## Record calm, legible takes

- **Drive it like a person, via the injected helpers.** The harness passes `click`, `type`, `scrollTo`, `moveTo`, `pan` into your steps and renders a **visible pointer** (Chromium shows none otherwise) with a click-ring pulse. Prefer `click(page, locator)` over raw `locator.click()`: it smooth-scrolls the target into view, **places** the pointer on it (a snap — *not* a slow traced glide, which reads as robotic), pulses, then clicks. Use `type(page, locator, text)` for fields and `scrollTo`/`pan` to bring a result into view before the caption lands on it.
- **Pace for causality — the #1 lever for "natural".** A human needs a beat after every *significant* change to register what happened and why. Structure each beat as **caption the cause → do the action → pause → reveal the result → hold**. After a state change that has a visible consequence (a value updates, rows clear, a total recomputes), hold **≥2s** (a hero/“aha” change ≥3s) with the *result on screen* — never cut away mid-transition. Rushing changes is what makes a take feel chaotic.
- **Keep the result in frame.** If a change happens off-screen (the control you toggled is far from the thing that changes), `scrollTo` the consequence into view and hold there — don't leave the viewer staring at the trigger while the effect scrolls past unseen.
- **Navigate in-app (SPA), not `page.goto`.** A hard reload flashes white (reads as restless) and wipes injected styles/caption/cursor. Click the app's own nav after the first entry/login.
- **Show what opens each window.** Caption the action and show the click before a dialog appears (`'Click "Add"…'` then click) — otherwise modals seem to materialize from nowhere.

## Pipeline

1. **Pull project specifics from memory** — do NOT hardcode. Recall login user, dev-data seeding, ports, brand color. For Flock Workday: `demo-admin-user-bert`, `dev-data-seed-test-classpath`, `dev-backend-spring-profile-flag`, `flock-yellow-dark-mode-restraint`, `screencast-mp4-flicker`. Confirm the app is up (backend + frontend) before recording.

2. **Write the steps module** — copy `scripts/steps.template.mjs` next to your work and fill in the real selectors/captions. It default-exports `async ({ page, caption, section, sleep, env, BASE }) => {…}`. Wrap each logical beat in `section('name', …)` so one bad selector doesn't abort the whole take; narrate with `caption(page, '…')` (re-inject after every full navigation).

3. **Record** — the harness records 1440×900 webm:
   ```bash
   STEPS=./my-demo.mjs BASE_URL=http://localhost:3001 VIDEO_DIR=/tmp/sc-seg1 \
     node .agents/skills/demo-video/scripts/record-harness.mjs
   ```
   For multi-segment demos (e.g. one beat needs a temporary code flip), set a different `VIDEO_DIR` per segment and pass `SEGMENT=2`. It prints `VIDEO_FILES=[…]`.

4. **Transcode (flicker-free)** — single take or concat several:
   ```bash
   scripts/to-mp4.sh out.mp4 /tmp/sc-seg1/video.webm                      # single
   scripts/to-mp4.sh out.mp4 /tmp/sc-seg1/a.webm /tmp/sc-seg2/b.webm      # concat
   ```

5. **Verify** — extract frames and actually look at them (catch flicker, blank pages, caption overlap, cut-off UI):
   ```bash
   scripts/verify-frames.sh out.mp4 /tmp/sc-frames 12
   ```
   Then Read the PNGs. Don't ship without eyeballing frames.

6. **Deliver** — move the mp4 to where the user expects it (usually the project root), then reveal it in their file manager so it's one click away:
   ```bash
   scripts/reveal.sh /path/to/project/demo.mp4
   ```
   `reveal.sh` is best-effort and cross-platform (macOS Finder / Linux / WSL Explorer); it no-ops on a headless box. Pair it with `SendUserFile` when the user is away.

## mp4 or GIF?

Default to **mp4** (`to-mp4.sh`). It's the safe cross-platform share format (webm won't play inline on iOS/Signal) and PRs render it inline. Reach for **GIF** (`scripts/to-gif.sh`) only for **short** clips (≤10–15s), small regions, autoplay-inline contexts (GitHub markdown, email). GIF's 256-color palette bands gradients/brand chrome and softens text, and long/high-res GIFs balloon past embed limits. GIF avoids the `-qp` flicker entirely but trades it for palette banding.

## Pacing & captions

One idea per caption; lead with the verb. Variable dwell beats uniform: snappy ~100–300ms during actions, **600–800ms pause** after a result lands, **≥1500ms** on a hero/summary beat. `slowMo` (default 300ms) spaces clicks automatically.

## Self-improvement (do this without being asked)

Scope: this is **only** for learnings about the **demo-recording craft itself** — screen capture, Playwright-driving reliability, caption/overlay rendering, video encoding/quality, ffmpeg recipes, format choice, pacing. Not general coding lessons, not facts about the app you happened to record (those are the app's concern). When such a learning surfaces, fold it back in before you finish:

- **Generalizable recording craft → this skill.** A reusable recipe or fix goes in `scripts/` (so it can't be mis-typed next time) and/or a line in [REFERENCE.md](REFERENCE.md); a short rule goes in SKILL.md. If it changed a script's behavior, re-run the relevant validation (synthetic-webm transcode or a smoke record) before trusting it.
- **Project-specific quirk → memory, not this skill.** Login users, seeding flags, ports, brand color, app-specific selectors belong in a memory file (and get *recalled* by step 1), never hardcoded here. The skill stays project-agnostic.

Two tests, both must pass: (1) is it about recording/encoding/capture, not the app or general coding? (2) would it help record a *different* app? Both yes → skill. About this repo only → memory. Neither → it's not for this skill at all. Don't bloat the skill with one-off notes, and only commit a skill change to dotfiles after the user asks.

## Details

- Recipes (transcode/concat/gif), the `-qp` trap, frame-verify, MUI helper snippets, multi-segment design, troubleshooting: [REFERENCE.md](REFERENCE.md).
- Engine: `scripts/record-harness.mjs` (rarely edited). Per-demo: `scripts/steps.template.mjs` (copy + edit). Steps receive `{ page, caption, section, sleep, env, BASE, click, type, scrollTo, moveTo, pan }` — the last five drive the visible pointer / smooth scroll (see "Record calm, legible takes"). `STORAGE_STATE=` reuses auth across segments (load if present; steps can save to it to skip re-login). `INJECT_CSS=` re-injects CSS on every load (flatten flickery backdrops, etc.).
