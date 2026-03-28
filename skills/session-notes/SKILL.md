---
name: session-notes
description: "End-of-session Obsidian notes (MANDATORY at close). Triggers: 'close out', 'wrap up', 'done for the day'. NOT for reading past notes."
user-invocable: true
---

# Session Notes — Obsidian Vault Update

**MANDATORY** at the end of every session when the user says they're done.

## Obsidian CLI

Auto-detect Obsidian binary location:
```bash
OBS=""
for p in "/c/Program Files/Obsidian/Obsidian.exe" \
         "/c/Users/$USERNAME/AppData/Local/Programs/obsidian/Obsidian.exe" \
         "/Applications/Obsidian.app/Contents/MacOS/Obsidian" \
         "$(which obsidian 2>/dev/null)"; do
  [ -f "$p" ] && OBS="$p" && break
done
[ -z "$OBS" ] && echo "Obsidian not found — install or set OBS manually"
```

**Active vault**: `{{vault_name}}`

**Always use Obsidian CLI** for vault operations + `obsidian-markdown` skill for syntax reference.

All CLI commands output to stderr — always append `2>&1` and filter startup noise:
```bash
"$OBS" <command> [args] 2>&1 | grep -v "Loading\|out of date"
```

| Directory | Content |
|-----------|---------|
| `{{project}}/Sessions/` | Daily session notes |
| `{{project}}/{ViewName}/` | View/tab-specific docs |
| `{{project}}/Learnings/` | Debugging patterns, API gotchas, architecture decisions |
| `{{project}}/Roadmap.md` | Backlog and completed items |

## Steps

### Agent Teams Architecture

When closing out a session, dispatch these agent teams simultaneously after the End-of-Session Review completes (all model: "opus"):

**Team A — Obsidian Vault Updates** (3 parallel agents):
- **Agent: Session Note Writer** — Create/update today's session note (Step 1). Needs: session summary, commits, files changed
- **Agent: Vault Docs Updater** — Update view/component docs + Roadmap + Learnings (Steps 2-4). Needs: list of changed components, new learnings, roadmap items
- **Agent: Help Content Updater** — Update in-app documentation if user-facing features changed (Step 5). Needs: list of UI-visible changes. Skip if no UI changes.

**Team B — Memory & Tracking** (2 parallel agents):
- **Agent: Memory Updater** — Update memory/MEMORY.md and topic-specific memory files (Step 6). Needs: key decisions, state changes, new patterns
- **Agent: Skill Tracker** — Update `.claude/skills/skill-usage.json` with session's skill invocations (Step 7). Needs: list of skills used + outcomes

**Sequential prerequisite**: The End-of-Session Review (git commit, deploy, verify) MUST complete before dispatching teams. Notes must reflect final state, not in-progress state.

Each agent should use the Obsidian CLI auto-detect pattern documented above. All vault agents use `2>&1 | grep -v "Loading\|out of date"` on every CLI call.

### 1. Create/Update Today's Session Note

File: `{{project}}/Sessions/{YYYY-MM-DD}.md`

**Check if today's note exists:**
```bash
"$OBS" daily:path 2>&1 | grep -v "Loading\|out of date"
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
"$OBS" property:set name="keywords" value="[timer, KV, deploy, bug-fix]" path="{{project}}/Sessions/{YYYY-MM-DD}.md" 2>&1 | grep -v "Loading\|out of date"
```

**Keywords**: Add 3-8 retrieval keywords per session — terms someone would search for later.
Include: technologies used, problem types solved, components touched, concepts discussed.
Good: `[timer-system, KV-persistence, react-hooks, shop-floor]`
Bad: `[coding, work, stuff]`

### 2. Update View/Component Docs (if changed)

Update docs for any views or components modified this session.

Only update if the component was modified this session. Use `append` for additions:
```bash
"$OBS" append path="{{project}}/{ViewName}/{ViewName}.md" content="\n## {Date} — {Change}" 2>&1 | grep -v "Loading\|out of date"
```

### 3. Update Roadmap (if backlog changed)

File: `{{project}}/Roadmap.md`

**Mark tasks complete via CLI:**
```bash
"$OBS" task path="{{project}}/Roadmap.md" line={N} done 2>&1 | grep -v "Loading\|out of date"
```

**List open roadmap tasks:**
```bash
"$OBS" tasks todo path="{{project}}/Roadmap.md" verbose 2>&1 | grep -v "Loading\|out of date"
```

**Append new backlog items:**
```bash
"$OBS" append path="{{project}}/Roadmap.md" content="\n- [ ] {new item}" 2>&1 | grep -v "Loading\|out of date"
```

### 4. Update Learnings (if new patterns/gotchas)

Directory: `{{project}}/Learnings/`

**Check existing headings before adding** (avoid duplicates):
```bash
"$OBS" outline path="{{project}}/Learnings/Gotchas.md" 2>&1 | grep -v "Loading\|out of date"
"$OBS" search query="{topic}" path="{{project}}/Learnings" 2>&1 | grep -v "Loading\|out of date"
```

**Append to existing file:**
```bash
"$OBS" append path="{{project}}/Learnings/Gotchas.md" content="\n### {Title}\n{content}" 2>&1 | grep -v "Loading\|out of date"
```

### 5. Update In-App Documentation (if features changed)

If any user-facing features, workflows, or UI were added/changed/removed this session, update the in-app help documentation.

**When to update**:
- New view/tab added — add a new top-level section
- New feature in existing view — add subsection or update existing subsection content
- Workflow changed (e.g., new button, renamed status, changed filter behavior) — update the relevant subsection
- Feature removed — remove the subsection (don't leave stale docs)

**How to update**:
1. Read the relevant help/documentation file to find the section to update
2. Use the Edit tool to modify the content in place
3. Keep the same style as existing documentation
4. Add appropriate keywords for discoverability

**Skip if**: Only backend/API changes, no UI-visible behavior change, or only CSS tweaks.

### 6. Update Memory Files

- `memory/MEMORY.md` — update task statuses, add new patterns (use Edit tool — this is in the repo, not the vault)
- Create topic-specific memory files as needed (e.g., `memory/debugging.md`)

### 7. Update Skill Usage Tracker

Append this session's skill usage to `.claude/skills/skill-usage.json`.

For each skill invoked during the session, record:
- `skill`: skill name
- `count`: how many times it was invoked
- `outcome`: "success", "partial" (some steps skipped), or "failed"
- `notes`: brief note on what happened (especially issues or corrections)

Also update the `aggregate.skill_frequency` counts and `aggregate.total_sessions_tracked`.

If a skill was relevant but NOT invoked (e.g., should have used `/research-gate` but didn't), log it in `skills_not_invoked_but_relevant`.

**Trigger `/skill-audit`** if any of these are true:
- 5+ skills were modified this session
- It's been 14+ days since `aggregate.last_audit`
- A skill failed or produced incorrect output

## Session Learning Protocol (EVERY SESSION)

1. **Start**: Check `memory/` files for relevant past learnings
2. **During**: Document new insights immediately (don't batch to end)
3. **Update** when discovering:
   - New debugging pattern — `/troubleshooting` skill
   - New gotcha — CLAUDE.md Known Gotchas
   - Completed task — update MEMORY.md
   - Outdated skill — update the skill
4. **Never repeat** a mistake that's already documented in memory

**Architecture decisions**: Prioritize critical thinking and scalable architecture over speed. Ask high-level questions to build a framework. When a function/feature has changed scope, point it out and ask if the architecture should change.

## End-of-Session Review (before writing notes)

When the user says they're "closing up", "done for the day/night", or similar:

1. **Review & suggest improvements** in:
   - Structure & architecture (component organization, shared utilities)
   - Documentation (CLAUDE.md, skills, memory files - condense/update)
   - Security (secrets exposure, input validation, CSP headers, rate limiting)
   - Skills & methods (new skills needed, existing skills outdated)
   - Efficiency & performance (caching, bundle size, parallel operations)
   - Future development ideas based on current session's work
2. Present suggestions to user for approval
3. Implement approved changes
4. **Git commit and push** to dev
5. **Deploy if needed** (build, deploy, verify — per project conventions)
6. **Verify deploy** — curl live endpoints, check CI, confirm HTTP 200. Report "deployed and verified"
7. **THEN** proceed with Obsidian session notes (steps 1-6 above) — notes must reflect final state, not in-progress state

## Important

- **Prefer Obsidian CLI** for vault operations (create, append, read, tasks, search)
- Use Edit tool only for repo-local files (memory/, CLAUDE.md)
- Keep notes concise and actionable
- Always include "Left Off" so the next session can resume quickly
- Use frontmatter (`property:set`) to tag sessions for later querying
