# Evolution

How specs change over time—splitting, merging, versioning, deprecating.

## Table of Contents

1. [When to Evolve](#when)
2. [Splitting Specs](#splitting)
3. [Merging Specs](#merging)
4. [Versioning](#versioning)
5. [Deprecation](#deprecation)
6. [Change Management](#change-management)

---

## When

Specs are living documents. Recognize these signals:

### Signals for Evolution

| Signal | Problem | Action |
|--------|---------|--------|
| Spec > 150 lines | Too large to navigate | Split |
| Same content in multiple specs | Duplication | Merge or extract |
| Multiple unrelated sections | Scope creep | Split |
| Questions keep arising | Incomplete | Add missing content |
| Implementation reveals gaps | Underspecified | Update |
| Old behavior described | Outdated | Update or deprecate |
| Conflicting specs | Inconsistency | Resolve and consolidate |

### The 150-Line Rule

When a spec exceeds ~150 lines:
1. Check if it covers distinct sub-topics
2. If yes: split into parent + children
3. If no: it may be appropriately detailed

---

## Splitting

Create hierarchy—parent overview + children with details.

### When to Split

- Spec exceeds 150 lines
- Distinct sub-topics within one spec
- Different audiences need different detail levels
- Different sections change at different rates
- Sections could be referenced independently

### Split Strategies

**Strategy 1: Parent + Children**

Keep original as parent, extract details to children:

```
Before:
features/
└── user-management.md (250 lines)

After:
features/
├── user-management.md (50 lines - overview)
└── user-management/
    ├── registration.md
    ├── authentication.md
    ├── profile.md
    └── permissions.md
```

**Strategy 2: Index + Peers**

For equal-weight topics:

```
Before:
features/checkout.md (300 lines)

After:
features/checkout/
├── index.md (overview + links)
├── cart.md
├── payment.md
├── shipping.md
└── confirmation.md
```

**Strategy 3: Flat Split**

For truly independent topics:

```
Before:
features/user-and-permissions.md

After:
features/user.md
features/permissions.md
```

### What Stays in Parent

| Stays in Parent | Moves to Children |
|-----------------|-------------------|
| Overview/purpose | Detailed requirements |
| Core expectations | Extended scenarios |
| Key scenarios (2-3) | Edge cases |
| Links to children | Full business rules |
| High-level behavior | Implementation notes |

### Parent Spec Pattern

```markdown
---
$schema: feature
id: FEAT-001
title: User Management
status: active
children:
  - user-management/registration
  - user-management/authentication
  - user-management/profile
---

# User Management

## Overview
Complete user lifecycle from registration through account management.

## Core Expectations
- Registration completes in under 2 minutes
- Login works across all devices
- Profile updates reflect immediately

## Components
- [Registration](user-management/registration.md) - Signup flow
- [Authentication](user-management/authentication.md) - Login/logout
- [Profile](user-management/profile.md) - User settings

## Key Scenarios

### Happy Path: New User
- Given: Visitor on landing page
- When: Completes registration
- Then: Lands on onboarding flow
- Details: See [Registration](user-management/registration.md#success-flow)
```

### Child Spec Pattern

```markdown
---
$schema: feature
id: FEAT-001-A
title: User Registration
status: active
parent: features/user-management
---

# User Registration

Part of: [User Management](../user-management.md)

## Context
New users create accounts to access the system.

[Detailed content here...]

## Related
- [Authentication](authentication.md) - After registration
- [Profile](profile.md) - Initial profile setup
```

---

## Merging

Combine related specs to reduce fragmentation.

### When to Merge

- Specs cover closely related topics
- One spec is subset of another
- Maintaining separately causes inconsistency
- Users look in wrong place for information
- Combined would still be < 150 lines

### Merge Process

1. **Identify candidates**
   - Specs that heavily reference each other
   - Specs in same domain with overlapping scope

2. **Analyze overlap**
   - What content is duplicated?
   - What content is unique?
   - What conflicts exist?

3. **Plan structure**
   - How will merged spec be organized?
   - What sections will it have?

4. **Execute merge**
   - Combine unique content
   - Resolve duplicates (keep best version)
   - Resolve conflicts

5. **Update references**
   - Find all specs referencing old specs
   - Update to reference merged spec

6. **Deprecate old specs**
   - Mark as deprecated with pointer to new location

### Merge Example

```
Before:
features/
├── login.md (50 lines)
├── signup.md (40 lines)
├── logout.md (20 lines)
└── password.md (60 lines)

After:
features/
└── authentication.md (150 lines)
    - Login section
    - Signup section
    - Logout section
    - Password Management section

+ Deprecation notices in old files pointing to authentication.md
```

---

## Versioning

When specs undergo breaking changes that require coexistence.

### When to Version

- Breaking change to existing behavior
- Need to support old and new simultaneously
- Major feature overhaul
- API contract change

### Version Types

| Change Type | Action |
|-------------|--------|
| Clarification | Update in place |
| New behavior | Increment minor version |
| Breaking change | Increment major version |
| Removed | Deprecate |

### Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes (incompatible)
MINOR: New functionality (backward compatible)
PATCH: Clarifications, typo fixes
```

### Version in Frontmatter

```yaml
---
$schema: feature
id: FEAT-001
title: Checkout Flow
status: active
version: 2.0.0

changelog:
  - version: "2.0.0"
    date: 2025-01-15
    changes:
      - "Redesigned payment flow"
      - "BREAKING: Removed PayPal support"
  - version: "1.1.0"
    date: 2024-09-01
    changes:
      - "Added Apple Pay support"
  - version: "1.0.0"
    date: 2024-01-01
    changes:
      - "Initial version"
---
```

### Multiple Active Versions

When both versions must be supported:

```
features/
├── checkout-v1.md (deprecated, removal: 2025-06)
├── checkout-v2.md (current)
└── checkout-v2/
    ├── payment.md
    └── shipping.md
```

Or with directories:

```
features/
├── v1/
│   └── checkout.md
├── v2/
│   └── checkout.md
└── current → v2/  (symlink)
```

---

## Deprecation

When specs are replaced or removed.

### When to Deprecate

- Feature being removed
- Replaced by newer spec
- Consolidated into another spec
- No longer accurate

### Deprecation Process

1. **Add deprecation metadata**

```yaml
---
status: deprecated
deprecated_since: 2025-01-15
deprecated_reason: "Merged into authentication.md"
replacement: design/features/authentication
removal_date: 2025-04-15
---
```

2. **Add visible warning**

```markdown
> ⚠️ **DEPRECATED**
>
> This spec is deprecated and will be removed on 2025-04-15.
> See [Authentication](authentication.md) for the current spec.
```

3. **Update references**
   - Find all specs referencing this one
   - Update to reference replacement

4. **Remove after grace period**
   - Keep deprecated spec during transition
   - Remove after removal_date

### Grace Period Guidelines

| Impact | Minimum Grace Period |
|--------|----------------------|
| Minor consolidation | 1 month |
| Feature change | 2 months |
| Breaking change | 3 months |
| Major redesign | 6 months |

---

## Change Management

Process for evolving specs safely.

### Change Types

| Type | Approval | Process |
|------|----------|---------|
| Typo fix | None | Update in place |
| Clarification | Informal | Update, note in changelog |
| New scenario | Review | Add, increment patch |
| New behavior | Review + stakeholder | Add, increment minor |
| Breaking change | Full review | New version, deprecate old |
| Removal | Stakeholder approval | Deprecate with timeline |

### Change Request Template

```markdown
## Spec Change Request

**Spec:** design/features/checkout.md
**Change type:** [clarification | new behavior | breaking | removal]

### Current State
[What the spec says now]

### Proposed Change
[What it should say]

### Rationale
[Why this change is needed]

### Impact
- Affected specs: [list]
- Affected implementations: [list]
- Migration needed: [yes/no]

### Stakeholder Sign-off
- [ ] Product owner
- [ ] Tech lead
- [ ] QA lead
```

### Impact Analysis

Before making changes:

1. **Find dependents**
   - Which specs reference this one?
   - Which implementations depend on this?
   - Which tests verify this behavior?

2. **Assess impact**
   - Does this break existing behavior?
   - Does this require code changes?
   - Does this affect users?

3. **Plan migration**
   - What needs to change?
   - In what order?
   - Who is responsible?

### Changelog Entry

```yaml
changelog:
  - version: "1.2.0"
    date: 2025-01-20
    type: minor
    changes:
      - "Added support for guest checkout (FEAT-123)"
      - "Clarified shipping calculation for international orders"
    migration: null
```

For breaking changes:

```yaml
changelog:
  - version: "2.0.0"
    date: 2025-01-20
    type: breaking
    changes:
      - "BREAKING: Removed legacy payment API"
      - "BREAKING: Changed order status enum values"
    migration: |
      1. Update all code using PaymentV1 to PaymentV2
      2. Run status migration script: scripts/migrate-order-status.py
      3. Update test fixtures with new status values
```
