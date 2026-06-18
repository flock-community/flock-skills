# Build specs from conversation

Transform conversations into typed specifications that AI agents can execute.

Detect the integration level first (see [SKILL.md](../SKILL.md) → Integration Level Detection). At level 0, suggest the **init** operation, or create a single spec file (level 1).

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

For elicitation techniques: read `conversation-flow.md`.

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
| "Vision is to use React Native" | Tech in Why layer | "That's a technical choice, goes in How/Stack. What problem does the app solve for users?" |
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

## After Building

- Run AI validation prompts from the schema (see `validation-patterns.md`).
- Connect the new spec to related specs across layers.
- Suggest the **review** operation to validate quality, or the **deepen** operation to fill gaps.
