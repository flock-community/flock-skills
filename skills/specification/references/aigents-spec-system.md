# AigentsWork Specification System

Een universeel, typed, git-native systeem voor het definiëren en tracken van specificaties, agents, workflows, en meer.

---

## Kernprincipes

1. **Markdown voor content** - Leesbaar voor mens én AI
2. **YAML voor schemas** - Type definities, validatie regels
3. **Git als database** - Versioning, history, sync
4. **AI validatie** - Inhoudelijke validatie via prompts

---

## Architectuur

```
project/
├── schemas/                    # Type definities (YAML)
│   ├── _base/
│   │   └── entity.yaml
│   ├── common/
│   │   ├── index.yaml
│   │   └── status.yaml
│   ├── agent.yaml
│   ├── task.yaml
│   └── workflow.yaml
│
├── specs/                      # Instanties (Markdown + frontmatter)
│   ├── agents/
│   │   ├── alice.md
│   │   └── bob.md
│   ├── tasks/
│   │   └── oauth-login.md
│   └── workflows/
│       └── code-review.md
│
└── .implemented.json           # Tracking: wat is geïmplementeerd
```

---

## Tracking & Sync

### Het probleem

Specificaties veranderen. We moeten weten:
- Welke specs zijn geïmplementeerd?
- Welke specs zijn gewijzigd sinds implementatie?
- Wat moet nog gedaan worden?

### De oplossing

```json
// .implemented.json
{
  "specs/agents/alice.md": "a1b2c3d4",
  "specs/tasks/oauth-login.md": "e5f6g7h8",
  "specs/agents/bob.md": null
}
```

- **Key**: pad naar spec file
- **Value**: git blob hash op moment van implementatie

### Sync check

```python
def needs_work(file):
    current_hash = git_hash_object(file)
    implemented_hash = implemented.get(file)
    return current_hash != implemented_hash

def mark_done(file):
    implemented[file] = git_hash_object(file)
```

| Current Hash | Implemented Hash | Status |
|--------------|------------------|--------|
| abc123 | abc123 | ✅ In sync |
| abc123 | null | ⚠️ Nieuw, geen implementatie |
| xyz789 | abc123 | ⚠️ Gewijzigd sinds implementatie |

---

## Schema Systeem

### Basis structuur

```yaml
# schemas/agent.yaml

name: Agent
description: Een agent die taken uitvoert

frontmatter:
  # Veld definities voor frontmatter
  
sections:
  # Sectie definities voor markdown body
```

### Primitieve types

| Type | Beschrijving |
|------|--------------|
| `string` | Tekst |
| `number` | Getal |
| `boolean` | true/false |
| `date` | ISO datum |
| `any` | Geen validatie |

### Complexe types

```yaml
types:
  # Enum
  Priority:
    type: enum
    values: [low, medium, high, critical]
    
  # Object
  Address:
    type: object
    fields:
      street:
        type: string
      city:
        type: string
      country:
        type: string
        default: "NL"
        
  # List
  Skills:
    type: list
    items: string
    min: 1
    max: 10
    
  # Reference
  AgentRef:
    type: ref
    ref_type: Agent
```

### Frontmatter velden

```yaml
frontmatter:
  name:
    type: string
    required: true
    
  status:
    type: enum
    values: [active, inactive]
    default: active
    
  skills:
    type: list
    items: string
    min: 1
    
  reports_to:
    type: ref
    ref_type: Agent
    required: false
    
  contact:
    type: object
    fields:
      email:
        type: string
        ai_validate: "Must be valid email format"
      phone:
        type: string
        required: false
```

### Secties

```yaml
sections:
  - heading: Role
    level: 1                    # # (default: auto)
    required: true
    content: paragraph          # paragraph | list | code | any | none
    ai_validate: "Must describe a clear, single responsibility"
    
  - heading: Responsibilities
    required: true
    content: none               # Alleen container voor subsecties
    sections:
      - heading: Primary
        level: 2                # ##
        content: list
        min_items: 2
        ai_validate: "Each item must start with a verb"
        
      - heading: Secondary
        level: 2
        required: false
        content: list
        
  - heading: Notes
    required: false
    content: any
```

### Content types

| Type | Verwacht |
|------|----------|
| `paragraph` | Lopende tekst |
| `list` | Markdown lijst (- of 1.) |
| `code` | Code block |
| `any` | Alles toegestaan |
| `none` | Geen content, alleen subsecties |

---

## Imports & Extends

### Imports

```yaml
# schemas/task.yaml

$imports:
  - from: ./common
    types: [Status, Priority]
  - from: ./agent
    types: [Agent]

name: Task

frontmatter:
  status:
    type: Status              # Geïmporteerd type
  assigned_to:
    type: ref
    ref_type: Agent           # Geïmporteerd type
```

### Index files

```yaml
# schemas/common/index.yaml

$exports:
  - Status from ./status
  - Priority from ./status
  - Address from ./contact
```

### Extends (inheritance)

```yaml
# schemas/_base/entity.yaml

name: BaseEntity

frontmatter:
  id:
    type: string
    auto: uuid
  created_at:
    type: date
    auto: now
  updated_at:
    type: date
    auto: now
```

```yaml
# schemas/task.yaml

$extends: ./_base/entity

name: Task

frontmatter:
  # id, created_at, updated_at komen van BaseEntity
  
  title:
    type: string
    required: true
```

---

## Generics

```yaml
# schemas/common/generics.yaml

types:
  List:
    type: generic
    params: [T]
    definition:
      type: list
      items: T
      
  Ref:
    type: generic
    params: [T]
    definition:
      type: ref
      ref_type: T
      
  Maybe:
    type: generic
    params: [T]
    definition:
      type: T
      required: false
```

Gebruik:

```yaml
frontmatter:
  members:
    type: List<Agent>
    
  lead:
    type: Ref<Agent>
    
  deadline:
    type: Maybe<date>
```

---

## Union Types

```yaml
types:
  Trigger:
    type: union
    variants:
      - type: object
        tag: manual
        fields:
          initiated_by:
            type: ref
            ref_type: Agent
            
      - type: object
        tag: schedule
        fields:
          cron:
            type: string
          timezone:
            type: string
            
      - type: object
        tag: event
        fields:
          source:
            type: string
          event_type:
            type: string
```

Gebruik in document:

```yaml
trigger:
  $type: schedule
  cron: "0 9 * * 1-5"
  timezone: Europe/Amsterdam
```

---

## AI Validatie

### Basis

```yaml
frontmatter:
  role:
    type: string
    ai_validate: "Must describe a clear, single responsibility"
```

### Met variabele referenties

```yaml
frontmatter:
  name:
    type: string
    
  level:
    type: enum
    values: [junior, medior, senior]
    
  skills:
    type: list
    items: string

sections:
  - heading: Role
    ai_validate: "Must match a $level level developer"
    
  - heading: Responsibilities
    ai_validate: "Each item must be achievable with $skills"
    
  - heading: Goals
    ai_validate: "Must be appropriate for someone reporting to $reports_to.role"
```

### Variabele syntax

| Syntax | Resolved naar |
|--------|---------------|
| `$name` | frontmatter.name |
| `$skills` | frontmatter.skills |
| `$reports_to` | Resolved ref object |
| `$reports_to.name` | ref.frontmatter.name |
| `$reports_to.role` | ref.frontmatter.role |
| `$sections.Role` | Sectie content |

---

## Document Formaat

### Structuur

```markdown
---
$schema: agent
name: Alice
status: active
skills: [react, typescript, testing]
reports_to: bob
contact:
  email: alice@company.com
  phone: "+31612345678"
---

# Role

Frontend developer responsible for the component library.

# Responsibilities

## Primary

### Daily
- Review pull requests from team members
- Update task status in standup

### Weekly
- Sync with design team
- Update documentation

## Secondary
- Mentor junior developers
- Participate in interviews

# Notes

Started January 2024. Works remotely from Utrecht.
Prefers async communication via Slack.
```

### Frontmatter

- Begint en eindigt met `---`
- YAML formaat
- `$schema` verwijst naar schema file
- Typed fields volgens schema

### Body

- Markdown formaat
- Secties met headings (`#`, `##`, `###`)
- Content types: paragraphs, lists, code blocks
- Vrije tekst waar toegestaan

---

## Validatie Flow

```
1. Parse document
   ├── Frontmatter (YAML)
   └── Sections (Markdown)

2. Load schema via $schema

3. Resolve imports & extends

4. Validate frontmatter
   ├── Required fields aanwezig?
   ├── Types correct?
   ├── Refs bestaan?
   └── AI validatie passed?

5. Validate sections
   ├── Required sections aanwezig?
   ├── Content types correct?
   ├── Nested sections correct?
   └── AI validatie passed?

6. Return errors of ✅
```

---

## Voorbeelden

### Agent Schema

```yaml
# schemas/agent.yaml

$extends: ./_base/entity

$imports:
  - from: ./common
    types: [Status, ContactInfo]

name: Agent
description: Een agent die taken uitvoert

frontmatter:
  name:
    type: string
    required: true
    
  status:
    type: Status
    default: active
    
  level:
    type: enum
    values: [junior, medior, senior]
    required: true
    
  skills:
    type: list
    items: string
    min: 1
    
  reports_to:
    type: ref
    ref_type: Agent
    required: false
    
  contact:
    type: ContactInfo
    required: false

sections:
  - heading: Role
    required: true
    content: paragraph
    ai_validate: "Must describe a clear responsibility for a $level developer"
    
  - heading: Responsibilities
    required: true
    content: none
    sections:
      - heading: Primary
        content: list
        min_items: 2
        ai_validate: "Must be achievable with $skills"
        
      - heading: Secondary
        required: false
        content: list
        
  - heading: Capabilities
    required: false
    content: list
    
  - heading: Notes
    required: false
    content: any
```

### Task Schema

```yaml
# schemas/task.yaml

$extends: ./_base/entity

$imports:
  - from: ./common
    types: [Status, Priority]
  - from: ./agent
    types: [Agent]

name: Task
description: Een uit te voeren taak

frontmatter:
  title:
    type: string
    required: true
    ai_validate: "Must be actionable, start with verb"
    
  status:
    type: Status
    default: pending
    
  priority:
    type: Priority
    default: medium
    
  assigned_to:
    type: ref
    ref_type: Agent
    required: false
    
  depends_on:
    type: list
    items:
      type: ref
      ref_type: Task
    required: false
    
  due_date:
    type: date
    required: false

sections:
  - heading: Description
    required: true
    content: paragraph
    ai_validate: "Must be clear enough for $assigned_to.level experience level"
    
  - heading: Acceptance Criteria
    required: true
    content: list
    min_items: 1
    ai_validate: "Each criterion must be objectively verifiable"
    
  - heading: Technical Notes
    required: false
    content: any
    
  - heading: Discussion
    required: false
    content: any
```

### Workflow Schema

```yaml
# schemas/workflow.yaml

$extends: ./_base/entity

$imports:
  - from: ./agent
    types: [Agent]
  - from: ./task
    types: [Task]

name: Workflow
description: Een geautomatiseerde workflow

types:
  Trigger:
    type: union
    variants:
      - type: object
        tag: manual
        fields:
          initiated_by:
            type: ref
            ref_type: Agent
      - type: object
        tag: schedule
        fields:
          cron:
            type: string
          timezone:
            type: string
            default: "Europe/Amsterdam"
      - type: object
        tag: event
        fields:
          source:
            type: string
          event_type:
            type: string

  Step:
    type: object
    fields:
      name:
        type: string
      agent:
        type: ref
        ref_type: Agent
      action:
        type: string
      on_success:
        type: string
        required: false
      on_failure:
        type: string
        required: false

frontmatter:
  name:
    type: string
    required: true
    
  trigger:
    type: Trigger
    required: true
    
  steps:
    type: list
    items: Step
    min: 1

sections:
  - heading: Purpose
    required: true
    content: paragraph
    
  - heading: Steps
    required: true
    content: none
    sections:
      - pattern: "*"
        content: paragraph
        ai_validate: "Must clearly describe what $name does in this step"
        
  - heading: Error Handling
    required: false
    content: any
```

---

## Samenvatting

| Aspect | Oplossing |
|--------|-----------|
| **Content** | Markdown + frontmatter |
| **Types** | YAML schemas |
| **Validatie** | Type checking + AI validatie |
| **Relaties** | `ref` type met `ref_type` |
| **Nesting** | Recursive sections |
| **Reuse** | Imports, extends, generics |
| **Tracking** | `.implemented.json` + git blob hash |
| **Versioning** | Git |

Het systeem combineert:
- **Leesbaarheid** van Markdown
- **Type safety** van TypeScript-achtige schemas
- **Flexibiliteit** van AI validatie
- **Robuustheid** van Git versioning
