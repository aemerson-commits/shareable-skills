---
name: data-reconciliation
description: "Trace a data item through your pipeline layers to find where values diverge. For debugging stale/wrong data, not code bugs."
user-invocable: true
---

# Data Reconciliation — Pipeline Integrity Check

Traces a specific record or data point through every layer of the data pipeline. Identifies exactly where a value diverges from its source of truth. Different from /full-stack-trace (which finds code bugs) — this finds data staleness, transformation errors, and cache inconsistencies.

## When to Use

- "The data looks wrong" — a specific record shows incorrect values
- "This number doesn't match the source system" — frontend disagrees with source
- After sync issues — verifying data integrity
- After cache problems — checking what's cached vs what's real
- When user points to a specific item and says "this is wrong"

## Arguments

- First argument (required): Identifier to trace (e.g., order number, record ID, customer name)
- `--layer=source|api|cache|frontend` (optional: start tracing from a specific layer)
- `--field=<name>` (optional: trace a specific field, e.g., "status", "weight", "dueDate")

## Data Pipeline Map

Customize this to match your project's architecture:

```
Source Database              <- Source of truth
    | API/tunnel
Backend API (Express/etc.)   <- Transforms: SQL -> JSON, joins, enrichment
    | HTTP
API Proxy / Functions        <- Caching layer: KV with TTL, compression
    |
Cache Layer (KV/Redis)       <- Cached data with TTL
    |
Data Transform               <- Reshapes data for frontend consumption
    |
React Component              <- Displays to user (may further filter/format)
```

## Phase 1: Parallel Layer Sampling (4 Agents, model: "opus")

Pattern: Fan-Out/Fan-In. Each agent reads data at one layer for the target item.

### Agent: Source Layer
```
Find the source data for [identifier] in the primary database.

Read backend API code to find the relevant query for this data type.
Trace the query to understand: which tables, which joins, which WHERE clause.

Document: exact field values at the source, including any transformations
in the query itself (CASE statements, JOINs, computed columns).

Output:
| Field | Source Value | Source Table | Notes |
|-------|-------------|-------------|-------|
```

### Agent: Cache Layer
```
Find the cached data for [identifier].

1. Identify which cache key would contain this item
2. Read transform logic to understand how source data is reshaped
3. Check sync/refresh code to understand how source data maps to cache

Document: what the cache SHOULD contain based on the transform logic.
Flag any transformations that could lose or alter data.

Output:
| Field | Expected Cache Value | Transform Applied | Potential Issue |
|-------|---------------------|-------------------|----------------|
```

### Agent: Frontend Layer
```
Find how [identifier] is displayed in the frontend.

1. Read the relevant React component that displays this data
2. Trace: how does the component receive the data? (props? direct fetch?)
3. Check: does the component apply additional formatting?
4. Check: does useMemo or filtering alter the data before display?
5. Check: does localStorage override any values?

Document: what the user SEES and how it got transformed from the API response.

Output:
| Field | Displayed Value | Formatting Applied | Component:Line |
|-------|----------------|-------------------|----------------|
```

### Agent: API Layer
```
Find the API response for [identifier].

1. Read the API function that serves this data
2. Trace: does it hit cache first? What's the TTL?
3. If cache miss: what endpoint does it call? What transform happens?
4. Check: does the API apply any filtering, sorting, or enrichment?

If possible, construct the exact curl command that would fetch this item's data.

Output:
| Field | API Response Value | Cache Hit? | TTL | Transform |
|-------|-------------------|------------|-----|-----------|
```

## Phase 2: Reconciliation (Main Agent)

Compile all 4 agents' field-level reports into a single comparison matrix:

```markdown
## Data Reconciliation: [identifier]

### Field Comparison
| Field | Source | API | Cache | Frontend | Match? |
|-------|--------|-----|-------|----------|--------|
| status | Released | Released | Released | Open | MISMATCH |
| dueDate | 2026-04-15 | 2026-04-15 | 2026-04-14 | 4-14-26 | MISMATCH |
| weight | 5280.5 | 5280.5 | 5280.5 | 5,281 | OK (rounding) |

### Divergence Points
For each MISMATCH:
1. **Field**: [name]
2. **Diverges at**: [which layer boundary]
3. **Root cause**: [stale cache / transform bug / sync lag / display formatting]
4. **Fix**: [specific action]

### Common Root Causes
- **Stale cache**: TTL hasn't expired, data changed in source. Fix: wait for TTL or invalidate
- **Sync lag**: Background sync runs at intervals, item was just changed. Fix: trigger manual sync
- **Transform bug**: Transform logic drops/alters a field. Fix: update transform
- **Display formatting**: Component formats differently than expected. Fix: update formatter
- **Timezone shift**: ISO date parsed as UTC, displayed as local -> off by 1 day. Fix: parse as local
- **Compression mismatch**: Reading compressed cache without decompression returns garbage
```

## Phase 3: Fix Recommendation

Based on the divergence analysis:
1. If **stale cache**: Suggest cache invalidation or TTL adjustment
2. If **sync lag**: Suggest manual sync trigger
3. If **transform bug**: Identify the exact line and suggest fix
4. If **display error**: Identify the component and formatter
5. If **source data wrong**: Flag as "source data issue — check directly"

## Escalation

- If divergence is in code logic (not data): escalate to `/deep-root-cause`
- If divergence is intermittent: escalate to `/temporal-forensics`
- If no divergence found but user insists data is wrong: escalate to `/isolation-test`
