---
name: write-plan
description: Write a structured implementation plan for multi-step features. Decomposes work into tasks with exact file paths, code examples, and verification steps. Use after /research-gate for complex features spanning 5+ files or multiple projects.
---

# Write Plan

Create a structured implementation plan that can be executed by subagents or followed step-by-step. Plans live in `docs/plans/` and serve as the contract for what gets built.

## Arguments

- First argument (optional): Feature name
- If coming from `/research-gate`, use the approved approach as input

## Prerequisites

- `/research-gate` should have run first (constraints and approach already decided)
- If not, ask: "Should I run /research-gate first, or do you already know the approach?"

## Plan Document Structure

Create `docs/plans/YYYY-MM-DD-{feature-slug}.md`:

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence — what does "done" look like?]
**Done When:**
- [ ] [Behavioral: "When [user action], [expected result]"]
- [ ] [Data: "[Field] shows [value] for [condition]"]
- [ ] [Visual: "[Component] renders [correctly / matches existing pattern]"]
- [ ] Build passes all affected projects
- [ ] No lint errors

These criteria are verified by `/review-impl` Agent A (Spec Compliance) and Phase 4 (Visual Verification).

**Approach:** [2-3 sentences — the chosen approach from research gate]
**Constraints:** [Key constraints that shaped this approach]

## File Map

| Action | File | Lines |
|--------|------|-------|
| Create | `project/src/components/NewView.jsx` | — |
| Modify | `project/src/App.jsx` | 45-60 |
| Modify | `shared/utils.js` | append |

## Task 1: [Component/Feature Name]

**Files:** `exact/path.js`, `exact/other.js`
**Estimated scope:** [S/M/L — S = 1-2 files, M = 3-5 files, L = 5+]

- [ ] Step 1: [Specific action with complete code or exact description]
  ```jsx
  // Complete code block — not "add validation" but the actual code
  ```
- [ ] Step 2: [Next action]
- [ ] Verify: [Exact verification command or check]
  ```bash
  cd project && npm run build  # must pass
  ```

## Task 2: [Next Component]
...

## Task N: Final Verification

- [ ] Build all affected projects
- [ ] Lint passes
- [ ] Manual smoke test: [what to check in browser]
- [ ] Playwright verification: [if applicable]

## Parallel Execution Map

[Which tasks can run in parallel vs. which have dependencies]

Task 1 ──→ Task 3 ──→ Task 5 (verify)
Task 2 ──→ Task 4 ──╱
```

## Vertical Slicing (MANDATORY)

**Each task/phase must deliver a testable end-to-end increment.** Never write phases like "all the backend first, then all the UI" — that produces plans where you can't verify anything until the last task lands.

**Vertical slice** (good):
- Task 1: "Add POST /api/items endpoint + one React form field + persist to DB + verify curl returns 200 and field renders"
- Task 2: "Add GET /api/items?id=X + detail view in UI + verify round-trip"
- Task 3: "Add delete + optimistic UI removal + verify"

**Horizontal slice** (bad — avoid):
- Task 1: "Build all 4 API endpoints"
- Task 2: "Build all the DB schema"
- Task 3: "Build the React components"
- Task 4: "Wire them together"

**Why**: horizontal slices stack risk at the end — the first 3 tasks "pass" but nothing actually works until Task 4. If Task 4 surfaces a design flaw, you redo all the earlier work. Vertical slices force integration issues to appear in Task 1 when they're cheap.

**Exception**: schema migrations that multiple tasks depend on can be a standalone Task 0. That's the only horizontal slice allowed.

## Plan Quality Checklist

Before presenting the plan to the user, verify:

- [ ] **Every step has exact file paths** — no "update the relevant file"
- [ ] **Code blocks are complete** — not "add error handling" but the actual try/catch
- [ ] **Each task is independently verifiable** — has a verify step
- [ ] **Scope per task is S or M** — break L tasks into smaller pieces
- [ ] **Every phase is a vertical slice** — each one produces a testable end-to-end increment (see Vertical Slicing section above). No "all backend then all UI" plans.
- [ ] **Parallel opportunities identified** — independent tasks marked for concurrent execution
- [ ] **Constraints from research gate are respected** — no approach that was already eliminated
- [ ] **"Always/Ask/Never" boundaries carried over** — if research-gate produced implementation boundaries, they're referenced or restated at the top of the plan
- [ ] **Existing patterns followed** — uses shared utilities, matches codebase conventions
- [ ] **Behavioral "Done When" criteria** — each task has at least one testable assertion (not just "build passes")
- [ ] **Security considered** — auth checks, input validation, CORS for new endpoints
- [ ] **State / timing / race audit done** — see section below. Skip only for pure read-only or cosmetic features.

## State / Timing / Race Audit (MANDATORY for stateful features)

Any feature that writes to a database, cache store, or shared state (e.g. a pending-changes map), or that triggers a refresh cycle, must pass this audit before the plan is approved. Silent races here have cost hours repeatedly. Explicitly address each row that applies — don't skip rows with "probably fine":

| Hazard | What to check |
|---|---|
| **Stale `useMemo` after state setter** | If the plan calls a handler right after `setX`, will it read the pre-update memo? Solution: `pendingAction` flag + `useEffect`, or accept the staleness explicitly. |
| **Cache invalidation after DB writes** | Does the write need to invalidate specific cache keys? Are there keys that must NOT be deleted because enrichment runs at read-time? |
| **Query invalidation coverage** | Does `handleRefresh` (or equivalent) invalidate ALL data keys that depend on the mutated table? Missing any key causes stale renders. |
| **Override confirmation** | If confirming a pending state, compare ALL identifying fields — not just one. Prefer server `result` over local data-driven string matching. |
| **Safety timers** | Never blind-clear pending state on a timer — must only clean up drafts + release refs. |
| **Re-entrancy / double-click** | Can the user click twice before state settles? Disable the triggering control while a pending flag is set. |
| **Effect re-fire during pipeline churn** | Effects watching state that the submit pipeline also mutates need a guard (`if (modalOpen) return` or equivalent). |
| **Chunk boundary collisions** | If chunked writes seed an index from `SELECT MAX(...)` server-side, ensure concurrent writes can't collide. |
| **Draft autosave collisions** | New flows that mutate shared state should debounce with AbortController — don't duplicate if a shared pattern already exists. |
| **Auth / identity** | Service-token requests need fallback identity; PIN gate is independent. Test both authed identities if your project has multiple auth paths. |
| **DST / cron triggers** | Worker crons are UTC — season changes shift fire times. A deploy command may NOT remove registered crons; verify via API after deploy. |
| **Secret-deploy-secret drift** | Rotating a secret via CLI can create deployments with OLD code — always follow with a full redeploy. |

**How to use this:** In the plan document, add a short "State / Timing / Race audit" subsection that names each hazard that applies and the mitigation, or explicitly notes "N/A — feature is UI-local / read-only". Reviewers check this section exists.

## Execution Modes

After the user approves the plan:

### Mode A: Subagent Execution (recommended for 3+ tasks)

Dispatch parallel agents using `isolation: "worktree"` for independent tasks:

```
For each independent task group:
1. Launch agent with worktree isolation
2. Agent reads the plan document for its assigned task(s)
3. Agent implements, verifies (build + lint), and reports
4. Main thread reviews results and merges
```

### Mode B: Sequential Execution (for dependent tasks or small plans)

Execute tasks sequentially with TodoWrite tracking. Mark each complete as you go.

### Mode C: Hybrid (most common)

- Independent infrastructure tasks (API endpoints, utilities) → parallel subagents
- Dependent UI integration → sequential after infrastructure is ready
- Final verification → always sequential, always last

## Plan Maintenance

- **Update the plan** if the approach changes during implementation
- **Mark completed tasks** with [x] as they finish
- **Add discovered tasks** that weren't in the original plan (scope creep flag — ask user first)
- Plans are reference documents, not sacred — adapt if reality diverges

## When NOT to Write a Plan

- Single-file bug fixes
- CSS-only changes
- Config/secret updates
- Features that `/research-gate` cleared as "no blocking constraints, straightforward"
- Tasks with fewer than 3 steps

For these, just use TodoWrite directly.
