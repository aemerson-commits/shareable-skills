---
name: worker-build
description: "Factory for building Cloudflare Workers — email reporters, cron jobs, API monitors. Parallel agents: scaffold, admin UI, secrets config, deploy + verify."
user-invocable: true
---

# Worker Build — Cloudflare Worker Factory

Templated pipeline for building new Cloudflare Workers. Most workers follow the same pattern: cron-triggered, email delivery, recipient lists, admin UI, Bearer token auth on HTTP endpoints.

## Arguments

- First argument (required): Worker name (e.g., "inventory-report", "shipping-alert")
- `--type=email|monitor|sync` (default: email)
  - `email`: Cron-triggered email report (JWT email delivery, recipients, admin UI)
  - `monitor`: API polling + alert on change (state tracking, threshold alerts)
  - `sync`: Data synchronization (source → cache/DB, reconciliation)
- `--cron=<schedule>` (e.g., "0 12 * * 1-5" for 8am ET weekdays during EDT)

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
- Cron schedules in `wrangler.toml` are UTC: `"0 12 * * 1-5"` = 8am EDT / 7am EST
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

**Wrangler's `Deployed {name} triggers` output lies.** The message prints regardless of whether CF actually advanced the trigger registration. Silent cron failures are a real recurring pattern — triggers appear registered but never fire because wrangler no-ops when the cron string matches what CF already has stored.

**The Cloudflare API is the source of truth.** After every `wrangler deploy` of a cron worker:

**GOTCHA: Wrangler OAuth token expires ~2h.** Mid-session deploys may fail with `AuthenticationError [code: 10000]` if the token aged out. If you see this error, run `npx wrangler login` to refresh — the token location varies by OS (check wrangler's config directory). Do not retry the deploy until re-authenticated.

```bash
# Get your OAuth token from wrangler's config (location varies by OS)
TOK=$(grep '^oauth_token' ~/.config/.wrangler/config/default.toml | cut -d'"' -f2)
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
  -d '[{"cron":"0 12 * * 1-5"}]'
```

After the PUT, `modified_on` and `created_on` both advance to the current time. This is the *only* way to heal a silently-stuck trigger registration.

**Trigger re-registration is required whenever:**
- You ran `wrangler secret put` without a follow-up redeploy (known footgun)
- You commented out `[triggers]` and redeployed (wrangler does NOT unregister; need PUT `[]`)
- A cron monitoring alert fires for a worker whose `wrangler deploy` just ran "successfully"

**Post-deploy verification**: after PUT, the definitive evidence the trigger fires is a fresh success KV entry on the next scheduled run. Don't assume success from wrangler output alone.

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
- Cron → read source → transform → write to cache/DB → reconcile
- Hash-based change detection
- Rate limiting on mutations
