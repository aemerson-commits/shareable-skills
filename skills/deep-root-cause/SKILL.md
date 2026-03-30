---
name: deep-root-cause
description: "Team A diagnostic — deep root cause analysis when the obvious fix was wrong. Traces data flow, audits assumptions, builds reproduction."
user-invocable: true
---

# Deep Root Cause Analysis (Team A)

For when the fix was applied but the symptom persists identically. The prior analysis was wrong — this team goes deeper.

## When to Use
- Directly: when you know the first fix attempt targeted the wrong root cause
- Via router: `/persistent-issue` classifies as Category A

## Input
- Evidence Document from `/persistent-issue` (or build one from conversation context)
- The specific symptom and prior fix attempts

## Agent Team (Fan-Out/Fan-In, all model: "opus")

Dispatch 3 agents simultaneously:

### Agent 1: Reproducer
```
Your job is to build exact reproduction steps for this issue.

Evidence: [paste Evidence Document]

Steps:
1. Identify the exact user action or trigger that causes the symptom
2. If it's a UI issue: write Playwright steps to reproduce (see /webapp-testing)
3. If it's an API issue: write the exact curl command that demonstrates it
4. If it's a data issue: identify the specific record/order/item that exhibits the problem
5. Verify the reproduction — run it and confirm the symptom appears

Output: Exact reproduction steps + confirmation that symptom is reproducible
```

### Agent 2: Data Flow Tracer
```
Your job is to trace the data from source to symptom, finding where actual diverges from expected.

Evidence: [paste Evidence Document]

Trace path (check EACH step):
1. **Source**: Where does the data originate? (database, API, cache, user input)
2. **Transform**: What transformations happen? (mapping, normalization, formatting)
3. **Transport**: How does it reach the frontend? (API endpoint, proxy, direct fetch)
4. **Render**: How is it displayed? (component, props, state, CSS)

For each step:
- Read the actual code
- Identify what the data SHOULD be vs what it IS
- Mark the first point where actual != expected

Output: The exact step where data diverges + the code responsible
```

### Agent 3: Assumption Auditor
```
Your job is to list and verify every assumption the prior fix relied on.

Evidence: [paste Evidence Document]

For each prior fix attempt:
1. What assumption was the fix based on? (e.g., "the data is stale in cache")
2. Is that assumption actually true? VERIFY by reading the code, not by reasoning
3. What other explanations could produce the same symptom?

Common false assumptions:
- "The data comes from the API" — it might come from a cache (check TTL)
- "The endpoint returns fresh data" — it might be cached (check cache layer)
- "The component re-renders" — it might be memoized (check useMemo deps)
- "The deploy updated this" — the build might be stale (check deploy source)
- "The fix was deployed" — was it actually pushed and deployed? (check git log + deploy URL)

Output: List of assumptions with VERIFIED/FALSE status + alternative explanations
```

## Synthesis

Main agent merges all 3 reports:
1. Reproduction confirms the symptom
2. Data Flow Tracer identifies WHERE it breaks
3. Assumption Auditor identifies WHY the prior fix missed it

Present: "The root cause is [X] at [file:line]. The prior fix targeted [Y] instead because of the false assumption that [Z]."

## Escalation
If all 3 agents report "no divergence found" or "cannot reproduce": escalate to Team B (Full Stack Trace) — the issue may be in a layer none of the agents checked.
