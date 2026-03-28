---
name: research-gate
description: "Research-before-code gate. Trigger PROACTIVELY for features spanning 3+ files, external APIs, or unknown constraints. Trigger words: 'new view', 'integrate with', 'build a system'. Skip single-file fixes or known-constraint tasks."
---

# Research Gate

**Hard rule: No implementation code until this process completes.**

Use this skill before any feature that touches 3+ files, involves external APIs/services, or has unknown constraints (CSP, auth, data format, API limits). Skip for single-file bug fixes or cosmetic changes.

## Arguments

- First argument (optional): Feature name or description
- If no argument, ask the user what they want to build

## Process

### Phase 1: Constraint Discovery — Parallel Research (3-5 min)

Dispatch 4 research agents simultaneously (all model: "opus"):

- **Agent: Codebase Constraints** — Check project documentation and known gotchas for relevant warnings. Check existing skill definitions for API patterns. Search memory/notes for past attempts or decisions. Output: CONSTRAINTS + GOTCHAS lists

- **Agent: Code Pattern Analysis** — Read existing code in the affected files to understand current patterns. Check neighboring files for conventions. Output: PATTERNS list + code snippets

- **Agent: External API Research** — If external APIs involved: check rate limits, auth requirements, data formats. If browser/frontend: check CSP, CORS, browser compatibility. Skip if purely internal. Output: CONSTRAINTS + UNKNOWNS lists

- **Agent: Prior Art Search** — Search codebase for similar features already built. Check if shared utilities or patterns exist for reuse. Output: PATTERNS + reuse opportunities

**Synthesis** (main agent): Merge all 4 agents' outputs, deduplicate into:
- CONSTRAINTS: Hard limits that eliminate approaches (e.g., "CSP blocks inline scripts in this environment")
- PATTERNS: Existing codebase patterns to follow (e.g., "all background jobs use the shared email utility")
- GOTCHAS: Known pitfalls from docs/memory (e.g., "cache keys use compressed values — must decompress before reading")
- UNKNOWNS: Things we can't determine from code alone (ask the user)

### Phase 2: Approach Selection (2-3 min)

Present to the user:

```markdown
## Research Summary for [Feature]

### Constraints Found
- [constraint 1 — with source file/doc reference]
- [constraint 2]

### Recommended Approach
[1-3 sentences. Why this approach, given the constraints.]

### Alternatives Considered
| Approach | Why Not |
|----------|---------|
| [alt 1]  | [eliminated by constraint X] |
| [alt 2]  | [works but more complex than recommended] |

### Unknowns / Questions for You
- [anything that needs user input before proceeding]
```

### Phase 3: Gate Decision

- **If constraints are clear and approach is approved** -> Proceed to implementation (or `/write-plan` for complex features)
- **If unknowns remain** -> Ask the user, then re-evaluate
- **If no constraints found** -> Flag this explicitly ("no blocking constraints found — proceeding with straightforward implementation") and move on. Don't over-research simple features.

## When to Escalate to /write-plan

After the research gate clears, use `/write-plan` if:
- The feature spans 5+ files or 3+ projects
- It involves multiple phases or has ordering dependencies
- It needs subagent parallelization
- The user explicitly asks for a plan

Otherwise, proceed directly with implementation using TodoWrite for tracking.

## Examples of Past Rework This Prevents

| Incident | What Happened | What Research Would Have Found |
|----------|---------------|-------------------------------|
| CSS feature blocked by browser policy | Multiple rendering approaches tried serially | Browser policy constraint discoverable in 1 search |
| Cache returning stale data | Read raw cache value, got corrupted output | Compression/encoding documented in project gotchas |
| Duplicated code across services | N identical modules built serially | Shared pattern already existed, could have been templated |
| Auth bypass in new endpoints | Security vulnerabilities shipped | Auth requirements documented in project security notes |
