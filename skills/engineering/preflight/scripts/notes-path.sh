#!/usr/bin/env bash
# Resolve the agent-agnostic location for /preflight's self-improve notes.
# Prints the notes path (exit 0); prints nothing and exits 1 when self-improve
# should be skipped — cloud/ephemeral sandbox, or no agent config dir.
set -euo pipefail

EPHEMERAL_ENV_VARS=(CLAUDE_CODE_CLOUD CLAUDE_CODE_REMOTE CODESPACES \
                    GITPOD_WORKSPACE_ID GITHUB_ACTIONS CI)
AGENT_CONFIG_DIRS=(.claude .cursor .codex .windsurf .gemini .aider)

if [ -n "${PREFLIGHT_SKIP_SELFIMPROVE:-}" ]; then
  echo "skip: PREFLIGHT_SKIP_SELFIMPROVE set" >&2
  exit 1
fi
for var in "${EPHEMERAL_ENV_VARS[@]}"; do
  if [ -n "${!var:-}" ]; then
    echo "skip: ephemeral/cloud environment ($var set)" >&2
    exit 1
  fi
done

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
search_roots=("$root")
main_checkout=$(git worktree list 2>/dev/null | awk 'NR==1{print $1}') || true
[ -n "${main_checkout:-}" ] && [ "$main_checkout" != "$root" ] && search_roots+=("$main_checkout")

if [ -n "${PREFLIGHT_NOTES_DIR:-}" ]; then
  echo "$root/${PREFLIGHT_NOTES_DIR}/preflight.md"
  exit 0
fi

for r in "${search_roots[@]}"; do
  for dir in "${AGENT_CONFIG_DIRS[@]}"; do
    if [ -d "$r/$dir" ]; then
      echo "$r/$dir/preflight.md"
      exit 0
    fi
  done
done

echo "skip: no agent config dir found (.claude/.cursor/.codex/...)" >&2
exit 1
