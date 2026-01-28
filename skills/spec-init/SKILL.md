---
name: spec-init
description: |
  Set up spec directory structure in a project — initialize or upgrade integration levels.

  MANDATORY TRIGGERS: spec-init, "set up specs", "initialize specs", "bootstrap specs"

  Use when: Setting up a new spec system in a project or upgrading an existing one to a higher integration level
---

# /spec-init — Set Up Spec Structure

Initialize the spec system in a project or upgrade to a higher integration level.

## Integration Level Detection

Detect the current level before setup:

1. Check for `@spec` annotations in code files → Level 5
2. Check for `.implemented.json` → Level 4
3. Check for `specs/schemas/` or `$schema` references → Level 3
4. Check for `specs/` directory with `why/`, `what/`, or `how/` subdirs → Level 2
5. Check for any `.md` with `$schema` frontmatter → Level 1
6. None found → Level 0

See `../specification/references/integration-levels.md` for full details.

## Setup Flow

1. **Detect** current integration level
2. **Report** current state to user
3. **Ask** which level to target (suggest one level up, or level 2 for new projects)
4. **Execute** the upgrade steps for the target level
5. **Suggest** running `/spec` to create the first spec (vision is a good start)

## Upgrade Steps

### Level 0 → 1: First Spec

Create a single markdown spec file with YAML frontmatter. Good for trying out the system.

```bash
# Create a vision spec as starting point
# Use the vision schema from ../specification/schemas/why/vision.yaml
```

### Level 0/1 → 2: Hierarchy

```bash
mkdir -p specs/why specs/what specs/how
```

Move any existing spec files into the correct layer directory. If existing specs don't fit cleanly, ask the user.

### Level 2 → 3: Schema-Validated

Copy schemas from the template or reference the built-in schemas:

```bash
# Option A: Copy schemas for customization
cp -r ../specification/template/schemas specs/schemas

# Option B: Reference built-in schemas (no copy needed)
# Specs just use $schema: feature and the skill reads built-in schemas
```

Copy scripts for local validation:
```bash
mkdir -p scripts
cp ../specification/template/scripts/index.py scripts/
cp ../specification/template/scripts/validate.py scripts/
cp ../specification/template/scripts/stats.sh scripts/
```

### Level 3 → 4: Implementation-Tracked

Create `.implemented.json` at the project root or inside `specs/`:

```json
{}
```

Then populate with current spec hashes:
```bash
# For each spec file, compute git blob hash
git hash-object specs/what/feature/login.md
# Add to .implemented.json
```

### Level 4 → 5: Code-Linked

Provide guidance on adding code annotations:

```
Annotation format: // @spec {SPEC-ID}#{8-char-git-blob-hash}

Example:
// @spec FEAT-001#a1b2c3d4
function login(email, password) { ... }

Get current hash: git hash-object specs/what/feature/login.md
Use first 8 characters of the hash.
```

Suggest running `/spec-reverse` to automatically annotate existing code.

## Template Resources

The project template is available at `../specification/template/` and contains:
- `schemas/` — Full set of YAML schemas for all 15 spec types
- `specs/.implemented.json` — Empty implementation tracker
- `scripts/` — `index.py`, `validate.py`, `stats.sh`
- `README.md` — Quick reference for the spec system

## After Setup

Suggest next steps based on the project state:
- **Empty project:** "Run `/spec` to create a vision spec — describe what you're building and for whom."
- **Existing code:** "Run `/spec-reverse` to generate specs from your existing codebase."
- **Has some specs:** "Run `/spec-status` to see current state, or `/spec-review` to check quality."
