#!/usr/bin/env bash
# Transcode + optionally concat screen-recording webm(s) to a flicker-free H.264 mp4.
# Constant -qp (NOT -crf) + disabled aq-mode/mbtree/scenecut so flat UI areas don't
# pulse. See REFERENCE.md "The -qp flicker trap". QP=0 = lossless fallback.
set -euo pipefail

command -v ffmpeg >/dev/null || { echo "ffmpeg not found — install it (macOS: brew install ffmpeg | Linux: sudo apt-get install -y ffmpeg)." >&2; exit 127; }
command -v ffprobe >/dev/null || { echo "ffprobe not found — it ships with ffmpeg; install that." >&2; exit 127; }

QP="${QP:-16}"
FPS="${FPS:-25}"
X264P="aq-mode=0:scenecut=0:keyint=600:no-mbtree=1"

[ "$#" -ge 2 ] || { echo "usage: to-mp4.sh out.mp4 in1.webm [in2.webm ...]" >&2; exit 2; }
out="$1"; shift

# Default the canvas to the FIRST input's own size, so a take recorded at anything other than
# 1440x900 is not silently letterboxed into it (that wastes exactly the pixels a smaller viewport
# was chosen to gain). Set W=/H= explicitly to pad onto a different canvas on purpose — e.g. a
# portrait take onto a brand canvas, per REFERENCE.md "Branded intro/outro".
src_wh="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$1" 2>/dev/null || true)"
# Require the separator: `${src_wh%x*}` and `${src_wh#*x}` are no-ops when the pattern does not
# match, so a probe that returned a bare "1024" would otherwise yield a silent 1024x1024 canvas.
# Blanking it here (rather than exiting) keeps an explicit W=/H= able to rescue a failed probe.
case "$src_wh" in *[0-9]x[0-9]*) ;; *) src_wh="" ;; esac
W="${W:-${src_wh%x*}}"
H="${H:-${src_wh#*x}}"
case "${W}x${H}" in ''|*x|x*|*[!0-9x]*) echo "could not read dimensions from $1 — pass W= and H=." >&2; exit 3;; esac
# libx264 + yuv420p rejects odd dimensions with a bare "Invalid argument" from the filter graph
# that never mentions the canvas. Sourcing the size makes odd reachable — a MacBook Air records
# 1512x945 — so round down; losing one row beats losing the encode.
W=$((W - W % 2)); H=$((H - H % 2))
echo "canvas ${W}x${H} (qp=${QP}, fps=${FPS})" >&2

# setparams tags bt709 (primaries/trc/matrix) so QuickTime renders correctly — it shows a faint
# pulse on untagged H.264 that other players (Signal/web/Chrome) don't. Tag only, no conversion.
NORM="fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709"

if [ "$#" -eq 1 ]; then
  ffmpeg -y -i "$1" -vf "$NORM" \
    -c:v libx264 -preset slow -qp "$QP" -x264-params "$X264P" \
    -pix_fmt yuv420p -movflags +faststart -an "$out"
else
  args=(); fc=""; labels=""; i=0
  for f in "$@"; do
    args+=(-i "$f")
    fc+="[${i}:v]${NORM}[v${i}];"
    labels+="[v${i}]"
    i=$((i+1))
  done
  fc+="${labels}concat=n=$#:v=1[v]"
  ffmpeg -y "${args[@]}" -filter_complex "$fc" -map "[v]" \
    -c:v libx264 -preset slow -qp "$QP" -x264-params "$X264P" \
    -pix_fmt yuv420p -movflags +faststart -an "$out"
fi
echo "wrote $out ($(du -h "$out" | cut -f1))"
