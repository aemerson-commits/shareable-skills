---
name: cascade-orchestration
description: "Reusable agent team cascade patterns — parallel dispatch, sequential pipelines, fan-out/fan-in, and cross-project propagation"
---

# Cascade Orchestration Patterns

Reusable patterns for orchestrating agent teams across projects. All agents use model: "opus" with max effort.

## Pattern 1: Fan-Out / Fan-In

Use when N independent tasks produce results that need synthesis.

```
Main Agent
|-- dispatch N agents in parallel (fan-out)
|   |-- Agent 1 -> result 1
|   |-- Agent 2 -> result 2
|   +-- Agent N -> result N
+-- synthesize all results (fan-in)
```

**Use cases:** Component audits, environment audits, code reviews, compliance checks.

**Implementation:**
- Each agent gets a focused scope (one project, one domain, one file set)
- Agents use `isolation: "worktree"` when modifying code
- Main agent waits for all agents, then merges results
- If any agent fails, report partial results + failure reason

## Pattern 2: Sequential Pipeline

Use when each stage depends on the previous stage's output.

```
Stage 1 (parallel research agents)
    | results
Stage 2 (parallel implementation agents)
    | code changes
Stage 3 (parallel review agents)
    | findings
Stage 4 (synthesis + report)
```

**Use cases:** /research-gate -> /write-plan -> build -> /review-impl

**Implementation:**
- Each stage can internally use Fan-Out/Fan-In
- Stage transitions are explicit — main agent gates progression
- Context from earlier stages passed to later stages via structured summaries
- Never skip stages; if a stage produces no issues, note "clean" and proceed

## Pattern 3: Per-Project Propagation

Use when a shared change must be verified/applied across all projects.

```
Trigger: shared/ file changed
|-- Agent: Project A Verifier -- check imports, build, test
|-- Agent: Project B Verifier -- check imports, build, test
|-- Agent: Project C Verifier -- check imports, build, test
+-- Agent: Project D Verifier -- check imports, build, test
```

**Use cases:** Shared utility changes, cross-project deployments.

**Implementation:**
- Each agent gets the same verification checklist
- Agents run in their project's directory
- Results compiled into per-project pass/fail matrix
- If ANY project fails, block the operation

## Pattern 4: Cascading Sub-Teams

Use when a domain agent needs deeper analysis than one agent can provide.

```
Domain Agent (e.g., Security Review)
|-- Sub-agent: Profile A (unauthenticated attacker)
|-- Sub-agent: Profile B (compromised user)
+-- Sub-agent: Profile C (compromised admin)
```

**Use cases:** Security reviews, performance analysis, multi-persona UX review.

**Implementation:**
- Parent agent defines sub-agent scope and shares relevant context
- Sub-agents report to parent, not directly to main
- Parent synthesizes sub-agent results before reporting to main
- Max depth: 2 levels (main -> domain -> sub-agent). Never go deeper.

## Pattern 5: Conditional Dispatch

Use when some agents are only needed based on what changed.

```
Main Agent reads git diff
|-- If src/frontend/ changed  -> dispatch Frontend agents
|-- If shared/ changed        -> dispatch ALL project agents
|-- If src/workers/ changed   -> dispatch Worker agents
+-- If src/api/ changed       -> dispatch API agents
```

**Use cases:** Selective deploys, conditional session steps.

**Implementation:**
- Main agent determines scope from git diff or user input
- Only dispatch agents for affected areas
- Skip unnecessary agents to save context and cost
- Log which agents were dispatched and which were skipped

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Do This Instead |
|-------------|-------------|-----------------|
| Agent spawns agent spawns agent (3+ deep) | Context loss, coordination overhead | Max 2 levels deep |
| All agents share one worktree | Race conditions on file writes | Each code-modifying agent gets own worktree |
| Agent does research + implementation | Scope creep, context bloat | Separate research agents from implementation agents |
| Sequential when parallel is possible | Wastes time | If tasks have no data dependency, parallelize |
| Parallelizing tiny tasks | Agent overhead > task time | Only parallelize tasks that take 30s+ each |

## Skill Integration Map (customize for your project)

| Workflow | Pattern | Agents |
|----------|---------|--------|
| Intent discovery | Sequential | /grill-me conversation |
| Constraint research | Fan-Out/Fan-In | 4 parallel research agents |
| Implementation planning | Sequential Pipeline | Research -> decompose -> task list |
| Code review | Cascading Sub-Teams | 3+ reviewers + visual verification |
| Persistent bug diagnosis | Sequential + Conditional | Triage -> dispatch Team A-E |
| Component audit | Per-Project Propagation | N project auditors + cross-project auditors |
| Environment audit | Fan-Out/Fan-In | N context scanners -> cross-reference synthesis |
| Pre-merge review | Cascading Sub-Teams | N domains x 1-3 sub-agents each |
| Selective deploy | Per-Project Propagation + Conditional | Affected project agents only |
| Full-stack build | Sequential Pipeline + Fan-Out/Fan-In | Designers -> builders (worktree) -> verifiers |
| Root cause analysis | Fan-Out/Fan-In | Reproducer, Data Flow Tracer, Assumption Auditor |
| Regression hunting | Sequential Pipeline | Bisector -> Side Effect Analyzer -> Rollback Verifier |
