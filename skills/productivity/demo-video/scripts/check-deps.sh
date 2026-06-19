#!/usr/bin/env bash
# Preflight the toolchain (node, ffmpeg/ffprobe, playwright) with install hints.
# Usage: check-deps.sh [project-root=$PWD]
set -uo pipefail

root="${1:-$PWD}"
miss=0
have() { command -v "$1" >/dev/null 2>&1; }

ffmpeg_hint() {
  case "$(uname -s)" in
    Darwin) echo "    install: brew install ffmpeg" ;;
    *)      echo "    install: sudo apt-get install -y ffmpeg  (or your distro's package manager)" ;;
  esac
}

if have node; then
  echo "✓ node $(node -v)"
else
  echo "✗ node (Node.js ≥18) not found — drives Playwright"
  case "$(uname -s)" in
    Darwin) echo "    install: brew install node" ;;
    *)      echo "    install: see https://nodejs.org or your distro's package manager" ;;
  esac
  miss=1
fi

for t in ffmpeg ffprobe; do
  if have "$t"; then
    echo "✓ $t"
  else
    echo "✗ $t not found — transcode/verify need it"
    ffmpeg_hint
    miss=1
  fi
done

if have node && { node -e "require.resolve('playwright',{paths:['$root']})" 2>/dev/null \
              || node -e "require.resolve('@playwright/test',{paths:['$root']})" 2>/dev/null; }; then
  echo "✓ playwright resolvable from $root"
else
  echo "✗ playwright not installed"
  echo "    install: npm i -D @playwright/test   (in the project)   — or:  npm i -g playwright"
  miss=1
fi
echo "  note: if recording errors with \"Executable doesn't exist\", run:  npx playwright install chromium"

if [ "$miss" -eq 0 ]; then
  echo "All hard deps present."
else
  echo "Install the items marked ✗ above before recording." >&2
fi
exit "$miss"
