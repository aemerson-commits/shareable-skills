---
name: propagate-feature
description: "Replicate features across projects with independent codebases — diff, adapt, apply. For cross-project propagation when projects have component copies instead of shared imports."
user-invocable: true
---

# Propagate Feature — Cross-Project Replication

When a feature is built in one project and needs to exist in another project that has its own component copies (not shared imports). The primary use case is when two projects share component structure but have diverged over time.

## When to Use

- After modifying components that another project also has copies of
- After adding a feature to one project that should exist in another
- When `/audit-components` flags drift between project copies
- When user says "also add this to [other project]" or "propagate to [project]"

## Arguments

- `--source=<project>` (required: source project)
- `--target=<project>` (required: target project)
- `--files=<glob>` (optional: specific files to propagate)
- `--all` — propagate all drifted files (uses diff to find them)

## Phase 1: Drift Analysis (2 Parallel Agents, model: "opus")

### Agent: Component Differ
```
Compare source and target component files.

For each file in the copy relationship:
1. Run diff between source and target versions
2. Classify each difference:
   - SOURCE_ONLY: Change exists only in source (needs propagation)
   - TARGET_ONLY: Change exists only in target (project-specific adaptation)
   - CONFLICT: Both sides changed the same area (needs manual resolution)
3. For SOURCE_ONLY changes: extract the specific hunks that need to apply

Output: Per-file diff report with classification
```

### Agent: API Differ
```
Compare source and target API function files.

For each API file in the relationship:
1. Diff the files
2. Identify: new endpoints in source, modified endpoints, source-only logic
3. Check: does the target have different bindings, different env vars?
4. Flag any endpoint that references project-specific resources

Output: Per-file API diff with adaptation notes
```

## Phase 2: Adaptation Plan (Main Agent)

Present the diff analysis to user:

```markdown
## Propagation: {source} → {target}

### Files to Propagate
| File | Changes | Type | Risk |
|------|---------|------|------|
| ComponentA.jsx | +new feature panel | SOURCE_ONLY | Low |
| api-handler.js | +new endpoint guards | SOURCE_ONLY | Low |
| Dashboard.jsx | +customer filter | CONFLICT | Medium |

### Conflicts (need your input)
- Dashboard.jsx: Source added customer filter at line 45. Target has testing tab at same location. How to merge?

### Auto-Adaptations
- Import paths adjusted (project-relative)
- Binding names verified against target config
```

Wait for user approval on conflicts.

## Phase 3: Apply (1 Worktree Agent, model: "opus")

### Agent: Propagator (worktree)

For each approved file:
1. **SOURCE_ONLY changes**: Apply the diff hunks to target file
2. **CONFLICT resolution**: Apply user's chosen resolution
3. **Auto-adapt**:
   - Adjust import paths for target project structure
   - Verify env var names match target config
   - Adjust CSS class prefixes if projects use different conventions
4. Do NOT touch source project files

## Phase 4: Verification (2 Parallel Agents, model: "opus")

### Agent: Build Verifier
- `cd {target} && npm run lint && npm run build`
- If shared/ was also modified: build source project too

### Agent: Consistency Checker
- Verify propagated components have same props interface
- Verify API endpoints handle same actions/params
- Verify no broken imports in target project
- Verify CSS additions don't collide with target's existing styles

## Phase 5: Report

```markdown
## Propagation Complete: {source} → {target}

### Files Modified
| File | Changes Applied |
|------|----------------|

### Remaining Drift (intentional)
| File | Target-Only Changes | Reason |
|------|-------------------|--------|

### Build Status
- {target}: PASS/FAIL
- {source}: PASS/FAIL (if modified)
```

## Anti-Patterns

- NEVER blindly copy entire files — always diff and apply hunks
- NEVER overwrite target-specific adaptations (extra features, project-specific logic)
- NEVER propagate without checking import path differences
- If a component has diverged significantly (>50% different), flag for user decision rather than auto-merging
