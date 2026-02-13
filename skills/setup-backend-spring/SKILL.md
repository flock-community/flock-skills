---
name: setup-backend-spring
description: Use when setting up a new Kotlin Spring Boot backend, creating a multi-module project, scaffolding hexagonal architecture, or initializing a new backend service with domain/api/adapters structure
---

# Backend Project Setup Skill

Creates a Kotlin Spring Boot backend with hexagonal architecture, multi-module Gradle structure, and Detekt rules for boundary enforcement.

## What Gets Created

- **Spring Boot** project with Kotlin and coroutines
- **Multi-module structure**: domain, api, adapters, app
- **Hexagonal architecture** with enforced boundaries
- **Detekt** with custom hexagonal rules
- **Arrow-kt** for functional programming support

## Process Overview

### Step 1: Gather Project Info

Use AskUserQuestion to collect:
- **Project name**: any format (normalized to lowercase-with-hyphens)
- **Group ID**: reverse domain notation (e.g., `community.flock.myproject`)
- **Target directory**: where to create the project
- **Build tool**: Gradle (Recommended) or Maven

### Step 2: Optional Dependencies

Use AskUserQuestion with multiSelect:
- spring-data-jpa, spring-data-r2dbc, spring-boot-starter-security, spring-boot-starter-validation, or None

### Step 3: Normalize Project Name

Convert to lowercase-with-hyphens: `AgentCorpHQ` → `agent-corp-hq`

### Steps 4-7: Project Generation & Structure

See [steps-basic.md](steps-basic.md) for:
- Fetch Spring Boot version from Spring Initializr
- Generate base project via curl
- Transform to multi-module structure
- Configure all build.gradle.kts files

### Step 8: Detekt Configuration

See [steps-detekt.md](steps-detekt.md) for:
- Create domain/detekt.yml with hexagonal rules
- Configure boundary enforcement

### Steps 9-13: Finalize

See [steps-finalize.md](steps-finalize.md) for:
- Create Application class
- Create application.properties
- Create CLAUDE.md and README.md (templates in [templates/](templates/))
- Initialize git repository
- Verify build

## Architecture

```
{project-name}/
├── domain/          # Business logic, entities, ports (no framework deps)
├── api/             # REST controllers, DTOs
├── adapters/        # Port implementations
└── app/             # Entry point, wires all modules
```

### Module Dependency Rules

| Module | Can Depend On | Cannot Depend On |
|--------|---------------|------------------|
| domain | (nothing) | api, adapters, app |
| api | domain | adapters, app |
| adapters/* | domain | api, other adapters, app |
| app | domain, api, adapters/* | (none - entry point) |

Detekt with hexagonal rules enforces these constraints.

## Common Mistakes

1. **Forgetting `scanBasePackages`** in `@SpringBootApplication` - Spring won't discover beans
2. **Domain depending on other modules** - Domain must be pure; detekt catches violations
3. **Not adding new adapter modules to app dependencies** - App needs all adapters
4. **Missing adapter in settings.gradle.kts** - New adapter modules must be included

## Adding a New Adapter

See [steps-adapters.md](steps-adapters.md) for instructions on adding database or external service adapters.
