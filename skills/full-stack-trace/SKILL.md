---
name: full-stack-trace
description: "Team B diagnostic — systematic layer-by-layer trace when the fix was in the wrong layer. Frontend -> API -> Backend -> Infrastructure."
user-invocable: true
---

# Full Stack Trace (Team B)

For when the fix was applied to the wrong layer. Systematically checks each layer of the stack to find where the issue actually lives.

## When to Use
- Directly: when the fix changed behavior but didn't resolve the issue (wrong layer)
- Via router: `/persistent-issue` classifies as Category B

## Input
- Evidence Document from `/persistent-issue`
- Which layer the prior fix targeted

## Agent Team (Sequential Pipeline, all model: "opus")

Dispatch 4 agents in sequence — each passes findings to the next. The break point between "correct here" and "wrong here" identifies the real layer.

### Agent 1: Frontend Inspector
```
Check the frontend layer for this issue.

Evidence: [paste Evidence Document]

Verify:
1. Component receives correct props from parent (read component tree, check prop passing)
2. Component state is correct (check useState initial values, useEffect deps)
3. Memoization isn't hiding stale data (check useMemo/useCallback/React.memo deps)
4. CSS isn't hiding/misplacing content (check display, visibility, overflow, z-index)
5. localStorage/sessionStorage isn't serving stale saved state (check stored values against current defaults)
6. Event handlers fire correctly (check onClick, onChange bindings)

If using browser automation: take a screenshot and inspect the DOM for the specific element.

Output:
- CLEAR: Frontend layer is correct, data arrives correctly but [specific observation]
- FOUND: Issue is in the frontend at [file:line] because [reason]
```

### Agent 2: API Verifier
```
Check the API layer. Only runs if Agent 1 reports CLEAR.

Evidence: [paste Evidence Document + Agent 1 findings]

Verify:
1. Curl the endpoint directly (with appropriate auth headers if needed)
2. Check response shape — is it JSON? correct fields? correct values? (not an HTML error page)
3. Check caching layer — is the response being served from cache vs live data?
4. Check request parameters — is the frontend sending the right query params/body?
5. Compare environments — does the same endpoint return different results on dev vs prod?
6. Check CORS headers — is the response being blocked or modified?

Output:
- CLEAR: API returns correct data
- FOUND: Issue is in the API at [file:line] because [reason]
```

### Agent 3: Backend Prober
```
Check the backend data layer. Only runs if Agent 2 reports CLEAR.

Evidence: [paste Evidence Document + Agent 1-2 findings]

Verify:
1. Data source query — run the actual query and check the raw results
2. Cache content — if a caching layer exists, compare cached data against source of truth
3. Data transformations — check any mapping, normalization, or aggregation logic
4. Database state — is the data correct at rest? Check for stale, missing, or malformed records
5. Third-party API responses — if data comes from external services, check their responses directly

Output:
- CLEAR: Backend data is correct
- FOUND: Issue is in the backend at [file:line] because [reason]
```

### Agent 4: Infrastructure Checker
```
Check infrastructure. Only runs if Agent 3 reports CLEAR.

Evidence: [paste Evidence Document + Agent 1-3 findings]

Verify:
1. Secrets/environment variables — are all required env vars set in the running environment?
2. Configuration files — do config files match expectations? (bindings, routes, permissions)
3. Deploy state — is the latest code actually deployed? Compare git HEAD with what's running
4. Background jobs/cron — are scheduled tasks registered and running on time?
5. Auth tokens — are service tokens, API keys, or JWTs valid and not expired?
6. DNS/networking — is the domain resolving correctly? Are upstream services reachable?

Output:
- CLEAR: Infrastructure is correct (escalate — issue may be intermittent, try Team D)
- FOUND: Issue is in infrastructure: [specific misconfiguration]
```

## Synthesis

The first agent that reports FOUND identifies the layer. Main agent presents:
"The issue is in the [layer] layer at [file:line]. The prior fix targeted [other layer] instead."

If all 4 agents report CLEAR: escalate to Team D (Temporal Forensics) — the issue may be timing-dependent.
