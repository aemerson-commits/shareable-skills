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
Cache Layer (KV/Redis)       <- Cached data with TTL, D1 enrichment at read time
    |
Data Transform               <- Reshapes data for frontend consumption
    |
React Component              <- Displays to user (may further filter/format)
```

## Phase 0: Identifier Probe (do this BEFORE fanning out agents)

Identifiers are often ambiguous — the same string may refer to different entities depending on context (e.g. an order number vs a job name vs a customer PO). **A single search call resolves this before wasting the full fan-out.**

```bash
# Use your backend's search endpoint to classify the identifier
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://{{your-app}}.example.com/api/search?q=<identifier>"
```

| Probe Result | Action |
|---|---|
| Matches expected entity type | Proceed to Phase 1 |
| Matches a different entity type (e.g., job name not order number) | Pivot the trace to the true entity |
| No matches anywhere | Ask the user what system they saw the identifier in — guessing wastes the fan-out |
| Present in source but not on user's screen | SO is live; divergence is downstream — skip source agent, go straight to cache/frontend |

**Only proceed to Phase 1 if Phase 0 confirms the identifier maps to a real entity and you've identified which layer is plausibly losing data.** Often Phase 0 alone resolves the question.

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
3. Check enrichment code — what overlays are applied at read time?
   (e.g. D1 enrichment layers: assignment data, status overrides, synthetic cards)
4. Check sync/refresh code to understand how source data maps to cache

Document: what the cache SHOULD contain based on the transform logic.
Flag any enrichment step that could mask, collapse, or filter the identifier.

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
5. Check: is any feature-gate mode active that blocks live data?

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
3. **Root cause**: [identifier ambiguity / stale cache / transform bug / sync lag / display formatting]
4. **Fix**: [specific action]

### Common Root Causes
- **Identifier ambiguity**: User's ID maps to a different entity than expected. Fix: resolve via Phase 0 probe and pivot the trace to the true entity.
- **WHERE filter drop**: Records vanish when a backend query filters by status, warehouse, process completion, or quantity shipped. Fix: confirm via completions endpoint or direct search.
- **Record absorption**: Enrichment logic consolidates N records into one summary card. Downstream sees 1 record not N. Fix: this is often intentional — drill into the summary record's child array.
- **Stale cache**: TTL hasn't expired, data changed in source. Fix: wait for TTL or invalidate.
- **Transform/enrichment bug**: Enrichment code drops/alters a field. Fix: update enrichment.
- **Frontend filter**: Active user filters (status, machine, assignee, date range) hide the record. Fix: identify which filter and either correct upstream state or change the user's active selection.
- **Display formatting**: Component formats differently than expected. Fix: update formatter.
- **Timezone shift**: ISO date parsed as UTC, displayed as local -> off by 1 day. Fix: parse as local.
- **Compression mismatch**: Reading compressed cache without decompression returns garbage. Fix: use the correct cache utility.
```

## Phase 3: Fix Recommendation

Based on the divergence analysis:
1. If **identifier ambiguity**: Restart the trace using the resolved entity (from Phase 0 probe). Often the original "missing data" is actually present under a different ID.
2. If **stale cache**: Suggest cache invalidation or TTL adjustment.
3. If **transform/enrichment bug**: Identify the exact line and suggest fix.
4. If **frontend filter**: Identify the component, the filter condition, and whether the upstream data or the user's selection needs to change.
5. If **source data wrong**: Flag as "source data issue — check directly in source system".

## Escalation

- If divergence is in code logic (not data): escalate to `/deep-root-cause`
- If divergence is intermittent: escalate to `/temporal-forensics`
- If no divergence found but user insists data is wrong: escalate to `/isolation-test`
