---
name: start-day
description: "Morning startup: git pull, QMD update, session notes review, alerts check, ideas triage, and daily briefing"
user-invocable: true
---

# Start Day — Morning Session Startup

Run this at the start of every session when the user says "good morning", "let's start", or similar.

## Obsidian CLI

**Auto-detect**: Set `OBS` var based on which Obsidian binary exists:
```bash
OBS="/c/Program Files/Obsidian/Obsidian.exe"
[ ! -f "$OBS" ] && OBS="/c/Users/$USER/AppData/Local/Programs/obsidian/Obsidian.exe"
```

All CLI commands: append `2>&1 | grep -v "Loading\|out of date"`

## Execution

Run as many steps in parallel as possible. Steps 1-4 and Step 8 (Event Log check) are fully independent — launch them all at once. Step 5 depends on reading results. Step 9 (briefing) is the final synthesis.

### Step 1 — Git Pull (parallel)

```bash
git pull
```

Note the files changed and summarize what came in (new features, fixes, docs, etc.).

### Step 2 — Re-index (background, parallel)

Run any project-specific re-indexing in background — don't wait for it. For example:
```bash
npx qmd update && npx qmd embed  # if using qmd for semantic search
```

### Step 3 — Review Recent Session Notes (parallel, use Agent)

Read the last 2-3 session notes from `{{project}}/Sessions/` (glob for `*.md`, pick most recent by date). Summarize:
- What was worked on
- Any open items, blockers, or follow-ups
- "Left Off" state from last session

```bash
"$OBS" read path="{{project}}/Sessions/{YYYY-MM-DD}.md" 2>&1 | grep -v "Loading\|out of date"
```

Also check if yesterday's session note exists — if not, flag it (session notes may have been missed).

### Step 4 — Check Memory State (parallel, use Agent)

Read and summarize:
1. `memory/promises.md` — any unblocked deferred items?
2. `memory/working-state.md` — any crash buffer / interrupted work?
3. `memory/MEMORY.md` Active Alerts section — list all active warnings

If `promises.md` or `working-state.md` don't exist, that's fine — report clean state.

### Step 5 — Check Ideas Inbox

```bash
"$OBS" read path="Ideas.md" 2>&1 | grep -v "Loading\|out of date"
```

If there are ideas (anything beyond frontmatter + `# Ideas` header), report count and brief titles. Ask if user wants to run `/triage-ideas` to route them, or offer to do it inline.

If inbox is empty, report "Ideas inbox is clear."

### Step 6 — Scan Recent Learnings

Check for entries added in the last few days:
```bash
"$OBS" read path="{{project}}/Learnings/Gotchas.md" 2>&1 | grep -v "Loading\|out of date"
"$OBS" read path="{{project}}/Learnings/Architecture.md" 2>&1 | grep -v "Loading\|out of date"
```

Only mention if there are recent additions worth calling out (new gotchas relevant to likely work today).

### Step 7 — Verify Pending Items

Check any pending infrastructure items from MEMORY.md alerts. For example:
- Secrets that should be set
- Services that should be running
- Anything marked "Pending" in MEMORY.md Active Work sections

Report verified items and clear resolved alerts from MEMORY.md.

### Step 8 — Daily Event Log Review (if applicable)

If your project has a cross-dashboard event log for errors and duplicates, surface unresolved items now. For example, if using a D1 `event_log` table:

```bash
# Query the event log for recent unresolved errors
# (adapt to your project's error tracking setup)
npx wrangler d1 execute your-db --remote --command \
  "SELECT dashboard, category, contentSummary, createdAt FROM event_log WHERE eventType='error' AND status='new' ORDER BY createdAt DESC LIMIT 50" \
  --json
```

**Surface in briefing:**
- If no unresolved errors: report "Event Log: clear"
- If errors exist: report count + top 3-5 as one-liners: `relativeTime · source · category · summary[:80]`
  - Group clusters (e.g. "5 of 8 are api-error from the same view" → suggest `/troubleshooting`)
  - Flag items >7 days old as stale or backlogged
- **Window guard**: with a large limit the response can pull a long backlog. Detail-list only the recent window (last ~14 days) in the briefing; roll everything older into "+N older unresolved (>14d)" so a backlog of stale rows can't crowd out today's real issues.
- Don't auto-resolve — user reviews and marks Resolve / Acknowledge / Dismiss themselves

### Step 8.5 — Pipeline & Plan of Attack (if project tracking is set up)

If the project uses a gated project pipeline (e.g. Obsidian project notes with gate state), read the open notes and build three buckets:

1. **Blocked on you** — projects at a gate requiring a human decision (e.g. threat assessment, signoff) OR any unanswered open question. These are the "Questions for Me" — the things only you can unblock. List each with its one-line question/decision. Lead the plan with this bucket.
2. **Agent-ready (today's unattended queue)** — projects flagged as unattended-runnable with no unanswered questions, at an active gate (research, scope, build, verify, visual). These are what an overnight agent skill or `/advance-gate` can drive forward without you. Order by priority then value.
3. **Needs scoping** — open projects not yet ready for unattended work, stuck early (no plan written). Candidates for a self-refill research pass if the agent-ready queue is thin.

If an overnight agent run finished, surface what it produced — draft PRs to review, queued questions, the morning checklist — and fold its queued questions into bucket 1.

Keep it to the top few per bucket; the full board lives in whatever project-tracking view you use.

### Step 9 — Friday Wisdom Check

Check if today is Friday:
```bash
date +%u
```

If the result is `5` (Friday) and the `/wisdom` skill is installed, after presenting the briefing, ask:

> **It's Friday — run weekly `/wisdom`?** This will audit skill health, review evolve instincts, fold in the latest `/insights` usage signal, and propose knowledge improvements.
>
> Wisdom folds in your Claude Code **usage report** (friction patterns + suggested improvements), but it can only *read* a report you've already generated — it can't run `/insights` itself. For the freshest signal, **run `/insights` first**, then `/wisdom`. If you skip it, wisdom still runs and just notes "no usage signal folded in."

If the user says yes, invoke the `/wisdom` skill. Do NOT auto-run it — always ask first. If they haven't run `/insights` in the last ~7 days, gently remind them it'll sharpen the wisdom pass.

If `/wisdom` is not installed, skip this step silently.

## Output Format

Present a concise morning briefing:

```
Good morning! Here's your daily briefing:

**Git pull**: X files, summary of changes
**Last session (date)**: What was done, where we left off
**Crash buffer**: Clean / has active state (details)
**Active alerts**:
- alert 1
- alert 2
**Event Log**: clear / N new errors+duplicates needing review (top 3-5 listed if >0)
**Pipeline — blocked on you**: N — the questions/decisions only you can clear (top 3-5; "all clear" if none)
**Pipeline — agent-ready today**: N — the pre-scoped unattended queue (top 3-5 by priority), ready for overnight agent or /advance-gate
**Night shift (if ran)**: state, draft PRs to review, queued questions
**Ideas inbox**: X items / clear
**Skill health**: Last audit {date} — {pass/due for audit}. Top 3 used skills last 7 days: X, Y, Z
**Recent gotchas**: Any new entries worth noting
**Pending items**: Verified / needs attention

What are you working on today?
```

## Key Principles

- **Maximize parallelism**: Steps 1-4 should all launch simultaneously (use Agent tool for 3 and 4)
- **Background indexing**: Don't block on re-indexing — it can finish while briefing
- **Don't overwhelm**: Keep the briefing scannable. Details on request
- **Surface blockers first**: If there's interrupted work or critical alerts, lead with those
- **Ideas triage is optional**: Ask before running — user may want to defer
