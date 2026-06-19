#!/usr/bin/env bash
# Transcode + optionally concat screen-recording webm(s) to a flicker-free H.264 mp4.
# Constant -qp (NOT -crf) + disabled aq-mode/mbtree/scenecut so flat UI areas don't
# pulse. See REFERENCE.md "The -qp flicker trap". QP=0 = lossless fallback.
set -euo pipefail

command -v ffmpeg >/dev/null || { echo "ffmpeg not found — install it (macOS: brew install ffmpeg | Linux: sudo apt-get install -y ffmpeg)." >&2; exit 127; }

QP="${QP:-16}"
FPS="${FPS:-25}"
W="${W:-1440}"
H="${H:-900}"
X264P="aq-mode=0:scenecut=0:keyint=600:no-mbtree=1"
# setparams tags bt709 (primaries/trc/matrix) so QuickTime renders correctly — it shows a faint
# pulse on untagged H.264 that other players (Signal/web/Chrome) don't. Tag only, no conversion.
NORM="fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709"

[ "$#" -ge 2 ] || { echo "usage: to-mp4.sh out.mp4 in1.webm [in2.webm ...]" >&2; exit 2; }
out="$1"; shift

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
