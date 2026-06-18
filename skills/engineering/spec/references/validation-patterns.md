# Validation Patterns

AI validation prompts for spec quality. Schemas define structure; validation ensures content quality.

## Table of Contents

1. [How AI Validation Works](#how-it-works)
2. [Variable Syntax](#variables)
3. [Validation Patterns by Type](#patterns)
4. [Completeness Checks](#completeness)
5. [Quality Criteria](#quality)

---

## How It Works

AI validation adds semantic checks beyond schema structure. Prompts run against spec content to verify quality.

### Schema Definition

```yaml
# In schemas/feature.yaml
sections:
  - heading: Goals
    content: list
    min_items: 3
    ai_validate: "Each goal must use MUST/SHOULD/MAY language from RFC 2119"

  - heading: Scenarios
    content: structured
    ai_validate: "Each scenario must be completable by $personas.0 in under 5 minutes"
```

### Validation Process

1. Parse spec into frontmatter + sections
2. For each section with `ai_validate`:
   - Substitute variables with actual values
   - Send section content + prompt to AI
   - Return pass/fail + explanation
3. Aggregate results

### Output Format

```json
{
  "spec": "features/login.md",
  "valid": false,
  "results": [
    {
      "section": "Goals",
      "valid": true,
      "message": "All 4 goals use proper requirements language"
    },
    {
      "section": "Scenarios",
      "valid": false,
      "message": "Scenario 'Password reset flow' requires 7 steps, exceeding 5-minute threshold for 'casual-user' persona"
    }
  ]
}
```

---

## Variables

Variables in validation prompts reference spec content.

### Syntax

| Pattern | Resolves To |
|---------|-------------|
| `$fieldname` | Frontmatter field value |
| `$fieldname.property` | Nested property |
| `$fieldname.0` | First item in array |
| `$sections.Heading` | Section content |
| `$refs.type` | Referenced specs of type |

### Examples

```yaml
# Frontmatter
personas: [casual-user, power-user]
entities: [order, product]
priority: high

# Validation prompts
ai_validate: "Achievable by $personas.0"
# → "Achievable by casual-user"

ai_validate: "Must cover all $entities"
# → "Must cover all [order, product]"

ai_validate: "Appropriate complexity for $priority priority"
# → "Appropriate complexity for high priority"

ai_validate: "Consistent with $sections.Context"
# → "Consistent with [Context section content]"
```

### Referenced Specs

```yaml
refs:
  - design/personas/casual-user
  - design/entities/order

ai_validate: "Scenarios must match capabilities of $refs.persona.Capabilities"
# → Loads casual-user.md, extracts Capabilities section
```

---

## Patterns

### Vision Specs

```yaml
sections:
  - heading: Purpose
    ai_validate: |
      Must answer: What problem does this solve?
      Must be specific, not generic ("help users" is too vague)
      Should be 2-4 sentences

  - heading: Success Criteria
    content: list
    ai_validate: |
      Each criterion must be SMART:
      - Specific (not vague)
      - Measurable (has a number or clear threshold)
      - Achievable (realistic given constraints)
      - Relevant (ties back to Purpose)
      - Time-bound (has a timeframe, explicit or implied)

  - heading: Non-Goals
    ai_validate: |
      Each item must be something reasonable stakeholders might expect
      but we explicitly choose not to do.
      "Not a social network" is too obvious.
      "Not supporting IE11" is valid if audience might expect it.
```

### Feature Specs

```yaml
sections:
  - heading: Goals
    ai_validate: |
      Each goal must:
      - Start with MUST, SHOULD, or MAY
      - Describe observable user outcome
      - Not mention implementation details
      - Be testable (can write a scenario for it)

  - heading: Rules and Examples
    ai_validate: |
      Each rule must have at least 2 examples:
      - One where rule applies (positive case)
      - One where rule doesn't apply (negative case)
      Examples must use concrete values, not placeholders.

  - heading: Scenarios
    ai_validate: |
      Each scenario must:
      - Follow Given/When/Then format
      - Have exactly one When clause
      - Use concrete data values
      - Be independently testable
      - Be achievable by $personas within 3 user actions

  - heading: Rabbit Holes
    ai_validate: |
      Each item must identify:
      - A specific complexity risk
      - A mitigation or simplification approach
      Should not be generic ("be careful with performance")
```

### Entity Specs

```yaml
sections:
  - heading: Attributes
    ai_validate: |
      Each attribute must specify:
      - Data type (string, number, date, enum, etc.)
      - Required or optional
      - Constraints (length, range, format)
      No implementation-specific types (no "VARCHAR(255)")

  - heading: Relationships
    ai_validate: |
      Each relationship must specify:
      - Related entity (must exist or be marked as TODO)
      - Cardinality (one-to-one, one-to-many, many-to-many)
      - Whether required or optional
      - Direction of ownership if applicable

  - heading: States
    ai_validate: |
      If entity has lifecycle:
      - All states must be named
      - All valid transitions must be shown
      - Terminal states must be identified
      - No orphan states (unreachable or inescapable)

  - heading: Business Rules
    ai_validate: |
      Each rule must be enforceable at the entity level.
      Rules requiring cross-entity checks belong in design/rules/
```

### Rule Specs

```yaml
sections:
  - heading: Statement
    ai_validate: |
      Must be a single, clear sentence.
      Subject must be explicit (not "the system" or "it").
      Must be domain language, not technical.

  - heading: Condition
    ai_validate: |
      Must specify:
      - When the rule is evaluated (trigger)
      - What is checked (predicate)
      Must be evaluable with available data.

  - heading: Action
    ai_validate: |
      Must specify observable outcome.
      If multiple outcomes, must be mutually exclusive.
      Must not include implementation ("update database").

  - heading: Examples
    ai_validate: |
      Must have at least 3 examples:
      - One where rule applies as expected
      - One edge case
      - One where rule explicitly doesn't apply
```

### Agent Specs

```yaml
sections:
  - heading: Responsibilities
    ai_validate: |
      Each responsibility must:
      - Start with a verb
      - Be achievable with listed $skills
      - Not overlap with other agents' responsibilities
      - Be specific enough to verify completion

  - heading: Constraints
    ai_validate: |
      Each constraint must:
      - Use MUST NOT / SHOULD NOT language
      - Be verifiable (can check if violated)
      - Include rationale if not obvious
```

### Skill Specs

```yaml
sections:
  - heading: Steps
    ai_validate: |
      Steps must:
      - Be in logical order
      - Have clear completion criteria
      - Reference specific inputs/outputs
      - Not assume implicit knowledge
      - Be executable by an AI agent

  - heading: Examples
    ai_validate: |
      At least one complete worked example showing:
      - Input state
      - Each step applied
      - Final output
```

---

## Completeness

Standard completeness checks applicable to all specs.

### Coverage Checklist

```yaml
ai_validate_spec: |
  Verify the spec covers:

  HAPPY PATHS:
  - [ ] Primary use case has complete scenario
  - [ ] All MUST goals have corresponding scenarios

  ERROR CASES:
  - [ ] At least one error scenario per rule
  - [ ] Error messages are specified (exact wording)

  EDGE CASES:
  - [ ] Empty/null/missing data handled
  - [ ] Boundary values addressed
  - [ ] Concurrent access considered (if applicable)

  STATES:
  - [ ] Initial state defined
  - [ ] Success state defined
  - [ ] Loading/pending states (if UI)
```

### Cross-Reference Validation

```yaml
ai_validate_refs: |
  For each ref in frontmatter:
  - Referenced spec must exist
  - Reference relationship is correct type (uses, extends, implements)
  - No circular references
  - Referenced spec is active (not deprecated)
```

---

## Quality

Quality criteria beyond structure and completeness.

### Abstraction Level

```yaml
ai_validate_abstraction: |
  Check that spec maintains proper abstraction:

  SHOULD NOT contain:
  - Database/storage technology (PostgreSQL, Redis)
  - API implementation (REST endpoints, GraphQL)
  - Framework/library names (React, Spring)
  - Specific algorithms
  - Color codes or pixel values
  - Code snippets (except in build specs)

  SHOULD contain:
  - User-observable behaviors
  - Business rules in domain language
  - Component references by name (Button, Card)
  - Performance in user terms ("feels instant", "within 2 seconds")
```

### Scenario Quality

```yaml
ai_validate_scenarios: |
  Each scenario should:

  DECLARATIVE (describe what, not how):
  Good: "User is authenticated"
  Bad: "User clicks login, enters email, enters password, clicks submit"

  CONCRETE (specific values):
  Good: "User with email 'alice@test.com' and 3 items in cart"
  Bad: "User with valid email and some items"

  INDEPENDENT (no dependencies on other scenarios):
  Good: Each scenario sets up its own context
  Bad: "Continuing from previous scenario..."

  SINGLE BEHAVIOR (one When, focused Then):
  Good: "When user clicks save, document is persisted"
  Bad: "When user clicks save and refreshes page and checks history..."
```

### Language Quality

```yaml
ai_validate_language: |
  Check for:

  AMBIGUOUS TERMS (flag for clarification):
  - "fast", "slow", "quick" → need metrics
  - "large", "small" → need thresholds
  - "etc.", "and so on" → enumerate
  - "appropriate", "suitable" → specify criteria

  PASSIVE VOICE (prefer active):
  Avoid: "The order is processed"
  Prefer: "System processes the order" or "User sees order confirmed"

  CONSISTENT TERMINOLOGY:
  - Same concept should use same term throughout
  - Terms should match project glossary
  - No unexplained domain jargon
```

### Testability

```yaml
ai_validate_testability: |
  Every requirement must be verifiable:

  UNTESTABLE:
  - "System should be fast"
  - "UI should be user-friendly"
  - "Data should be secure"

  TESTABLE:
  - "Response time < 200ms for 95th percentile"
  - "User completes checkout in < 3 minutes on first attempt"
  - "PII encrypted at rest and in transit"
```
