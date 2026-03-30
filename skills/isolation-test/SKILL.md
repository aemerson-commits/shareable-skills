---
name: isolation-test
description: "Team C diagnostic — isolation testing when multiple factors contribute to a persistent issue. Tests components independently to find interacting failures."
user-invocable: true
---

# Isolation Testing (Team C)

For when a fix partially works or the issue is inconsistent. Multiple factors are likely interacting — this team isolates each one.

## When to Use
- Directly: when you suspect 2+ things are broken simultaneously
- Via router: `/persistent-issue` classifies as Category C

## Input
- Evidence Document from `/persistent-issue`
- Which components are suspected

## Agent Team (Conditional Dispatch, all model: "opus")

Dispatch 3 agents simultaneously:

### Agent 1: Component Isolator
```
Test each suspected component independently.

Evidence: [paste Evidence Document]

For each component in the data path:
1. Feed it known-good input → does it produce correct output?
2. Feed it the actual problematic input → does it produce wrong output?
3. If wrong: this component is one of the contributing factors

Components to test (as applicable):
- API response (curl directly)
- Cache content (read raw key)
- Data transformation/mapping logic (trace specific item)
- React component (mock props, check render)
- CSS rules (inspect computed styles)
- Backend endpoint (curl directly)
- Database query (run the SQL/query)

Output: List of components with PASS/FAIL + what specifically fails
```

### Agent 2: Data Minimizer
```
Reproduce with the smallest possible dataset.

Evidence: [paste Evidence Document]

Steps:
1. Identify the specific data item(s) that exhibit the issue
2. Can it reproduce with just 1 item? (e.g., one specific record)
3. What's special about the failing items vs working items?
4. Check: is it a data shape issue? (missing field, null value, unexpected type)
5. Check: is it a data content issue? (special characters, long strings, edge case values)

Common data-related triggers:
- Records with multiple related items that have different ID patterns
- Items in unexpected states (completed but still showing as active)
- Date fields that are null or empty string
- IDs with special characters conflicting with internal format conventions

Output: Minimal reproduction dataset + what makes failing items different
```

### Agent 3: Environment Comparator
```
Test across environments to isolate environment-specific factors.

Evidence: [paste Evidence Document]

Compare:
1. Does it fail on dev? (curl dev endpoint)
2. Does it fail on prod? (curl prod endpoint)
3. Does it fail on localhost? (if running local dev server)
4. Does the SAME data produce different results on different environments?

If environment-specific:
- Compare secrets/env vars between environments
- Compare cached data: same key, different values?
- Compare deploy state: same git commit deployed?
- Compare config bindings

Output: Environment matrix (dev/prod/local x pass/fail) + what differs
```

## Synthesis

Main agent combines all 3 reports to identify the interaction:
"The issue requires [Factor A] AND [Factor B] to manifest. Factor A alone doesn't cause it. Factor B alone doesn't cause it. The fix must address both."

If only 1 factor found: re-classify as Category A and escalate to Team A.
If no factors found: escalate to Team E (might be a regression — something changed).
