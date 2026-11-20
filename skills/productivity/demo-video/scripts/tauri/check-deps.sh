#!/usr/bin/env bash
# Preflight for record-tauri.mjs: node, ffmpeg/ffprobe, the skill's webdriverio, and per-OS capture tools.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
miss=0
have() { command -v "$1" >/dev/null 2>&1; }
ok() { echo "✓ $*"; }
no() { echo "✗ $1"; echo "    install: $2"; miss=1; }

if have node; then ok "node $(node -v)"; else no "node (>=18)" "brew install node | your distro's package manager"; fi
for t in ffmpeg ffprobe; do
  if have "$t"; then ok "$t"; else no "$t" "brew install ffmpeg | sudo apt-get install -y ffmpeg"; fi
done
if [ -d "$here/node_modules/webdriverio" ]; then ok "webdriverio (skill-local)"; else no "webdriverio" "cd '$here' && npm install"; fi

case "$(uname -s)" in
  Darwin)
    devices="$(ffmpeg -hide_banner -f avfoundation -list_devices true -i "" 2>&1)"
    if [[ "$devices" == *"Capture screen"* ]]; then
      ok "avfoundation screen device"
    else no "avfoundation screen device" "a Homebrew ffmpeg build lists 'Capture screen 0'; none is listed while the display sleeps"; fi
    echo "  note: the terminal app needs Screen Recording (and Accessibility to raise the window): System Settings → Privacy & Security."
    ;;
  Linux)
    if have Xvfb || [ -n "${DISPLAY:-}" ]; then ok "X display (Xvfb or \$DISPLAY)"; else no "Xvfb" "sudo apt-get install -y xvfb | pacman -S xorg-server-xvfb"; fi
    if pkg-config --exists webkit2gtk-4.1 2>/dev/null; then ok "webkit2gtk-4.1"; else no "webkit2gtk-4.1" "sudo apt-get install -y libwebkit2gtk-4.1-dev | pacman -S webkit2gtk-4.1"; fi
    ;;
esac
[ "$miss" -eq 0 ] && echo "All deps present." || echo "Install the items marked ✗ above." >&2
exit "$miss"
