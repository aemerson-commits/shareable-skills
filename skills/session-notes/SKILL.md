---
name: session-notes
description: "End-of-session Obsidian notes (MANDATORY at close). Triggers: 'close out', 'wrap up', 'done for the day'. NOT for reading past notes."
user-invocable: true
---

# Session Notes — Obsidian Vault Update

**MANDATORY** at the end of every session when the user says they're done.

## Obsidian CLI

**Auto-detect**: Set `OBS` var based on which Obsidian binary exists on the system:
```bash
OBS="/c/Program Files/Obsidian/Obsidian.exe"
[ ! -f "$OBS" ] && OBS="/c/Users/$USER/AppData/Local/Programs/obsidian/Obsidian.exe"
```

**Always use Obsidian CLI** for vault operations.

All CLI commands output to stderr — always append `2>&1` and filter startup noise:
```bash
"$OBS" <command> [args] 2>&1 | grep -v "Loading\|out of date"
```

| Directory | Content |
|-----------|---------|
| `{{project}}/Sessions/` | Daily session notes |
| `{{project}}/{ViewName}/` | View/tab documentation |
| `{{project}}/Learnings/` | Debugging patterns, API gotchas, architecture decisions |
| `{{project}}/Roadmap.md` | Backlog and completed items |

## Steps

### Agent Teams Architecture

When closing out a session, dispatch these agent teams simultaneously after the End-of-Session Review completes (all model: "opus"):

**Team A — Obsidian Vault Updates** (3 parallel agents):
- **Agent: Session Note Writer** — Create/update today's session note (Step 1). Needs: session summary, commits, files changed
- **Agent: Vault Docs Updater** — Update view docs + Roadmap + Learnings (Steps 2-4). Needs: list of changed components, new learnings, roadmap items
- **Agent: Help Content Updater** — Update in-app help content files if UI changed (Step 5). Needs: list of UI-visible changes. Skip if no UI changes.

**Team B — Memory & Tracking** (2 parallel agents):
- **Agent: Memory Updater** — Update memory/MEMORY.md and topic-specific memory files (Step 6). Needs: key decisions, state changes, new patterns
- **Agent: Skill Tracker** — Update skill-usage.json with session's skill invocations (Step 7). Needs: list of skills used + outcomes

**Sequential prerequisite**: The End-of-Session Review (git commit, deploy, verify) MUST complete before dispatching teams. Notes must reflect final state, not in-progress state.

### 1. Create/Update Today's Session Note

File: `{{project}}/Sessions/{YYYY-MM-DD}.md`

**Check if today's note exists:**
```bash
"$OBS" read path="{{project}}/Sessions/{YYYY-MM-DD}.md" 2>&1 | grep -v "Loading\|out of date"
```

**Create new session note** (if none exists today):
```bash
"$OBS" create path="{{project}}/Sessions/{YYYY-MM-DD}.md" content="---\ntype: session\ndate: {YYYY-MM-DD}\nfocus: [topic1, topic2]\nkeywords: [keyword1, keyword2, keyword3]\ncommits: []\n---\n\n# Session — {YYYY-MM-DD}\n\n## Focus\n\n> {one-line goal}\n\n## Completed\n\n- [x] {item}\n\n## Key Decisions\n\n> {decision with rationale}\n\n## Learnings\n\n> {patterns discovered}\n\n## Left Off\n\n> {state and next steps}\n\n## Files Changed\n\n| File | Change |\n|------|--------|\n\n## Commits\n\n\`\`\`\n{hash} {message}\n\`\`\`" 2>&1 | grep -v "Loading\|out of date"
```

**Append additional session** (if note already exists for today):
```bash
"$OBS" append path="{{project}}/Sessions/{YYYY-MM-DD}.md" content="\n---\n\n## Session 2 — {topic}\n\n### What Was Done\n..." 2>&1 | grep -v "Loading\|out of date"
```

**Set frontmatter properties** (after creating/updating):
```bash
"$OBS" property:set name="commits" value="[abc1234, def5678]" path="{{project}}/Sessions/{YYYY-MM-DD}.md" 2>&1 | grep -v "Loading\|out of date"
"$OBS" property:set name="keywords" value="[timer, cache, deploy, bug-fix]" path="{{project}}/Sessions/{YYYY-MM-DD}.md" 2>&1 | grep -v "Loading\|out of date"
```

**Keywords**: Add 3-8 retrieval keywords per session — terms someone would search for later.
Include: technologies used, problem types solved, components touched, concepts discussed.
Good: `[timer-system, cache-persistence, react-hooks, dashboard]`
Bad: `[coding, work, stuff]`

### 2. Update View/Component Docs (if changed)

Only update if the component was modified this session. Use `append` for additions:
```bash
"$OBS" append path="{{project}}/{ViewName}/{ViewName}.md" content="\n## {Date} — {Change}" 2>&1 | grep -v "Loading\|out of date"
```

### 3. Update Roadmap (if backlog changed)

File: `{{project}}/Roadmap.md`

```bash
"$OBS" task path="{{project}}/Roadmap.md" line={N} done 2>&1 | grep -v "Loading\|out of date"
"$OBS" tasks todo path="{{project}}/Roadmap.md" verbose 2>&1 | grep -v "Loading\|out of date"
"$OBS" append path="{{project}}/Roadmap.md" content="\n- [ ] {new item}" 2>&1 | grep -v "Loading\|out of date"
```

### 4. Update Learnings (if new patterns/gotchas)

Directory: `{{project}}/Learnings/`

```bash
"$OBS" outline path="{{project}}/Learnings/Gotchas.md" 2>&1 | grep -v "Loading\|out of date"
"$OBS" search query="{topic}" path="{{project}}/Learnings" 2>&1 | grep -v "Loading\|out of date"
"$OBS" append path="{{project}}/Learnings/Gotchas.md" content="\n### {Title}\n{content}" 2>&1 | grep -v "Loading\|out of date"
```

### 5. Update Help Content (if features changed)

If any user-facing features were added/changed/removed, update the in-app help documentation files. Skip if only backend/API changes with no UI-visible behavior change.

### 6. Update Memory Files

- `memory/MEMORY.md` — update task statuses, add new patterns (use Edit tool — this is in the repo, not the vault)
- Create topic-specific memory files as needed

### 7. Update Skill Usage Tracker

Record each skill invoked during the session: skill name, count, outcome (success/partial/failed), and notes.

## Session Learning Protocol (EVERY SESSION)

1. **Start**: Check `memory/` files for relevant past learnings
2. **During**: Document new insights immediately (don't batch to end)
3. **Update** when discovering:
   - New debugging pattern → troubleshooting docs
   - New gotcha → Known Gotchas
   - Completed task → update MEMORY.md
   - Outdated skill → update the skill
4. **Never repeat** a mistake that's already documented in memory

## End-of-Session Review (before writing notes)

When the user says they're done:

1. **Review & suggest improvements** in: structure, docs, security, skills, efficiency, future ideas
2. Present suggestions to user for approval
3. Implement approved changes
4. **Git commit and push**
5. **Deploy if needed**
6. **Verify deploy** — curl live endpoints, check CI, confirm HTTP 200
7. **THEN** proceed with Obsidian session notes — notes must reflect final state

## Important

- **Prefer Obsidian CLI** for vault operations (create, append, read, tasks, search)
- Use Edit tool only for repo-local files (memory/, CLAUDE.md)
- Keep notes concise and actionable
- Always include "Left Off" so the next session can resume quickly
- Use frontmatter (`property:set`) to tag sessions for later querying
