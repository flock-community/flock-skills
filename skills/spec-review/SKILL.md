---
name: spec-review
description: |
  Review existing specs for quality and completeness — structural validation, content review, cross-reference checks, and drift detection.

  MANDATORY TRIGGERS: spec-review, "review specs", "check specs", "audit specs"

  Use when: Checking spec quality, finding broken references, validating against schemas, or detecting implementation drift
---

# /spec-review — Review Specs for Quality

Review existing specs for structural integrity, content quality, cross-reference completeness, and implementation drift.

## Integration Level Detection

Detect the current level to determine review capabilities:

1. Check for `@spec` annotations in code files → Level 5
2. Check for `.implemented.json` → Level 4
3. Check for `specs/schemas/` or `$schema` references → Level 3
4. Check for `specs/` directory with `why/`, `what/`, or `how/` subdirs → Level 2
5. Check for any `.md` with `$schema` frontmatter → Level 1
6. None found → Level 0 (nothing to review)

See `../specification/references/integration-levels.md` for full details.

## Review Flow

1. **Ask scope:** All specs, one layer (why/what/how), or specific spec file(s)
2. **Run structural review**
3. **Run content review** (level 3+: schema-guided)
4. **Run cross-reference review**
5. **Run completeness review**
6. **Run drift review** (level 4+: implementation, level 5: annotations)
7. **Present report** with errors, warnings, and suggestions

## 1. Structural Review

Check spec files for structural correctness:

- **Required fields** — every spec needs `id`, `title`, `$schema`
- **Valid frontmatter** — YAML parses without errors
- **Broken references** — `why:`, `what:`, `how:` fields point to existing specs
- **Orphan specs** — specs not referenced by any other spec (except vision, which is the root)
- **Large specs** — files over ~150 lines are candidates for splitting (see `../specification/references/evolution.md`)
- **Circular references** — specs that form reference cycles

Run `scripts/validate.py` if available. Otherwise, check manually by reading spec files.

## 2. Content Review (Level 3+)

For each spec, read its schema and run AI validation prompts:

1. Read schema: project `specs/schemas/{layer}/{type}.yaml` or built-in `../specification/schemas/{layer}/{type}.yaml`
2. Check all required sections are present
3. Run `ai_validate` prompts from each section definition
4. Check frontmatter fields match schema types and constraints

For AI validation patterns and variable syntax, read `../specification/references/validation-patterns.md`.

### Content Quality Checks

- **Abstraction level** — specs describe WHAT, not HOW (unless How layer)
- **Scenario quality** — Given/When/Then covers happy path, error cases, edge cases
- **Language quality** — uses RFC 2119 keywords (MUST/SHOULD/MAY) consistently
- **Testability** — requirements are specific enough to verify

## 3. Cross-Reference Review

Check bidirectional references between specs:

- **Layer coverage** — features should reference goals, goals should reference vision
- **Bidirectional refs** — if A references B, B should reference A (or at least be aware)
- **Layer integrity** — Why specs don't reference How specs directly (What is the bridge)
- **Reference density** — specs with zero cross-references are likely missing connections

## 4. Completeness Review

Check for common gaps:

- **Features without scenarios** — no Given/When/Then blocks
- **Goals without metrics** — no measurable success criteria
- **Entities without relationships** — domain objects floating in isolation
- **Personas without journeys** — user types with no defined workflows
- **Rules without examples** — business rules lacking concrete examples
- **Decisions without options** — ADRs that don't list alternatives considered

## 5. Drift Review

### Level 4: Implementation Drift

Read `.implemented.json` and compare spec file hashes:
- **Drifted specs** — spec file changed since hash was recorded
- **Unimplemented specs** — active specs not in `.implemented.json`

### Level 5: Annotation Drift

Search code for `@spec` annotations and compare hashes:
- **Outdated annotations** — annotated hash ≠ current spec blob hash
- **Missing annotations** — implemented specs with no code annotations
- **Stale annotations** — annotations referencing deprecated or deleted specs

```bash
# Find all annotations
grep -rE '@spec [A-Z]+-[0-9]+#[a-f0-9]{8}' --include='*.ts' --include='*.js' --include='*.py'

# Get current hash for comparison
git hash-object specs/what/feature/login.md
```

## Output Format

Present findings as a structured report:

```
## Spec Review Report

### Errors (must fix)
- ✗ FEAT-003 references non-existent spec `what/entities/order`
- ✗ RULE-001 missing required section "Examples"

### Warnings (should fix)
- ⚠ FEAT-002 is 187 lines — consider splitting
- ⚠ GOAL-001 has no measurable metrics
- ⚠ ENT-004 is not referenced by any other spec

### Suggestions (could improve)
- ○ FEAT-001 has happy path but no error scenarios
- ○ PER-001 persona has no associated journey
- ○ 3 specs still in draft status
```

Group by severity. List the most critical issues first. For each issue, include the spec ID and a specific action to fix it.
