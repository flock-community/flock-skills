# Spec Project Template

A typed, git-native specification system for AI-assisted development.

## Quick Start

```bash
# 1. Copy to your project
cp -r spec-project-template/ your-project/

# 2. Create first spec (vision)
# AI reads schemas/why/vision.yaml and follows its structure
```

## Structure

```
project/
├── schemas/                    # Type definitions (YAML)
│   ├── _base/entity.yaml      # Base fields all specs inherit
│   ├── common/index.yaml      # Shared types
│   ├── why/                   # Vision, Goal, Persona, Constraint, Decision
│   ├── what/                  # Entity, Feature, Rule, Journey, Interface
│   └── how/                   # Agent, Skill, Lens, Workflow, Stack
│
├── specs/                      # Spec instances
│   ├── why/
│   ├── what/
│   └── how/
│
├── scripts/
│   ├── index.py              # Generate specs-index.json
│   └── validate.py           # Validate specs
│
└── .implemented.json          # Implementation tracking
```

## Three Layers

| Layer | Question | Types |
|-------|----------|-------|
| **Why** | Why build this? | Vision, Goal, Persona, Constraint, Decision |
| **What** | What does it do? | Entity, Feature, Rule, Journey, Interface |
| **How** | How to build it? | Agent, Skill, Lens, Workflow, Stack |

## Schema System

Schemas in `schemas/` define:
- **Frontmatter fields** - types, required, defaults
- **Sections** - required headings, content types
- **AI validation** - prompts for quality checks

```yaml
# schemas/what/feature.yaml
$extends: ../_base/entity

frontmatter:
  $schema:
    const: feature
  priority:
    type: enum
    values: [critical, high, medium, low]

sections:
  - heading: Context
    required: true
    ai_validate: "Must explain why this feature exists"
```

## Workflow

1. AI reads schema for spec type
2. Creates spec with required fields/sections
3. Runs AI validation prompts
4. Connects to related specs across layers

## Commands

```bash
python3 scripts/index.py      # Generate index
python3 scripts/validate.py   # Validate specs
```

## Customization

Edit schemas in `schemas/` to:
- Add fields to existing types
- Create new spec types
- Modify AI validation prompts

## Implementation Tracking

```json
// .implemented.json
{
  "specs/what/features/login.md": "a1b2c3d4",
  "specs/what/entities/user.md": null
}
```

Hash = git blob hash when implemented. Different hash = spec changed.
