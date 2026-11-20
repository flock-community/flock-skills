# demo-video — Tauri desktop apps

Pipeline: **launch** the app with its WebDriver plugin → **drive** the webview (WebdriverIO, captions + pointer injected into the DOM) → **capture** the window region with ffmpeg → **transcode** with `scripts/to-mp4.sh` → **verify** frames → **deliver**.

Playwright cannot attach to a Tauri window (WKWebView on macOS, WebKitGTK on Linux), and `tauri-driver` has no macOS support. This path uses `tauri-plugin-wdio-webdriver`, a W3C WebDriver server that runs *inside* the app (macOS, Linux, Windows), and talks to it with plain `webdriverio` `remote()` — no test runner. Recording a browser build instead? Use the Playwright pipeline in [SKILL.md](SKILL.md).

The scripts for this path are in `scripts/tauri/`. Transcode, verify and deliver use the same scripts as a web take: `scripts/to-mp4.sh` (constant `-qp`, never `-crf` — `-crf` makes flat UI areas pulse), `scripts/verify-frames.sh`, `scripts/reveal.sh`. The pacing and caption rules in [SKILL.md](SKILL.md) ("Record calm, legible takes", "Pacing & captions") apply unchanged.

## Safety first: what the app starts on launch

A desktop app often starts real services on launch (a backend, a database, a sync job). A demo must never start, open or record against the user's own data. Before the first take, read the app's launch code (`src-tauri/src/main.rs` and whatever it calls) and find out what it starts. If it cannot be pointed at a dev/scratch/fake backend, the app needs a **recording-only launch path**: an env var, compiled in only with a cargo feature, that loads a given client URL and skips everything else. Propose that change to the user before writing it; see "App prep" below for the pattern.

The harness backs this up:

- `REQUIRE_IN_BIN=<the demo env var name>` — refuses to launch a binary that does not contain that string, i.e. one built without the feature, which would ignore the env var and run its normal startup.
- `DENY_PORTS` (default `8080`) — refuses `APP_ENV` values that point at those ports. Set it to the user's private ports.
- The app is killed if its WebDriver server has not answered after 60 s.

## Pipeline

1. **Check the toolchain** — `scripts/tauri/check-deps.sh`. Needs node ≥18, ffmpeg/ffprobe, the skill's own `webdriverio` (`cd scripts/tauri && npm install`, once), and on Linux `Xvfb` + `webkit2gtk-4.1`. macOS: the terminal app needs **Screen Recording** (capture) and ideally **Accessibility** (to raise the window) in System Settings → Privacy & Security; without Screen Recording ffmpeg records black or nothing. The screen must be awake and unlocked for the whole take ("Capture" below).

2. **Pull project specifics — don't hardcode.** From agent memory / project notes, or ask the user: the cargo feature and demo env var, the binary path, how to start the fake/dev backend and on which port, the accent colour, which ports and folders are private. Save what you learn back to memory.

3. **Build the app with the plugin** — e.g. `cargo build --features webdriver` in `src-tauri/` (debug binary at `target/debug/<name>`). A debug build is fine for video and compiles faster.

4. **Start the fake/dev backend + client** on a free port and confirm it serves *your* build ([SKILL.md](SKILL.md) step 2: on a shared machine the port may belong to another checkout).

5. **Write the steps module** — copy `scripts/tauri/steps.template.mjs`. It gets `{ browser, $, caption, section, sleep, click, type, scrollTo, moveTo, pan, env }`. Selectors are WebdriverIO strings: `aria/Accessible name` (exact name), CSS, or XPath. **Probe first**: a steps file that only `waitUntil`s the landing element and logs `await browser.getPageSource()` lengths / `$$('button')` names is a cheap check before a full take.

6. **Record**:
   ```bash
   APP_BIN=src-tauri/target/debug/my-app \
   APP_ENV='{"MY_APP_DEMO_URL":"http://127.0.0.1:5179/"}' REQUIRE_IN_BIN=MY_APP_DEMO_URL \
   STEPS=./demo-steps.mjs OUT=/tmp/take1.mkv CAPTION_ACCENT='#4fd8ff' \
     node "$SKILL_DIR/scripts/tauri/record-tauri.mjs"
   ```
   It sets the window to `WIDTH`×`HEIGHT` (default 1280×860 CSS px) at `X`,`Y`, raises it, crops the screen to the outer window (title bar included, Retina at 2×), records lossless H.264 into `.mkv`, runs the steps, stops ffmpeg with `q`, quits the app and prints `VIDEO_FILE=…`. **The capture is a screen region, not the window**: anything that comes in front of it (another app, a notification, a permission prompt) is recorded, including whatever private content it shows. The harness raises the app before every `caption` and `click` (macOS), but tell the user not to use the machine during a take, turn on Do Not Disturb, and check the frames for foreign windows before sharing. Linux: with no `$DISPLAY` (or `XVFB=1`) it starts a private `Xvfb :99`. A failed `section` prints `SECTION_FAIL[name]` and the take goes on: read all of them, the first one is the cause and the later ones usually follow from it.

7. **Transcode, verify, deliver** — with the shared scripts:
   ```bash
   "$SKILL_DIR/scripts/to-mp4.sh" demo.mp4 /tmp/take1.mkv           # W=1280 H=860 to downscale a 2× take
   "$SKILL_DIR/scripts/verify-frames.sh" demo.mp4 /tmp/demo-frames 12   # then Read the PNGs
   "$SKILL_DIR/scripts/reveal.sh" "$PWD/demo.mp4"
   ```
   Look at the frames: a black first frame means no Screen Recording permission; a wrong crop means the scale or window position was off ("Capture" below).

## Driving differences from Playwright

- **Clicks send only a `click` event** — no pointer/mouse events. Widgets that listen to `pointerdown`/`mousedown` (some drag handles, menus, canvas charts) won't react; trigger those through `browser.execute` on the element, or pick a control that uses `click`.
- **No visible cursor and no mouse events for it**: the harness moves the injected pointer itself (`moveTo`, `click`). Don't `browser.action('pointer')` expecting the overlay to follow.
- **`aria/Name` is an exact accessible-name match** — no Playwright-style substring trap, but also no regex; use XPath for partial text. It also stops matching when the label is rendered from two text nodes (JSX `Connect {name}`); XPath `normalize-space()` matches that: `//button[normalize-space()="Connect Mail"]`.
- **XPath text matches also hit the injected caption.** The caption is part of the page, so `//*[contains(., "Saved")]` is true as soon as a caption says "Saved", and a wait on it passes before the app shows anything. Scope text selectors to the app's own containers, or add `[not(ancestor-or-self::*[@id="__demo_caption__"])]`.
- **`selectByVisibleText` does not reach a React controlled `<select>`**: the DOM value changes but React's `onChange` never runs, so the state snaps back. Set the value with the native setter and dispatch `change`:
  ```js
  await browser.execute((el, value) => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, await $('select[name="model"]'), 'small');
  ```
- **Native menus and dialogs are out of reach** of WebDriver. Show them by a keyboard shortcut only if the app wires one into the webview; otherwise leave them out or record them by hand.
- **A full navigation wipes the injected overlay**; `caption`/`moveTo` recreate it, so call `caption` again after one. Navigate in-app (click the app's own nav), as for a web take.

## App prep: plugin and a recording-only launch path

The app needs the embedded WebDriver server, `tauri-plugin-wdio-webdriver` (crate; part of WebdriverIO's
`desktop-mobile` repo). It exposes automation over HTTP on loopback, so keep it out of release builds with an optional
dependency behind a cargo feature:

```toml
[dependencies]
tauri-plugin-wdio-webdriver = { version = "1.5", optional = true }

[features]
webdriver = ["dep:tauri-plugin-wdio-webdriver"]
```

```rust
let builder = tauri::Builder::default();
#[cfg(feature = "webdriver")]
let builder = builder.plugin(tauri_plugin_wdio_webdriver::init()); // port from TAURI_WEBDRIVER_PORT, default 4445
```

Its default permission set is empty, so the capabilities file needs no change.

When the app's setup starts services (a backend, a sidecar, a sync), add a demo env var under the same feature that
loads a given URL and returns from `setup` before those start:

```rust
#[cfg(feature = "webdriver")]
fn demo_client() -> Option<Url> {
    let url = env::var("MY_APP_DEMO_URL").ok()?;
    // Panic on a bad value: falling through to the normal startup is the dangerous outcome.
    Some(url.parse().unwrap_or_else(|e| panic!("MY_APP_DEMO_URL {url:?} is not a URL: {e}")))
}
#[cfg(not(feature = "webdriver"))]
fn demo_client() -> Option<Url> { None }

// in setup(), after app.manage(...) of any state that commands or RunEvent::Exit read:
if let Some(url) = demo_client() {
    app.get_webview_window("main").expect("the main window").navigate(url)?;
    return Ok(());
}
```

Keep the state the rest of the app reads (`app.manage`) before the early return: an `app.state::<T>()` in an exit
handler panics on unmanaged state. Also skip any custom menu whose items start services: WebDriver can't click native
menus, but a person at the keyboard during the take can.

Point the URL at a dev server with a fake backend (fastest, deterministic data) or at a dev backend with scratch data.
A debug build is fine: `cargo build --features webdriver`.

## Capture

`record-tauri.mjs` reads the outer window rect over WebDriver (CSS px, title bar included) and crops the screen to it.

**macOS (avfoundation).**
- The device is the first `Capture screen N` from `ffmpeg -f avfoundation -list_devices true -i ""`; set `SCREEN=` to
  use another one. The crop is in physical pixels: rect × `devicePixelRatio`, so a 1280×860 window on Retina records
  2560×1720. Pass `W=1280 H=860` to `to-mp4.sh` for a 1× file, or keep 2× for sharper text.
- The window must be on the main display and uncovered. The harness raises it by PID through System Events (needs
  Accessibility; it continues with a warning without it) at the start and again before every `caption` and `click`.
  A window that comes in front between two beats is still recorded until the next one. avfoundation has no
  window-only capture; ScreenCaptureKit has one but ffmpeg doesn't expose it. Notifications and system prompts that appear over the
  region are recorded: turn on Do Not Disturb before a take.
- **The screen must be awake and unlocked.** While the display sleeps, ffmpeg lists no `Capture screen` device (`check-deps.sh` then reports the device as missing). Once it is awake but locked, the take records the lock screen. The harness detects neither: check before an unattended take, and look at the frames.
- **Screen Recording permission** belongs to the app that launched node (Terminal, iTerm, an IDE, an agent host).
  Without it the capture is black or fails. Newer macOS versions also show a recurring prompt such as
  *"X is requesting to bypass the system private window picker"* to apps that capture the screen directly. The
  harness grabs one throwaway frame before launching the app so the prompt appears first. If it still shows up in
  the take, answer it (Allow) and record again; `verify-frames.sh` shows it.
- `-capture_cursor 0`: the real cursor is left out; the injected pointer is the only one.
- The raw take is lossless H.264 (`-qp 0`, yuv444p) in `.mkv`, about 3 MB/s at 2× Retina. `.mkv` stays playable if
  the recorder dies mid-take. Always run `to-mp4.sh` on it; don't share the raw file.

**Linux (x11grab).**
- With no `$DISPLAY`, or with `XVFB=1`, the harness starts `Xvfb :99 -screen 0 1920x1200x24`. Without a window manager
  the window has no decorations and sits at 0,0 whatever `X`/`Y` say; the harness reads the real rect after
  `setWindowRect`, so the crop still matches.
- On a desktop session ($DISPLAY set, X11 or XWayland), x11grab captures the screen: keep the window uncovered.
  Under a Wayland compositor the app may be a native Wayland client that x11grab can't see; force XWayland with
  `GDK_BACKEND=x11` in `APP_ENV`, or use the private Xvfb (`XVFB=1`).
- An empty window on some NVIDIA drivers: `WEBKIT_DISABLE_DMABUF_RENDERER=1` in `APP_ENV`. Under Xvfb set it anyway;
  there is no GPU.
- No permission prompts. Headless CI works: Xvfb + webkit2gtk-4.1 + ffmpeg.

## Captions and pointer

Injected into the webview's DOM over `browser.execute`, same look as the web harness (bottom-centre caption pill with an
accent bar, `CAPTION_ACCENT`; arrow pointer and click ring). They are part of the page, so they come out in the
capture at the app's scale and never drift from the window. `caption('')` hides the pill. The pill is fixed at the bottom and covers the last rows of a list or a footer button; the harness has no top position. Scroll the rows that matter clear of it, or hide the caption for that beat. A full page navigation removes
them; the next `caption`/`moveTo` puts them back.

The ffmpeg `drawtext` alternative (burning captions in after recording) works without touching the page but needs
timestamps per caption and a font file; use it only when the page must stay untouched.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `"X" is not in APP_BIN … Not launching it` | Built without the feature. `cargo build --features webdriver`. |
| `no WebDriver server on :4445 after 60s` | Plugin not registered, or registered under a cfg that's off. The app was killed. |
| `:4445 already answers` | Another app with the plugin is running. Quit it or set `WD_PORT`. |
| Black video / `screen capture failed` | Screen Recording not granted to the terminal app (macOS). |
| No `Capture screen` device, or the take shows the lock screen | The display was asleep or the screen locked (macOS). Wake and unlock it, record again. |
| A text wait passes at once, before the app reacts | The XPath matched the caption text. Scope it to the app's containers. |
| Crop shifted or wrong size | Window on a secondary display (macOS: move it to the main one), or a different scale; set `SCREEN=`. |
| A click "works" but nothing happens | The widget listens to pointer/mouse events, which the plugin doesn't send. Use `browser.execute(el => el.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true})), el)` or a different control. |
| `element ("aria/…") still not existing` | `aria/` matches the exact accessible name. Check case and exact text, or use XPath `contains()` / `normalize-space()` (label split over two text nodes). |
| Window shows the app's own boot/status screen | The demo env var didn't reach the app (typo in `APP_ENV` key), or setup reads it after starting services. |
| Cargo can't find the workspace in a worktree | A worktree nested inside another checkout picks up the parent's `[workspace]`. Put worktrees outside the main checkout. |
