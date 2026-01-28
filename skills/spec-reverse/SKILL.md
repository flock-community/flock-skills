---
name: spec-reverse
description: |
  Reverse engineer existing code into specs — analyze codebase structure, identify features and domain models, and draft typed specifications.

  MANDATORY TRIGGERS: spec-reverse, "reverse engineer", "spec from code", "document existing code"

  Use when: A codebase exists but has no specs, or parts of the code are unspecified and need documentation
---

# /spec-reverse — Reverse Engineer Code into Specs

Analyze existing code to draft typed specifications, then review with the user.

## Integration Level Detection

Detect the current level:

1. Check for `@spec` annotations in code files → Level 5
2. Check for `.implemented.json` → Level 4
3. Check for `specs/schemas/` or `$schema` references → Level 3
4. Check for `specs/` directory with `why/`, `what/`, or `how/` subdirs → Level 2
5. Check for any `.md` with `$schema` frontmatter → Level 1
6. None found → Level 0

See `../specification/references/integration-levels.md` for full details.

**At level 0:** Suggest running `/spec-init` first to set up the directory structure. Or proceed with level 1 (single files) and upgrade later.

## Reverse Engineering Flow

1. **Ask scope:** Whole project, specific directory, or specific files
2. **Analyze code** — read structure, identify components
3. **Map to spec types** — classify findings into layers and types
4. **Draft specs** — create drafts following schemas
5. **Review with user** — present drafts by layer, ask to confirm/correct
6. **Write specs** — save confirmed specs to the correct locations
7. **Connect** — add cross-references between specs

## Code Analysis

### Step 1: Project Structure

Read the project structure to understand the codebase:
- Directory organization (feature-based, layer-based, mixed)
- Entry points (main files, index files, route definitions)
- Configuration files (package.json, Cargo.toml, pyproject.toml, etc.)

### Step 2: Identify Components

| What to Find | Maps to Spec Type |
|--------------|-------------------|
| Tech stack (languages, frameworks, databases) | How/Stack |
| Data models, database schemas, types/interfaces | What/Entity |
| User-facing features, API endpoints, UI screens | What/Feature |
| Validation logic, permission checks, business rules | What/Rule |
| User flows, multi-step processes | What/Journey |
| UI components, pages, layouts | What/Interface |
| Background jobs, cron tasks, event handlers | How/Workflow |
| Reusable patterns, shared utilities | How/Skill |

### Step 3: Infer Why Layer

The Why layer must be inferred — code doesn't explicitly state purpose:
- **Vision** — infer from README, project description, or ask the user
- **Goals** — infer from metrics/analytics code, KPIs, or ask the user
- **Personas** — infer from auth roles, user types, or ask the user
- **Constraints** — infer from rate limits, validation rules, env configs
- **Decisions** — infer from comments, commit history, or ask the user

**Always ask the user to confirm Why layer specs.** Code reveals What and How but rarely Why.

## Drafting Specs

For each identified component:

1. **Read the schema** — project `specs/schemas/{layer}/{type}.yaml` or built-in `../specification/schemas/{layer}/{type}.yaml`
2. **Fill frontmatter** — all required fields, set `status: draft`
3. **Fill sections** — based on code analysis
4. **Mark uncertainties** — add hotspot comments where you're guessing:
   ```markdown
   ## Goals
   - MUST authenticate users via email/password <!-- HOTSPOT: confirm auth methods -->
   - SHOULD support social login <!-- HOTSPOT: saw OAuth config but unclear if active -->
   ```
5. **Add cross-references** — link specs to each other across layers

## Review with User

Present drafts **by layer**, starting with Why (needs most human input):

1. **Why layer first** — "Here's what I inferred about the project's purpose. Is this right?"
2. **What layer** — "Here are the features and domain models I found. Anything missing or wrong?"
3. **How layer** — "Here's the technical architecture I identified. Corrections?"

For each draft:
- Highlight hotspots that need confirmation
- Ask specific questions, not "does this look right?"
- Accept corrections and update immediately

## Level-Specific Behavior

### Level 4: Implementation Tracking

After writing confirmed specs, update `.implemented.json` with current hashes:
```bash
git hash-object specs/what/feature/login.md
```

### Level 5: Code Annotations

After specs are confirmed, add annotations to the analyzed code:
```javascript
// @spec FEAT-001#a1b2c3d4
function login(email, password) { ... }
```

- Compute hash: first 8 characters of `git hash-object` for the spec file
- Add annotations to functions, classes, or modules that implement the spec
- Ask user before modifying code files

## After Reverse Engineering

- Suggest running `/spec-review` to validate drafted specs
- Suggest running `/spec-deepen` to fill gaps identified during analysis
- If many drafts were created, suggest reviewing a few at a time rather than all at once
