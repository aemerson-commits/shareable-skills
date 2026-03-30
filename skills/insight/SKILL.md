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

**Also review:** `memory/MEMORY.md` (repo), CLAUDE.md RESUME section (repo), `{{project}}/Learnings/` (vault).

### 2. Generate Report

**Create the insight file via CLI:**

```bash
"$OBS" create path="{{project}}/Insights/{YYYY-MM-DD}.md" content="{report content}" 2>&1 | grep -v "Loading\|out of date"
```

**Set frontmatter:**

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
- Workers: {status}
- Open vault tasks: {count from tasks todo}
- Top tags: {from tags counts}

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
