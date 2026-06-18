# Flock Skills

Agent skills for delivering Flock-quality software. These are plain `SKILL.md`
skills built on the open Agent Skills standard, so they work with any coding
agent (Claude Code, Cursor, Codex, Copilot, and others).

## Quickstart

```bash
npx skills@latest add flock-community/flock-skills
```

Pick the skills you want and which agents to install them on.

## Skills

### Engineering

- [spec](./skills/engineering/spec/SKILL.md): build, review, and maintain typed
  specifications. One skill with seven operations (build, init, review, deepen,
  reverse, refactor, status) for turning conversations and code into structured,
  validated, traceable requirements that AI agents can execute.
- [preflight](./skills/engineering/preflight/SKILL.md): end-of-coding done-gate.
  Runs the full test suite, reviews the branch diff via code-review, fixes the
  findings, then self-improves by saving durable learnings for next time.

### Productivity

- [demo-video](./skills/productivity/demo-video/SKILL.md): record a polished,
  flicker-free demo video (or GIF) of a running web app by driving it with
  headless Playwright, then transcoding and frame-verifying the result.

## Use as a Claude Code plugin

The repo also ships a `.claude-plugin/plugin.json` listing the published skills.
To load it directly for local use:

```bash
claude --plugin-dir /path/to/flock-skills
```

## Local development

Symlink every skill into `~/.claude/skills` so the local Claude CLI picks them up:

```bash
./scripts/link-skills.sh
```

## Structure

```
flock-skills/
├── .claude-plugin/plugin.json     # lists the published skills
├── package.json
├── scripts/link-skills.sh         # symlink skills into ~/.claude/skills
└── skills/
    ├── engineering/
    │   ├── spec/                    # SKILL.md + references/ + schemas/ + scripts/ + template/
    │   └── preflight/               # SKILL.md + scripts/
    └── productivity/
        └── demo-video/              # SKILL.md + REFERENCE.md + scripts/
```

Skills are grouped into category buckets. Each published skill is listed above
and registered in `.claude-plugin/plugin.json`.
