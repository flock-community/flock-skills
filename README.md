# Flock Skills

A Claude Code plugin with skills for delivering Flock-quality software projects.

## Installation

### From marketplace

Add the marketplace and install the plugin:

```shell
# Add the marketplace
/plugin marketplace add flock-community/flock-skills

# Install the plugin
/plugin install flock-skills@flock-community-flock-skills
```

Or from the CLI:

```bash
claude plugin install flock-skills@flock-community-flock-skills
```

### Local development

Test the plugin locally with `--plugin-dir`:

```bash
git clone https://github.com/flock-community/flock-skills.git
claude --plugin-dir ./flock-skills
```

## Available Skills

### specification

Transform conversations into typed, validated specifications.

**Invoke:** `/flock-skills:specification` or ask about "spec", "requirements", "PRD", "design doc"

**Usage:**
- Start a new project: "I want to build a todo app"
- Define features: "Users can add tasks with due dates"
- Record decisions: "We decided to use PostgreSQL because..."

## Managing the Plugin

```shell
# Enable/disable the plugin
/plugin enable flock-skills
/plugin disable flock-skills

# Uninstall
/plugin uninstall flock-skills@flock-community-flock-skills
```

## Plugin Structure

```
flock-skills/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── marketplace.json          # Marketplace catalog
├── skills/
│   └── specification/
│       ├── SKILL.md           # Skill definition
│       ├── schemas/           # YAML type schemas
│       ├── references/        # Reference documentation
│       ├── scripts/           # Python utilities
│       └── template/          # Project template
└── README.md
```

## Adding More Skills

Create a new folder under `skills/` with a `SKILL.md` file:

```
skills/
└── your-skill/
    └── SKILL.md
```

### SKILL.md Format

```markdown
---
name: your-skill
description: What this skill does. Claude uses this to decide when to invoke it.
---

Your instructions for Claude here...
```

The skill becomes available as `/flock-skills:your-skill` after reinstalling or restarting Claude Code.
