---
name: worktree-guard
description: "Safe worktree merge — diffs each changed file against dev HEAD before copying, flags conflicts. Use BEFORE copying worktree files to the main tree. Triggers: 'merge worktree', 'copy from worktree', after any worktree agent completes with changes."
user-invocable: true
---

# Worktree Guard — Safe Merge

Prevents worktree agents from silently overwriting changes made earlier in the session or by other worktrees.

## When to Use

MANDATORY before copying any files from `.claude/worktrees/agent-*` to the main working tree. This skill should be invoked automatically when:
- A worktree agent completes with file changes
- Multiple worktree agents ran in parallel and need merging
- Any `cp` command targets files from a worktree path

## Steps

### 1. Identify Changed Files

For each worktree that needs merging:
```bash
cd <worktree-path> && git diff --name-only
```

### 2. Check for Conflicts

For each changed file in the worktree, check if the same file was modified in the main tree since the worktree branched:
```bash
# Get the worktree's base commit
BASE=$(cd <worktree-path> && git merge-base HEAD origin/dev)

# Check if file changed in dev since base
git diff --name-only $BASE..HEAD -- <file-path>
```

If a file appears in BOTH lists, it's a **conflict**.

### 3. Handle Conflicts

For each conflicting file:
1. Show a side-by-side summary: what the worktree changed vs what dev changed
2. **DO NOT silently overwrite** — present options:
   - **Merge manually**: Apply worktree additions without removing dev changes (append CSS, merge JSX carefully)
   - **Keep dev**: Skip the worktree's version of this file
   - **Keep worktree**: Overwrite (only if user explicitly confirms)
3. For CSS files (most common conflict): append worktree additions to the end of the dev version
4. For JSX/JS files: use Edit tool to surgically add worktree's new code blocks into the dev version

### 4. Safe Copy

For non-conflicting files, copy directly:
```bash
cp <worktree-path>/<file> <main-tree>/<file>
```

### 5. Verify

After all files merged:
```bash
cd <project> && npm run build
```

If build fails, the merge introduced an error — investigate before committing.

## Common Conflict Patterns

| File Type | Strategy |
|-----------|----------|
| `App.css` | Append new CSS blocks from worktree to end of dev file |
| `App.jsx` | Surgical Edit — add new imports, state, JSX where needed |
| API handler files | Add new endpoint cases to existing if/else chain |
| `package.json` | Merge dependencies (usually additive) |

## Anti-Patterns

- NEVER `cp` a worktree file over a main tree file without checking for conflicts first
- NEVER assume worktree has the latest version — it branched from an earlier commit
- NEVER merge worktrees in sequence without rebuilding between each (cascading conflicts)
