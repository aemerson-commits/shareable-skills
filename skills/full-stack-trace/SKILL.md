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
1. Component receives correct props from parent (read root component prop passing)
2. Component state is correct (check useState initial values, useEffect deps)
3. Memoization isn't hiding stale data (check useMemo/useCallback deps)
4. CSS isn't hiding/misplacing content (check display, visibility, overflow, z-index)
5. localStorage isn't serving stale saved state
6. Event handlers fire correctly (check onClick, onChange bindings)

If using Playwright: take a screenshot and inspect the DOM for the specific element.

Output:
- CLEAR: Frontend layer is correct, data arrives correctly but [specific observation]
- FOUND: Issue is in the frontend at [file:line] because [reason]
```

### Agent 2: API Verifier
```
Check the API layer. Only runs if Agent 1 reports CLEAR.

Evidence: [paste Evidence Document + Agent 1 findings]

Verify:
1. Curl the endpoint directly (with auth headers if needed)
2. Check response shape — is it JSON? correct fields? correct values?
3. Check CORS headers — is the response being blocked or modified?
4. Check if the endpoint is hitting cache vs live data (look for cache calls)
5. Check request parameters — is the frontend sending the right query?
6. Compare dev vs prod endpoint responses if relevant

Output:
- CLEAR: API returns correct data
- FOUND: Issue is in the API at [file:line] because [reason]
```

### Agent 3: Backend Prober
```
Check the backend data layer. Only runs if Agent 2 reports CLEAR.

Evidence: [paste Evidence Document + Agent 1-2 findings]

Verify:
1. Cache — is the cached data correct? Check TTL, check if stale
2. Database — query the source directly, compare with cached data
3. External API — if data comes from a third-party API, check the response
4. Data transformations — check mapping logic, normalization functions

Output:
- CLEAR: Backend data is correct
- FOUND: Issue is in the backend at [file:line] because [reason]
```

### Agent 4: Infrastructure Checker
```
Check infrastructure. Only runs if Agent 3 reports CLEAR.

Evidence: [paste Evidence Document + Agent 1-3 findings]

Verify:
1. Secrets — are all required secrets/env vars set?
2. Bindings — are database/cache bindings configured correctly?
3. Deploy state — is the latest code actually deployed? Compare git HEAD with deploy
4. Cron triggers — are scheduled tasks registered and running?
5. Auth config — are tokens/JWTs valid?
6. DNS — is the domain resolving correctly?

Output:
- CLEAR: Infrastructure is correct (escalate — issue may be intermittent, try Team D)
- FOUND: Issue is in infrastructure: [specific misconfiguration]
```

## Synthesis

The first agent that reports FOUND identifies the layer. Main agent presents:
"The issue is in the [layer] layer at [file:line]. The prior fix targeted [other layer] instead."

If all 4 agents report CLEAR: escalate to Team D (Temporal Forensics) — the issue may be timing-dependent.
