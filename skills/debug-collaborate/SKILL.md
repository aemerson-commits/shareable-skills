---
name: debug-collaborate
description: "Multi-agent collaborative debugging — parallel hypothesis generation and testing. Use when a solution didn't work, a bug persists, or the user reports 'still happening' / 'not fixed' / 'didn't work'."
user-invocable: true
---

# Collaborative Debugging - Multi-Agent Hypothesis Process

Use this skill when a solution didn't work, a bug persists, or the user reports "still happening" / "not fixed" / "didn't work".

## CRITICAL: Do NOT add debug logging as a first response. Form hypotheses first.

## Process

### Phase 1: Frame the Problem (before spawning agents)

Ask these questions (answer from context or ask the user):
1. What EXACTLY is the symptom? (observable behavior, not assumed cause)
2. What was the expected behavior?
3. What changed recently? (code, config, data, environment)
4. Has this ever worked correctly?

### Phase 2: Spawn Parallel Investigation Agents

Launch 3-4 Task agents simultaneously with these roles:

**Agent A - Root Cause Analyst**:
```
Read all files in the data flow end-to-end. Trace from [data source] through [API/transformation] to [rendering/output]. Identify exactly where the expected behavior diverges from actual behavior. Produce:
1. A specific hypothesis (1-2 sentences)
2. The exact file:line where the break occurs
3. A targeted code fix (not logging)
```

**Agent B - Environment & Config Investigator**:
```
Check all configuration, environment variables, external service state, and runtime conditions that could affect [the feature]. Look for: stale cache, wrong environment, missing bindings, API changes, schema mismatches. Produce:
1. A specific hypothesis about environmental/config cause
2. Evidence for/against from config files and API responses
3. A targeted fix or verification step
```

**Agent C - Contrarian / Non-Obvious Cause**:
```
Assume the obvious cause (what we already tried) is WRONG. Look for non-obvious explanations: race conditions, stale closures, timezone issues, encoding problems, cache poisoning, browser-specific behavior, CSS specificity conflicts. Produce:
1. A non-obvious hypothesis
2. Why the obvious fix might not address the real issue
3. An alternative fix approach
```

**Agent D - Architecture Reviewer** (when appropriate):
```
Step back and evaluate: Is the current design/architecture appropriate for what this feature needs to do? Would a different approach avoid this class of bug entirely? Produce:
1. Assessment of whether the design fits the use case
2. If mismatched: what architectural change would fix the root cause
3. Trade-offs of the architectural change
```

### Phase 3: Synthesize and Decide

After all agents report:
1. Compare hypotheses - which has the strongest evidence?
2. Are any hypotheses complementary (multiple causes)?
3. Rank by probability: implement the highest-probability fix FIRST
4. If agents disagree, present the top 2 options to the user with trade-offs

### Phase 4: Implement and Verify

1. Make the smallest change that tests the winning hypothesis
2. Build and verify (don't just deploy and hope)
3. If it doesn't work: move to hypothesis #2 (do NOT re-add logging for #1)

### Phase 5: Learn

1. Document what the actual root cause was
2. Update relevant files:
   - `memory/debugging-directives.md` if a new anti-pattern was found
   - `CLAUDE.md` Known Gotchas if it's a recurring trap
   - `memory/priority-actions.md` if it relates to tracked items
   - Relevant skill files if a pattern changed

## Arguments
- If the user provides context about what failed, use it to frame Phase 1
- If no context, ask the user the Phase 1 questions before spawning agents

### React fiber walking for state inspection

When diagnosing a React state bug, you often need to read values from live hooks (e.g. a state map, an orders array) without the app exposing them on `window`. Walk the fiber tree from the root and match hooks by shape.

```js
const root = document.querySelector('#root');
const key = Object.keys(root).find(k => k.startsWith('__reactContainer'));
let fiber = root[key].stateNode?.current;
const walk = (node, d=0) => {
  if (!node || d > 300) return;
  let hook = node.memoizedState;
  while (hook) {
    const v = hook.memoizedState;
    // Match by shape (e.g. object-of-overrides with the field you expect)
    if (v && typeof v === 'object' && !Array.isArray(v) && v !== null) {
      const s = v[Object.keys(v)[0]];
      if (s?.someExpectedField !== undefined) { /* found the state map */ }
    }
    hook = hook.next;
  }
  walk(node.child, d+1); walk(node.sibling, d+1);
};
walk(fiber);
```

**Caveats**:
- Fragile — depends on React internals (the `__reactContainer*` key name and fiber structure). Use only for ad-hoc diagnosis, **never** ship in production code.
- Match hooks by **shape** (presence of known fields), not by position — hook order shifts across renders and component versions.
- Pair with the Chrome DevTools MCP `evaluate_script` tool to run it inside a headless debugging session.

## When NOT to Use This Skill
- Simple typos or obvious one-line fixes
- User is asking for a new feature (not debugging)
- The issue is clearly documented in Known Gotchas
