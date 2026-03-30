---
name: verify-complete
description: "Verify feature completion with evidence — greps code, runs build, takes screenshots. Use BEFORE claiming any feature is done. Triggers: 'verify complete', 'check if done', 'is this actually working', or proactively after claiming 3+ items complete."
user-invocable: true
---

# Verify Complete — Evidence-Based Completion Check

Prevents overclaiming by requiring code-level evidence for each claimed feature. Use this before marking items as done in session notes, roadmaps, or status reports.

## When to Use

- After implementing a feature checklist (e.g., "10 UI improvement ideas")
- Before writing session notes that claim items are complete
- When reporting status to stakeholders
- Anytime you're about to say "X of Y items done"

## Steps

### 1. List Claims

Write out each feature being claimed as complete:
```
1. [CLAIMED] Search input in grid view
2. [CLAIMED] Color legend button
3. [CLAIMED] Product filter dropdown
...
```

### 2. Code Verification (Per Feature)

For each claimed feature, provide evidence:

```bash
# Search for the implementation
grep -r "searchText\|search-input\|filterText" project/src/ --include="*.jsx" --include="*.js" -l
```

Evidence categories:
- **Component exists**: File path + key JSX snippet
- **State wired**: useState/useEffect for the feature
- **UI renders**: JSX that produces visible output
- **API connected**: fetch/endpoint call if needed
- **CSS styled**: Relevant class names exist

Mark each as:
- `[VERIFIED]` — code exists, renders, connected
- `[PARTIAL]` — code exists but incomplete (missing CSS, no API, etc.)
- `[NOT FOUND]` — claimed but no code evidence
- `[DOCUMENTED ONLY]` — help text exists but no implementation

### 3. Build Verification

```bash
cd <project> && npm run build
```

Build passing does NOT mean features work — it only means no syntax errors.

### 4. Lint Verification

```bash
cd <project> && npm run lint
```

### 5. Visual Verification (if Playwright available)

Take screenshots of the feature in action. If auth blocks access, note it and verify via code instead.

### 6. Report Honest Status

```
## Feature Verification Report

| # | Feature | Code | Build | Visual | Status |
|---|---------|------|-------|--------|--------|
| 1 | Search  | Found in Dashboard.jsx:45 | PASS | N/A | VERIFIED |
| 2 | Legend  | NOT FOUND | - | - | NOT DONE |
| 3 | Filter  | Found but missing dropdown JSX | PASS | - | PARTIAL |
```

### 7. Correct Memory/Notes

If any items were previously claimed as done but are NOT VERIFIED:
- Update MEMORY.md to correct the status
- Update session notes if they contain false claims
- Update roadmap items if they were marked completed

## Anti-Patterns

- NEVER mark something as complete based on memory alone — always grep for code
- NEVER count help documentation as implementation
- NEVER count CSS without corresponding JSX as complete
- NEVER claim "done" without running build at minimum
- NEVER report X/Y completion without evidence for each X item

## Evidence Levels

| Level | Meaning | Required Evidence |
|-------|---------|-------------------|
| Verified | Feature works end-to-end | Code + build + visual or API test |
| Code Complete | Implementation exists | Code + build pass |
| Partial | Some pieces exist | Code exists but gaps identified |
| Not Done | No implementation | Grep returns empty or docs-only |
