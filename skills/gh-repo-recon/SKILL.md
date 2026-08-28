---
name: gh-repo-recon
description: "Read a GitHub repository you haven't cloned — its code, its issues and PRs, or its security posture — through the `gh` API instead of cloning it. Use when evaluating a dependency or platform before adopting it, tracing how another repo implements something, auditing rulesets / branch protection / deploy keys / Dependabot alerts, or answering 'who merged what' on a repo whose files you don't need. Triggers: 'look at <owner>/<repo>', 'how does X implement Y', 'audit our repo settings', 'check branch protection', 'who merged these PRs'. NOT for the repo you already have checked out (use Grep/Read) and NOT for CI status on your own PR (use `gh pr checks`)."
---

# gh-repo-recon

Read a repo you haven't cloned. Cloning to answer one question costs a full fetch, leaves a
directory to clean up, and still can't answer the governance questions — rulesets, branch
protection, deploy keys, merge attribution, and Dependabot alerts live only in the API.

Work outside-in: shape, then source, then history. Stop at the first layer that answers the
question — most questions end at layer 2.

## Layer 1 — Shape

```bash
gh api repos/<owner>/<repo> --jq '{full_name, stars:.stargazers_count, pushed:.pushed_at, open_issues_count, default_branch}'

# Every file in one call, then grep it — the API's equivalent of Glob.
gh api repos/<owner>/<repo>/git/trees/<default_branch>?recursive=1 \
  --jq '.tree[] | select(.type=="blob") | .path' | grep -i '<pattern>'

gh api repos/<owner>/<repo>/contents/<dir> --jq '.[].name'
```

Read `default_branch` from layer 1 instead of assuming `main` — a recursive tree call against the
wrong branch name returns a 404 that reads like a permissions problem.

## Layer 2 — Source

Download to a scratch dir, then read ranges. Progressive drilling beats fetching whole files:

```bash
curl -sL -o "$SCRATCHPAD/target.ts" \
  "https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>"

grep -n -i '<concept>' "$SCRATCHPAD/target.ts"
sed -n '216,320p' "$SCRATCHPAD/target.ts"
```

Same discipline as reading an unfamiliar local module: map the API surface before deep-reading —
`grep -n '^export\|^function\|^async function'` the downloaded file first.

## Layer 3 — Cross-repo code search

```bash
gh api -X GET search/code -f q='"<term>" repo:<owner>/<repo>' \
  --jq '.total_count, (.items[] | "\(.path):\(.name)")'
```

Code search indexes the default branch only and lags a push by minutes to hours. A zero result is
weak evidence of absence — confirm against the layer-1 tree before concluding the term isn't there.

## Layer 4 — Issues and PRs

```bash
for n in 1234 1235 1236; do
  echo "=== ISSUE $n ==="
  gh api repos/<owner>/<repo>/issues/$n --jq '{number,title,state,created_at,labels:[.labels[].name]}'
done

gh pr view <N> --repo <owner>/<repo> --json number,title,state,mergedAt,mergeable
gh api repos/<owner>/<repo>/pulls/<N>/reviews  --jq '.[] | "\(.user.login): \(.state)"'
gh api repos/<owner>/<repo>/issues/<N>/comments --jq '.[] | "--- \(.user.login) [\(.created_at)]:\n\(.body[0:200])"'
```

Batch by loop, not one call per turn.

**Three traps that cost real time:**

- **`mergeable` is `null`/UNKNOWN until the host computes it in the background**, and CI status
  says nothing about it. Reading a PR as "green and ready" from checks alone can queue a
  CONFLICTING PR as ready and produce a hard merge failure. Read `mergeable`, and if it's null,
  re-request rather than assuming.
- **A review verdict can be stale-by-head and read exactly like an uncleared one.** A block
  posted minutes after the commit that fixed it carries no marker saying so. Compare the
  verdict's recorded `HEAD=` against the PR's *current* head — that comparison is the read, not
  the verdict word.
- **Deleting a branch on merge can silently close a PR stacked on top of it.** If PR B's base is
  PR A's branch, merging A with `--delete-branch` (or the UI's "delete branch" checkbox) can take
  B down with it — with no separate warning that a second, still-open PR was affected. Before
  deleting a merged branch, check whether anything else has it as a base: `gh pr list --state
  open --base <branch-being-deleted>`.

## Layer 5 — Governance and security posture

The layer with no local equivalent. Loop it across repos when auditing more than one.

```bash
for r in <repo-a> <repo-b> <repo-c>; do
  echo "=== $r ==="
  gh api repos/<owner>/$r/rulesets                 --jq '.[] | "\(.id) \(.name) \(.enforcement)"'
  gh api repos/<owner>/$r/branches/main/protection --jq '{reviews:.required_pull_request_reviews, checks:.required_status_checks.contexts}'
  gh api repos/<owner>/$r/deploy-keys              --jq '.[] | "\(.title) read_only=\(.read_only)"'
  gh api repos/<owner>/$r/actions/permissions
done

# Which merges were a bot and which were a human
gh api "repos/<owner>/<repo>/pulls?state=closed&per_page=30" \
  --jq '.[] | select(.merged_at) | "\(.number) author=\(.user.login) merged_by=\(.merged_by.login)"'

gh api repos/<owner>/<repo>/dependabot/alerts \
  --jq '[.[] | select(.state=="open")] | length'
```

- A ruleset can bypass branch protection, so read both — protection alone doesn't answer "can
  this actor push to main".
- **A Dependabot alert list lags a landed fix.** Alerts still reading open right after a patch
  merges is usually the rescan lagging, not a failed fix — confirm the patched version is on the
  branch before treating the count as current.
- **A wrong-token 200 can be a login page**, not a success. When probing anything behind an auth
  wall, check the response body, not just the status code.

## Layer 6 — Fall back to a shallow clone

The API can't express ancestry. When the question is "is this commit on that branch" or "what
would this merge do", clone blobless and answer it with git:

```bash
gh repo clone <owner>/<repo> "$SCRATCHPAD/repo" -- --quiet --filter=blob:none
git -C "$SCRATCHPAD/repo" merge-base --is-ancestor <sha> origin/main && echo ON_MAIN || echo NOT_ON_MAIN
```

API-first, clone as the last resort — not the reverse.

## Notes

- Every command here is a **read** except the `gh pr merge` / `gh pr close` you might reach for
  at the end of an investigation. Cross-repo writes (merge, close, comment, delete a branch) are
  ordinary gated actions — confirm before acting on a repo the current task didn't name.
- `--jq` projections keep output small; prefer them over piping whole JSON bodies into context.
- Rate limit: `gh api rate_limit --jq '.resources.core'`. Code search has its own, much lower
  limit — don't loop it as freely as the other endpoints.

## Cross-links

- `pre-merge-review` — reviewing a diff you're about to merge, rather than reading a repo you
  don't have checked out
- `research-gate` § Phase 0 — checking whether an open PR already covers the feature before
  researching it, using the same `gh pr list` primitive
