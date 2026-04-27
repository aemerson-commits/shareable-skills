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

IMPORTANT: After `wrangler deploy` for workers, verify cron triggers are actually registered via the CF API — wrangler output is not reliable. See `/worker-build` § "Cron Trigger Verification" for the full verification pattern. `wrangler secret put` can also silently unregister crons; always redeploy after setting secrets.

## Model Guidance

When dispatching agents for parallel deploy work, prefer `model: "opus"` (at max effort) for any agent doing code review, security audit, or architectural decisions. Use `model: "sonnet"` for routine build/deploy/verification tasks.

## Safety

- NEVER deploy to production without explicit `--prod` flag
- ALWAYS build before deploying (`dist/` must be fresh)
- ALWAYS deploy from the project directory (not repo root — may skip Functions bundle)
- ALWAYS verify after deploy — never claim "deployed" without HTTP verification
