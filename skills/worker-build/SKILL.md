---
name: worker-build
description: "Factory for building Cloudflare Workers — email reporters, cron jobs, API monitors. Parallel agents: scaffold, admin UI, secrets config, deploy + verify."
---

# Worker Build — Cloudflare Worker Factory

Templated pipeline for building new Cloudflare Workers. Most workers follow the same pattern: cron-triggered, email delivery, KV recipient lists, admin UI in a settings panel, Bearer token auth on HTTP endpoints.

## Arguments

- First argument (required): Worker name (e.g., "inventory-report", "shipping-alert")
- `--type=email|monitor|sync` (default: email)
  - `email`: Cron-triggered email report (JWT email delivery, recipients, admin UI)
  - `monitor`: API polling + alert on change (KV state tracking, threshold alerts)
  - `sync`: Data synchronization (source → KV/D1, reconciliation)
- `--cron=<schedule>` (e.g., "0 12 * * MON-FRI" for 8am ET weekdays during EDT)

## Phase 0: Scope (Main Agent)

1. Verify worker name is unique: check `workers/` directory
2. Determine type and cron schedule
3. Read existing worker of same type for reference pattern

## Phase 1: Parallel Build (3 Agents, model: "opus")

Pattern: Fan-Out/Fan-In. All use `isolation: "worktree"`.

### Agent: Worker Scaffold (worktree)

Create the worker directory and core files:

**`workers/{name}/wrangler.toml`:**
```toml
name = "{name}"
main = "src/index.js"
compatibility_date = "2025-09-23"

[observability]
enabled = true

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID"

[triggers]
crons = ["{cron_schedule}"]

# Secrets (set via wrangler secret put):
# EMAIL_SERVICE_ACCOUNT
# EMAIL_PRIVATE_KEY
# EMAIL_SENDER
# WORKER_AUTH_TOKEN
```

**`workers/{name}/package.json`:**
```json
{
  "name": "{name}",
  "private": true,
  "version": "1.0.0",
  "scripts": { "deploy": "wrangler deploy" }
}
```

**`workers/{name}/src/index.js`:**
Must include:
- Bearer token auth (timing-safe HMAC via `crypto.subtle`) for all HTTP endpoints
- `scheduled(event, env, ctx)` handler for cron
- `fetch(request, env, ctx)` handler with `/run`, `/preview`, `/status` endpoints
- Email JWT flow (RS256) for email type
- KV recipient list read (`{name}-recipients` key)
- HTML email builder with `escapeHtml()` for any user data
- Worker alert integration (KV success/error tracking)
- Error handling with try/catch on cron, report errors to KV

**Timezone rules for M-F cron workers:**
- Cron schedules in `wrangler.toml` are UTC: `"0 12 * * MON-FRI"` = 8am EDT / 7am EST
- **DST**: EDT (Mar-Nov) uses `0 12`, EST (Nov-Mar) uses `0 13`. Pick one based on current date or accept the shift.
- **If the worker code checks "is today a weekday?" (e.g. for weekend-skip logic), MUST use local day, not UTC:**
  ```js
  // CORRECT — local day handles Fri evening without silently skipping as "weekend"
  const localDay = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' })
  const isWeekend = localDay === 'Sat' || localDay === 'Sun'

  // WRONG — at Fri 8pm ET = Sat 00:00 UTC, this flips to weekend and masks Friday failures
  const utcDay = new Date().getUTCDay()
  const isWeekend = utcDay === 0 || utcDay === 6
  ```
- **Never use `.split('T')[0]` to extract a day from an ISO string** when comparing to a local `todayStr`. Z-suffixed times yield the UTC day, not the local day. Use local components instead: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`.

### Agent: Admin UI Builder (worktree)

Add recipient management to admin settings:

1. Create admin endpoint — KV-backed CRUD for email recipients (copy pattern from existing recipient endpoints)
2. Add to settings UI: new section with recipient list + add/remove UI
3. Add worker to worker health monitoring array

### Agent: Deploy Config (worktree)

Prepare deployment:
1. Document required secrets (list them, don't set them)
2. Add to cron monitoring if cron-triggered

## Phase 2: Integration (Main Agent)

1. Merge all 3 worktrees
2. Verify no import conflicts
3. Build admin project (admin UI changes)
4. Generate the secrets setup commands:
   ```bash
   npx wrangler secret put EMAIL_SERVICE_ACCOUNT --name={name}
   npx wrangler secret put EMAIL_PRIVATE_KEY --name={name}
   npx wrangler secret put EMAIL_SENDER --name={name}
   npx wrangler secret put WORKER_AUTH_TOKEN --name={name}
   # CRITICAL: secret put creates a deployment with stale code — MUST redeploy after
   npx wrangler deploy
   ```

## Phase 3: Verification (2 Agents, model: "opus")

### Agent: Code Reviewer
- Verify Bearer auth on ALL HTTP endpoints (timing-safe HMAC, not string comparison)
- Verify email JWT flow matches shared pattern
- Verify error responses don't leak `err.message`
- Verify cron handler has try/catch with error logging
- Verify `escapeHtml()` on all user data in HTML email

### Agent: Build Verifier
- Build admin project (lint + build)
- Verify wrangler.toml has correct KV binding ID
- Verify package.json is minimal (no unnecessary deps)

## Phase 4: Report

```markdown
## Worker Build Complete: {name}

### Files Created
| File | Purpose |
|------|---------|

### Secrets Required
| Secret | Command |
|--------|---------|

### Next Steps
- [ ] Set secrets: run the commands above
- [ ] Deploy: `cd workers/{name} && npx wrangler deploy`
- [ ] **Verify cron actually registered** — see "Cron Trigger Verification" below (wrangler output is NOT sufficient)
- [ ] Deploy admin project (admin UI)
- [ ] Test: `curl -H "Authorization: Bearer $TOKEN" https://{{your-worker}}.workers.dev/run`
```

## Syntax-check before commit/deploy

Chain `node --check` before any commit or deploy of worker source:

```bash
node --check workers/<name>/src/index.js && git add workers/<name>/src/index.js && git commit -m "..."
node --check workers/<name>/src/index.js && (cd workers/<name> && npx wrangler deploy)
```

Catches syntax errors that would otherwise fail silently post-deploy (worker stays on last good build, but the next cron fails).

## Email HTML iteration pattern (shared)

Email-reporter workers expose `/run?preview=1` (or similar) that returns the rendered HTML without sending. Iteration loop:

```bash
curl -H "Authorization: Bearer $WORKER_AUTH_TOKEN" "https://{{your-worker}}.workers.dev/run?preview=1" > /tmp/email.html
open /tmp/email.html   # open in browser, visually compare to reference
# edit worker source, redeploy, repeat
```

Faster than sending test emails and digging through the inbox.

## Cron Trigger Verification (MANDATORY after any wrangler deploy or redeploy)

> **CAVEAT: Numeric DOW is silently broken — the PUT [] / PUT [{cron}] heal is INSUFFICIENT**
>
> **Symptom**: A cron with any numeric day-of-week — range (`1-5`) or single day (`1`, `2`) — can appear correctly registered in `GET /schedules` (right cron string, fresh `modified_on`) yet silently never fire. The wipe-then-readd `PUT [] / PUT [{cron}]` cycle described below advances `modified_on` but does NOT restart the trigger. The worker stays dead.
>
> **Root cause**: CF's cron dispatcher silently discards numeric DOW at the internal scheduling layer. Only a syntactically-different cron string causes the dispatcher to re-parse and clear the stuck state.
>
> **The only confirmed heal**: change the literal cron string to use named days — `MON-FRI` instead of `1-5`, `MON` instead of `1`, `TUE` instead of `2` — then run the wipe-then-readd cycle with the renamed string.
>
> **Exception**: workers that branch on `event.cron` string-equality must keep the numeric literal that matches their code. Fix the equality branch in source first, then rewrite the cron string.
>
> **Rule for new workers: never use numeric DOW.** Always write `MON-FRI`, `MON`, `TUE`, etc.

**Wrangler's `Deployed {name} triggers` output lies.** The message prints regardless of whether CF actually advanced the trigger registration. Silent cron failures are a real recurring pattern — triggers appear registered but never fire because wrangler no-ops when the cron string matches what CF already has stored.

**The Cloudflare API is the source of truth.** After every `wrangler deploy` of a cron worker:

**GOTCHA: Wrangler OAuth token expires ~2h.** Mid-session deploys may fail with `AuthenticationError [code: 10000]` if the token aged out. If you see this error, run `npx wrangler login` to refresh — the token location varies by OS (check wrangler's config directory). Do not retry the deploy until re-authenticated.

### Getting a CF API token for direct schedule calls

When the environment CF_API_TOKEN is unavailable or rejected, extract wrangler's OAuth token:
```bash
# Location varies by OS — check wrangler's config directory
CF_TOKEN=$(grep -E '^oauth_token' <wrangler-config-path>/default.toml | head -1 | sed 's/.*"//;s/".*//')
```
Expires ~2h. On `AuthenticationError [code: 10000]`, run `wrangler login` to refresh.

```bash
TOK=$(grep '^oauth_token' <wrangler-config-path>/default.toml | cut -d'"' -f2)
ACCT=YOUR_CF_ACCOUNT_ID

curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCT/workers/scripts/{{your-worker}}/schedules" \
  -H "Authorization: Bearer $TOK"
```

**Verify two things:**
1. Schedules match wrangler.toml exactly.
2. `modified_on` >= deploy time. If `modified_on` is older than the deploy, the trigger did NOT re-register — wrangler silently no-op'd because the cron string matched the current CF state. This is a landmine: an already-broken trigger (stuck non-firing) stays broken through redeploys.

**Remedy when `modified_on` is stale**: force re-registration with a wipe-then-readd PUT cycle (plain redeploy won't work):

```bash
# Step 1: wipe
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCT/workers/scripts/{{your-worker}}/schedules" \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d '[]'

# Step 2: readd (match wrangler.toml crons exactly)
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCT/workers/scripts/{{your-worker}}/schedules" \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '[{"cron":"0 12 * * MON-FRI"}]'
```

After the PUT, `modified_on` and `created_on` both advance to the current time. This is the *only* way to heal a silently-stuck trigger registration.

**Trigger re-registration is required whenever:**
- You ran `wrangler secret put` without a follow-up redeploy (known footgun)
- You commented out `[triggers]` and redeployed (wrangler does NOT unregister; need PUT `[]`)
- A cron monitoring alert fires for a worker whose `wrangler deploy` just ran "successfully"

**Post-deploy verification**: after PUT, the definitive evidence the trigger fires is a fresh success KV entry on the next scheduled run. Don't assume success from wrangler output alone.

## Bug-Class Sweep

After fixing a bug in one worker, grep `workers/*/` for the same pattern class before committing — workers copy-paste shared logic and bugs propagate silently.

Common classes to sweep:

| Class | What to grep |
|-------|-------------|
| Em-dash in email subjects | `grep -rn "—\|–" workers/*/src/` (non-ASCII dashes) |
| TTL math | grep for the specific constant or formula you just fixed |
| `btoa()` newline handling | `grep -rn "btoa" workers/*/src/` |
| `trackSuccess` params | `grep -rn "trackSuccess" workers/*/src/` — verify all call sites pass the same shape |
| Bearer auth pattern | `grep -rn "Authorization" workers/*/src/` — timing-safe HMAC everywhere |

Also check any shared utility module imported by most workers — a bug there propagates to all of them simultaneously.

**Fix all affected workers in one pass, in the same commit.** Don't defer to follow-up commits — they consistently don't happen.

## A Worker Deploy IS a Production Release

Unlike paired dev/prod Pages-style projects, an edge worker is typically a **single
deployment**: `wrangler deploy` (or equivalent) from **any branch and any working tree**
puts that code straight into production. Two consequences:

- A review note saying worker code is "on the dev branch, inert until deployed" is a **wrong
  mental model** — it is inert only because nobody has deployed yet, and deploying *is* the
  production change. Finish the security/equivalence review BEFORE the deploy, not after.
- Once deployed, your **release branch is behind running production** until the merge lands,
  so a later deploy or rollback from that branch **silently reverts live behavior**. After a
  manual worker deploy, merging is the action that *closes* the gap, not the risky one.

Corollary: "manual-deploy carry" in a release note describes **repo** state, never live
state. Confirm what is actually running with `wrangler deployments list` rather than trusting
a note.

## Bulk Worker Redeploy Pattern

> **⚠️ Before a bulk redeploy after a shared-module change: confirm the shared module still RESOLVES from a worker.**
> Workers are usually NOT npm workspaces — each has its own `node_modules/`. When a worker
> imports a shared module by relative path (`../../../shared/<mod>/index.js`), the bundler
> resolves that shared file's **bare** imports from *shared's* location upward — **never**
> the consuming worker's `node_modules`, even when the package is installed there. So adding
> a bare npm import to a shared module breaks every consuming worker's deploy while builds,
> lint, and the full test suite all stay green. Symptom: the deploy exits with
> `Could not resolve "<pkg>"` pointing at the *shared* file.
> **Fix:** declare the dependency on the shared package's own `package.json` so the workspace
> hoists it, then reinstall from the repo root.
> **Cheap pre-check:** `cd workers/<one-consumer> && npx wrangler deploy --dry-run` — if one
> consumer resolves, the rest will.
> This class survived a static byte-equivalence review that found nothing; **only the deploy
> can see it.** An extraction into a shared module consumed by a worker is not verified until
> a deploy (or dry-run) succeeds.

For shared utility changes that affect many workers, redeploy in parallel rather than serially:

### Procedure

1. List affected workers:
   ```bash
   grep -rln 'shared/worker-utils\|shared/web-push' workers/ | xargs -n1 dirname | sort -u
   ```

2. Dispatch parallel deploys (one Bash call per worker, NOT a `for` loop — clearer per-worker failure isolation):
   ```bash
   cd workers/worker-a && npx wrangler deploy &
   cd workers/worker-b && npx wrangler deploy &
   # ... one line per worker
   wait
   ```

3. Verify cron registration on each (CF API doesn't always advance `modified_on` on identical-cron redeploys):
   ```bash
   node scripts/verify-cron-coverage.mjs
   ```

4. Smoke-test each worker's HTTP endpoint with WORKER_AUTH_TOKEN to confirm a 200 (auth pass) + 401 (no auth) pair.

### Why parallel-individual over for-loop

- Per-worker failure visible in its own Bash tool result
- Cancellation/retry of one worker doesn't disturb the others
- Wrangler's per-worker cache state stays clean

For large batches (e.g., 10-15 workers), expect 60-90 seconds total — sequential would take 4-5 minutes.

## Worker Type Templates

### Email Reporter
- Cron → query data source → format HTML email → send → KV success tracking
- Recipients from KV key `{name}-recipients`
- `/run` endpoint for manual trigger, `/preview` for HTML preview

### Monitor
- Cron → check external source → compare with KV state → alert on change
- KV stores last-known state for delta detection
- Threshold-based alerting (not every change, only significant ones)

### Sync
- Cron → read source → transform → write to KV/D1 → reconcile
- Hash-based change detection
- Rate limiting on mutations (D1: batched)

## Business-Logic E2E Verification (beyond deploy-health)

A passing `/health` check, a registered cron trigger, and a clean `wrangler deploy` exit code together prove the worker **deployed** — they say nothing about whether its actual read/write logic is correct. For any worker whose run path or cron writes to a database or cache, verify the *behavior* with a seed → trigger → verify → cleanup cycle:

1. **Seed** known state directly in the datastore the worker reads/writes.
2. **Trigger** the worker's run path (its manual-trigger HTTP endpoint, or invoke the scheduled handler directly).
3. **Re-query the datastore** to confirm the mutation actually happened — check the specific rows/keys changed, not just that the endpoint returned 200. A 200 response only proves the handler didn't throw; it doesn't prove the write executed or matched any rows (an `UPDATE ... WHERE` that matches zero rows still returns success).
4. **Clean up** the seeded fixtures so the environment isn't left holding test data.

If the worker maintains its own success/failure tracking (a "last successful run" key, an alert-on-failure state), cross-check that state after the trigger too — a stale or missing success marker means the run didn't reach its success path even though the HTTP response was 200.

This is the layer above deploy-health checks: it's the difference between "the worker ran" and "the worker did the right thing."
