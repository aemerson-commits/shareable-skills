---
name: insight
description: "Weekly: generate Obsidian insight report with metrics and priorities"
user_invocable: true
---

# Weekly Insight Report — Obsidian Vault

Generate a weekly insight report summarizing development metrics, progress, and priorities.

## Obsidian CLI

**Binary**: Auto-detect Obsidian installation path.
**Active vault**: Set `{{vault_path}}` to your Obsidian vault location.

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

```bash
npx wrangler d1 execute your-db --remote --command "SELECT project, message AS metric, COUNT(*) AS samples, ROUND(AVG(numeric_value), 1) AS avg_value FROM rum_events WHERE event_type = 'perf' AND received_at >= datetime('now', '-7 days') GROUP BY project, message ORDER BY project, message" --json
```

Compare each `avg_value` against the [web.dev/vitals](https://web.dev/vitals) thresholds:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤2500ms | 2500–4000ms | >4000ms |
| CLS | ≤0.1 | 0.1–0.25 | >0.25 |
| INP | ≤200ms | 200–500ms | >500ms |
| FCP | ≤1800ms | 1800–3000ms | >3000ms |
| TTFB | ≤800ms | 800–1800ms | >1800ms |

Flag any metric crossing into "needs improvement" or "poor" — and any metric that degraded vs the prior 7 days.

**Error trends (if applicable):**

If your project has an `event_log` table:

```bash
npx wrangler d1 execute your-db --remote --command "SELECT dashboard, category, status, COUNT(*) AS n FROM event_log WHERE eventType = 'error' AND createdAt >= datetime('now', '-7 days') GROUP BY dashboard, category, status ORDER BY n DESC" --json
```

Surface: total errors this week, top 3 categories by count, ratio of resolved/dismissed/still-new.

### 2. Generate Report

**Create the insight file via CLI:**

```bash
"$OBS" create path="{{project}}/Insights/{YYYY-MM-DD}.md" content="{report content}" 2>&1 | grep -v "Loading\|out of date"
```

**Set frontmatter** (edit directly if `property:set` is broken in your Obsidian version):

```bash
"$OBS" property:set name="type" value="insight" path="{{project}}/Insights/{YYYY-MM-DD}.md" 2>&1 | grep -v "Loading\|out of date"
"$OBS" property:set name="week-ending" value="{YYYY-MM-DD}" path="{{project}}/Insights/{YYYY-MM-DD}.md" 2>&1 | grep -v "Loading\|out of date"
```

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

| Project | LCP | CLS | INP | FCP | TTFB | Samples | Status |
|---------|-----|-----|-----|-----|------|---------|--------|
| {project} | {avg ms} | {avg} | {avg ms} | {avg ms} | {avg ms} | {n} | good / needs-improvement / poor |

**Anomalies vs prior week:** {list any metric that degraded by >20% or crossed a threshold band}

**Errors logged this week:** {N total · X new · Y resolved · Z dismissed} — top categories: {list top 3}

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
