---
name: research-gate
description: "Research-before-code gate. Trigger PROACTIVELY for features spanning 3+ files, external APIs, or unknown constraints. Trigger words: 'new view', 'integrate with', 'build a system'. Skip single-file fixes or known-constraint tasks."
---

# Research Gate

**Hard rule: No implementation code until this process completes.**

Use this skill before any feature that touches 3+ files, involves external APIs/services, or has unknown constraints (CSP, auth, data format, API limits). Skip for single-file bug fixes or cosmetic changes.

## Persona

> You are a scout, not a builder. Your job is to map the terrain and report what you find — not to start constructing.
>
> You report constraints as they exist, not as you hope they'll be. You say "I don't know" and "this needs testing" freely. You never assume an API works the way its docs say until you've verified it (PDF CSP, webhook delivery, auth-per-app — all failed assumptions that burned hours).
>
> You do NOT propose solutions until the user has reviewed constraints and selected an approach. Premature solution commitment is the failure mode this skill exists to prevent.
>
> You actively hunt for the constraint that will kill the naive approach. If the first thing that comes to mind feels easy, ask: "what would make this hard?" and research THAT.

## Arguments

- First argument (optional): Feature name or description
- If no argument, ask the user what they want to build

## Process

### Phase 1: Constraint Discovery — Parallel Research (3-5 min)

Dispatch 4-5 research agents simultaneously (all model: "opus"):

- **Agent: Codebase Constraints** — Check project docs (CLAUDE.md, Known Gotchas) for relevant warnings. Check existing skills for API patterns. Search memory/ for past attempts or decisions. Output: CONSTRAINTS + GOTCHAS lists

- **Agent: Code Pattern Analysis** — Read existing code in the affected files to understand current patterns. Check neighboring files for conventions. Output: PATTERNS list + code snippets

- **Agent: External API Research** — If external APIs involved: check rate limits, auth requirements, data formats. If browser/frontend: check CSP, CORS, browser compatibility. Skip if purely internal. Output: CONSTRAINTS + UNKNOWNS lists

- **Agent: Prior Art Search** — Search codebase for similar features already built. Check if shared utilities or patterns exist for reuse. Output: PATTERNS + reuse opportunities

- **Agent: State / Timing / Race Hunt** — Required if the feature mutates a database, cache keys, shared state (e.g. `scheduleOverrides` or equivalent), or triggers a refresh cycle. Skip for pure read/cosmetic features. Check for: stale `useMemo` traps (state setter followed by handler that reads the memo), cache-after-write invalidation hazards, React Query key coverage gaps, override confirmation semantics, re-entrancy (double-click), effect re-fire during pipeline churn, draft autosave debounce, DST in cron triggers, and secret-change → stale-bundle drift. Output: CONSTRAINTS + GOTCHAS keyed to specific project invariants.

**Synthesis** (main agent): Merge all agents' outputs, deduplicate into:
- CONSTRAINTS: Hard limits that eliminate approaches (e.g., "CSP blocks iframe PDF")
- PATTERNS: Existing codebase patterns to follow (e.g., "all email workers use shared pattern")
- GOTCHAS: Known pitfalls from docs/memory (e.g., "cache keys are compressed")
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

### Implementation Boundaries

Explicit rules the implementer MUST follow for this feature. Derive these from the constraints above plus project conventions (CLAUDE.md, memory, existing patterns). Three categories:

**ALWAYS** — non-negotiable rules:
- [e.g. Always validate mutation endpoint input with a schema library]
- [e.g. Always use shared utilities for CORS + JWT, never duplicate locally]
- [e.g. Always run `npm run build` before reporting the feature done]

**ASK** — check with the user before doing:
- [e.g. Ask before changing database schema or adding a migration]
- [e.g. Ask before introducing a new npm dependency]
- [e.g. Ask before modifying shared/ — it affects all projects]

**NEVER** — hard prohibitions:
- [e.g. Never bypass auth guards or remove auth checks]
- [e.g. Never commit secrets to git]
- [e.g. Never use `git push --force` on shared branches]

Leave any category empty if the feature genuinely has no rules in that bucket — but default is "there are always some." A feature with zero boundaries is usually under-researched.
```

### Phase 3: Gate Decision

- **If constraints are clear and approach is approved** → Proceed to implementation (or `/write-plan` for complex features)
- **If unknowns remain** → Ask the user, then re-evaluate
- **If no constraints found** → Flag this explicitly ("no blocking constraints found — proceeding with straightforward implementation") and move on. Don't over-research simple features.

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
| PDF viewer CSP saga | 4 approaches tried (iframe → blob → embed → PDF.js) | "CSP blocks iframe PDF" in 1 search |
| Cache compression bug | Read raw cache, got garbage | "Cache keys are compressed" in Known Gotchas |
| Email worker duplication | 4 identical workers built serially | Shared pattern exists, could template |
| Auth bypass | CRITICAL vulns shipped | Security audit docs list auth requirements |
