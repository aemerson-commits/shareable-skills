---
name: session-notes
description: "End-of-session notes. Two modes — cheap `checkpoint` for mid-day, full close-out at true end of day. Triggers: 'close out', 'wrap up', 'done for the day', 'checkpoint'. NOT for reading past notes."
---

# Session Notes — Obsidian Vault Update

## Obsidian CLI

**Auto-detect**: Set `OBS` var based on which binary exists:
```bash
OBS="/c/Program Files/Obsidian/Obsidian.exe"
[ ! -f "$OBS" ] && OBS="/c/Users/${USERNAME:-$USER}/AppData/Local/Programs/obsidian/Obsidian.exe"
```

⚠️ **`$USER` is EMPTY in the Bash tool on Windows** — `$USERNAME` carries it. A bare `$USER`
silently builds `/c/Users//AppData/...`, which fails the `[ -f ]` test and reads as "the binary
isn't installed" rather than as a broken path. Always `${USERNAME:-$USER}`.

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

## Pick the mode first — this is the whole cost story

If this skill runs several times a day, most of those runs are mid-day checkpoints paying for
a full close-out they don't need — every Roadmap edit, every project note, the gotcha routing,
the help-content pass. That's the cost, and it's nearly all waste unless the day is actually
ending.

| | **Checkpoint** | **Full close-out** |
|---|---|---|
| When | Default. Any request that isn't an explicit ask for a full close-out. | Only when the user says so in words. |
| Does | Appends to today's note. Nothing else. | Everything below. |
| Costs | One append. | The full checklist. |
| Say | "Checkpointed — full close-out on request." | Full report. |

**Checkpoint is the default, and the only mode you may pick on your own.** Run the full
close-out only when the user explicitly asks for one — "full close-out", "close out the day",
"run the whole checklist." Nothing else licenses it:

- A bare "session notes" / "wrap up" / "checkpoint" → **checkpoint**.
- A second or third "session notes" the same day → still **checkpoint**. Repetition is not
  escalation.
- The clock, the hour, or a sense the day looks over → **not a signal**. You cannot see when
  the user is actually done.
- **A feature shipping today does not upgrade the mode.** It means the day still owes one full
  close-out *when the user calls for it* — see § Relationship to the Feature-Ship Checklist.
  Don't pre-emptively spend the checklist on the user's behalf.

Don't ask which mode to use — just checkpoint, and say the full close-out is available on
request. Treating ambiguity as a reason to ask is itself the failure mode: it turns an
unambiguous cheap default into a prompt, and a repeated "session notes" ends up misread as an
escalation it never was.

---

## Mode A — Checkpoint

Append one compact block to today's session note. **Do not** touch Roadmap, project
frontmatter, memory, help content, or the skill tracker.

```bash
"$OBS" append path="{{project}}/Sessions/{YYYY-MM-DD}.md" content="\n### {HH:MM} — {topic}\n\n- {what landed}\n- Left off: {state}\n" 2>&1 | grep -v "Loading\|out of date"
```

Write any `Learnings` bullets in the routed shape now (see § Session Learning Protocol) so an
end-of-day ingest — yours or a script's — can pick them up. That's what makes checkpointing
safe to keep cheap: the raw material for the full close-out is already captured as you go.

Then stop. Report one line. This is a complete, correct outcome — not a partial close-out.

---

## Mode B — Full close-out

### Before any shared-doc edit: scan for conflict markers

A memory index, a working-state note, session notes, or a roadmap can be written by several
sessions or processes at once — including an auto-sync plugin, if your vault uses one. A file
can be sitting in an unresolved merge, and an edit against it either fails to match the
expected text or writes around the markers and silently corrupts the file.

```bash
grep -c '<<<<<<<' "$FILE"      # 0 = safe to edit
```

Non-zero: resolve before editing — don't edit around it.

```bash
git -C "$(dirname "$FILE")" diff :2:"$FILE" :3:"$FILE"   # ours vs theirs
# pick a side or merge by hand, then: git add "$FILE"
```

If the merge/rebase that produced the markers is still in progress and the content is
recoverable from the remote, aborting and resetting to the remote's copy is often the faster
exit than resolving by hand. A pull-rebase-then-append helper, if you have one, prevents *new*
conflicts — it doesn't detect existing ones. Run the grep even when using it.

### Step 0 — Final state first (blocking prerequisite)

Notes must reflect final state, not in-progress state. Before anything below:

1. **Review & suggest improvements** in structure/architecture, documentation, security,
   skills & methods, efficiency/performance, and future ideas from the session's work.
2. Present suggestions for approval; implement what's approved.
3. **Git commit and push.**
4. **Deploy if needed.**
5. **Verify the deploy** — curl live endpoints, check CI, confirm a healthy status. Only report
   "deployed and verified" once you've actually checked.
6. **THEN** write the notes below — they must describe what actually landed, not what you
   intend to land.

This skill IS the Feature-Ship Checklist. The Roadmap, help-content, and memory artifacts
below are the same items the checklist mandates land in the same session as the feature
commit, alongside the session note itself. If a feature shipped today, all of them complete
before the session closes — skipping any creates the silent-drift pattern the checklist exists
to prevent.

### Agent Teams Architecture

When running a full close-out, dispatch these agent teams simultaneously after Step 0
completes (all model: "sonnet" — doc-writing agents don't need a stronger model):

**Team A — Vault Updates** (3 parallel agents):
- **Agent: Session Note Writer** — Create/update today's session note. Needs: session
  summary, commits, files changed.
- **Agent: Roadmap + Learnings Updater** — Read session notes from today, then update the
  Roadmap: mark completed items, update active project statuses, add new completed milestone
  sections with dates. Also update Learnings/ if new gotchas were discovered.
- **Agent: Help Content Updater** — Update in-app help content if ANY user-facing feature was
  added/changed this session. ALWAYS run this agent — it determines internally whether changes
  are needed.

**Team B — Memory & Tracking** (2 parallel agents):
- **Agent: Memory Updater** — Update `memory/MEMORY.md` and topic-specific memory files.
  Needs: key decisions, state changes, new patterns.
- **Agent: Skill Tracker** — Update the skill-usage tracker with this session's skill
  invocations. Needs: list of skills used + outcomes.

**MANDATORY agents**: Session Note Writer, Roadmap Updater, Memory Updater, and Help Content
Updater MUST always be dispatched. Skill Tracker is optional if no skills were invoked.

**If the Agent tool is unavailable, run every step INLINE in the main loop — this is NOT a
blocked close-out.** Some sessions run under a configuration that forbids subagents unless the
user explicitly asks for them. When that is in force, dispatching is not an option and the
close-out must still happen: work the artifact steps yourself, in order, in the main loop.
**The mandatory list above is a list of OUTPUTS, not a list of subagents** — session note,
Roadmap, project status, memory, help content. What must not be skipped is the artifact; the
dispatch mechanism is an implementation detail.

Two practical notes when running inline:

- It is usually **cheaper**, not a degradation — the main loop already holds the session
  context each agent would have to be re-fed. Keep the same token discipline the agent prompts
  impose: targeted greps and line-ranged reads, never a whole-file read of a 1000+ line
  document.
- Log it as a **success** with a note that the harness blocked agents, **not** as "partial".
  Recording it as partial run after run is what makes an environment limitation look like a
  recurring skill failure.

**Incremental-append preference (token economy)**: if the session already appended milestones
to today's note as work landed (the cheap pattern — a one-line append per shipped item during
the day, i.e. Mode A run repeatedly through the day), close-out is a TRIM-and-organize of that
note, not a from-scratch reconstruction. Tell agents what already exists so they extend rather
than regenerate.

**Full artifact detail — session note template, Roadmap, project frontmatter, help content,
memory, skill tracker** → read `references/close-out-artifacts.md`. Load it only when actually
running Mode B; a checkpoint never needs it.

---

## Session Learning Protocol (EVERY SESSION)

1. **Start**: Check `memory/` files for relevant past learnings
2. **During**: Document new insights immediately (don't batch to end)
3. **Update** when discovering:
   - New debugging pattern → troubleshooting docs
   - New gotcha → Known Gotchas
   - Completed task → update MEMORY.md
   - Outdated skill → update the skill
4. **Never repeat** a mistake that's already documented in memory
5. **Route recurring friction, don't just note it.** A one-off self-critique in a prose session note is easy to write and easy to lose — nobody re-reads last month's notes looking for a pattern. If the same friction (a repeated mistake, a recurring workaround, a process gap) shows up more than once, capture it somewhere structured and append-only that you can query for "what keeps recurring and hasn't actually been fixed" — even a simple dated one-liner in a dedicated log is enough to turn a vague feeling ("this keeps happening") into a countable, promotable signal.

**Route by TYPE — a friction ledger is for PROCESS frictions, not engineering gotchas.**
This is the single thing that breaks such a ledger. One project's ledger blew past its
cap of 15 to 38 active items, and 24 of those had been seen exactly once — because every
technical lesson of the day was being written as a keyed entry and routed there. A
friction belongs in the ledger only if it is a **repeatable failure in how you work**: a
verification you skipped, a claim you made without checking, a tool you keep misusing.
Ask: *could this recur on a totally unrelated feature next week?*

| Lesson | Goes to |
|--------|---------|
| "a NUL byte makes grep report the file as binary" / "this query library refires per keystroke" / "SQLite compares ISO and space-formatted datetimes as strings" | your gotchas doc — **a fact about the system** |
| "I claimed deployed without checking" / "I piped a verifier and lost its exit code" / "I resurfaced a memory as current without re-verifying" | the friction ledger — **a fact about your process** |

A one-off technical bug fixed in the same session has already closed its loop; putting it
in the ledger just drowns the recurring items the ledger exists to surface. When in doubt,
write it as a gotcha — a real process friction will recur and get a second chance.

6. **If ingestion is automated, make it FAIL-CLOSED on an explicit key.** A parser that
   slugifies free prose will manufacture junk (one version invented ~19 keys from the first
   six words of arbitrary bullets). Require a recognized heading AND a leading backticked
   slug, and deliberately skip anything else:

   ```markdown
   ## Learnings

   - `stale-cached-response-reads-as-failed-deploy` — preview served pre-deploy output, read as a failed deploy
   ```

   The corollary is a *writing* obligation: **write the learnings you want routed in that
   shape as you write the note.** Otherwise ingest legitimately finds nothing and the
   session's frictions evaporate — the exact failure the step exists to prevent. This is also
   why a checkpoint should write learnings in the routed shape immediately (Mode A above),
   rather than deferring them to a from-memory reconstruction at full close-out.

**Architecture decisions**: Prioritize critical thinking and scalable architecture over speed. Ask high-level questions to build a framework. When a function/feature has changed scope, point it out and ask if the architecture should change.

## Relationship to the Feature-Ship Checklist

The full close-out **is** the Feature-Ship Checklist. Session note, Roadmap, project status,
memory, and help content are the same items the checklist mandates land in the same session as
the feature commit. If a feature shipped today, they complete before the day closes — skipping
any creates the silent drift the checklist exists to prevent.

A **checkpoint does not discharge the checklist.** If a feature shipped, the day still needs
one full close-out — **but the user calls for it, not you.** Surface the debt in one line —
"a feature shipped today, so the day still owes a full close-out when you want it" — and leave
the timing to them.

## Important

- **Prefer Obsidian CLI** for vault operations (create, append, read, tasks, search)
- Use Edit tool only for repo-local files (memory/, CLAUDE.md) and for frontmatter — some
  Obsidian versions silently no-op a CLI `property:set` against externally-written files; if
  that bites you, edit the YAML block directly instead
- Keep notes concise and actionable
- Always include "Left Off" so the next session can resume quickly
- A day that ends on checkpoints alone leaves the Feature-Ship artifacts behind for work that
  already shipped — if your vault has a project-status view, spot-check the next morning
  whether yesterday actually got a full close-out, not just a note
- **If you script any part of the close-out, have the script itself write the "this day is
  closed" marker, not a manual edit at the end of the checklist.** A hand-written last step can
  be silently skipped with no trace — the artifacts it was meant to certify (Roadmap, memory,
  etc.) can all exist while the marker never gets written, and the next morning's check then
  reports a close-out as still owed when it already happened. A script-written marker can
  instead refuse itself and say which earlier step failed, which is the only way "the checklist
  ran" stays a claim you can trust rather than one you hope is true.
