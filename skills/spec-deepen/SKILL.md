---
name: spec-deepen
description: |
  Deepen specs through code+spec reflection and targeted questioning — find gaps, strengthen coverage, and improve specificity.

  MANDATORY TRIGGERS: spec-deepen, "deepen specs", "improve specs", "spec gaps", "what's missing"

  Use when: Specs exist but need more depth, specificity, or coverage — finding gaps, adding scenarios, strengthening requirements
---

# /spec-deepen — Deepen Specs Through Reflection

Improve existing specs by reflecting on code and specs together, finding gaps, and asking targeted questions.

## Integration Level Detection

Detect the current level:

1. Check for `@spec` annotations in code files → Level 5
2. Check for `.implemented.json` → Level 4
3. Check for `specs/schemas/` or `$schema` references → Level 3
4. Check for `specs/` directory with `why/`, `what/`, or `how/` subdirs → Level 2
5. Check for any `.md` with `$schema` frontmatter → Level 1
6. None found → Level 0 (nothing to deepen — suggest `/spec-init`)

See `../specification/references/integration-levels.md` for full details.

## Deepening Flow

1. **Ask scope:** Which spec(s) to deepen — specific file, layer, or all
2. **Read specs** in scope and their cross-references
3. **Analyze gaps** per layer (see Gap Analysis below)
4. **Ask 1-2 questions** at a time — don't overwhelm
5. **Draft updates** after each answer
6. **Check cross-layer connections** for missing links
7. **Repeat** until user is satisfied or no more gaps found

## Gap Analysis by Layer

### Why Layer
| Gap | Question to Ask |
|-----|-----------------|
| Vision without measurable success criteria | "How would you know this project succeeded? What numbers?" |
| Goal without specific metrics | "What's the target number for [metric]? By when?" |
| Persona without frustrations | "What's the worst part of their current workflow?" |
| Constraint without rationale | "Why does this constraint exist? What happens if violated?" |
| Decision without alternatives | "What other options did you consider? Why not those?" |

### What Layer
| Gap | Question to Ask |
|-----|-----------------|
| Feature with no error scenarios | "What happens when [happy path] fails?" |
| Feature with vague goals | "What specifically should the user see/experience?" |
| Entity without invariants | "What must always be true about a [entity]?" |
| Rule without examples | "Give me a concrete example where this rule applies" |
| Journey with no alternative paths | "What if the user goes back? Takes a detour? Gives up?" |

### How Layer
| Gap | Question to Ask |
|-----|-----------------|
| Agent without constraints | "What should this agent never do?" |
| Skill without error handling | "What happens when [step] fails?" |
| Workflow without timeouts | "How long can [step] take? What if it hangs?" |
| Stack without rationale | "Why [technology]? What alternatives were considered?" |

## Code-Spec Reflection

When code exists alongside specs:

1. **Read the spec** and its referenced code
2. **Identify discrepancies:**
   - Code handles cases not in the spec → ask if they should be specified
   - Spec describes behavior code doesn't implement → flag as gap
   - Code has error handling the spec doesn't mention → add to spec or mark as implementation detail
3. **Present findings** with specific line references

### Level 5: Annotation-Based Deepening

When code has `@spec` annotations:
- Read annotated code blocks and compare to spec content
- Identify behavior in code that the spec doesn't describe
- Flag specs where annotated hash is outdated (spec changed after code was written)
- Ask: "The code does [X] but the spec doesn't mention it. Should we add it?"

## Questioning Technique

Use conversation-flow patterns from `../specification/references/conversation-flow.md`:

- **Ask 1-2 questions at a time** — never dump a list of 10 questions
- **Be specific** — "What happens when a user submits an empty form?" not "What are the edge cases?"
- **Reference what exists** — "Your login feature covers success. What about wrong password? Locked account?"
- **Offer options when possible** — "Should expired sessions redirect to login or show a message?"
- **Draft immediately** after getting an answer — show the user what the spec update looks like

## Cross-Layer Deepening

Check connections between layers:

| Missing Connection | Action |
|--------------------|--------|
| Feature not linked to any goal | Ask: "Which goal does [feature] serve?" |
| Goal not linked to any feature | Ask: "What features would achieve [goal]?" |
| Entity not used in any feature | Ask: "Which features use [entity]?" |
| Persona not connected to journeys | Ask: "What's [persona]'s typical workflow?" |
| How specs not linked to What specs | Ask: "Which features does [agent/workflow] implement?" |

## After Deepening

- Update all modified specs with new version numbers
- Run schema validation on updated specs (level 3+)
- Update cross-references if new connections were found
- Suggest running `/spec-review` to validate the updated specs
