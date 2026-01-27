# Conversation Flow

How to extract specifications from user conversations. Specs emerge from dialogue, not templates.

## Table of Contents

1. [The Example Mapping Technique](#example-mapping)
2. [Phase-by-Phase Guide](#phases)
3. [Question Patterns](#questions)
4. [Handling Uncertainty](#uncertainty)
5. [From Examples to Scenarios](#scenarios)

---

## Example Mapping

Use the Example Mapping technique (Matt Wynne/Cucumber) to structure requirements conversations. Timebox to 25 minutes per story.

### The Four Elements

| Element | Color | Description |
|---------|-------|-------------|
| **Story** | Yellow | The user story being discussed (one per session) |
| **Rules** | Blue | Business rules / acceptance criteria |
| **Examples** | Green | Concrete examples illustrating each rule |
| **Questions** | Red | Unknowns to resolve later |

### Visual Pattern

```
[STORY: User can reset password]
        │
        ├── [RULE: Link expires after 1 hour]
        │       ├── [Example: Click link at 59min → works]
        │       └── [Example: Click link at 61min → "expired" error]
        │
        ├── [RULE: One-time use only]
        │       ├── [Example: Use link once → works]
        │       └── [Example: Use link twice → "already used" error]
        │
        └── [QUESTION: Rate limit reset requests?]
```

### Signal Interpretation

| Pattern | Signal | Action |
|---------|--------|--------|
| Many rules | Story too large | Split into smaller stories |
| Many questions | Not ready | More discovery needed |
| Many examples per rule | Rule may be complex | Consider splitting rule |
| Few examples | Rule may be unclear | Add more examples |

---

## Phases

### Phase 1: Listen

**Goal:** Understand what the user is describing and identify the spec type.

**Listen for patterns:**

| User says... | Likely spec type |
|--------------|------------------|
| "The goal is..." "We want to achieve..." | Vision |
| "Our users are..." "They need..." | Persona |
| "Users should be able to..." | Feature |
| "A [thing] has..." "A [thing] can be..." | Entity |
| "If X then Y" "Must not..." | Rule |
| "They start by... then..." | Journey |
| "The system should..." (with agent focus) | Agent |
| "The process for..." | Workflow |

**Capture verbatim:** Note exact words, especially domain terms. These become the ubiquitous language.

### Phase 2: Clarify

**Goal:** Fill in gaps with targeted questions.

Use the question patterns below. Ask only 1-2 questions at a time to avoid overwhelming.

**Required coverage checklist:**
- [ ] Happy path described
- [ ] At least one error case
- [ ] Who can/cannot do this
- [ ] What success looks like
- [ ] Performance expectations (if relevant)

### Phase 3: Map Examples

**Goal:** For each rule, gather concrete, testable examples.

**Process:**
1. State the rule in user's words
2. Ask for a positive example (rule applies, expected outcome)
3. Ask for a negative example (rule doesn't apply, different outcome)
4. Ask for edge cases

**Example extraction:**

```
User: "Premium users get free shipping on large orders"

You: "What counts as a 'large order'?"
User: "Over $50"

You: "So if a premium user orders $60 worth, shipping is free?"
User: "Yes"

You: "What about a premium user ordering $40?"
User: "Standard shipping applies"

You: "And a non-premium user ordering $60?"
User: "They pay shipping too"
```

Captured examples:
- $60 order, premium user → free shipping
- $40 order, premium user → standard shipping
- $60 order, regular user → standard shipping

### Phase 4: Draft

**Goal:** Create the spec with frontmatter and scenarios.

**Convert each example to Given/When/Then:**

```markdown
### Rule: Premium users get free shipping over $50

#### Premium user with qualifying order
- Given: User has premium membership
- When: They place an order for $60
- Then: Shipping cost is $0.00

#### Premium user below threshold
- Given: User has premium membership
- When: They place an order for $40
- Then: Standard shipping rates apply

#### Regular user with large order
- Given: User does not have premium membership
- When: They place an order for $60
- Then: Standard shipping rates apply
```

### Phase 5: Validate

**Goal:** Check completeness and run AI validation.

**Completeness checklist:**
- [ ] All happy paths covered with scenarios
- [ ] Error cases have exact messages
- [ ] Empty states defined
- [ ] Loading states specified (if UI)
- [ ] Edge cases addressed
- [ ] Performance expectations measurable

**AI validation:** If schema has `ai_validate` prompts, run them:

```yaml
ai_validate: "Each scenario must be verifiable by $personas.primary in under 5 minutes"
```

**Mark hotspots:** Unresolved questions become checklist items:

```markdown
## Hotspots
- [ ] What happens after 5 failed attempts?
- [ ] Should we support international shipping?
```

### Phase 6: Connect

**Goal:** Link to related specs and update indexes.

**Add references:**
```yaml
refs:
  - design/entities/order
  - design/personas/premium-user
  - design/rules/shipping-rates
  - build/skills/payment-processing
```

**Update parent spec** if this is a child spec.

**Update journey specs** if this feature appears in user journeys.

---

## Questions

### For Features

| Question | Reveals |
|----------|---------|
| "What does the user expect to see?" | Visual/UI requirements |
| "What happens if X goes wrong?" | Error handling |
| "How quickly should this feel?" | Performance expectations |
| "Who can do this? Who cannot?" | Permission rules |
| "What's the exact message shown?" | Copy requirements |
| "Walk me through the steps" | Complete flow |
| "What if the user cancels halfway?" | Interruption handling |

### For Entities

| Question | Reveals |
|----------|---------|
| "What information does this have?" | Attributes |
| "What states can this be in?" | State machine |
| "How does it relate to other things?" | Relationships |
| "What can you do with it?" | Operations |
| "What can never happen to it?" | Invariants |
| "Who can see/modify it?" | Access control |

### For Rules

| Question | Reveals |
|----------|---------|
| "When does this apply?" | Conditions |
| "What happens when it applies?" | Actions |
| "Are there exceptions?" | Edge cases |
| "Can you give me an example?" | Concrete scenarios |
| "What if the rule is violated?" | Enforcement |

### For Journeys

| Question | Reveals |
|----------|---------|
| "What triggers this journey?" | Entry points |
| "What's the happy path?" | Main flow |
| "Where might they get stuck?" | Friction points |
| "How do they know they're done?" | Success state |
| "What if they abandon midway?" | Recovery/cleanup |

---

## Uncertainty

### When to Push vs. Move On

**Push for clarity when:**
- Core business logic is ambiguous
- User safety or data integrity affected
- High-frequency use case
- Multiple interpretations possible

**Move on and mark as hotspot when:**
- Edge case with low frequency
- Implementation detail that can be decided later
- User is unsure and needs to consult others
- Blocked on external information

### Marking Hotspots

Use checkbox format in a dedicated section:

```markdown
## Hotspots
- [ ] Rate limiting policy for password resets
- [ ] Timezone handling for scheduled events
- [ ] Support for bulk operations in v1?
```

Hotspots are resolved in future conversations and converted to spec content.

---

## Scenarios

### Given-When-Then Grammar

```
Given [precondition/context]
When [action/trigger]
Then [observable outcome]
And [additional outcome]
```

### Good Scenario Patterns

**Declarative (preferred):**
```
Given a premium user with items in cart
When they complete checkout
Then shipping is calculated as free
```

**Imperative (avoid):**
```
Given I am on the checkout page
And I click the "Continue" button
And I fill in shipping address
And I click "Place Order"
Then I see "Order confirmed"
```

### One Behavior Per Scenario

**Bad (multiple behaviors):**
```
Given a user
When they login and add item to cart and checkout
Then order is placed
```

**Good (single behavior):**
```
# Scenario 1: Login
Given a registered user
When they provide valid credentials
Then they are authenticated

# Scenario 2: Add to cart
Given an authenticated user
When they add a product
Then it appears in their cart

# Scenario 3: Checkout
Given a user with items in cart
When they complete checkout
Then an order is created
```

### Concrete Data

Use specific values, not abstractions:

**Bad:**
```
Given a user with a valid email
When they enter correct password
Then login succeeds
```

**Good:**
```
Given a user with email "alice@example.com"
When they enter the correct password
Then they see "Welcome back, Alice"
```

---

## Coverage Checklist

Before finalizing design specs, verify coverage:

### Entities
- [ ] All entities have owner/creator relationship defined
- [ ] Lifecycle addressed (created_at, updated_at, deleted?)
- [ ] Storage/persistence implications noted
- [ ] Relationships to other entities explicit

### Features
- [ ] Happy path has complete scenario
- [ ] At least one error scenario per rule
- [ ] Performance expectation stated (if relevant)
- [ ] Empty state defined (no data yet)
- [ ] Loading state defined (if async)

### Cross-Cutting Concerns
- [ ] Multi-user implications (who owns what?)
- [ ] Multi-device sync (if applicable)
- [ ] Timezone handling
- [ ] Offline behavior
- [ ] Data validation rules

### After Design Specs
Once design specs are drafted, prompt for build specs:
- "Who/what implements these features?" → Agent specs
- "Are there reusable patterns?" → Skill specs
- "How do we evaluate quality?" → Lens specs
- "What's the implementation workflow?" → Workflow specs
