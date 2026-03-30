---
name: deploy-all
description: "Parallel deploy all changed projects — detects changes, builds, deploys, watches CI, verifies live URLs. Use instead of manual per-project deploys. Triggers: 'deploy all', 'deploy everything', 'push and deploy'."
user-invocable: true
---

# Deploy All — Parallel Multi-Project Deploy

Deploys all projects with changes in a single orchestrated flow. Replaces the manual commit-push-deploy-watch-curl cycle.

## Projects

Configure your project table:

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

```bash
gh run list --limit 5 --json databaseId,status,name
# Watch each in-progress run
gh run watch <run-id> --exit-status
```

### 7. Verify Live URLs

```bash
curl -s -o /dev/null -w "project-a: HTTP %{http_code}\n" https://your-project-a-dev.pages.dev
curl -s -o /dev/null -w "project-b: HTTP %{http_code}\n" https://your-project-b-dev.pages.dev
curl -s -o /dev/null -w "project-c: HTTP %{http_code}\n" https://your-project-c-dev.pages.dev
```

302 = auth gate (expected). 5xx = broken.

### 8. Report

Print a consolidated matrix:

```
| Project    | Build | Lint | Deploy | CI  | Live |
|------------|-------|------|--------|-----|------|
| Project A  | PASS  | PASS | PASS   | OK  | 302  |
| Project B  | PASS  | PASS | PASS   | OK  | 302  |
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

IMPORTANT: After `wrangler deploy` for workers, verify cron triggers are listed in the output. `wrangler secret put` can unregister crons on some platforms.

## Safety

- NEVER deploy to production without explicit `--prod` flag
- ALWAYS build before deploying (dist/ must be fresh)
- ALWAYS deploy from the project directory (not repo root — may skip Functions bundle)
- ALWAYS verify after deploy — never claim "deployed" without HTTP verification
