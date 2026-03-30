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
# GOOGLE_SERVICE_ACCOUNT_EMAIL
# GOOGLE_PRIVATE_KEY
# GOOGLE_SENDER_EMAIL
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
   npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL --name={name}
   npx wrangler secret put GOOGLE_PRIVATE_KEY --name={name}
   npx wrangler secret put GOOGLE_SENDER_EMAIL --name={name}
   npx wrangler secret put WORKER_AUTH_TOKEN --name={name}
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
- [ ] Verify cron registered
- [ ] Deploy admin project (admin UI)
- [ ] Test: `curl -H "Authorization: Bearer $TOKEN" https://{name}.your-account.workers.dev/run`
```

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
