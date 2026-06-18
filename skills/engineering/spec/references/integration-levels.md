# Integration Levels

Five progressive levels for adopting the spec system. Each level adds capability without requiring the previous levels to change.

## Level 1: Single File

**What it adds:** One markdown spec with YAML frontmatter.

**Structure:**
```
project/
└── spec.md          # or any .md with $schema frontmatter
```

**Detection:** A `.md` file with `$schema:` in its YAML frontmatter exists, but no `specs/` directory.

**Behavior:** Commands work on individual files. No hierarchy, no validation scripts.

## Level 2: Hierarchy

**What it adds:** Specs organized in three-layer directories.

**Structure:**
```
project/
└── specs/
    ├── why/         # Vision, Goal, Persona, Constraint, Decision
    ├── what/        # Entity, Feature, Rule, Journey, Interface
    └── how/         # Agent, Skill, Lens, Workflow, Stack
```

**Detection:** A `specs/` directory exists with `why/`, `what/`, or `how/` subdirectories.

**Behavior:** Commands can list, search, and cross-reference specs by layer. `/spec` places new files in the correct layer directory.

## Level 3: Schema-Validated

**What it adds:** YAML schemas define structure and AI validation prompts.

**Structure:**
```
project/
├── specs/
│   ├── schemas/         # Project-specific schema overrides (optional)
│   │   ├── _base/
│   │   ├── common/
│   │   ├── why/
│   │   ├── what/
│   │   └── how/
│   ├── why/
│   ├── what/
│   └── how/
```

**Detection:** A `specs/schemas/` directory exists, OR specs reference `$schema:` and built-in schemas are used.

**Behavior:** `/spec` validates against schemas before writing. `/spec-review` runs AI validation prompts from schemas. `validate.py` and `index.py` scripts are available.

## Level 4: Implementation-Tracked

**What it adds:** `.implemented.json` maps spec file paths to git blob hashes.

**Structure:**
```
project/
├── specs/
│   ├── ...
│   └── .implemented.json    # { "specs/what/feature/login.md": { "hash": "a1b2c3d4..." } }
```

**Detection:** A `.implemented.json` file exists at the project root or inside `specs/`.

**Behavior:** `/spec-status` shows implementation state (in-sync, drifted, unimplemented). `/spec-review` flags specs that have changed since last implementation. Hash is the git blob hash of the spec file.

## Level 5: Code-Linked

**What it adds:** Code annotations reference spec IDs with version hashes.

**Annotation format:**
```javascript
// @spec FEAT-001#a1b2c3d4
function login(email, password) { ... }
```

- `FEAT-001` — spec ID from the frontmatter `id:` field
- `a1b2c3d4` — first 8 characters of the git blob hash of the spec file when the code was written
- Multiple annotations: `// @spec FEAT-001#abc12345 RULE-003#def67890`
- Annotations can appear on functions, classes, modules, or code blocks

**Detection:** Code files contain the pattern `@spec [A-Z]+-\d+#[a-f0-9]{8}`.

```bash
grep -rE '@spec [A-Z]+-[0-9]+#[a-f0-9]{8}' --include='*.ts' --include='*.js' --include='*.py'
```

**Behavior:** `/spec-status` shows per-annotation drift (annotated hash ≠ current spec hash). `/spec-review` identifies code that may be out of date with changed specs. `/spec-reverse` adds annotations to analyzed code.

**Drift detection:** When the spec file's current git blob hash differs from the hash in the annotation, the code is potentially out of date with the spec.

```bash
# Get current hash of a spec file
git hash-object specs/what/feature/login.md
# Returns: a1b2c3d4e5f6...
# Compare first 8 chars against annotation
```

---

## Detection Algorithm

Commands detect the current level at startup:

```
1. Check for @spec annotations in code files → Level 5
2. Check for .implemented.json → Level 4
3. Check for specs/schemas/ or $schema references → Level 3
4. Check for specs/ directory with layer subdirs → Level 2
5. Check for any .md with $schema frontmatter → Level 1
6. None found → Level 0 (no specs)
```

Use the highest detected level. Lower-level features are always available.

---

## Upgrading Between Levels

| From → To | What to do |
|-----------|-----------|
| 0 → 1 | Create first spec as a markdown file with YAML frontmatter |
| 1 → 2 | Create `specs/why/`, `specs/what/`, `specs/how/` and move specs into correct layer |
| 2 → 3 | Copy schemas to `specs/schemas/` or use built-in schemas via `$schema:` references |
| 3 → 4 | Create `.implemented.json` with current spec hashes |
| 4 → 5 | Add `// @spec ID#hash` annotations to code that implements specs |

`/spec-init` handles all upgrades interactively. `/spec-refactor` handles restructuring during upgrades.

---

## Command Adaptation by Level

| Command | Level 1-2 | Level 3 | Level 4 | Level 5 |
|---------|-----------|---------|---------|---------|
| `/spec` | Create/update markdown specs | + Validate against schemas | + Update .implemented.json | + Suggest code annotations |
| `/spec-init` | Create first spec or specs/ dirs | + Copy schemas | + Create .implemented.json | + Add annotation guide |
| `/spec-review` | Check structure and refs | + Run AI validation prompts | + Flag drifted implementations | + Check annotation hash drift |
| `/spec-deepen` | Gap analysis by layer | + Schema-guided questions | + Check unimplemented specs | + Compare annotations to spec content |
| `/spec-reverse` | Draft specs from code | + Apply schemas to drafts | + Create .implemented.json entries | + Add annotations to code |
| `/spec-refactor` | Split/merge/re-layer | + Update schema refs | + Update .implemented.json | + Update code annotations |
| `/spec-status` | Count by layer/type/status | + Validation summary | + Implementation tracking | + Annotation coverage and drift |
