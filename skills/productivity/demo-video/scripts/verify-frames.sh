#!/usr/bin/env bash
# Extract ~n evenly-spaced frames as PNG, then Read them to catch flicker/blanks/overlaps.
set -euo pipefail

[ "$#" -ge 1 ] || { echo "usage: verify-frames.sh video [outdir=/tmp/screencast-frames] [n=12]" >&2; exit 2; }
vid="$1"; outdir="${2:-/tmp/screencast-frames}"; n="${3:-12}"

mkdir -p "$outdir"; rm -f "$outdir"/frame-*.png
dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$vid")"
rate="$(awk -v d="$dur" -v n="$n" 'BEGIN{printf "%.6f", n/d}')"

ffmpeg -y -i "$vid" -vf "fps=${rate}" "$outdir/frame-%03d.png"
echo "extracted ${n}~ frames over ${dur}s to $outdir:"
ls -1 "$outdir"/frame-*.png
