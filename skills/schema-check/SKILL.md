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

## Profile the Data Before Designing a Data Feature

Structure (columns / keys / bindings) is only half the picture. Before designing any feature that **derives** from a production table — a writeback automation, a classifier, a read-time enrichment, a backfill — don't guess the shape from the schema. Run a short battery of **read-only** SELECTs against the real data, one analytical question each:

1. **Coverage** — total rows / rows with a usable value in the target column / distinct keys.
2. **Sample values** — `SELECT <col> ... LIMIT 20` to see the real format and any junk.
3. **Distribution** — `GROUP BY` the discriminating column.
4. **Aggregate summary** — the number the feature will actually compute.
5. **Provenance of the gap** — which rows *lack* the column, grouped by source (that gap is often the automation's actual target).

Interleave the probes with reading the code that produces the rows, so each gap maps to a fill path. Nothing is written — the output feeds the design. (Some engines cap the number of terms in a compound/UNION query — batch large multi-table probes into smaller groups if you hit that limit.)

## Prefix-LIKE Index Is Often a No-Op — Confirm with EXPLAIN QUERY PLAN

Before adding `CREATE INDEX ... ON t(col)` to make `col LIKE ? || '%'` "seekable," verify it actually helps — on SQLite-family engines (including serverless/edge SQLite variants) it frequently does nothing. Three stacked reasons:

1. Default `LIKE` is **case-insensitive**, and the LIKE→range optimization only fires when the index collation matches — a plain binary index is silently ignored (full `SCAN`); you must declare `CREATE INDEX ... ON t(col COLLATE NOCASE)`.
2. Even with the NOCASE index, a **parameterized** `LIKE ?` on a large table won't range-seek without histogram statistics (e.g. SQLite's `STAT4`) — the planner can't estimate the range's selectivity at plan time and defaults to a full scan. Lightweight/serverless SQLite deployments often lack these stats entirely (no `STAT4`, no auto-`ANALYZE`), making this the common case.
3. Forcing it with `INDEXED BY` yields a full *index* scan, still not a range seek.

What reliably seeks: **equality** (`col IN (...)` / `col = ?`) on an indexed column, or a **literal-inlined** prefix (`LIKE 'abc%'`, with injection-safe construction). Practical rule: before adding a prefix-LIKE index "for performance," confirm with `EXPLAIN QUERY PLAN` that it actually produces a `SEARCH ... (col>? AND col<?)` — otherwise prefer an equality rewrite or accept the scan.

## Check Whether "Dev" and "Prod" Are Actually the Same Database

Before reasoning about any schema change as "we'll try it on dev first," confirm dev
and prod are genuinely separate. A very common serverless setup has a `*-dev` database
that **exists but is never used**: it is wired only as the *preview* binding, while every
deploy targets the production branch — so the preview binding never activates and dev
traffic hits the production database. The naming implies isolation that the bindings do
not provide.

> **⚠️ When they share one database, A MIGRATION IS A PRODUCTION CHANGE — there is no dev rehearsal.**
> If CI applies migrations on pushes to *either* branch, **a breaking migration merged to
> the integration branch hits production reads immediately.**
>
> For any rename / `DROP` / constraint-rebuild of a table production reads:
> 1. **Split** additive-now from destructive-later into two migrations, so production
>    survives the first apply and the destructive half lands once nothing reads the old shape.
> 2. **Probe production preconditions first** — confirm the assumed tables/columns actually
>    exist before writing the migration that depends on them.
> 3. Apply through the **migration runner**, not a raw one-off execute — the runner records
>    the applied-migrations tracker. A hand-applied migration is not recorded, so CI re-runs
>    it and fails on `duplicate column name` (there is no `IF NOT EXISTS` for `ADD COLUMN`).
> 4. **Verify both environments live** — a dev-only smoke proves nothing when it is the
>    same database.

Verify the binding rather than trusting the name: read the deploy config for which database
ID each environment binds, and which branch the deploy actually targets.

## Production Write Operations — One-Off Fix vs Repeatable Backfill

Everything above is read-only. When you actually WRITE to a production table, pick the
right vehicle and gate it:

- **One-off data fix** (correct a handful of rows): a throwaway scratchpad script run
  against the remote database. Always **probe → write → re-SELECT verify** in the same
  session: confirm the reported changed-row count matches the intended count, then re-read
  to prove the new state. **The re-SELECT is the proof** — the write's own count alone
  doesn't show you what the rows now contain. Prefer deleting/updating by explicit primary
  key over a pattern match; a scoped ID list cannot over-match the way a `WHERE` clause can.
- **Repeatable backfill** (fill a column across many rows): a **committed** script with an
  explicit `--dry` default (print what WOULD change, write nothing) and an `--apply` gate.
  Run `--dry` first, eyeball the diff, then `--apply`. Syntax-check it before either run.

## Anti-Patterns

- NEVER write a database query without checking the schema first
- NEVER assume column names from memory — always verify
- NEVER add a KV binding to config without also adding it in the platform dashboard
- NEVER create a migration that conflicts with existing schema
