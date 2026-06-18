# Set up spec structure

Initialize the spec system in a project or upgrade to a higher integration level.

Detect the current level first (see [SKILL.md](../SKILL.md) → Integration Level Detection).

## Setup Flow

1. **Detect** current integration level
2. **Report** current state to user
3. **Ask** which level to target (suggest one level up, or level 2 for new projects)
4. **Execute** the upgrade steps for the target level
5. **Suggest** the **build** operation to create the first spec (vision is a good start)

## Upgrade Steps

### Level 0 → 1: First Spec

Create a single markdown spec file with YAML frontmatter. Good for trying out the system.

```bash
# Create a vision spec as starting point
# Use the vision schema from ../schemas/why/vision.yaml
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
cp -r ../template/schemas specs/schemas

# Option B: Reference built-in schemas (no copy needed)
# Specs just use $schema: feature and the skill reads built-in schemas
```

Copy scripts for local validation:
```bash
mkdir -p scripts
cp ../template/scripts/index.py scripts/
cp ../template/scripts/validate.py scripts/
cp ../template/scripts/stats.sh scripts/
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

Suggest the **reverse** operation to automatically annotate existing code.

## Template Resources

The project template is available at `../template/` and contains:
- `schemas/` — Full set of YAML schemas for all 15 spec types
- `specs/.implemented.json` — Empty implementation tracker
- `scripts/` — `index.py`, `validate.py`, `stats.sh`
- `README.md` — Quick reference for the spec system

## After Setup

Suggest next steps based on the project state:
- **Empty project:** "Run the **build** operation to create a vision spec — describe what you're building and for whom."
- **Existing code:** "Run the **reverse** operation to generate specs from your existing codebase."
- **Has some specs:** "Run the **status** operation to see current state, or **review** to check quality."
