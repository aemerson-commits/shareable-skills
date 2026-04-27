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

Document your common key patterns:
```
orders-cache              — Order data (may be compressed)
machines-cache            — Machine definitions
draft:{email}:{operation} — User drafts (7-day TTL)
data-source-toggle        — Feature toggle
worker-last-success.*     — Worker health tracking
worker-last-error.*       — Worker error tracking
recipients-{feature}      — Email recipients
```

```bash
# List KV keys matching a pattern
npx wrangler kv key list --namespace-id=YOUR_KV_NAMESPACE_ID --prefix="<pattern>" | head -20
```

### 3. Binding Verification

Check config for the project:
```bash
cat <project>/wrangler.toml  # Pages projects may not have this — check CF dashboard
cat workers/<worker>/wrangler.toml
```

Common bindings:
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

Before creating a new migration:
```bash
# List existing migrations
ls <project>/migrations/

# Check latest migration number
ls <project>/migrations/ | tail -1
```

New migration should be numbered sequentially (e.g., `0018_*.sql` after `0017_*.sql`).

## Anti-Patterns

- NEVER write a database query without checking the schema first
- NEVER assume column names from memory — always verify
- NEVER add a KV binding to config without also adding it in the platform dashboard
- NEVER create a migration that conflicts with existing schema
