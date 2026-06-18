#!/usr/bin/env bash
# Reveal a finished file in the OS file manager (macOS Finder / Linux / WSL Explorer).
# Best-effort: a headless box with no file manager must not fail the deliver step.
set -uo pipefail

f="${1:-}"
[ -n "$f" ] || { echo "usage: reveal.sh <file>" >&2; exit 2; }
[ -e "$f" ] || { echo "reveal: no such file: $f" >&2; exit 0; }

case "$(uname -s)" in
  Darwin) open -R "$f" ;;
  Linux)
    if grep -qiE "(microsoft|wsl)" /proc/version 2>/dev/null && command -v explorer.exe >/dev/null; then
      explorer.exe "/select,$(wslpath -w "$f")" || true
    else
      command -v xdg-open >/dev/null && xdg-open "$(dirname "$f")" || true
    fi
    ;;
  *) command -v explorer.exe >/dev/null && explorer.exe "/select,$f" || true ;;
esac
