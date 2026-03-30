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
├── dispatch N agents in parallel (fan-out)
│   ├── Agent 1 → result 1
│   ├── Agent 2 → result 2
│   └── Agent N → result N
└── synthesize all results (fan-in)
```

**Used by:** /audit-components, /env-audit, /pre-merge-review, /skill-audit

**Implementation:**
- Each agent gets a focused scope (one project, one domain, one file set)
- Agents use `isolation: "worktree"` when modifying code
- Main agent waits for all agents, then merges results
- If any agent fails, report partial results + failure reason

## Pattern 2: Sequential Pipeline

Use when each stage depends on the previous stage's output.

```
Stage 1 (parallel research agents)
    ↓ results
Stage 2 (parallel implementation agents)
    ↓ code changes
Stage 3 (parallel review agents)
    ↓ findings
Stage 4 (synthesis + report)
```

**Used by:** /research-gate → /write-plan → build → /review-impl

**Implementation:**
- Each stage can internally use Fan-Out/Fan-In
- Stage transitions are explicit — main agent gates progression
- Context from earlier stages passed to later stages via structured summaries
- Never skip stages; if a stage produces no issues, note "clean" and proceed

## Pattern 3: Per-Project Propagation

Use when a shared change must be verified/applied across all projects.

```
Trigger: shared/ file changed
├── Agent: Project A Verifier — check imports, build, test
├── Agent: Project B Verifier — check imports, build, test
├── Agent: Project C Verifier — check imports, build, test
└── Agent: Project D Verifier — check imports, build, test
```

**Used by:** /audit-components (after shared util changes), /deploy-all

**Implementation:**
- Each agent gets the same verification checklist
- Agents run in their project's directory
- Results compiled into per-project pass/fail matrix
- If ANY project fails, block the operation

## Pattern 4: Cascading Sub-Teams

Use when a domain agent needs deeper analysis than one agent can provide.

```
Domain Agent (e.g., Security Review)
├── Sub-agent: Profile A (unauthenticated attacker)
├── Sub-agent: Profile B (compromised user)
└── Sub-agent: Profile C (compromised admin)
```

**Used by:** /pre-merge-review (security, performance, UX sub-agents)

**Implementation:**
- Parent agent defines sub-agent scope and shares relevant context
- Sub-agents report to parent, not directly to main
- Parent synthesizes sub-agent results before reporting to main
- Max depth: 2 levels (main → domain → sub-agent). Never go deeper.

## Pattern 5: Conditional Dispatch

Use when some agents are only needed based on what changed.

```
Main Agent reads git diff
├── If project-a/ changed → dispatch Project A agents
├── If shared/ changed → dispatch ALL project agents
├── If workers/ changed → dispatch Worker agents
└── If backend/ changed → dispatch Backend agent
```

**Used by:** /deploy-all (selective), /session-notes (conditional steps)

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

## Skill Integration Map

| Workflow | Pattern | Agents |
|----------|---------|--------|
| `/start-day` | Fan-Out/Fan-In | 4 parallel: git pull, index, session review, memory check |
| `/research-gate` | Fan-Out/Fan-In | 4 parallel research agents → synthesis |
| `/audit-components` | Per-Project Propagation | N project auditors + cross-project auditors |
| `/env-audit` | Fan-Out/Fan-In | N context scanners → cross-reference synthesis |
| `/review-impl` | Sequential Pipeline | 3 context agents → 3 reviewers → synthesis |
| `/pre-merge-review` | Cascading Sub-Teams | 5 domains x 1-3 sub-agents each (up to 12 total) |
| `/deploy-all` | Per-Project Propagation + Conditional | N Pages agents, then Worker agents |
| `/session-notes` | Fan-Out/Fan-In + Conditional | 5 parallel: vault, docs, help, memory, tracker |
| `/debug-collaborate` | Fan-Out/Fan-In | 3-4 hypothesis investigators → synthesis |
| `/write-plan` | Sequential Pipeline | Research → decompose → task list with file paths |
| `/skill-audit` | Fan-Out/Fan-In | 4 parallel checks → compliance check → report |
| `/persistent-issue` | Sequential Pipeline + Conditional | Triage → dispatch Team A-E → auto-escalate (cascade mode) |
| `/deep-root-cause` | Fan-Out/Fan-In | 3 agents: Reproducer, Data Flow Tracer, Assumption Auditor |
| `/full-stack-trace` | Sequential Pipeline | 4 agents: Frontend → API → Backend → Infrastructure |
| `/isolation-test` | Fan-Out/Fan-In + Conditional | 3 agents: Component Isolator, Data Minimizer, Environment Comparator |
| `/temporal-forensics` | Fan-Out/Fan-In | 3 agents: Race Condition Hunter, Stale State Detective, Timing Profiler |
| `/regression-bisect` | Sequential Pipeline | 3 agents: Git Bisector, Side Effect Analyzer, Rollback Verifier |
| `/full-stack-build` | Sequential Pipeline + Fan-Out/Fan-In | 2 designers → 2 builders (worktree) → 4 verifiers |
| `/worker-build` | Fan-Out/Fan-In | 3 builders (worktree) → 2 verifiers |
| `/propagate-feature` | Sequential Pipeline + Fan-Out/Fan-In | 2 differs → adapt plan → 1 propagator (worktree) → 2 verifiers |
| `/data-reconciliation` | Fan-Out/Fan-In | 4 layer samplers → reconciliation matrix |
| `/grill-me` | Sequential (conversation) | Intent interrogation → Intent Summary for /research-gate |
