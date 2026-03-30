---
name: regression-bisect
description: "Team E diagnostic — regression hunting for features that stopped working. Git bisect, side effect analysis, rollback verification."
user-invocable: true
---

# Regression Bisect (Team E)

For when something used to work and now doesn't. Finds the breaking change and its unintended side effects.

## When to Use
- Directly: when user says "this used to work" or "it broke after [change]"
- Via router: `/persistent-issue` classifies as Category E

## Input
- Evidence Document from `/persistent-issue`
- Approximate timeframe when it last worked (if known)

## Agent Team (Sequential Pipeline, all model: "opus")

### Agent 1: Git Bisector
```
Find the commit range where the issue was introduced.

Evidence: [paste Evidence Document]

Steps:
1. Identify the affected feature/component/endpoint
2. Run `git log --oneline --since="2 weeks ago" -- [affected files]` to see recent changes
3. If user provided a timeframe: `git log --oneline --after="[date]" -- [affected files]`
4. For each commit in the range:
   - Read the diff: `git show [hash] --stat` then `git show [hash] -- [specific file]`
   - Could this change have affected the broken feature?
5. Narrow to the most likely 1-3 commits

Do NOT use `git bisect` (requires interactive mode). Use manual diff analysis.

Output: Most likely breaking commit(s) with hash + summary of what changed
```

### Agent 2: Side Effect Analyzer
```
Analyze the suspected breaking commit for unintended side effects.

Evidence: [paste Evidence Document + Agent 1 findings]
Breaking commit: [hash from Agent 1]

Steps:
1. Read the FULL diff of the breaking commit: `git show [hash]`
2. For each changed file:
   - Was the change intentional for the commit's stated purpose?
   - Does the change affect any OTHER feature besides what the commit intended?
3. Check for these common side effect patterns:
   - Shared utility change that affects multiple consumers
   - CSS change with broader selector than intended
   - Props change that breaks a different component
   - Import change that shifts module initialization order
   - Removed or renamed export that another file depends on
   - Cache key pattern change that breaks cache reads
   - API response shape change that breaks frontend parsing
4. Check if the commit modified shared files that affect multiple projects

Output: The specific side effect + which code path it breaks
```

### Agent 3: Rollback Verifier
```
Verify that reverting the suspected change would fix the issue WITHOUT actually reverting.

Evidence: [paste Evidence Document + Agent 1-2 findings]
Breaking commit: [hash]
Side effect: [from Agent 2]

Steps:
1. Read the current state of the affected code
2. Read the state BEFORE the breaking commit: `git show [hash~1]:[file]`
3. Identify the minimal change needed to fix the side effect WITHOUT reverting the whole commit
4. Verify the fix wouldn't break the commit's original purpose

The goal is a TARGETED fix, not a full revert:
- If a shared util was changed: can we fix the specific consumer that broke?
- If a CSS selector was broadened: can we narrow it without losing the intended styling?
- If a prop was removed: can we add it back where needed?

Output: Minimal targeted fix with exact code change at [file:line]
```

## Synthesis

Main agent presents:
"The regression was introduced in commit [hash] ([message]). The commit intended to [purpose], but as a side effect it [broke X]. The fix is [targeted change] at [file:line] — this preserves the original commit's purpose while fixing the regression."

If no breaking commit found in recent history: escalate to Team B (might be infrastructure, not code).
