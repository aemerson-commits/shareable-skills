---
name: start-day
description: "Morning startup: git pull, session notes review, alerts check, ideas triage, and daily briefing"
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

Run as many steps in parallel as possible. Steps 1-4 are fully independent — launch them all at once. Step 5 depends on reading results. Step 6 is the final briefing.

### Step 1 — Git Pull (parallel)

```bash
git pull
```

Note the files changed and summarize what came in (new features, fixes, docs, etc.).

### Step 2 — Re-index (background, parallel)

Run any project-specific re-indexing in background — don't wait for it.

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
**Ideas inbox**: X items / clear
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
