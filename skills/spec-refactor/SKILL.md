---
name: spec-refactor
description: |
  Restructure, migrate, or import specs — split large specs, merge related ones, re-layer misplaced specs, upgrade integration levels, or import from external formats.

  MANDATORY TRIGGERS: spec-refactor, "refactor specs", "split spec", "merge specs", "import specs", "reorganize"

  Use when: Specs need restructuring — too large, misplaced in wrong layer, need merging, or importing from external format
---

# /spec-refactor — Restructure Specs

Split, merge, re-layer, upgrade, or import specs while maintaining referential integrity.

## Integration Level Detection

Detect the current level:

1. Check for `@spec` annotations in code files → Level 5
2. Check for `.implemented.json` → Level 4
3. Check for `specs/schemas/` or `$schema` references → Level 3
4. Check for `specs/` directory with `why/`, `what/`, or `how/` subdirs → Level 2
5. Check for any `.md` with `$schema` frontmatter → Level 1
6. None found → Level 0

See `../specification/references/integration-levels.md` for full details.

## Operations

### 1. Split

When a spec exceeds ~150 lines or covers multiple concerns:

**Strategies** (from `../specification/references/evolution.md`):
- **Parent + Children** — original becomes overview, details move to child specs
- **Index + Peers** — original becomes index linking to peer specs
- **Flat Split** — original splits into independent specs

**Process:**
1. Identify the split points (sections that are independent concerns)
2. Show the user the proposed before/after structure
3. Create new spec files with new IDs
4. Update the original spec (make it a parent/index or delete it)
5. Update all cross-references pointing to the original
6. Run `scripts/validate.py` to verify no broken references

### 2. Merge

When specs are too granular or overlapping:

**Process:**
1. Identify the specs to merge
2. Show the user the proposed combined structure
3. Create the merged spec (use the more significant ID, or create new)
4. Deprecate or delete the original specs
5. Update all cross-references
6. Run validation

### 3. Re-Layer

When specs are in the wrong layer (e.g., implementation detail in Why layer):

**Common fixes:**
| Found in | Should be in | Example |
|----------|-------------|---------|
| Why/Vision | How/Stack | Technology choices in vision |
| What/Feature | What/Rule | Business rule embedded in feature |
| What/Feature | How/Workflow | Implementation flow in feature |
| How/Skill | What/Rule | Business logic in implementation skill |

**Process:**
1. Read the misplaced spec
2. Show the user what should move and where
3. Create new spec in correct layer with appropriate schema
4. Update or remove content from original spec
5. Update cross-references

### 4. Upgrade Integration Level

Move from one level to the next. Delegates to `/spec-init` for the actual setup, but handles the restructuring:

- Level 1 → 2: Move specs into layer directories
- Level 2 → 3: Add `$schema` references to existing specs, validate against schemas
- Level 3 → 4: Compute hashes for all specs, create `.implemented.json`
- Level 4 → 5: Identify code-spec relationships, add annotations

### 5. Import from External Format

Convert external documents into specs:

| Source Format | Approach |
|---------------|----------|
| PRD / Requirements doc | Extract features, goals, constraints → multiple specs |
| User stories | Map to features with scenarios |
| ADRs | Map to decisions |
| API docs (OpenAPI) | Extract entities, interfaces, rules |
| Database schema | Extract entities with attributes and relationships |
| README / Wiki | Extract vision, goals, features |

**Process:**
1. Read the source document
2. Map content to spec types and layers
3. Draft specs following schemas
4. Present to user for review
5. Write confirmed specs

## Deprecation Handling

When removing or replacing specs, follow deprecation patterns from `../specification/references/evolution.md`:

1. Set `status: deprecated` on the old spec
2. Add `superseded_by:` pointing to the replacement
3. Keep the deprecated file for reference (don't delete immediately)
4. Update all references to point to the new spec
5. Remove deprecated specs in a later cleanup pass

## After Refactoring

After any refactoring operation:

1. Run `scripts/index.py` to regenerate the index (if available)
2. Run `scripts/validate.py` to check for broken references (if available)
3. At level 4+: update `.implemented.json` with new file paths and hashes
4. At level 5: update `@spec` annotations in code if spec IDs changed
5. Show the user a summary of what changed

## Reference

- `../specification/references/evolution.md` — Splitting strategies, versioning, deprecation
- `../specification/references/tooling.md` — Index and validation scripts
- `../specification/references/integration-levels.md` — Level upgrade details
