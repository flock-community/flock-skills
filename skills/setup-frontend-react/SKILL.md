---
name: setup-frontend-react
description: Use when setting up a new React frontend with Vite, TypeScript, TanStack Router, TanStack Query, and Ant Design
---

# Frontend React Project Setup Skill

Creates a React + Vite + TypeScript frontend with TanStack Router, TanStack Query, Ant Design, Storybook, design tokens, and layered architecture.

## What Gets Created

- **Vite** project with React + TypeScript
- **ESLint + Prettier** with strict TypeScript checking
- **TanStack Router** for type-safe file-based routing
- **TanStack Query** for data fetching and caching
- **Ant Design** UI components
- **Storybook** for component development
- **Design token system** extending Ant Design
- **Layered architecture** with enforced boundaries
- **Custom ESLint plugin** with AI-friendly error messages

## Process Overview

### Step 1: Gather Project Info

Use AskUserQuestion to collect:
- **Project name**: any format (normalized to lowercase-with-hyphens)
- **Target directory**: where to create the project

### Step 2: Normalize Project Name

Convert to lowercase-with-hyphens: `AgentCorpHQ` → `agent-corp-hq`

### Steps 3-8: Basic Setup

See [steps-basic.md](steps-basic.md) for:
- Create Vite project
- Configure ESLint + Prettier + boundaries
- Add npm scripts
- Install TanStack Router + Query
- Configure Vite with path aliases
- Install Ant Design

### Step 9: Storybook

See [steps-storybook.md](steps-storybook.md) for:
- Install Storybook with Vite builder
- Configure with Ant Design theme wrapper

### Steps 10-11: Architecture & Theme

See [steps-architecture.md](steps-architecture.md) for:
- Create layered directory structure
- Create design token system (colors, typography, spacing)

### Step 12: Example Component

See [steps-components.md](steps-components.md) for:
- Create Button component with Storybook stories

### Step 13: Custom ESLint Plugin

See [steps-eslint-plugin.md](steps-eslint-plugin.md) for:
- Create eslint-plugin-novacuria with design token rules

### Steps 14-23: Finalize

See [steps-finalize.md](steps-finalize.md) for:
- Update TypeScript config for path aliases
- Create routes and main entry point
- Create CLAUDE.md and README.md (templates in [templates/](templates/))
- Initialize git and verify setup

## Architecture

```
src/
├── theme/           # Design tokens (leaf layer)
├── shared/
│   ├── ui/          # Reusable UI components
│   └── lib/         # Pure utilities
├── features/        # Feature modules
├── hooks/           # Shared React hooks
└── routes/          # Pages (can import everything)
```

### Import Rules

| From | Can Import |
|------|------------|
| `theme/` | Nothing (leaf layer) |
| `shared/lib/` | Nothing (pure utilities) |
| `shared/ui/` | `theme/`, `shared/lib/` |
| `hooks/` | `theme/`, `shared/lib/` |
| `features/*` | `theme/`, `shared/*` (NOT other features) |
| `routes/` | Everything |

## Common Issues

1. **Route tree not generating** - TanStack Router plugin must be before React plugin in `vite.config.ts`
2. **TypeScript errors in routes** - Run `npm run dev` once to generate `routeTree.gen.ts`
3. **ESLint non-null assertion error** - Use explicit null checks with thrown errors
4. **Path alias not resolving** - Ensure both `vite.config.ts` and `tsconfig.app.json` have matching alias configurations
5. **Custom ESLint plugin not loading** - Ensure `eslint-plugin-novacuria/` directory exists with all rule files
