#!/usr/bin/env bash
# Print the base branch, merge-base, and changed files for the current feature branch.
# Lets /preflight scope the review to "this branch vs its base" without guessing.
# Usage: diff-base.sh [base-branch]   (base auto-detected if omitted)
set -euo pipefail

cur=$(git rev-parse --abbrev-ref HEAD)

base="${1:-}"
if [ -z "$base" ]; then
  if ref=$(git symbolic-ref -q refs/remotes/origin/HEAD); then
    base=${ref#refs/remotes/origin/}
  else
    for b in main master develop trunk; do
      if git show-ref --verify --quiet "refs/heads/$b" \
        || git show-ref --verify --quiet "refs/remotes/origin/$b"; then
        base=$b; break
      fi
    done
  fi
fi
base=${base:-main}

baseref=$base
git rev-parse --verify --quiet "$base" >/dev/null || baseref="origin/$base"
mb=$(git merge-base "$baseref" HEAD 2>/dev/null || echo "")

echo "current_branch: $cur"
echo "base_branch: $base"
echo "merge_base: ${mb:-<none>}"
if [ "$cur" = "$base" ] || [ -z "$mb" ]; then
  echo "note: not on a distinct feature branch — fall back to working tree + recent commits"
fi
echo
echo "# changed files (branch commits + staged + unstaged):"
{
  [ -n "$mb" ] && git diff --name-status "$mb"..HEAD
  git diff --name-status HEAD
  git diff --name-status --cached
} | sort -u
