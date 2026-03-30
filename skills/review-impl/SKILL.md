---
name: review-impl
description: Adversarial implementation review. Dispatches independent reviewer agents to verify spec compliance and code quality after feature implementation. Use after completing a multi-step feature, before committing or deploying.
---

# Review Implementation

Dispatch independent reviewer agents that read the actual code — not the implementer's summary. This catches the class of bugs where "it works in my head" doesn't match what was actually written.

## Arguments

- First argument (optional): Feature name or description of what was just implemented
- If a plan exists in `docs/plans/`, reference it automatically

## When to Use

- After completing any feature that touches 3+ files
- After any feature involving auth, security, or financial data
- After any feature with a plan document
- Before committing multi-step work
- When the user says "review this" or "check my work"

Skip for: single-file fixes, CSS changes, config updates.

## Grading Rubric

Each reviewer grades against weighted criteria (not just pass/fail):

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| **Functionality** | 40% | Does the feature work as specified? Missing requirements? Extra work not requested? |
| **Design consistency** | 25% | Follows existing patterns? Color tokens, spacing, component reuse? |
| **Data integrity** | 20% | Edge cases handled? Empty states? Error states? Loading states? Null/undefined safety? |
| **Performance** | 15% | No unnecessary re-renders? Bundle impact? API call efficiency? |

**Scoring**: Each dimension gets 1-5. Weighted total determines overall grade:
- **A (4.0+)**: Ship it — no issues or minor style nits only
- **B (3.0-3.9)**: Fix IMPORTANT issues, then ship
- **C (2.0-2.9)**: Significant issues — fix before commit
- **F (<2.0)**: Fundamental problems — re-evaluate approach

Each reviewer agent includes a score table in their output.

## Process

### Phase 1: Gather Context (parallel, model: "opus")

Dispatch 3 context-gathering agents simultaneously:
- **Agent: Diff Analyzer** — Run `git diff --stat` and `git diff` to capture all changed files and actual code changes
- **Agent: Spec Reader** — Read the plan from `docs/plans/` (if exists) + TodoWrite list for intended scope
- **Agent: Pattern Scanner** — Read neighboring unchanged files to establish baseline patterns and conventions

All 3 agents report back. Main agent compiles context package for Phase 2 reviewers.

### Phase 2: Dispatch Reviewers (parallel)

Launch three agents simultaneously (all model: "opus"):

**Agent A — Spec Compliance Reviewer**

```
You are reviewing code that was just implemented. Your job is to verify it matches
the specification — nothing more, nothing less.

IMPORTANT: The implementer may have cut corners, missed edge cases, or built
something slightly different from what was requested. Do NOT trust summaries
or commit messages. Read the actual code.

Context:
- Plan/spec: [paste plan or feature description]
- Changed files: [from git diff --stat]

Review checklist:
1. MISSING REQUIREMENTS: Is anything from the spec not implemented?
   - Check every requirement line by line against the code
   - Look for TODO comments that indicate unfinished work
   - Verify error handling exists where the spec implies it

2. EXTRA/UNNEEDED WORK: Was anything added that wasn't requested?
   - Over-engineered abstractions
   - Features not in the spec
   - Premature optimization

3. SECURITY GAPS: For any new endpoints or data handling:
   - Auth checks present?
   - Input validation on user data?
   - XSS prevention for HTML output?
   - CORS headers from shared utilities (not duplicated locally)?

4. DATA INTEGRITY: For any data transformations:
   - Are cache keys using correct patterns?
   - Are IDs from config (not hardcoded)?
   - Are dates formatted consistently?

Output format:
## Spec Compliance: PASS / ISSUES FOUND

### [If issues found]
| # | Severity | File:Line | Issue | Fix |
|---|----------|-----------|-------|-----|
| 1 | CRITICAL | path:42   | ...   | ... |

CRITICAL = must fix before commit (security, data loss, broken functionality)
IMPORTANT = should fix (missing feature, poor error handling)
MINOR = nice to have (naming, style)
```

**Agent B — Code Quality Reviewer**

```
You are reviewing code quality for recently implemented changes.
Read the actual diffs — do not rely on descriptions.

Changed files: [from git diff --stat]

Review checklist:
1. PATTERNS & CONVENTIONS:
   - Follows existing codebase patterns? (check neighboring files)
   - Uses shared utilities?
   - React hooks used correctly? (no nested components, stable useMemo deps)
   - CSS follows project conventions?

2. ERROR HANDLING:
   - API endpoints return proper error responses (not unhandled exceptions)?
   - Frontend handles loading/error states?
   - No silent failures (catch blocks that swallow errors)?

3. PERFORMANCE:
   - No unnecessary re-renders (check useMemo/useCallback usage)?
   - API calls aren't duplicated?
   - Large data sets paginated or virtualized?

4. MAINTAINABILITY:
   - No magic numbers or hardcoded values that should be constants?
   - No duplicated logic that should use shared utilities?
   - Clear variable/function names?

Output format:
## Code Quality: PASS / ISSUES FOUND

### [If issues found]
| # | Severity | File:Line | Issue | Suggestion |
|---|----------|-----------|-------|------------|
| 1 | IMPORTANT | path:42  | ...   | ...        |
```

**Agent C — Security & Auth Reviewer**

```
You are reviewing security aspects of recently implemented changes.
Read the actual diffs — do not rely on descriptions.

Changed files: [from Phase 1 Diff Analyzer]

Review checklist:
1. AUTH COVERAGE:
   - Every new API endpoint has auth checks
   - RBAC permissions checked where needed
   - No raw auth header reads (use helper functions)

2. INPUT VALIDATION:
   - All user-controlled parameters validated
   - SQL queries use parameterized queries (no string concatenation)
   - HTML output escapes user data

3. SECRETS & CORS:
   - No hardcoded secrets, API keys, or tokens
   - CORS headers from shared utilities (not duplicated)
   - Error responses don't leak internal details

Output format:
## Security Review: PASS / ISSUES FOUND

### [If issues found]
| # | Severity | File:Line | Issue | Fix |
|---|----------|-----------|-------|-----|
| 1 | CRITICAL | path:42  | ...   | ... |
```

### Phase 3: Synthesize and Act

After all three reviewers (A, B, C) report:

1. **All PASS** → Report clean review, proceed to Phase 4 or commit
2. **MINOR issues only** → List them, ask user if they want to fix or skip
3. **IMPORTANT issues** → Fix them, then re-run the affected reviewer
4. **CRITICAL issues** → Fix immediately, re-run all three reviewers

### Phase 4: Visual Verification (if UI changed, model: "opus")

Skip if changes are backend-only or config-only.

Dispatch 1 Playwright agent:

**Agent D — Visual Verification**
```
You are verifying the visual implementation of recently changed UI components.

Changed files: [from Phase 1 — filter to .jsx and .css files only]
Project: [determine from file paths]
Dev URL: [from project config]

Steps:
1. Launch headless Playwright
2. Navigate to dev URL with auth headers
3. Navigate to new/modified view
4. Take screenshots: default state, with data, mobile viewport (375x812)
5. Compare against existing views: color tokens, spacing, theme, responsive
6. If acceptance criteria exist (from /write-plan "Done When"): verify each one

Output:
## Visual Verification: PASS / ISSUES FOUND
Screenshots: [list of paths]
| Check | Status | Notes |
|-------|--------|-------|
| Color tokens | PASS/FAIL | |
| Theme | PASS/FAIL | |
| Mobile responsive | PASS/FAIL | |
| Acceptance criteria | PASS/FAIL | |
```

Note: Requires changes deployed to dev. If not yet deployed, skip and add "deploy + visual verify" to Next Steps.

### Phase 4b: Consumer Contract Verification (if data shape changed)

Skip if changes don't affect API response shapes or data transformations.

Dispatch 1 agent (model: "opus"):

**Agent E — Consumer Contract Reviewer**
```
You are verifying that new/modified API responses match what frontend
components actually read.

Changed files: [from Phase 1 — filter to API files]

Steps:
1. For each modified API endpoint, identify the response shape (field names, types, nesting)
2. Grep ALL frontend .jsx files that call this endpoint
3. For each consumer, extract the exact field paths read:
   - Direct property access: `data.fieldName`
   - Destructuring: `const { field1, field2 } = item`
   - Map/filter callbacks: `.filter(s => s.status === 'active')`
   - Conditional checks: `if (item.field && item.otherField)`
4. Compare: does every consumer field exist in the API response?
5. Check: are field NAMES identical?
6. Check: are field TYPES compatible? (string vs number, null vs undefined)

Output:
## Consumer Contract: PASS / MISMATCHES FOUND
| Consumer File | Field Read | API Field | Match? |
|--------------|------------|-----------|--------|
```

### Phase 5: Report

Present a concise summary:

```markdown
## Implementation Review: [Feature]

### Grade: [A/B/C/F] (weighted score: X.X/5.0)
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Functionality | X/5 | 40% | X.X |
| Design consistency | X/5 | 25% | X.X |
| Data integrity | X/5 | 20% | X.X |
| Performance | X/5 | 15% | X.X |

**Spec Compliance:** PASS / X issues (Y fixed)
**Code Quality:** PASS / X issues (Y fixed)
**Security:** PASS / X issues (Y fixed)
**Visual:** PASS / X issues (deployed: yes/no)
**Consumer Contracts:** PASS / X mismatches (if data shape changed)

### Issues Found & Resolved
- [brief description of what was caught and fixed]

### Ready to Commit: YES / NO (pending fixes)
```

## Review Anti-Patterns (Do NOT do these)

- **Rubber-stamping**: "Looks good" without reading the code → always cite specific files
- **Style-only feedback**: Focusing on formatting when there are logic bugs
- **Trusting the implementer's self-report**: Always read the diff independently
- **Scope creep in review**: Suggesting refactors or features not in the spec
- **Blocking on MINOR**: Don't hold up a commit for naming preferences

## Integration with Other Skills

| Workflow | When to Review |
|----------|---------------|
| `/write-plan` → implement → `/review-impl` | Standard feature workflow |
| `/research-gate` → implement → `/review-impl` | Simpler features |
| Bug fix → `/review-impl` | Only if fix touches 3+ files |
| `/deploy` | Review runs automatically before deploy if changes are uncommitted |
