---
name: grill-me
description: "Interrogate the user about their idea before any work begins. Walks the decision tree one question at a time, provides recommended answers, self-serves from codebase. Produces an Intent Summary for /research-gate."
user-invocable: true
---

# Grill Me — Intent Interrogation

Deeply question the user about their idea before any code or research begins. Walks down each branch of the decision tree, resolving dependencies one by one. Prevents building the wrong thing.

## When to Use

- User describes a new feature concept with ambiguous scope
- User references a business process Claude hasn't encountered before
- Cross-department stakeholders involved
- User explicitly invokes `/grill-me`
- Any request where "what" or "why" is unclear, even if "how" seems obvious

## When to Skip

- Bug fixes or "X is broken" — go straight to diagnosis
- User provides a detailed spec or plan document
- Feature is a direct copy of an existing view (use `/propagate-feature`)
- Single-file changes or config updates
- User says "just do it" or "I know what I want"

## How It Works

**One question at a time.** Do not dump a questionnaire. Each question:
1. Ask one specific question
2. Provide your recommended answer based on what you know (codebase, session history, memory)
3. Wait for the user's response
4. Follow up on their answer before moving to the next branch

**Self-service when possible.** If a question can be answered by reading the codebase, session notes, or memory files — answer it yourself instead of asking the user. Tell them what you found and ask if it's correct.

## Question Branches

Walk these branches in order, but skip any that are obviously answered by context:

### 1. Audience & Access
- Who uses this? Which user roles? Which project/app?
- Is this for a specific person or team?
- Does it need specific permissions or is it for all authenticated users?

### 2. Success Criteria
- What does "working" look like? Paint the picture.
- How will you know it's done? What's the minimum viable version?
- Is there an existing process this replaces? (Excel, phone call, email, manual workflow)

### 3. Data Source & Shape
- Where does the data come from? (database, API, cache, manual entry)
- How fresh does it need to be? (real-time, cached, daily, weekly)
- What are the key fields? What's the primary identifier?
- Are there edge cases in the data? (duplicates, nulls, special formats)

### 4. Interaction Model
- Is this a dashboard (view-only), a tool (input/output), or a workflow (multi-step)?
- Daily use or occasional? (determines caching strategy and data density)
- Mobile or desktop? (determines responsive strategy)
- Does it need to send notifications, emails, or trigger actions?

### 5. Integration Points
- Does this connect to existing views/features? Which ones?
- Does it need a new API endpoint, or can it reuse existing ones?
- Does it need new database tables or cache keys?
- Does it interact with external systems?

### 6. Edge Cases & Risks
- What happens when there's no data? (empty state)
- What happens with bad/incomplete data? (error handling)
- Who should NOT see this? (security implications)
- What's the blast radius if it breaks? (read-only = low, mutations = high)

### 7. Priority & Scope
- How urgent is this? (blocking production, improving workflow, nice-to-have)
- Is this the full vision or an MVP? What gets cut for v1?
- What does v2 look like? (helps design for extensibility without over-engineering)

## Termination

Stop grilling when you have clear answers for branches 1-4 at minimum. Branches 5-7 can be answered by research-gate or during implementation.

Produce an **Intent Summary**:

```markdown
## Intent Summary: [Feature Name]

**For**: [audience] in [project]
**Purpose**: [one sentence — what problem this solves]
**Replaces**: [current process, if any]
**Data**: [source] → [key fields] → [display format]
**Interaction**: [dashboard/tool/workflow], [frequency], [device]
**Success**: [what "done" looks like — 2-3 bullet points]
**MVP scope**: [what's in v1, what's deferred]
**Risks**: [key edge cases or unknowns]
```

This summary becomes the input to `/research-gate` Phase 1. Paste it directly into the research-gate feature description.

## Integration

| Skill | Relationship |
|-------|-------------|
| `/research-gate` | **Feeds into** — Intent Summary is the input |
| `/write-plan` | **Upstream** — Intent Summary referenced in plan Goal |
| `/full-stack-build` | **Upstream** — can invoke grill-me in Phase 0 if intent is unclear |
| `/persistent-issue` | **Not related** — grill-me is for new features, not debugging |

## Pipeline Position

```
/grill-me  →  /research-gate  →  /write-plan  →  /full-stack-build
  INTENT        CONSTRAINTS       DECOMPOSITION     EXECUTION
```
