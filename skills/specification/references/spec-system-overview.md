# Spec System Overview

Specifications are markdown files with YAML frontmatter, organized in three layers, validated by schemas.

## Three Layers

| Layer | Question | Types | Stability |
|-------|----------|-------|-----------|
| **Why** | Why build this? | Vision, Goal, Persona, Constraint, Decision | Most stable |
| **What** | What does it do? | Entity, Feature, Rule, Journey, Interface | Moderate |
| **How** | How to build it? | Agent, Skill, Lens, Workflow, Stack | Least stable |

## Spec Format

Each spec is a markdown file with YAML frontmatter:

```markdown
---
$schema: feature
id: FEAT-001
title: User Login
status: draft
version: 1.0.0
why:
  - why/goals/user-retention
what:
  - what/entities/user
how:
  - how/skills/oauth
---

# User Login

## Context
[Why this feature exists]

## Goals
- MUST allow email/password authentication
- SHOULD remember login for 7 days
```

## Schema System

Schemas (`schemas/{layer}/{type}.yaml`) define:
- **Frontmatter fields** — required fields, types, defaults
- **Sections** — required/optional headings, content type
- **AI validation** — prompts for content quality checks
- `$extends` inherits from base schemas, `$imports` uses shared types

## ID Format

| Layer | Prefixes |
|-------|----------|
| Why | `VIS-`, `GOAL-`, `PER-`, `CONST-`, `DEC-` |
| What | `ENT-`, `FEAT-`, `RULE-`, `JOUR-`, `UI-` |
| How | `AGT-`, `SKL-`, `LNS-`, `WFL-`, `STACK-` |

## Requirements Language (RFC 2119)

- **MUST** — absolute requirement
- **SHOULD** — recommended, exceptions need justification
- **MAY** — truly optional

## Cross-Layer References

Specs reference each other via frontmatter fields (`why:`, `what:`, `how:`) using relative paths like `why/goals/user-retention`. References are bidirectional — a feature references its goals, goals reference their features.

## Integration Levels

The spec system supports 5 progressive levels from single-file to code-linked. See [integration-levels.md](integration-levels.md) for details.
