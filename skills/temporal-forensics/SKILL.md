---
name: temporal-forensics
description: "Team D diagnostic — temporal analysis for intermittent issues. Hunts race conditions, stale state, cache timing, and async ordering."
user-invocable: true
---

# Temporal Forensics (Team D)

For intermittent issues that come and go, or that seemed fixed but returned. The problem is timing-dependent — this team finds the timing.

## When to Use
- Directly: when the issue is intermittent or timing-related
- Via router: `/persistent-issue` classifies as Category D

## Input
- Evidence Document from `/persistent-issue`
- When the issue occurs vs when it doesn't (if known)

## Agent Team (Fan-Out/Fan-In, all model: "opus")

Dispatch 3 agents simultaneously:

### Agent 1: Race Condition Hunter
```
Search for race conditions and async ordering issues.

Evidence: [paste Evidence Document]

Check these patterns in the affected code:
1. **useEffect ordering**: Are multiple useEffects competing for the same state?
   - Check deps arrays — are they stable? (object/array refs change every render)
   - Is there a useEffect that sets state that triggers another useEffect?
2. **Concurrent fetches**: Are multiple API calls racing?
   - Check if responses can arrive out of order
   - Check if a slow response overwrites a fast one
3. **State updates during unmount**: Is a component setting state after unmounting?
   - Check for missing cleanup in useEffect return
4. **Cache read-after-write**: Is code reading cache immediately after writing?
   - Eventually consistent stores may return stale data after immediate writes
5. **API rate limits**: Are concurrent mutations exhausting budget?
   - Check for parallel mutations without rate limiting

Output: Specific race condition with timing diagram showing the failure path
```

### Agent 2: Stale State Detective
```
Search for stale data, expired caches, and closure captures.

Evidence: [paste Evidence Document]

Check:
1. **Cache TTL**: Is the cache TTL too long? Too short?
   - Is the issue that data is correct in source but stale in cache?
2. **localStorage**: Is the app reading old localStorage data?
   - Column settings, tab preferences, toggles
   - Cross-reference saved values against current defaults
3. **React closures**: Is a callback capturing stale state?
   - Check useCallback deps — missing deps means stale closure
   - Check event handlers defined inside render without useCallback
4. **Sync lag**: Do background sync processes run at intervals?
   - Is the user expecting immediate updates that won't appear until next sync?
5. **Cache format mismatch**: Is code reading cache without proper deserialization?
   - Compressed cache keys read without decompression return garbage
6. **Browser cache**: Is the browser serving a stale JavaScript bundle?
   - Check if content hashing is working (filenames should have hashes)

Output: Specific stale state source + what triggers the staleness
```

### Agent 3: Timing Profiler
```
Analyze timing correlations.

Evidence: [paste Evidence Document]

Check:
1. **Cron timing**: Does the issue correlate with scheduled task schedules?
   - Check all cron intervals and their UTC offsets
   - Account for DST changes (UTC-only schedules shift relative to local time)
2. **Deploy timing**: Did the issue appear right after a deploy?
   - Secret changes can unregister cron triggers in some platforms
   - Build artifacts might be stale (deployed from wrong directory?)
3. **Cache expiry window**: Does the issue appear at specific intervals?
   - Map intervals to known cache TTLs and sync frequencies
4. **User session timing**: Does it happen after being idle?
   - Auth token expiry
   - localStorage TTL checks

Output: Timing pattern identified + correlation with specific system event
```

## Synthesis

Main agent merges timing findings:
"The issue is intermittent because [timing condition]. It manifests when [trigger A] coincides with [state B]. The fix is [make the timing deterministic / extend TTL / add retry / fix the race]."

If no timing pattern found: escalate to Team E (might be a regression — something changed recently).
