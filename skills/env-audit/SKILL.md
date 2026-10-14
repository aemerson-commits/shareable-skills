---
name: env-audit
description: "Audit environment variables across all projects — detect missing secrets, compare code references against deployed config, and identify which env vars each context requires."
---

# Environment Variable Audit

Scan all projects for env var references, cross-reference against deployed secrets and config bindings, and report gaps.

## Contexts

Your project may run across multiple environments:

| Context | Runtime | Env Var Source | Detection Pattern |
|---------|---------|----------------|-------------------|
| **Cloudflare Pages** | V8 isolate | `context.env.*` (secrets + bindings) | `functions/api/*.js` accessing `env.*` |
| **Cloudflare Workers** | V8 isolate | `env.*` (secrets + wrangler vars) | `workers/*/src/*.js` accessing `env.*` |
| **Node.js Backend** | Node.js | `process.env.*` from `.env` | `server/*.js` accessing `process.env` |
| **Local Scripts** | Node.js | `process.env.*` | `scripts/**/*.js` accessing `process.env` |

## Agent Teams Architecture

```
Phase 1 — Parallel Discovery (model: "opus"):
  +-- Pages Scanner -----> grep projects' functions/ + wrangler pages secret list
  +-- Workers Scanner ---> grep workers/ + wrangler secret list per worker + read wrangler.toml bindings
  +-- Backend Scanner ---> grep backend/ for process.env + check .env var names
  +-- Scripts Scanner ---> grep scripts/ for process.env

Phase 2 — Cross-Reference (main agent):
  Compile agents' results -> matrix per project
  Flag: MISSING, UNUSED, DEV-ONLY, PROD-ONLY

Phase 3 — Actionable Output (main agent):
  Generate fix commands for each issue found
```

All agents are read-only (no code modifications), so `isolation: "worktree"` is not required. Each agent uses `model: "opus"` for dispatch.

## Step 1 — Discover code references (via parallel agents)

Dispatch agents simultaneously (model: "opus"), one per context:

### Agent: Pages Scanner
Enumerate the Pages projects from the repo (`git ls-files '*/functions/**' | cut -d/ -f1 | sort -u`), never from a hardcoded list: hardcoded lists go stale and silently omit newer projects. Then grep each project's `functions/` directory for env var access patterns and run `wrangler pages secret list` per Cloudflare project. A project that deploys to production only has no dev target; skip its dev call, or you will get an error or a false DEV-ONLY finding.

A `functions/`-only grep misses env reads in shared modules that those functions import. Resolve each project's relative `import`/`require` graph into the shared directory (transitively through re-exports) and grep those files too, or a reachable shared read is reported as absent.

```bash
# Grep for env var references
grep -rn "env\.\([A-Z_]\+\)" project-a/functions/ project-b/functions/ --include="*.js" -oh | sort -u

# List secrets for each project (names only, no values)
npx wrangler pages secret list --project-name=your-project-a-dev 2>&1
npx wrangler pages secret list --project-name=your-project-a 2>&1
# ... repeat for each project
```

### Agent: Workers Scanner
Enumerate workers from the repo (`git ls-files 'workers/*/wrangler.toml'`), not a hardcoded list. Derive each worker's scan root from the `main` line in its `wrangler.toml` rather than assuming `src/` (a root-level `index.js` otherwise scans as zero references), and glob both `*.js` and `*.mjs`. Run `wrangler secret list` from each worker directory, and read each `wrangler.toml` for `[vars]`, KV, D1, R2, `[ai]`, `[[services]]` and `[[durable_objects.bindings]]`. Missing service and Durable Object bindings makes bound dependencies look unbound.

### Agent: Backend Scanner
Grep backend code for `process.env` references and check `.env` file var names. With dotenvx, values are encrypted but key names are plaintext, so `grep -oE '^[A-Z][A-Z_0-9]*=' .env` lists names without any decryption key; only reading a value needs one.

### Agent: Scripts Scanner
Grep scripts for `process.env` references.

## Step 2 — Cross-reference and report

Main agent compiles results into a matrix per project. Workers have no dev/prod split (one deployment), so give them a single `Secret` column instead of a Dev/Prod pair; the same goes for any production-only Pages project:

```
## Project A (dev / prod)

| Variable | Code References | Dev Secret | Prod Secret | Config |
|----------|----------------|------------|-------------|--------|
| API_TOKEN | handler.js:3 | ✅ | ✅ | — |
| NEW_VAR | newfile.js:10 | ❌ MISSING | ❌ MISSING | — |
| CACHE | handler.js:8 | — | — | ✅ binding |
```

### Flag these issues:
- **❌ MISSING**: Code references a var that isn't in deployed secrets or bindings
- **⚠️ UNUSED**: Secret exists but no code references it (may be stale)
- **⚠️ DEV-ONLY**: Secret set on dev but missing from prod (deploy risk); Pages only
- **⚠️ PROD-ONLY**: Secret set on prod but missing from dev (can't test); Pages only
- **✅ OK**: Code reference matches deployed secret/binding

## Step 3 — Actionable output

For each issue found, output the fix command:

```bash
# Missing secret — set it:
npx wrangler pages secret put NEW_VAR --project-name=your-project-dev

# Stale secret — consider removing:
npx wrangler pages secret delete UNUSED_VAR --project-name=your-project-dev
```

## Quick Mode

If invoked with a specific project name (e.g., `/env-audit project-a`), only audit that one context instead of all projects.

## CF Access AUD Pattern

When using Cloudflare Access JWT verification, each Access Application has its own AUD (audience) value. Different apps must use their respective AUD values — using the wrong AUD causes silent JWT verification failures (generic 401, not a clear error).

Keep AUD values documented per-app:
```
| App | .env Key |
|-----|----------|
| App A | CF_ACCESS_AUD_APP_A |
| App B | CF_ACCESS_AUD_APP_B |
```

Verify by inspecting the CF Access redirect URL — the `kid=` param in the redirect URL encodes the AUD. Storing the raw AUD hash in your encrypted `.env` as a named key per-app is the safe pattern.

## Gotchas

- `wrangler pages secret list` shows names only, not values — safe to run
- Workers use `wrangler secret list` (no `pages` keyword) — must run from worker directory
- Some env vars are accessed dynamically (e.g., `env[key]`) — won't be caught by static grep
- KV/D1/R2 bindings come from config, not secrets — check both
- Encrypted `.env` files need their decryption key to inspect — check your secrets manager
- **`wrangler secret put` breaks deployments**: Secret changes create a new deployment using an older/incomplete code bundle. ALWAYS follow `wrangler secret put` with a full redeploy (Pages: `wrangler pages deploy dist`; Workers: `wrangler deploy`) from the project dir. Without this, API code silently reverts to a stale version
