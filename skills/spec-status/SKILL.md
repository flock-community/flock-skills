---
name: spec-status
description: |
  Show spec system state, health, and drift — overview of integration level, spec counts, broken references, and implementation tracking.

  MANDATORY TRIGGERS: spec-status, "spec status", "spec health", "spec stats"

  Use when: Checking the overall state of the spec system, finding problems, or deciding what to work on next
---

# /spec-status — Show Spec System State

Report the current state, health, and coverage of the spec system.

## Integration Level Detection

Detect and report the current level:

1. Check for `@spec` annotations in code files → Level 5
2. Check for `.implemented.json` → Level 4
3. Check for `specs/schemas/` or `$schema` references → Level 3
4. Check for `specs/` directory with `why/`, `what/`, or `how/` subdirs → Level 2
5. Check for any `.md` with `$schema` frontmatter → Level 1
6. None found → Level 0

See `../specification/references/integration-levels.md` for full details.

## Report Sections

### 1. Integration Level

Report the detected level and what's available:
```
Integration Level: 3 (Schema-Validated)
  ✓ Spec hierarchy (specs/why/, specs/what/, specs/how/)
  ✓ Schema validation (specs/schemas/)
  ✗ Implementation tracking (.implemented.json not found)
  ✗ Code annotations (no @spec annotations found)
```

### 2. Quick Stats

Count specs by layer, type, and status:
```
Specs: 23 total
  Why:  8  (3 vision, 2 goal, 2 persona, 1 constraint)
  What: 10 (3 entity, 4 feature, 2 rule, 1 journey)
  How:  5  (2 agent, 1 skill, 1 workflow, 1 stack)

Status: 15 active, 7 draft, 1 deprecated
```

Use `scripts/stats.sh` if available, or read and count spec files directly.

### 3. Health Check

Check for structural issues:
- **Broken references** — specs referencing non-existent specs
- **Orphan specs** — specs not referenced by any other spec (except vision)
- **Large specs** — files exceeding ~150 lines (candidates for splitting)
- **Circular references** — specs that form reference cycles
- **Missing required fields** — specs without `id`, `title`, or `$schema`

Use `scripts/validate.py` if available, or check manually.

### 4. Implementation Tracking (Level 4+)

Read `.implemented.json` and compare hashes:
```
Implementation:
  In sync:       12 specs (hash matches)
  Drifted:       3 specs (spec changed since implementation)
  Unimplemented: 8 specs (not in .implemented.json)
```

List drifted specs with their last-implemented hash vs current hash.

### 5. Code Annotation Coverage (Level 5)

Search code for `@spec` annotations:
```
Annotations:
  Total:          45 annotations across 28 files
  Unique specs:   18 specs referenced in code
  Hash drift:     3 annotations reference outdated spec versions
  Unreferenced:   5 specs have no code annotations
```

List annotations with hash drift (annotated hash ≠ current spec blob hash).

### 6. Coverage Gaps

Identify missing coverage:
- **Layers with zero specs** — e.g., no How specs yet
- **Features without scenarios** — features missing Given/When/Then
- **Goals without features** — goals not connected to any feature
- **Entities without rules** — domain objects lacking business rules
- **Personas not referenced** — personas no goal or feature connects to

### 7. Recommendations

Based on findings, suggest the next command:
- Health issues → "Run `/spec-review` to fix structural problems"
- Many drafts → "Run `/spec-review` to improve draft quality"
- Missing layers → "Run `/spec` to fill gaps in [layer]"
- Drifted implementations → "Run `/spec-deepen` on drifted specs"
- No specs yet → "Run `/spec-init` to set up the spec system"
- Ready to upgrade → "Run `/spec-init` to upgrade to level [N+1]"

## Output Format

Present the report as a structured summary. Use tables for stats, bullet lists for issues, and bold for action items. Keep it scannable — users want a quick overview, not a wall of text.
