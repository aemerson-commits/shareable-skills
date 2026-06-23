---
name: handoff
description: "Write a disposable session-handoff doc to OS temp so a fresh session/agent can continue ONE in-flight task slice without re-deriving context. Triggers: 'hand this off', 'write a handoff', 'spin up a fresh session to continue X', or when context is getting large and you want a clean continuation. NOT for end-of-day notes (use /session-notes) or cross-session promises (use your memory/notes file)."
---

# Handoff

Produce a single **disposable** handoff document in the OS temp directory that lets a fresh agent or session pick up exactly one in-flight task slice and keep going. Pattern credit: Matt Pocock's "write the handoff, then start clean."

This is **not** `/session-notes` (durable, end-of-day) and **not** your memory/notes file (long-lived deferred items). A handoff is throwaway: it captures live, in-the-weeds state for an immediate continuation and is deleted/ignored once consumed.

## When to use

- Context is growing large and you want to start a clean session that continues the same task.
- You're deliberately dispatching a fresh agent to carry one slice forward.
- You're stopping mid-task and a different machine/session will resume soon.

## Required: a focus

A handoff covers **one task slice**, not the whole session. If the user hasn't named the slice, ask: *"What single task should this handoff cover?"* Do not dump everything you've touched — a handoff that tries to cover three threads is useless to the next agent.

## Principles

1. **Pointers, not duplication.** The next agent has the repo and git. Give *coordinates*: `path/to/file.js:120-148`, commit SHAs, `docs/plans/<plan>.md`, the relevant session note, the failing test name. Do not paste large code blocks or re-explain what a file already says.
2. **Redact secrets.** Never write a token/key/secret *value* into the handoff. Reference it by name and location (e.g. "`API_TOKEN` in root `.env`"). Your scratch/temp dir is less protected than the repo.
3. **Suggested skills.** List the skills the continuation will likely need (e.g. `/deploy`, `/test-scheduler`, `/pre-merge-review`) so the fresh agent doesn't rediscover them.
4. **State the exact next action.** End with the single concrete next step, not a menu. The next agent should be able to act on line one.
5. **Machine-agnostic.** Resolve the temp dir portably (below) — handoffs are written and read on different machines.

## Temp path resolution (machine-agnostic)

Write to the OS temp dir, never the repo or any permanent notes file:

```bash
# bash / git-bash
TMP="${TMPDIR:-${TEMP:-/tmp}}"
OUT="$TMP/handoff-$(date +%Y%m%d-%H%M%S).md"
```

```powershell
# PowerShell
$Out = Join-Path $env:TEMP ("handoff-{0}.md" -f (Get-Date -Format yyyyMMdd-HHmmss))
```

## Document template

```markdown
# Handoff — <task slice> — <YYYY-MM-DD HH:MM>

## Goal
<one sentence: what "done" looks like for THIS slice>

## State right now
- Branch: <branch> @ <short-sha> (pushed? ahead of origin?)
- <what's working / what's half-built — 2-4 bullets, pointers only>

## Coordinates
- <file path:line> — <why it matters>
- Plan: <docs/plans/...>  |  Session note: <your scratch/temp dir or notes file>
- Commits in play: <sha> <subject>

## Next action
<the single concrete next step>

## Verify
<how to confirm the slice is done — exact command / URL / test>

## Suggested skills
</deploy, /test-scheduler, ...>

## Watch out for
<the one or two gotchas that will bite the next agent — link any relevant feedback/notes files>
```

## Closeout

After writing, report the absolute path and a 2-line summary to the user. Do **not** commit it, add it to any permanent notes, or write it into memory — it's disposable. If the continuation happens in this same session, just read it back when resuming.
