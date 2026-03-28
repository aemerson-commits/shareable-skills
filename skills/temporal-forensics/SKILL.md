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
4. **Read-after-write consistency**: Is code reading data immediately after writing?
   - Eventually consistent stores (caches, replicated DBs) may return stale data on immediate read
5. **Resource contention**: Are concurrent operations exhausting a shared resource?
   - Rate limits, connection pools, API quotas, mutex/lock contention

Output: Specific race condition with timing diagram showing the failure path
```

### Agent 2: Stale State Detective
```
Search for stale data, expired caches, and closure captures.

Evidence: [paste Evidence Document]

Check:
1. **Cache TTL**: What are your cache TTLs? Is the data stale?
   - Identify all caching layers (server cache, CDN, browser, application-level)
   - Is the issue that data is correct at the source but stale in cache?
2. **localStorage/sessionStorage**: Is the app reading old browser storage?
   - Saved preferences, column settings, toggle states, filter values
   - Cross-reference stored values against current application defaults
3. **React closures**: Is a callback capturing stale state?
   - Check useCallback deps — missing deps means stale closure
   - Check event handlers defined inside render without useCallback
   - Check deps arrays on useMemo and useEffect
4. **Sync lag**: How often does the sync/background job run? Is the user expecting real-time updates from a batch process?
   - Identify the refresh interval and compare against user expectations
5. **Cache format mismatch**: Is code reading compressed/encoded cache without the proper decoder?
   - Check if cached data is gzipped, base64-encoded, or serialized — reader must match writer
6. **Browser cache**: Is the browser serving a stale JavaScript bundle?
   - Check if content hashing is working (filenames should have hashes)

Output: Specific stale state source + what triggers the staleness
```

### Agent 3: Timing Profiler
```
Analyze timing correlations.

Evidence: [paste Evidence Document]

Check:
1. **Cron/scheduled job timing**: List your scheduled jobs and their intervals.
   Does the issue correlate with when a job runs (or fails to run)?
   Check for timezone issues (UTC vs local time, DST transitions)
2. **Deploy timing**: Did the issue appear right after a deploy?
   - Check if a config change or secret update caused a side effect (e.g., unregistering a scheduled task)
   - Check if the deployed artifact is stale (built from wrong branch or directory)
3. **Cache expiry window**: Does the issue appear at regular intervals matching a cache TTL?
   - Map out all TTLs in the system and see if the recurrence pattern matches any of them
4. **Session timing**: Does it happen after the user is idle?
   - Auth token expiry (JWT, session cookie, refresh token)
   - WebSocket disconnects after idle timeout
   - Background tab throttling by the browser

Output: Timing pattern identified + correlation with specific system event
```

## Synthesis

Main agent merges timing findings:
"The issue is intermittent because [timing condition]. It manifests when [trigger A] coincides with [state B]. The fix is [make the timing deterministic / extend TTL / add retry / fix the race]."

If no timing pattern found: escalate to Team E (might be a regression — something changed recently).
