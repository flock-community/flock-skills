---
name: spec
description: |
  Build new specs from conversation — transform ideas, requirements, and decisions into typed, validated specifications.

  MANDATORY TRIGGERS: specification, spec, requirements, feature spec, user story, acceptance criteria, domain model, "what to build", PRD, product requirements, design doc, ADR, decision record

  Use when: (1) Starting a new project, (2) Converting conversations into structured specs, (3) Defining features, entities, or business rules, (4) Recording architectural decisions, (5) Creating implementation guidance for AI agents
---

# /spec — Build Specs from Conversation

Transform conversations into typed specifications that AI agents can execute.

## Integration Level Detection

Before starting, detect the current integration level:

1. Check for `@spec` annotations in code files → Level 5
2. Check for `.implemented.json` → Level 4
3. Check for `specs/schemas/` or `$schema` references → Level 3
4. Check for `specs/` directory with `why/`, `what/`, or `how/` subdirs → Level 2
5. Check for any `.md` with `$schema` frontmatter → Level 1
6. None found → Level 0

See `../specification/references/integration-levels.md` for full detection and adaptation details.

**At level 0:** Suggest running `/spec-init` first, or create a single spec file (level 1).

## Using Schemas

**Before creating any spec**, read the schema for that type:

```bash
# Check if project has custom schemas
ls specs/schemas/  # Project-specific schemas

# Fall back to built-in schemas
# Read from: ../specification/schemas/{layer}/{type}.yaml
```

Schemas define:
- **Frontmatter fields** — required fields, types, defaults
- **Sections** — required/optional headings, content type
- **AI validation** — prompts for content quality checks

When creating a spec:
1. Read the schema: project `specs/schemas/{layer}/{type}.yaml` or built-in `../specification/schemas/{layer}/{type}.yaml`
2. Include all required frontmatter fields
3. Include all required sections
4. Run AI validation prompts against content

## The Three Layers

| Layer | Question | Types | Stability |
|-------|----------|-------|-----------|
| **Why** | Why build this? | Vision, Goal, Persona, Constraint, Decision | Most stable |
| **What** | What does it do? | Entity, Feature, Rule, Journey, Interface | Moderate |
| **How** | How to build it? | Agent, Skill, Lens, Workflow, Stack | Least stable |

## Conversation Loop

```
1. LISTEN  — Identify layer and spec type from conversation
2. STOP    — Run pre-creation checklist (MANDATORY — see below)
3. CLARIFY — Ask questions if checklist fails
4. ROUTE   — Separate mixed info into correct spec types
5. DRAFT   — Create/update spec following schema
6. VALIDATE — Run AI validation prompts from schema
7. CONNECT — Link to related specs across layers
```

For elicitation techniques: read `../specification/references/conversation-flow.md`

## Pre-Creation Checklist (MANDATORY)

**STOP before creating any spec. Do NOT skip this.**

| # | Check | Question | If NO → Action |
|---|-------|----------|----------------|
| 1 | Clear input? | Do I know WHO uses it, WHAT it does, WHY it matters? | Ask clarifying questions |
| 2 | Searched existing? | Did I check if similar spec exists? | Search specs/ directory first |
| 3 | Single concern? | Is this ONE spec type, not mixed info? | Split into separate specs |
| 4 | Correct layer? | Tech→How, Users→Why, Behavior→What? | Route to correct layer |
| 5 | No contradictions? | Does this conflict with existing specs? | Flag conflict, ask user |
| 6 | Measurable? | For vision/goals: are metrics specific numbers? | Ask "how would you measure?" |

### Checklist Example

**User says:** "I want to build a todo app using React"

```
1. Clear input?      → NO (Who? What's different?)
2. Searched existing? → N/A (new project)
3. Single concern?    → NO ("todo app" = vision, "React" = stack)
4. Correct layer?     → NO (React is How, not Why)
5. No contradictions? → N/A
6. Measurable?        → NO (no success criteria)

RESULT: Do NOT create spec yet.
ACTION: Ask "Who is this for? What makes it different?"
ACTION: Note "React goes in how/stack, not vision"
```

## Clarifying Questions

### Vague Input → Ask Questions
| Input Pattern | Ask |
|---------------|-----|
| "I want to build X" | "Who is this for? What makes it different?" |
| "Success means users like it" | "How would you measure that? Rating? Usage frequency?" |
| "The feature should work well" | "What does 'well' look like? Speed? Accuracy?" |
| No metrics given | "What numbers would tell you this is working?" |

### Technical in Wrong Layer → Redirect
| User Says | Problem | Response |
|-----------|---------|----------|
| "Vision is to use React Native" | Tech in Why layer | "That's a technical choice — goes in How/Stack. What problem does the app solve for users?" |
| "Feature: use Redux store" | Implementation as requirement | "That's how you'll build it. What should users experience?" |
| "Goal: build with microservices" | Architecture as goal | "That's an approach. What business outcome are you targeting?" |

### Contradictions → Flag and Resolve
When new input conflicts with existing specs:
```
"I notice this conflicts with [existing-spec]:
- You said: [new requirement]
- But earlier: [existing requirement]

How should we resolve this?"
```

## Update vs Create Protocol

**Before creating a new spec:**

1. **Search** existing specs for similar topic
2. **If similar exists**, ask: "Should I add this to [existing-spec] or create a new spec?"
3. **For small additions** (1-2 scenarios, edge case, detail): prefer updating existing spec
4. **For new capability** (different purpose, different users): create new spec

| Input | Action |
|-------|--------|
| "Also, dates should auto-parse" (during feature discussion) | Update existing feature with new scenario |
| "Oh, and show a loading spinner" | Update existing interface spec |
| "We need a completely different login for admins" | Create new feature (different purpose) |
| "The API should handle 1000 req/sec" | Update existing constraint OR create new non-functional constraint |

## Information Routing

**Send information to the correct spec type:**

| Information Type | Route To | NOT To |
|------------------|----------|--------|
| Technical choices (React, PostgreSQL) | how/stack or why/decisions | vision, features |
| User behaviors, frustrations, context | why/personas | features |
| Business rules (permissions, limits) | what/rules | feature edge cases |
| Implementation algorithms | how/skills or how/workflows | feature goals |
| Data structures with attributes | what/entities | feature descriptions |
| Non-functional requirements | why/constraints | feature goals |
| Success numbers | vision metrics or goals | feature context |

When user mentions something for the wrong layer:
```
"I've noted [detail]. That belongs in a [correct-type] spec.
Should I create that now, or continue with [current-topic]?"
```

## Spec Format

```markdown
---
$schema: feature
id: FEAT-001
title: User Login
status: draft
version: 1.0.0
why:
  - why/goals/user-retention
  - why/personas/registered-user
what:
  - what/entities/user
  - what/rules/authentication
how:
  - how/skills/oauth
---

# User Login

## Context
[Required section per schema]

## Goals
- MUST allow email/password authentication
- SHOULD remember login for 7 days

## Rules and Scenarios

### Rule: Valid credentials grant access
- Given: User has verified account
- When: Enters correct credentials
- Then: Redirected to dashboard
```

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

## Built-in Schemas

This skill includes default schemas in `../specification/schemas/`:

**Why**: `vision.yaml`, `goal.yaml`, `persona.yaml`, `constraint.yaml`, `decision.yaml`
**What**: `entity.yaml`, `feature.yaml`, `rule.yaml`, `journey.yaml`, `interface.yaml`
**How**: `agent.yaml`, `skill.yaml`, `lens.yaml`, `workflow.yaml`, `stack.yaml`

Projects can override these by creating `specs/schemas/` with custom versions.

## Reference Files

For deeper guidance on specific topics:
- `../specification/references/conversation-flow.md` — Elicitation techniques and Example Mapping
- `../specification/references/validation-patterns.md` — AI validation patterns and prompts
- `../specification/references/evolution.md` — Splitting, versioning, deprecation
- `../specification/references/tooling.md` — Index and validate scripts
- `../specification/references/spec-system-overview.md` — Condensed system overview
- `../specification/references/integration-levels.md` — Progressive integration levels
