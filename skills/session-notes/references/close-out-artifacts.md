<!-- Loaded only when running a FULL close-out (Mode B) — never for a checkpoint. See SKILL.md. -->

## Artifacts

### 1. Create/Update Today's Session Note

File: `{{project}}/Sessions/{YYYY-MM-DD}.md`

**Check if today's note exists:**
```bash
"$OBS" read path="{{project}}/Sessions/{YYYY-MM-DD}.md" 2>&1 | grep -v "Loading\|out of date"
```

**Create new session note** (if none exists today):
```bash
"$OBS" create path="{{project}}/Sessions/{YYYY-MM-DD}.md" content="---\ntype: session\ndate: {YYYY-MM-DD}\nfocus: [topic1, topic2]\nkeywords: [keyword1, keyword2, keyword3]\ncommits: []\n---\n\n# Session — {YYYY-MM-DD}\n\n## Focus\n\n> {one-line goal}\n\n## Completed\n\n- [x] {item}\n\n## Key Decisions\n\n> {decision with rationale}\n\n## Learnings\n\n- \`keyed-slug\` — {what recurred}\n\n## Left Off\n\n> {state and next steps}\n\n## Files Changed\n\n| File | Change |\n|------|--------|\n\n## Commits\n\n\`\`\`\n{hash} {message}\n\`\`\`" 2>&1 | grep -v "Loading\|out of date"
```

If the note already exists (checkpoints ran earlier today), **append a new `## Session N`
block — do not read the whole note back and regenerate it.** By evening it can be sizable;
re-reading it to "trim and organize" is one of the largest single reads of the day.

```bash
"$OBS" append path="{{project}}/Sessions/{YYYY-MM-DD}.md" content="\n---\n\n## Session 2 — {topic}\n\n### What Was Done\n..." 2>&1 | grep -v "Loading\|out of date"
```

**Set frontmatter properties** — Note: some Obsidian versions have a bug where `property:set`
silently no-ops on externally-written files (confirmed in Obsidian 1.12.7; exit 0, no output).
If this affects you, edit frontmatter directly with the Edit tool instead, **merging** with
existing values rather than overwriting:

```yaml
---
commits: [abc1234, def5678]            # append new SHA to existing array
keywords: [deploy, bug-fix, refactor]  # merge with existing list
---
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

### 3. Update Roadmap (MANDATORY every full close-out)

File: `{{project}}/Roadmap.md`

**Token economy**: do NOT read the full Roadmap.md if it is large. Grep for the section
headers and project names touched this session, then read ONLY those line ranges. Same rule
for MEMORY.md — the index is loaded in context already; never re-read the whole journal.

**Always do ALL of these:**
1. **Read the roadmap sections relevant to this session's work** (targeted grep + ranged reads) to understand current state
2. **Update "Current State" paragraph** date and add any new facts about the system
3. **Update "Active Projects" table** — change statuses for projects worked on this session
4. **Mark completed items** in Immediate Backlog and lower sections
5. **Add a "Completed — {date}" section** with all items finished this session (append before Long-Term Ideas)
6. **Add new backlog items** if any were discussed

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

**If you maintain a derived/materialized backlog or queue file** (e.g. a generated "what's
ready to work on" list), don't hand-edit that file — update its SOURCES (the roadmap item, the
todo, the project note) and regenerate it. A derived artifact that gets hand-edited drifts from
its sources the next time it regenerates, silently discarding the manual edit.

### 3a. Update Project Frontmatter (MANDATORY when a project shipped or changed status)

If your vault tracks individual projects as separate files, edit their frontmatter when status
changes. Use the Edit tool directly (`property:set` is broken in some Obsidian versions — see
§1):

```yaml
status: shipped          # active | blocked | shipped | paused — flip to shipped when the work is merged/live
shipped: 2024-01-15      # YYYY-MM-DD the status flipped to shipped (leave blank otherwise)
last_update: 2024-01-15  # always bump to today when touched
```

Only flip to `shipped` when the work is actually merged/live — leave genuinely in-flight
projects `active`/`blocked`/`paused`. If your project view derives its open/closed state from
a gate checklist rather than (or in addition to) this `status:` field, advance that checklist
too — fixing only the `status:` field can leave a gated note reading as still-open. An
**attended infra change with no code commit** (a deploy, a config flip, a secret rotation) is
still a state change worth advancing the gate/status for.

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

### 5. Update Help Content (MANDATORY — agent determines if changes needed)

The Help Content Updater agent MUST always be dispatched. It reads the session's completed
items and determines internally whether in-app help content needs updating. If no UI-facing
changes were made, the agent reports "no changes needed" and exits.

When user-facing features, workflows, or UI were added/changed/removed, update the in-app help
documentation files.

**Structure**: Each help content file exports an array of section objects:
```js
{ id, title, keywords, description, subsections: [{ id, title, keywords, searchText, content: JSX }] }
```

**When to update**:
- New view/tab added → add a new top-level section
- New feature in existing view → add subsection or update existing subsection content
- Workflow changed (e.g., new button, renamed status, changed filter behavior) → update the relevant subsection
- Feature removed → remove the subsection (don't leave stale docs)

**How to update**:
1. Read the relevant help content file to find the section/subsection to update
2. Use the Edit tool to modify the content JSX in place
3. Keep the same style: short paragraphs, use helper components, match existing tone
4. Add appropriate `keywords` and `searchText` for discoverability

**Skip if**: Only backend/API changes, no UI-visible behavior change, or only CSS tweaks.

### 6. Update Memory Files

`memory/MEMORY.md` (in the repo, not the vault — use the Edit tool):

- If the file is truncated past some size at session load, keep entries to one line and
  consolidate or archive stale ones before adding.
- **Strike stale lines in the same edit** that records the new state — including any
  frontmatter/summary line used for recall, since that's the highest-leverage place to get it
  wrong. Don't park a correction under a "(historical)" heading below the old claim; notes
  sediment, and a later read can land on the wrong stratum.
- **Write the conditional, not the dated assertion**, for anything a later merge or a
  concurrent session can flip: "on the feature branch, not yet merged — verify: `<check
  command>`" degrades gracefully; "shipped as of {date}" goes silently wrong the moment
  something else lands. A conditional never goes false; it just tells the reader how to check.
- **Verify landed-state claims before writing them.** For any new "pending" / "on a branch,
  not merged" / "shipped" claim naming a commit or PR, check it against source control in the
  same turn and record the verified state — never the remembered one. Same rule for the
  session note's "Left Off".
- Create topic-specific memory files as needed (e.g., `memory/debugging.md`).

### 7. Update Skill Usage Tracker

Append this session's skill usage to the skill-usage tracker file.

For each skill invoked during the session, record:
- `skill`: skill name
- `count`: how many times it was invoked
- `outcome`: "success", "partial" (some steps skipped), or "failed"
- `notes`: brief note on what happened (especially issues or corrections)

Also update the aggregate skill-frequency counts and total-sessions-tracked figure.

If a skill was relevant but NOT invoked (e.g., should have used a research-gate skill but
didn't), log it as a missed-opportunity note.

**Trigger a skill-health audit** if any of these are true:
- 5+ skills were modified this session
- It's been 14+ days since the last audit
- A skill failed or produced incorrect output
