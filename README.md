# Flock Skills

Custom skills plugin for Claude Code.

## Installation

### Option 1: Install directly from Git URL

```bash
/plugin install https://github.com/flock-community/flock-skills.git
```

### Option 2: Via marketplace

```bash
# First, add this repo as a marketplace
/plugin marketplace add flock-community/flock-skills

# Then install the plugin
/plugin install flock-skills@flock-community-flock-skills
```

### Option 3: Clone and install locally

```bash
# Clone the repository
git clone https://github.com/flock-community/flock-skills.git ~/flock-skills

# Install from local path
/plugin install ~/flock-skills
```

## Available Skills

### specification

Transform conversations into typed, validated specifications.

**Invoke with:** `/flock-skills:specification`

**Triggers:** specification, spec, requirements, feature spec, PRD, design doc, ADR

**Usage:**
- Start a new project: "I want to build a todo app"
- Define features: "Users can add tasks with due dates"
- Record decisions: "We decided to use PostgreSQL because..."

## Plugin Structure

```
flock-skills/
├── .claude-plugin/
│   └── plugin.json       # Plugin manifest
├── skills/
│   └── specification/    # Specification skill
│       ├── SKILL.md
│       ├── references/
│       ├── scripts/
│       └── templates/
└── README.md
```

## Adding More Skills

Create a new folder under `skills/` with a `SKILL.md` file:

```
skills/
└── your-new-skill/
    ├── SKILL.md          # Required - skill instructions
    ├── references/       # Optional - supporting docs
    └── scripts/          # Optional - helper scripts
```

### SKILL.md Format

```markdown
---
name: your-skill-name
description: |
  What this skill does.
  MANDATORY TRIGGERS: keyword1, keyword2
---

# Your Skill Name

Instructions for Claude...
```

## Verification

After installation, verify the skill is loaded:

1. Type `/` to see available skills
2. Look for `flock-skills:specification` in the list
3. Or ask Claude: "What skills do you have available?"

## Uninstall

```bash
/plugin remove flock-skills
```
