---
name: spec
description: |
  Build, review, and maintain typed specifications — structured, validated, traceable requirements that AI agents can execute. One skill, several operations: build (create from conversation), init (set up structure), review (quality/drift), deepen (fill gaps via questioning), reverse (code into specs), refactor (split/merge/import/upgrade), status (health overview).

  MANDATORY TRIGGERS: specification, spec, requirements, feature spec, user story, acceptance criteria, domain model, "what to build", PRD, product requirements, design doc, ADR, decision record, "set up specs", "review specs", "check specs", "spec gaps", "what's missing", "reverse engineer", "spec from code", "refactor specs", "split spec", "spec status", "spec health"

  Use when: (1) Starting a new project, (2) Converting conversations into structured specs, (3) Defining features, entities, or business rules, (4) Recording architectural decisions, (5) Documenting existing code, (6) Auditing or maintaining a spec system.
---

# spec — typed specifications that AI agents can execute

A single skill with seven operations. Identify the operation that matches the request, detect the integration level, then follow the matching reference file.

## Operations

| Operation | When | Reference |
|-----------|------|-----------|
| **build** | Create specs from conversation, ideas, or decisions | `references/build.md` |
| **init** | Set up or upgrade the spec directory structure | `references/init.md` |
| **review** | Check quality, cross-references, and drift | `references/review.md` |
| **deepen** | Find gaps and add depth via targeted questions | `references/deepen.md` |
| **reverse** | Reverse engineer existing code into specs | `references/reverse.md` |
| **refactor** | Split, merge, re-layer, import, or upgrade specs | `references/refactor.md` |
| **status** | Report system state, health, and coverage | `references/status.md` |

If the request is ambiguous, ask which operation, or infer from context: no specs yet → **init** or **reverse**; specs exist with a quality concern → **review** or **deepen**.

## Integration Level Detection

Before any operation, detect the current level:

1. Check for `@spec` annotations in code files → Level 5
2. Check for `.implemented.json` → Level 4
3. Check for `specs/schemas/` or `$schema` references → Level 3
4. Check for `specs/` directory with `why/`, `what/`, or `how/` subdirs → Level 2
5. Check for any `.md` with `$schema` frontmatter → Level 1
6. None found → Level 0

See `references/integration-levels.md` for full detection and adaptation details. At level 0, suggest the **init** operation, or create a single spec file (level 1).

## The Three Layers

| Layer | Question | Types | Stability |
|-------|----------|-------|-----------|
| **Why** | Why build this? | Vision, Goal, Persona, Constraint, Decision | Most stable |
| **What** | What does it do? | Entity, Feature, Rule, Journey, Interface | Moderate |
| **How** | How to build it? | Agent, Skill, Lens, Workflow, Stack | Least stable |

## Using Schemas

**Before creating or validating any spec**, read the schema for that type:

1. Project schemas first: `specs/schemas/{layer}/{type}.yaml`
2. Fall back to built-in: `schemas/{layer}/{type}.yaml`

Schemas define frontmatter fields (required fields, types, defaults), sections (required/optional headings), and AI validation prompts. When creating a spec: include all required frontmatter fields and sections, then run the schema's AI validation prompts against the content.

Built-in schemas (in `schemas/`):

- **Why**: `vision.yaml`, `goal.yaml`, `persona.yaml`, `constraint.yaml`, `decision.yaml`
- **What**: `entity.yaml`, `feature.yaml`, `rule.yaml`, `journey.yaml`, `interface.yaml`
- **How**: `agent.yaml`, `skill.yaml`, `lens.yaml`, `workflow.yaml`, `stack.yaml`

Projects override these by creating `specs/schemas/` with custom versions.

## Quick Reference

### Type Detection
| User says... | Type |
|--------------|------|
| "The goal is..." | Why/Goal |
| "Our users are..." | Why/Persona |
| "We decided to..." | Why/Decision |
| "A [thing] has..." | What/Entity |
| "Users can..." | What/Feature |
| "If X then Y" | What/Rule |
| "The screen shows..." | What/Interface |
| "We'll use [tech]..." | How/Stack |

### Requirements Language (RFC 2119)
| Keyword | Meaning |
|---------|---------|
| **MUST** | Absolute requirement |
| **SHOULD** | Recommended |
| **MAY** | Truly optional |

### ID Format
- `VIS-001`, `GOAL-001`, `PER-001`, `CONST-001`, `DEC-001`
- `ENT-001`, `FEAT-001`, `RULE-001`, `JOUR-001`, `UI-001`
- `AGT-001`, `SKL-001`, `LNS-001`, `WFL-001`, `STACK-001`

## Reference Files

Operations:
- `references/build.md` — create specs from conversation
- `references/init.md` — set up or upgrade the structure
- `references/review.md` — quality, cross-references, drift
- `references/deepen.md` — gap-finding through questioning
- `references/reverse.md` — reverse engineer code into specs
- `references/refactor.md` — split, merge, re-layer, import, upgrade
- `references/status.md` — system health overview

Shared knowledge:
- `references/conversation-flow.md` — elicitation techniques and Example Mapping
- `references/validation-patterns.md` — AI validation patterns and prompts
- `references/evolution.md` — splitting, versioning, deprecation
- `references/tooling.md` — index and validate scripts
- `references/integration-levels.md` — progressive integration levels
- `references/spec-system-overview.md` — condensed system overview

The project template lives in `template/`; built-in schemas in `schemas/`; utility scripts in `scripts/`.
