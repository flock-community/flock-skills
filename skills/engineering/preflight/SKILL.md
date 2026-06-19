---
name: preflight
description: Definition-of-done gate that also sharpens itself. Runs the full test suite, reviews the feature-branch diff via the /code-review skill, fixes the findings, then self-improves by saving durable learnings — repo-specific quirks to a per-project notes file, general craft back into this skill. Use when the user finishes a chunk of code, says /preflight, "run my checks", "verify and clean up", or wants a done-check before committing or opening a PR.
---

# Preflight

End-of-coding gate. Run the loop in order. Don't skip the self-improve step (unless step 0 reports no durable notes location) — it's what makes the next run faster.

## Loop

0. **Load memory.** Run `scripts/notes-path.sh` (relative to this skill dir) to resolve the project-notes file for whichever coding agent is in use — it adapts to `.claude`, `.cursor`, `.codex`, etc. (and handles worktrees). If it prints a path, read that file when it exists: it holds the test command, build quirks, and recurring pitfalls learned on past runs — use them, don't rediscover. If it exits without a path (cloud/ephemeral sandbox, or no agent config dir), there's nowhere durable to persist — skip this step *and* the self-improve step (5).
1. **Scope the diff.** Run `scripts/diff-base.sh` (relative to this skill dir) to get the base branch + changed files. That diff is the review scope. If not on a feature branch, fall back to working tree + recent commits.
2. **Run tests.** Use the command from project notes if present; else detect it (package.json scripts, `cargo test`, `./gradlew test`, `pytest`, `go test ./...`, Makefile). Run the **full** suite. Capture failures verbatim.
3. **Review.** Invoke the `/code-review` skill scoped to the branch diff. Let it surface bugs + cleanups. Don't re-implement review logic here.
4. **Fix.** Address test failures first, then review findings worth acting on. Re-run the affected tests (and the full suite at the end) until green. State plainly what you fixed and what you deliberately skipped + why.
5. **Self-improve.** Skip entirely if step 0 reported no notes path (cloud/ephemeral, or no agent config dir) — there's nowhere durable to persist. Otherwise reflect: did anything this run reveal that would make *next* run faster or catch more? Route it per the rules below. Announce every save in the final summary.

## Self-improve routing

Be conservative. Most runs save nothing. Save only durable, reusable lessons.

**→ Project notes (the file resolved in step 0, e.g. `.claude/preflight.md` or `.cursor/preflight.md`)** — facts true for *this repo*:
- the exact test / lint / build command (esp. if it took effort to find)
- env or setup steps tests need (services, fixtures, env vars)
- flaky tests and how to deal with them
- a pitfall in this codebase that caused a review finding and is likely to recur

**→ This skill (`SKILL.md`)** — only lessons general across *any* project: a review heuristic, a workflow gap, a better detection order. Rare. Keep the file lean — sharpen existing lines before adding new ones. If unsure whether a lesson is general, it isn't; put it in project notes.

**Don't save:** one-off bugs, generic language/tool facts with no hook into this repo, dated incident narratives, anything already in CLAUDE.md / memory, or project trivia. When in doubt, don't.

## Project notes format

A terse quick-reference, NOT a logbook. Create the notes file (path from step 0, under the active agent's config dir) on first useful learning:

```md
# preflight — project notes
test: <command>           # one-line caveats as trailing comments
setup: <what tests need>  # optional

## <topic>                # group pitfalls under short topic headings
- <rule> — <why + code pointer: File.kt:symbol>
```

Save discipline (apply every time, BEFORE writing):
- **≤2 lines per entry.** A rule plus a code pointer. Link the code; don't transcribe the
  incident — no repro stories, dated "RESOLUTION:" logs, or pasted stack traces.
- **Fold, don't append.** If it touches an existing line or topic, edit that line and reuse the
  `##` topic headings — don't add a fresh bullet that overlaps one.
- **Prune as you go.** When the file drifts long, merge overlapping entries and delete lessons
  that no longer bite. Fewer sharper lines beat an exhaustive log — you reread this every run.

## Output

End with: tests (pass/fail counts), findings fixed, findings skipped + why, and any learnings saved (which store, one line each).
