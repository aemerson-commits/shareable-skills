---
name: env-audit
description: "Audit environment variables across all projects — detect missing secrets, compare code references against deployed config, and identify which env vars each context requires."
user-invocable: true
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
Grep all projects' `functions/` directories for env var access patterns, then run `wrangler pages secret list` for all Pages projects (dev + prod):

```bash
# Grep for env var references
grep -rn "env\.\([A-Z_]\+\)" project-a/functions/ project-b/functions/ --include="*.js" -oh | sort -u

# List secrets for each project (names only, no values)
npx wrangler pages secret list --project-name=your-project-a-dev 2>&1
npx wrangler pages secret list --project-name=your-project-a 2>&1
# ... repeat for each project
```

### Agent: Workers Scanner
Grep all `workers/` for env var access patterns, run `wrangler secret list` from each worker directory, and read each worker's `wrangler.toml` for bindings.

### Agent: Backend Scanner
Grep backend code for `process.env` references and check `.env` file var names.

### Agent: Scripts Scanner
Grep scripts for `process.env` references.

## Step 2 — Cross-reference and report

Main agent compiles results into a matrix per project:

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
- **⚠️ DEV-ONLY**: Secret set on dev but missing from prod (deploy risk)
- **⚠️ PROD-ONLY**: Secret set on prod but missing from dev (can't test)
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

## Gotchas

- `wrangler pages secret list` shows names only, not values — safe to run
- Workers use `wrangler secret list` (no `pages` keyword) — must run from worker directory
- Some env vars are accessed dynamically (e.g., `env[key]`) — won't be caught by static grep
- KV/D1/R2 bindings come from config, not secrets — check both
- Encrypted `.env` files need their decryption key to inspect — check your secrets manager
