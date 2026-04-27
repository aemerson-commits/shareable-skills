---
name: audit-components
description: "Audit component health after code changes — verify imports, props, and shared utility consistency across all projects."
user-invocable: true
---

# Audit Components

Verify the health of the modular component architecture after code changes. Catches broken imports, prop mismatches, unused exports, and drift between shared utilities and their consumers.

## What This Checks

### 1. Import Resolution
Verify every import in each component resolves to an actual export:
- Check all component `.jsx` files in each project
- Check shared utility files
- Check root `App.jsx` imports

### 2. Props Consistency
Verify props passed from App.jsx match what each component destructures:
- Props passed but never destructured (wasted, non-breaking)
- Props destructured but never passed (will be `undefined`, likely a bug)

### 3. Shared Utility Usage
Verify no component has local copies of functions that exist in shared utilities:
- Search for duplicate function definitions across all component files in all projects
- Flag any local reimplementation of shared functions

### 4. Unused Exports
Check if any export from shared files is not imported anywhere:
- For each export in shared utility files
- Search all `.jsx` files for matching import statements
- Flag exports with zero consumers

### 5. Lint and Build (all projects)
```bash
cd project-a && npx biome lint src/ && npm run build
cd project-b && npx biome lint src/ && npm run build
# ... repeat for each project
```
All must pass with 0 errors. Report any warnings.

### 6. Cross-Project Shared Re-exports
If your projects re-export shared utilities, verify each project's local utils file re-exports ALL functions from the shared source. Flag any missing re-exports.

## Steps

### Phase 1 — Parallel Per-Project Audit

Dispatch agents simultaneously (model: "opus"), one per project. Each agent independently performs checks 1-2 and 5 for its project:

- **Agent: Project A Auditor** — Read App.jsx, check all component imports resolve, verify props passed vs destructured, run lint + build
- **Agent: Project B Auditor** — Same for project B
- (etc.)

Each agent returns a structured report: `{ project, importIssues[], propIssues[], lintWarnings[], buildResult }`.

### Phase 2 — Parallel Cross-Project Checks

Dispatch 2 agents simultaneously (model: "opus") for checks 3, 4, and 6:

- **Agent: Shared Utility Auditor** — Check for duplicate utility definitions across all projects (check 3). Verify re-exports match shared source exports (check 6). Flag any missing re-exports or local duplicates.
- **Agent: Unused Export Auditor** — Check all shared exports have at least one consumer across all projects (check 4). Flag orphaned exports with zero consumers.

Each agent returns: `{ duplicates[], missingReexports[], unusedExports[] }`.

### Phase 3 — Synthesize

Main agent compiles results from all agents into the final PASS/WARN/FAIL table.

## Agent Teams Architecture

```
Phase 1 (parallel, model: "opus"):
  +-- Project A Auditor -----> imports + props + lint/build
  +-- Project B Auditor -----> imports + props + lint/build
  +-- Project C Auditor -----> imports + props + lint/build

Phase 2 (parallel, model: "opus"):
  +-- Shared Utility Auditor -> duplicates + re-exports (checks 3, 6)
  +-- Unused Export Auditor --> orphaned exports (check 4)

Phase 3 (main agent):
  Compile agent results -> PASS / WARN / FAIL table
```

All agents are read-only (no code modifications), so `isolation: "worktree"` is not required.

## Output Format

Report results as:
- **PASS** items (green) - everything correct
- **WARN** items (yellow) - non-breaking but worth noting (unused props, etc.)
- **FAIL** items (red) - will cause bugs or build failures

## Pre-Edit Consumer Scan

Before editing or removing CSS classes or data field references:
1. Grep for the class/field across ALL projects
2. Check both JSX references (`className=`) and CSS definitions (`.class-name {`)
3. Check both component CSS files AND `App.css` in each project

## Post-Edit Completeness Check

After applying changes across multiple files:
1. Re-grep for the changed pattern to confirm ALL instances updated
2. This catches files you didn't know about (e.g., a third project copy)

## Post-Edit Re-Grep Verification

After any multi-file pattern edit (renaming a prop, removing a CSS class, swapping an import, adding a parameter to a shared function), re-run the ORIGINAL pre-edit grep against the codebase AFTER your edits:

```bash
# Example: after adding a param to a shared utility across all consumers
grep -rn "mySharedFn" project-a/src/ project-b/src/ shared/

# Example: after renaming a CSS class
grep -rn "old-class-name" project-a/src/ project-b/src/

# Example: after converting a prop to an import
grep -rn "propsName\|OldPropPattern" --include="*.jsx" .
```

The re-grep catches:
- **Files added between Edit operations** that weren't in the initial scan
- **Import aliases** that resolve differently across projects
- **Test files** that import or mock the changed symbol
- **Index re-exports** that forward the old signature

Zero results = all instances updated. Any remaining hits = missed site. Fix before committing.

This is the post-edit equivalent of the pre-edit consumer scan — both are required for complete coverage. Running only the pre-edit scan leaves a gap for files created or modified after your initial grep.

## When to Use
- After modifying shared utilities or constants
- After adding/removing props from a component
- After adding a new component
- Before merging to main (part of the release checklist)
