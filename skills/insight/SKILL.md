---
name: insight
description: "Weekly: generate Obsidian insight report with metrics and priorities"
---

# Weekly Insight Report — Obsidian Vault

Generate a weekly insight report summarizing development metrics, progress, and priorities.

## Obsidian CLI

**Binary**: Auto-detect the Obsidian installation path — a system-wide install and a per-user
install can both exist, so probe rather than hardcode:

```bash
OBS="/c/Program Files/Obsidian/Obsidian.exe"
[ ! -f "$OBS" ] && OBS="/c/Users/${USERNAME:-$USER}/AppData/Local/Programs/obsidian/Obsidian.exe"
```

⚠️ **`$USER` is EMPTY in the Bash tool on Windows** — `$USERNAME` carries it. A bare `$USER`
silently builds `/c/Users//AppData/...`, which fails the `[ -f ]` test and reads as "not
installed" rather than as a broken path.

**Active vault**: Set `{{vault_path}}` to your Obsidian vault location — resolve it at runtime
(env override, then a candidate list) rather than hardcoding a username; the folder differs per
machine.

All CLI commands output to stderr — always append `2>&1` and filter startup noise:

```bash
"$OBS" <command> [args] 2>&1 | grep -v "Loading\|out of date"
```

## Steps

### 1. Gather Data

**Discover this week's session notes:**

```bash
"$OBS" files folder="{{project}}/Sessions" 2>&1 | grep -v "Loading\|out of date"
```

Read the most recent 5-7 files (one per session day).

**Git stats for the week:**

```bash
git log --oneline --since="7 days ago"
git diff --stat HEAD~{N}  # where N = commit count from above
```

**Vault-wide open tasks:**

```bash
"$OBS" tasks todo verbose 2>&1 | grep -v "Loading\|out of date"
```

**Top topics this week (tag frequency):**

```bash
"$OBS" tags counts sort=count 2>&1 | grep -v "Loading\|out of date"
```

**Recurring unresolved items** (items appearing in "Next Steps" across sessions):

```bash
"$OBS" search:context query="Next Steps|Left Off|Still on backlog" path="{{project}}/Sessions" limit=20 2>&1 | grep -v "Loading\|out of date"
```

**Also review:** `memory/MEMORY.md` (repo), CLAUDE.md (repo), `{{project}}/Learnings/` (vault).

**Real-User Monitoring (web-vitals) — past 7 days (if applicable):**

If your project captures web-vitals from real users (e.g., in a D1 `rum_events` table), query them now:

> **Use p75, NOT mean.** Core Web Vitals are defined at the **75th percentile** precisely because backgrounded-tab samples poison the average — web-vitals reports LCP/FCP when a tab is refocused, which can be minutes later. Always: (1) filter outliers `numeric_value < 60000`, (2) report **p75**, (3) keep `max` visible so you can see the outlier tail you filtered.

```bash
npx wrangler d1 execute your-db --remote --command "
WITH f AS (
  SELECT project, message AS metric, numeric_value,
    ROW_NUMBER() OVER (PARTITION BY project, message ORDER BY numeric_value) AS rn,
    COUNT(*)     OVER (PARTITION BY project, message) AS n
  FROM rum_events
  WHERE event_type='perf' AND received_at >= datetime('now','-7 days')
    AND numeric_value < 60000          -- drop backgrounded-tab outliers (>60s = tab refocus, not a real load)
)
SELECT project, metric, n AS samples, ROUND(numeric_value,1) AS p75
FROM f WHERE rn = CAST(ROUND(0.75 * (n - 1)) AS INT) + 1   -- nearest-rank p75
ORDER BY project, metric" --json
```

Compare each `p75` against the [web.dev/vitals](https://web.dev/vitals) thresholds:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤2500ms | 2500–4000ms | >4000ms |
| CLS | ≤0.1 | 0.1–0.25 | >0.25 |
| INP | ≤200ms | 200–500ms | >500ms |
| FCP | ≤1800ms | 1800–3000ms | >3000ms |
| TTFB | ≤800ms | 800–1800ms | >1800ms |

Flag any metric crossing into "needs improvement" or "poor" — and any metric that DEGRADED vs the prior 7 days (re-run with `received_at BETWEEN datetime('now','-14 days') AND datetime('now','-7 days')` to compare). A jump driven by a few huge samples (check `max` separately) is almost always the backgrounded-tab artifact, not a real regression — the `<60000` filter + p75 already guard against it, but sanity-check before raising an alarm.

**Error trends (if applicable):**

If your project has an `event_log` table:

```bash
npx wrangler d1 execute your-db --remote --command "SELECT dashboard, category, status, COUNT(*) AS n FROM event_log WHERE eventType = 'error' AND createdAt >= datetime('now', '-7 days') GROUP BY dashboard, category, status ORDER BY n DESC" --json
```

Surface: total errors this week, top 3 categories by count, ratio of resolved/dismissed/still-new (the "noise floor"). If any single error type repeats >5 times, that's a hot spot worth calling out.

### 2. Generate Report

**Create the insight file via CLI, with frontmatter embedded in the content:**

> Some Obsidian CLI versions have removed the `property:set` write subcommand entirely (it can exit non-zero with "command not found" on newer releases), while the read-side `properties` subcommand keeps working. Rather than depend on a write subcommand that may not exist, embed the frontmatter as a literal `---` YAML block directly in the `create` call's content — that always works, since it's just markdown text.

```bash
"$OBS" create path="{{project}}/Insights/{YYYY-MM-DD}.md" content="---\ntype: insight\nweek-ending: {YYYY-MM-DD}\n---\n\n{report content}" 2>&1 | grep -v "Loading\|out of date"
```

**Verify the frontmatter took:**

```bash
"$OBS" properties path="{{project}}/Insights/{YYYY-MM-DD}.md" 2>&1 | grep -v "Loading\|out of date"
```

If your installed CLI does support `property:set`, that route still works — the embedded-frontmatter approach above is just the more portable default since it has no dependency on that subcommand existing.

Template:

```markdown
# Weekly Insight — {YYYY-MM-DD}

## Development Summary

- **Commits this week**: {count}
- **Files changed**: {count}
- **Key features shipped**: [list]
- **Bugs fixed**: [list]

## Architecture Changes

- [any structural changes made]

## Current Priorities

1. [highest priority item]
2. [next priority]
3. [etc.]

## Blocked Items

- [items waiting on external action]

## Metrics / Health

- Components: {count} views, {total lines}
- Shared utilities: {function count}
- Workers/services: {status}
- Open vault tasks: {count from tasks todo}
- Top tags: {from tags counts}

## Real-User Monitoring (web-vitals)

_All values are **p75** with samples >60s filtered out (never report the mean)._

| Project | LCP | CLS | INP | FCP | TTFB | Samples | Status |
|---------|-----|-----|-----|-----|------|---------|--------|
| {project} | {p75 ms} | {p75} | {p75 ms} | {p75 ms} | {p75 ms} | {n} | good / needs-improvement / poor |

**Anomalies vs prior week:** {list any metric that degraded by >20% or crossed a threshold band}

**Errors logged this week (event_log):** {N total · X new · Y resolved · Z dismissed} — top categories: {list top 3}

**Hot spots:** {any error type with >5 occurrences this week}

## Recurring Unresolved Items

- [items appearing in "Next Steps" / "Left Off" across multiple sessions without completion]

## Recommendations

- [suggested improvements or focus areas for next week]
```

### 3. Update Roadmap

**Check current roadmap tasks:**

```bash
"$OBS" tasks todo path="{{project}}/Roadmap.md" verbose 2>&1 | grep -v "Loading\|out of date"
```

Mark completed items and update priorities based on the week's progress.

## When to Run

- End of week (Friday sessions)
- Or when user explicitly requests `/insight`
- Can also be triggered mid-week for a status check
