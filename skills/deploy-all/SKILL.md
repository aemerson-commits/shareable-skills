---
name: deploy-all
description: "Parallel deploy all changed projects — detects changes, builds, deploys, watches CI, verifies live URLs. Use instead of manual per-project deploys. Triggers: 'deploy all', 'deploy everything', 'push and deploy'."
user-invocable: true
---

# Deploy All — Parallel Multi-Project Deploy

Deploys all projects with changes in a single orchestrated flow. Replaces the manual commit-push-deploy-watch-curl cycle.

## Projects

Configure your project table for your repo:

| Project | Dir | Dev CF Project | Prod CF Project | CI Workflow |
|---------|-----|----------------|-----------------|-------------|
| Project A | `project-a/` | `your-project-a-dev` | `your-project-a` | `Deploy A` |
| Project B | `project-b/` | `your-project-b-dev` | `your-project-b` | `Deploy B` |
| Project C | `project-c/` | `your-project-c-dev` | `your-project-c` | `Deploy C` |

**Source directory gotcha**: the CF Pages project name may differ from the source directory name. If your source dir name doesn't match the CF Pages project name, deploying from the wrong directory ships stale `functions/api/*.js` that breaks endpoints with 500s. Always match source dir to what your CI workflow uses.

## Steps

### 1. Detect Changed Projects

```bash
# Which projects have uncommitted changes?
git diff --name-only HEAD | grep -oP '^(project-a|project-b|project-c|workers)/' | sort -u
```

### 2. Build All Changed Projects (Parallel)

```bash
cd project-a && npm run build &
cd project-b && npm run build &
cd project-c && npm run build &
wait
```

If any build fails, STOP. Fix the error before deploying anything.

### 3. Lint All Changed Projects (Parallel)

```bash
cd project-a && npm run lint &
cd project-b && npm run lint &
cd project-c && npm run lint &
wait
```

If any lint fails, STOP. Fix before committing.

### 4. Commit and Push

```bash
git add <changed-files>
git commit -m "<descriptive message>"
git push origin dev
```

ASCII dashes only in the commit message — some CLI deploy tools reject em/en-dashes in a `--commit-message` flag: the deploy can succeed while the CI dashboard shows the step failed on a parse error, which reads as a flake.

### 5. Deploy Changed Projects (Parallel)

For dev deploys (default):
```bash
cd project-a && npx wrangler pages deploy dist --project-name=your-project-a-dev --branch=main --commit-dirty=true &
cd project-b && npx wrangler pages deploy dist --project-name=your-project-b-dev --branch=main --commit-dirty=true &
cd project-c && npx wrangler pages deploy dist --project-name=your-project-c-dev --branch=main --commit-dirty=true &
wait
```

### 6. Watch CI

**Prefer the Monitor tool** over `gh run watch --exit-status` when possible — it streams run events as notifications without blocking the turn, so you can progress other work (verification, notes) while CI runs.

```bash
gh run list --limit 5 --json databaseId,status,name
```

Then use the Monitor tool on each in-progress run. Shell-loop fallback when Monitor isn't suitable:

```bash
# Non-blocking fallback: poll until all runs resolve, then report.
# Monitor tool is preferred over this for longer CI runs.
until [ "$(gh run list --branch main --limit 5 --json status --jq '.[] | select(.status != "completed") | .status' | wc -l)" = "0" ]; do
  sleep 10
done
gh run list --branch main --limit 5 --json databaseId,conclusion,name
```

Avoid `gh run watch --exit-status` chained with other commands — it blocks the whole turn and burns prompt cache on waits. Monitor or the `until` loop lets the agent do other work while CI completes.

### 7. Verify Live URLs

```bash
# With CF Access credentials (adapt to your auth mechanism):
curl -s -o /dev/null -w "project-a: HTTP %{http_code}\n" \
  -H "CF-Access-Client-Id: ${CF_ID}" -H "CF-Access-Client-Secret: ${CF_SECRET}" \
  https://your-project-a-dev.{{your-domain}}
curl -s -o /dev/null -w "project-b: HTTP %{http_code}\n" \
  -H "CF-Access-Client-Id: ${CF_ID}" -H "CF-Access-Client-Secret: ${CF_SECRET}" \
  https://your-project-b-dev.{{your-domain}}
```

200 = healthy. 5xx = broken. 302 = auth credentials missing.

### 8. Report

Print a consolidated matrix:

```
| Project    | Build | Lint | Deploy | CI  | Live |
|------------|-------|------|--------|-----|------|
| Project A  | PASS  | PASS | PASS   | OK  | 200  |
| Project B  | PASS  | PASS | PASS   | OK  | 200  |
| Project C  | SKIP  | SKIP | SKIP   | -   | -    |
```

## Flags

- `--prod`: Deploy to production projects instead of dev
- `--workers`: Also deploy changed workers (`cd workers/<name> && npx wrangler deploy`)
- `--skip-ci`: Don't wait for CI (for manual wrangler deploys that bypass CI)

## Workers Deploy

For workers that changed:
```bash
cd workers/<name> && npx wrangler deploy
```

> **⚠️ Unlike the paired dev/prod project deploys above, this has NO dev/prod distinction — it IS production.**
> Those projects come in dev/prod pairs and honor the `--prod` semantics documented in § Flags.
> Workers typically do not: each is a **single deployment**, so a deploy from **any branch**
> ships straight to live. Do not treat a worker deploy as the "dev half" of this skill's run —
> review it first, and expect your release branch to be *behind* production until the merge
> lands. Full rationale plus the shared-module resolution trap: `/worker-build` § "A Worker
> Deploy IS a Production Release".

IMPORTANT: After `wrangler deploy` for workers, verify cron triggers are actually registered via the CF API — wrangler output is not reliable. See `/worker-build` § "Cron Trigger Verification" for the full verification pattern. `wrangler secret put` can also silently unregister crons; always redeploy after setting secrets.

IMPORTANT: After ANY secret change (Pages or Workers), immediately do a full redeploy. A secret update alone can create/activate a deployment that runs on a stale or incomplete code bundle — some endpoints silently 5xx while others keep working, and it's easy to misread as a code bug instead of a deploy-ordering issue.

## Model Guidance

When dispatching agents for parallel deploy work, prefer `model: "opus"` (at max effort) for any agent doing code review, security audit, or architectural decisions. Use `model: "sonnet"` for routine build/deploy/verification tasks.

## Safety

- NEVER deploy to production without explicit `--prod` flag
- ALWAYS use the flag/setting that targets the true production branch — a "preview" or "staging" branch flag often only deploys to an alias URL, never the live production URL, and silently succeeding there while believing you shipped to prod is a recurring failure mode worth guarding against explicitly
- ALWAYS build before deploying (`dist/` must be fresh)
- ALWAYS deploy from the project directory (not repo root — may skip Functions bundle)
- ALWAYS verify after deploy — never claim "deployed" without HTTP verification
