---
name: worktree-guard
description: "Safe worktree merge — diffs each changed file against dev HEAD before copying, flags conflicts. Use BEFORE copying worktree files to the main tree. Triggers: 'merge worktree', 'copy from worktree', after any worktree agent completes with changes."
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
5. **Refined rule for a shared/common hub directory**: if the conflicting file lives in a shared library layer imported by many consumers (utils, hooks, shared components), prefer **Keep worktree** (`git checkout --theirs <file>`) — the agent's edits ARE the intended change, and a shared hub is rarely touched by unrelated work in the same window. Fall back to a manual merge only when step 2 shows the main branch *and* the worktree independently touched the same file.

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

## Worktree Agent Cherry-Pick Lifecycle (6 Steps)

When a worktree agent commits its changes to a branch, use this sequence to integrate back into `dev` (this is the canonical pattern):

1. **Fetch**: `git fetch origin <agent-branch>` after agent reports completion
2. **Diff**: `git log main..origin/<agent-branch> --oneline` to confirm commits exist. If empty, the agent failed to commit — redo the work in the main tree.
3. **Cherry-pick**: `git cherry-pick origin/<agent-branch>` (single commit) or `git cherry-pick <first>^..<last>` for multi-commit branches. For a clean integration, `git merge --no-ff origin/<agent-branch>` also works.
4. **Conflict handling**: For conflicts in shared files, prefer `git checkout --theirs <file>` — the agent's edits are the intended changes; main usually has unrelated drift. Manual merge only when both sides independently touched the same region.
5. **Test**: Run project tests + `npm run build` in each affected project before pushing.
6. **Cleanup**: `git worktree remove <path>` and `git branch -D <agent-branch>` once merged. Remote branch: `git push origin --delete <agent-branch>`.

**Empty diff = silent commit failure**: If `git log main..origin/<agent-branch>` returns nothing, the agent ran but never committed. Do not proceed — redo the task.

## Post-Merge Teardown

Generalizes the merge flow above to ANY merged worktree — a cherry-picked agent branch OR a merged PR worktree. Tear down **immediately after merge confirmation** (or after `git merge-base --is-ancestor <wt-HEAD> origin/<main-branch>` confirms the commits landed) — don't defer to session end. Stale worktrees accumulate (one audit had to bulk-remove 21) and cause "already checked out" errors when a branch name is reused:

```bash
git worktree remove -f <path-to-worktree>   # -f needed when a lockfile is dirty from an install
git worktree prune                          # clear stale refs — especially after a multi-worktree session
git branch -d <branch-name>                 # if a branch was created for it
```

Periodic hygiene: `git worktree list | wc -l` — if it climbs past a handful, audit each worktree's HEAD with `git merge-base --is-ancestor <wt-HEAD> origin/<main-branch>` and bulk-remove only those already merged. If you find yourself hand-rolling this create/list/teardown/prune cycle often, wrap it in a small helper script (create/list/finish/prune subcommands) rather than reproducing the recipe by hand each time — cheap to write, and it removes the "did I remember every step" risk.

## Sibling Worktrees (per-concurrent-session isolation)

Distinct from the merge flow above: when several sessions run at once, each concurrent task should get its **own sibling worktree** — a peer directory next to the main checkout (e.g. `../<repo>-<topic>`) — so one session's branch switch or cleanup can't clobber another's uncommitted work. Use this instead of sharing a single checkout across sessions. For a throwaway, non-`cd`'d scratch tree, a lighter alternative is a leading path variable pointing into a scratch/temp directory.

**Create** (off your default integration branch for most tracks, off the release branch for a follow-up to something already shipped):

```bash
git worktree add -b <you>/<topic> "../<repo>-<topic>" origin/<default-branch>   # new branch
git worktree add "../<repo>-<topic>" <you>/<existing-branch>                   # existing branch
```

`cd` into it and treat it as a full standalone checkout (edit / grep / build / test / commit from inside).

**Bootstrap deps** so tests/builds work in the fresh tree:

- **Junction/symlink the main repo's dependency directory** (fast — for a test-only run): on Windows, `cmd.exe /c 'mklink /J "<worktree>\node_modules" "<main-repo>\node_modules"'` — note `/J` (junction), NOT `/D` (symlink; needs admin, fails without it). On macOS/Linux, a plain symlink works.
- **Run the real install** when a genuine build is needed. If it churns the lockfile, restore the original from your default branch afterward to keep the churn out of the feature diff.
- Copy in any gitignored local secrets/keys the sibling needs for deploy-adjacent operations.

**Teardown** (immediately after the branch lands — don't defer to session end):

```bash
rmdir <worktree>/node_modules   # un-junction/un-link FIRST if you linked it
git worktree remove "../<repo>-<topic>" --force   # --force if the lockfile is dirty
git branch -D <you>/<topic>
```

A junctioned/symlinked dependency directory must be removed before `worktree remove`, or removal trips on it.

## Anti-Patterns

- NEVER `cp` a worktree file over a main tree file without checking for conflicts first
- NEVER assume worktree has the latest version — it branched from an earlier commit
- NEVER merge worktrees in sequence without rebuilding between each (cascading conflicts)
