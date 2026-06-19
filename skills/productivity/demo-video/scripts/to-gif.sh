#!/usr/bin/env bash
# webm -> looping GIF. Short clips only; tradeoffs vs mp4 in REFERENCE.md.
set -euo pipefail

command -v ffmpeg >/dev/null || { echo "ffmpeg not found — install it (macOS: brew install ffmpeg | Linux: sudo apt-get install -y ffmpeg)." >&2; exit 127; }

[ "$#" -ge 2 ] || { echo "usage: to-gif.sh out.gif in.webm [fps=15] [width=960]" >&2; exit 2; }
out="$1"; in="$2"; fps="${3:-15}"; width="${4:-960}"

pal="$(mktemp -t screencast-pal-XXXXXX).png"
trap 'rm -f "$pal"' EXIT

ffmpeg -y -i "$in" -vf "fps=${fps},scale=${width}:-1:flags=lanczos,palettegen=stats_mode=full" "$pal"
ffmpeg -y -i "$in" -i "$pal" -lavfi \
  "fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" \
  -loop 0 "$out"

echo "wrote $out ($(du -h "$out" | cut -f1))"
