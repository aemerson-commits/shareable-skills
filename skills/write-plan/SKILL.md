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

These criteria are verified by `/review-impl` and visual verification.

**Approach:** [2-3 sentences — the chosen approach from research gate]
**Constraints:** [Key constraints that shaped this approach]

## File Map

| Action | File | Lines |
|--------|------|-------|
| Create | `{{project}}/src/components/NewView.jsx` | — |
| Modify | `{{project}}/src/App.jsx` | 45-60 |
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
  cd {{project}} && npm run build  # must pass
  ```

## Task 2: [Next Component]
...

## Task N: Final Verification

- [ ] Build all affected projects: `cd {{project}} && npm run build`
- [ ] Lint passes: `cd {{project}} && npm run lint`
- [ ] Manual smoke test: [what to check in browser]
- [ ] Automated verification: [if applicable]

## Parallel Execution Map

[Which tasks can run in parallel vs. which have dependencies]

Task 1 --> Task 3 --> Task 5 (verify)
Task 2 --> Task 4 --/
```

## Plan Quality Checklist

Before presenting the plan to the user, verify:

- [ ] **Every step has exact file paths** — no "update the relevant file"
- [ ] **Code blocks are complete** — not "add error handling" but the actual try/catch
- [ ] **Each task is independently verifiable** — has a verify step
- [ ] **Scope per task is S or M** — break L tasks into smaller pieces
- [ ] **Parallel opportunities identified** — independent tasks marked for concurrent execution
- [ ] **Constraints from research gate are respected** — no approach that was already eliminated
- [ ] **Existing patterns followed** — uses shared utilities, matches codebase conventions
- [ ] **Behavioral "Done When" criteria** — each task has at least one testable assertion (not just "build passes")
- [ ] **Security considered** — auth checks, input validation, CORS for new endpoints

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

- Independent infrastructure tasks (API endpoints, utilities) -> parallel subagents
- Dependent UI integration -> sequential after infrastructure is ready
- Final verification -> always sequential, always last

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
