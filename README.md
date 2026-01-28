# Flock Skills

## Why

AI coding assistants build what you ask literally, not what you need.
Specifications bridge intent and implementation — structured, validated,
traceable requirements that AI agents can execute precisely.

## What

7 commands for creating, reviewing, and maintaining typed specifications.
Specs are markdown files with YAML frontmatter, organized in three layers
(Why / What / How), progressively validated from simple files to
schema-validated, implementation-tracked, code-linked systems.

## Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/spec` | Build new specs from conversation | "I want to build a todo app" |
| `/spec-init` | Set up spec directory structure | "Set up specs for this project" |
| `/spec-review` | Review specs for quality and completeness | "Check my specs for problems" |
| `/spec-deepen` | Deepen specs through reflection and questioning | "What's missing from my specs?" |
| `/spec-reverse` | Reverse engineer code into specs | "Generate specs from this codebase" |
| `/spec-refactor` | Restructure, migrate, or import specs | "Split this large spec" |
| `/spec-status` | Show spec system state, health, and drift | "How are my specs doing?" |

## Integration Levels

| Level | Name | What it adds |
|-------|------|-------------|
| 1 | Single file | One `.md` spec with YAML frontmatter |
| 2 | Hierarchy | Specs organized in `specs/why/`, `specs/what/`, `specs/how/` |
| 3 | Schema-validated | YAML schemas define structure + AI validation prompts |
| 4 | Implementation-tracked | `.implemented.json` maps spec paths to git blob hashes |
| 5 | Code-linked | Code annotations `// @spec FEAT-001#a1b2c3d4` reference spec ID + version hash |

Start at any level. Use `/spec-init` to set up or upgrade.

## Installation

```shell
# Add the marketplace
/plugin marketplace add flock-community/flock-skills

# Install the plugin
/plugin install flock-skills@flock-community-flock-skills
```

### Local development

```bash
git clone https://github.com/flock-community/flock-skills.git
claude --plugin-dir ./flock-skills
```

### Managing the plugin

```shell
/plugin enable flock-skills
/plugin disable flock-skills
/plugin uninstall flock-skills@flock-community-flock-skills
```

## Plugin Structure

```
flock-skills/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── skills/
│   ├── specification/           # Shared knowledge base
│   │   ├── schemas/             # 15 YAML type schemas
│   │   ├── references/          # System docs and guides
│   │   ├── scripts/             # Python utilities
│   │   └── template/            # Project template
│   ├── spec/SKILL.md            # /spec command
│   ├── spec-init/SKILL.md       # /spec-init command
│   ├── spec-review/SKILL.md     # /spec-review command
│   ├── spec-deepen/SKILL.md     # /spec-deepen command
│   ├── spec-reverse/SKILL.md    # /spec-reverse command
│   ├── spec-refactor/SKILL.md   # /spec-refactor command
│   └── spec-status/SKILL.md     # /spec-status command
└── README.md
```
