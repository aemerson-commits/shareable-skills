---
name: schema-check
description: "Verify database schema, KV keys, and env bindings before writing queries or endpoints. Use BEFORE any SQL, KV operations, or config changes. Triggers: 'check schema', 'what columns does X have', or proactively when writing DB/KV code."
user-invocable: true
---

# Schema Check — Pre-Query Verification

Prevents wrong column names, missing fields, and binding mismatches by checking the actual schema before writing code.

## When to Use

- Before writing any database SQL query
- Before adding KV get/put operations
- Before creating database migrations
- Before modifying config bindings
- When debugging "column not found" or "binding not found" errors

## Steps

### 1. Database Schema Check

```bash
# List all tables
npx wrangler d1 execute <db-name> --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"

# Get schema for a specific table
npx wrangler d1 execute <db-name> --remote --command="SELECT sql FROM sqlite_master WHERE name='<table>'"

# Check column names
npx wrangler d1 execute <db-name> --remote --command="PRAGMA table_info(<table>)"
```

### 2. KV Key Pattern Check

Document your common key patterns. Example patterns:
```
orders-cache              — Order data (may be compressed)
machines-cache            — Machine definitions
draft:{email}:{operation} — User drafts (7-day TTL)
feature-toggle:{name}     — Feature toggles
worker-last-success.*     — Worker health tracking
worker-last-error.*       — Worker error tracking
recipients-{feature}      — Email recipients
```

```bash
# List KV keys matching a pattern
npx wrangler kv key list --namespace-id=<kv-id> --prefix="<pattern>" | head -20
```

### 3. Binding Verification

Check config for the project:
```bash
cat <project>/wrangler.toml  # Pages projects may not have this — check CF dashboard
cat workers/<worker>/wrangler.toml
```

Common binding types:
- `CACHE` — KV namespace
- `ADMIN_DB` — D1 database
- `API_URL` — Backend API URL
- Auth-related client ID/secret bindings

### 4. Validate Proposed Query

Before writing a query, verify:
- [ ] Table exists
- [ ] All column names match schema exactly (case-sensitive)
- [ ] Required NOT NULL columns have values on INSERT
- [ ] Foreign keys reference valid tables
- [ ] Index exists for WHERE clause columns (for performance)

### 5. Migration Check

**Migration files are canonical schema docs.** Your `migrations/*.sql` files capture exact CHECK / UNIQUE / NOT NULL constraints that a live `PRAGMA table_info` won't fully reveal. Glob them by feature domain before writing queries or reviewing upserts:

```bash
# Find all migrations touching a feature area
ls <project>/migrations/ | grep -i "<keyword>"
```

Cross-reference any read-time enrichment layer — it may add columns or filter rows in ways the raw table schema doesn't show.

Before creating a new migration:
```bash
# List existing migrations
ls <project>/migrations/

# Check latest migration number
ls <project>/migrations/ | tail -1
```

New migration should be numbered sequentially (e.g., `0018_*.sql` after `0017_*.sql`).

**Applying a migration manually (when CI auto-apply won't run or is gated):**

**Default — tracked apply (additive / non-DROP migrations: ADD COLUMN, CREATE TABLE, CREATE INDEX — the vast majority):**

1. Apply: `npx wrangler d1 migrations apply <your-db> --remote` — auto-applies every un-applied file AND registers it in `d1_migrations`. **No manual INSERT needed.**
2. Verify tables via `sqlite_master`: `SELECT name, sql FROM sqlite_master WHERE name='<table>'`
3. Verify row counts / spot-check data: `SELECT COUNT(*) FROM <table>`

> **Do NOT default to `d1 execute --file` for ordinary migrations.** Raw `d1 execute --file=…` does NOT write to `d1_migrations`, so CI re-executes the migration on its next run → `duplicate column` / `table already exists` failure. The manual-INSERT workaround below is error-prone — forget it once and CI breaks. `migrations apply` is the safe default.

**Exception — `d1 execute --file` for DROP / destructive migrations only** (which `migrations apply` won't run safely):

1. Execute the migration: `npx wrangler d1 execute <your-db> --remote --file=<project>/migrations/NNNN_name.sql`
2. **Register it manually** so CI doesn't re-run it: `INSERT INTO d1_migrations (name) VALUES ('NNNN_name.sql')`
3. Verify `sqlite_master`, the tracker (`SELECT name FROM d1_migrations ORDER BY name DESC LIMIT 5`), and row counts

For data-seeding migrations, use `INSERT OR IGNORE` and re-verify that the expected seed rows exist post-apply.

## Anti-Patterns

- NEVER write a database query without checking the schema first
- NEVER assume column names from memory — always verify
- NEVER add a KV binding to config without also adding it in the platform dashboard
- NEVER create a migration that conflicts with existing schema
