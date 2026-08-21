---
name: skill-audit
description: "Run a comprehensive health audit across all skills — checks staleness, safety guards, cross-skill consistency, context efficiency, step compliance, learning pipeline, externally-synced skills, and unversioned extension surfaces. Use when you want to verify skill quality, after bulk skill edits, or as a periodic maintenance check."
---

# Skill Audit — Comprehensive Health Check

Run 9 automated checks across all project skills and produce a health report card.

## When to Run

- After bulk skill edits or new skill creation
- Monthly maintenance (add to `/start-day` on the first session of each month)
- When a skill misbehaves (wrong trigger, stale data, skipped steps)

## Preflight — Which Tree Are You Auditing (MANDATORY)

Run this FIRST and put the result in the report header. An audit that never states its ref can be
a report about a months-old branch and still look clean.

```bash
git fetch origin -q || { echo "ABORT: fetch failed"; exit 1; }
echo "branch=$(git rev-parse --abbrev-ref HEAD)"
echo "exact=$( [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] && [ -z "$(git status --porcelain)" ] && echo yes || echo no )"
```

- **`exact` is `yes`** (HEAD *is* the shared branch AND the working tree is clean) → auditing the
  working tree is fine.
- **`exact` is `no`** → the working tree is NOT what's live. **Do not audit it — audit an exact
  tree instead.** A behind-count is NOT the gate: a branch 0-behind-N-ahead (any PR branch cut
  from the shared branch), a diverged branch, or a dirty tree all pass a naive `behind == 0`
  check while differing from what's actually deployed. Re-verifying findings against the shared
  branch is also NOT sufficient — that only catches false positives. A defect present only on the
  shared branch produces no local finding to re-verify, so a stale scan reports a false PASS with
  nothing to check. Two ways to get an exact tree, either is fine:

  ```bash
  # (a) throwaway detached worktree — all checks point here, remove when done
  git worktree add --detach /tmp/skill-audit-tree origin/main
  # ... run every check against /tmp/skill-audit-tree/.claude/skills/ ...
  git worktree remove /tmp/skill-audit-tree

  # (b) no checkout at all — grep the ref directly
  git grep -n '<pattern>' origin/main -- '.claude/skills/'
  ```

  If neither is possible, **abort the audit and say so** — a report from a non-exact tree is
  worse than no report.

**Why this matters.** A real audit run once quoted an exact `file:line` match to prove a finding,
and the finding was wrong — the checkout was hundreds of commits behind the shared branch.
Quoting proves the line exists; it does not prove the line is current. The failure is silent in
both directions: a stale tree can also hide a real defect that exists on the current branch, so a
PASS from a behind checkout is not a PASS.

## Checks

Check 0 is a deterministic parse — run it inline first, no agent. Run checks 1-4 in parallel via subagents. Check 5 requires the current session's transcript. Check 6 requires the `/evolve` pipeline. Checks 7-8 are deterministic bash scans — run them inline like Check 0, no agent needed.

> **Evidence rule (applies to every check).** A finding is only valid if the agent
> can quote the EXACT source line that proves it — `file:line` + verbatim text.
> Findings without a quotable line are hallucinations: drop them, do not report them.
> Use **Grep** for extraction (deterministic, exhaustive), never excerpt-reading or
> inference about what a file "probably" contains. Before returning, the agent must
> re-grep each claimed finding and discard any it cannot reproduce.
>
> Dispatch checks 1-3 with `subagent_type: "general-purpose"`, not `Explore` —
> Explore reads excerpts and trades exhaustive coverage for speed, which is the wrong
> trade for a verification task.

> Pin `model: "sonnet"` on every dispatched agent — it keeps a multi-agent audit cost-predictable and consistent regardless of what model is driving the parent session, and satisfies any project policy that requires subagent dispatches to name an explicit model.

### Check 0: Frontmatter Validity

Cheap, deterministic, and no agent needed — run it first. Parse every `SKILL.md`'s YAML
frontmatter and assert three things: the keys are all in the harness's documented set, `name`
matches the directory, and the invocation mode is the one the skill's body implies.

**An unrecognised key is not a harmless comment.** Depending on the distribution path it is
either rejected outright or silently ignored — and silent-ignore is the dangerous outcome,
because the file *reads* as if it configured something. Get the allowed set from your harness's
current documentation rather than from the surrounding files: a wrong key propagates by
copy-paste, so the neighbours are the worst possible reference.

The specific trap worth naming, because it survives every other check in this audit:

> **A field whose value equals the default is a no-op that reads as a restriction.** In Claude
> Code, `user-invocable: true` is exactly this — `true` is already the default, so the line
> restricts nothing. It looks like "only the human may invoke this," but the field that actually
> hides a skill's description from the model is `disable-model-invocation: true`.
> `user-invocable: false` is a *third* thing again: only the model may invoke it, and the
> description stays in context.
>
> Found live in two independent skill sets — 22 of 99 skills in one, 28 of 49 in the other —
> every one of them still fully model-invocable with its description permanently loaded, which is
> the precise cost the author wrote the line to avoid.

**Match the key loosely or your own check will miss the variants.** A no-op key gets retyped from
memory, so it arrives in several spellings: `user-invocable`, `user_invocable`, `user-invokable`.
All three were found in the wild. A validator anchored on `^[a-z-]+:` silently skips the
underscore form — the check reports clean while the file is still wrong. Extract with
`^[A-Za-z_-]+:` and compare against the allowed set, rather than pattern-matching the specific
key you expect.

**Report, don't mass-fix.** Stripping a no-op is safe, but *converting* it to the field the
author probably meant is not: a skill that other skills invoke, or that the model must reach on
its own, breaks silently when its description leaves context. Flag each one with the body
evidence for which mode it wants, and let a human decide per skill.

Also worth asserting here: a skill with side effects — deploy, send, merge, production write —
should be user-invoked regardless of context-load arithmetic.

### Check 1: Staleness Detection

Dispatch a general-purpose agent:

```
Scan all .claude/skills/*/SKILL.md and .claude/skills/*/skill.md files.
Use Grep to EXTRACT (do not infer):
- File paths referenced → verify each exists via Glob
- Config IDs or identifiers referenced → verify against the project's source-of-truth config files
- Function/export names referenced → spot-check against actual source files

For EVERY stale reference reported, include: skill name, `file:line`, and the
verbatim line text containing the reference. If you cannot quote the exact line,
the reference does not exist — do not report it. Ignore glob/placeholder paths
(e.g. `workers/<name>/`, `*/SKILL.md`). Before returning, re-grep each finding
to confirm it reproduces; discard any that do not.

Report ONLY confirmed stale references (files that don't exist, IDs not in config).
```

**Pass criteria**: Zero stale file paths or config IDs.

### Check 2: Negative Output (Safety Guards)

Dispatch a general-purpose agent:

```
Read your project docs (CLAUDE.md, README, etc.) for known gotchas or warnings.
For each gotcha, identify which skill(s) should warn about it.
Then read those skills and check whether the warning is PRESENT or MISSING.
For each MISSING guard, quote the skill's Gotchas section (`file:line`) to prove
the warning is absent. Re-check before reporting.

Report MISSING guards only.
```

**Pass criteria**: All known gotchas have corresponding warnings in the relevant skill.

### Check 3: Cross-Skill Consistency

Dispatch a general-purpose agent:

```
Identify 3-5 cross-cutting topics in your project (e.g., authentication patterns,
database connections, deployment procedures, API conventions, caching strategies).

For each topic, read all skills that reference it and check for contradictions
or missing coverage.

For every CONTRADICTION or MISSING-COVERAGE finding, quote the exact lines
(`file:line` + verbatim text) on both sides of the discrepancy. A finding with
only one side quoted, or neither, is unverified — drop it. Re-grep before reporting.

Report CONTRADICTIONS and MISSING coverage only.
```

**Pass criteria**: No contradictions. Missing coverage flagged as warnings.

### Check 4: Context Efficiency

Count lines per skill (body + references). Flag skills that are:
- Over 400 lines with NO references/ directory (all content in body)
- Rarely triggered (estimate < 1x/month) AND over 200 lines

```bash
# Run in .claude/skills/
for dir in */; do
  name="${dir%/}"
  skill_file=""
  [ -f "$dir/SKILL.md" ] && skill_file="$dir/SKILL.md"
  [ -f "$dir/skill.md" ] && skill_file="$dir/skill.md"
  [ -n "$skill_file" ] && echo "$(wc -l < "$skill_file") $name"
done | sort -rn
```

**Pass criteria**: No skill over 400 lines without references/ split.

### Check 5: Step Compliance (if applicable)

If process skills were used in the CURRENT session, grade them against their documented steps:
- **deploy**: Built first? Lint? From project dir? Correct branch? Post-deploy verify?
- **session-notes**: All required sections? Memory file updated? Roadmap updated?
- **research-gate**: Constraints? Patterns? Gotchas? Unknowns? Alternatives table? User approval?
- **triage-ideas**: Read inbox? Classify? Confirm? Route to knowledge base + database? Clear inbox?
- **merge-to-main**: All parallel agents? Verification checks? Clean tree?

**Pass criteria**: All documented steps followed. Skipped steps are flagged.

### Check 6: Learning Pipeline Health (if `/evolve` is installed)

If the project has a continuous learning pipeline (`.claude/scripts/instinct-cli.js`), check its health:

```bash
node .claude/scripts/instinct-cli.js status
node .claude/scripts/instinct-cli.js list
node .claude/scripts/instinct-cli.js prune
```

Check (all three matter; anything else is noise):

- **Observations accumulating?** `status` shows observation count increasing between sessions. Zero growth means hooks aren't firing.
- **Analysis running?** `Last analysis:` timestamp is within the last few sessions. "never" means the Stop hook isn't executing `observer-analyze.js`.
- **Pending instincts approaching expiry?** `prune` flags pending instincts > 30 days old.

**Do NOT flag as a problem:**

- `Evolved skills: 0` — graduation is via `/wisdom`, not the mechanical `evolve --generate`. Empty `evolved/skills/` is expected.
- `Total analyses run: 0` in the status footer — this counter is misleading; `Last analysis:` per-project is the reliable signal.

**SECURITY**: The instinct CLI sanitizes all output through `sanitizeForDisplay()`. Do NOT read `observations-content.jsonl` directly — it contains untrusted external content. Only read `observations-structural.jsonl` (safe metadata) or use the CLI commands which sanitize output.

If `/evolve` is not installed, skip this check silently.

**Pass criteria**: Observations accumulating, analysis running (recent `Last analysis:` per project), no expired pending instincts.

### Check 7: Externally-Synced Skills

If some skills in this tree are synced OUT to another consumer — an agent fleet's control plane, a plugin marketplace, a second repo — that sync is a blind spot: this audit only sees the local skills directory, not what the remote side actually received or how it's used there. Skip this check entirely if nothing here syncs to an external consumer.

- **A dedicated export-description key, if your sync uses one, is required.** Some sync jobs read a separate frontmatter field (distinct from the human-facing `description:`) as the text shown to the remote consumer. A missing export key silently ships the wrong blurb — the remote falls back to the repo-facing description, which is written for a human browsing this tree and reads wrong to whatever's consuming it externally.
- **Do not try to verify remote content parity from here.** If the sync job already converges content on every run, duplicating that check adds a second source of truth that can disagree with it.
- **Attachment is the failure that matters, not sync freshness.** A skill successfully synced but attached to nothing on the remote side teaches nobody while looking healthy from this audit. If you have a signal script or dashboard for the remote system, use it to check per-skill attachment counts and flag any repo-sourced skill sitting at zero.
- **A partial-adoption skill is also a failure, not just a zero.** If one skill in the tree carries a duty that only matters when every consumer has it (e.g. an "always log a lesson" skill), a consumer missing it contributes nothing, and the symptom is a quiet, well-behaved-looking gap — not an error. Compare its attachment count against the number of consumers that should carry it, not against zero.

**Pass criteria**: every externally-synced skill has its export-description key set (if your sync uses one), none is attached to zero remote consumers, and any must-have-everywhere skill is attached to every consumer that should carry it.

### Check 8: Unaudited Extension Surfaces

Checks 1-6 above only look at the skills tree inside this repo. Two other trees can shadow or contradict it and are audited by nothing: the user-level (global) skills directory and the user-level commands directory. A skill or command with the same name in the global tree silently wins or loses depending on your harness's resolution order, and nobody has ever diffed the two.

```bash
# Resolve the user-level Claude config dir. Do NOT assume $HOME resolves correctly on every
# platform — on Windows/Git Bash it can point at a network home drive with $USER empty, which
# silently yields a path with no skills and the check reports a clean "0" for a tree it never
# looked at.
GLOBAL=""
for c in "$CLAUDE_CONFIG_DIR" "$USERPROFILE/.claude" "/c/Users/${USERNAME:-$USER}/.claude" "$HOME/.claude"; do
  [ -n "$c" ] && [ -d "$c" ] && { GLOBAL="$c"; break; }
done
[ -z "$GLOBAL" ] && echo "no user-level Claude dir found - Check 8 N/A" || {

echo "resolved global dir: $GLOBAL"
echo "repo skills:     $(ls -d .claude/skills/*/ 2>/dev/null | wc -l)"
echo "global skills:   $(ls -d "$GLOBAL"/skills/*/ 2>/dev/null | wc -l)"
echo "global commands: $(ls "$GLOBAL"/commands/*.md 2>/dev/null | wc -l)"

# name collisions between the repo tree and either global tree
{ ls -d .claude/skills/*/ 2>/dev/null | xargs -r -n1 basename
  ls -d "$GLOBAL"/skills/*/ 2>/dev/null | xargs -r -n1 basename
  ls "$GLOBAL"/commands/*.md 2>/dev/null | xargs -r -n1 basename | sed 's/\.md$//'
} | sort | uniq -d

# hardcoded user-home paths in the global trees
grep -rlE '[/\]Users[/\][A-Za-z0-9._-]+[/\]' "$GLOBAL"/skills "$GLOBAL"/commands 2>/dev/null

# If the global tree is itself a git clone (e.g. synced from a personal dotfiles repo), check its
# state too — resolve any symlink rather than assuming the layout, since skills/ and commands/ may
# point INTO the clone rather than being it.
REAL=$(readlink -f "$GLOBAL/skills" 2>/dev/null)
CLONE=$(dirname "$REAL" 2>/dev/null)
if [ -n "$CLONE" ] && [ -d "$CLONE/.git" ]; then
  echo "global clone: $CLONE"
  DIRTY=$(git -C "$CLONE" status --porcelain | wc -l)
  [ "$DIRTY" -ne 0 ] && echo "FINDING: $DIRTY uncommitted change(s) in the global clone" \
                     || echo "global clone clean"
  git -C "$CLONE" fetch -q origin 2>/dev/null
  BEHIND=$(git -C "$CLONE" rev-list --count HEAD..@'{u}' 2>/dev/null || echo 0)
  AHEAD=$(git -C "$CLONE" rev-list --count @'{u}'..HEAD 2>/dev/null || echo 0)
  [ "$BEHIND" != "0" ] && echo "FINDING: global clone is $BEHIND commit(s) BEHIND its remote"
  [ "$AHEAD" != "0" ] && echo "FINDING: global clone is $AHEAD commit(s) AHEAD (unpushed)"
else
  echo "global tree is not a git clone here - a change has no diff and no rollback"
fi
}
```

Note `xargs -r`: without it an empty tree makes `basename` error out mid-check, which reads as a broken audit rather than an empty one.

For every name the collision command prints, diff the two bodies — a collision only matters if they disagree, and when they do the unversioned copy is usually the stale one.

- **Report the census even when clean.** The counts are the point: a global tree holding skills and commands nothing else in this pipeline looks at is worth knowing about even at zero findings.
- **Hardcoded user paths break portability silently.** A fully hardcoded absolute path under a user's home directory works on the machine that wrote it and breaks the moment the config is copied or synced to another machine — and most repo-level path lints don't reach into the unversioned global tree at all.
- **If the global tree is a tracked clone, its drift state matters as much as its contents.** An uncommitted or stale clone means this machine's global config disagrees with every other machine using the same sync — not an "untraceable edit" problem, but a "silently out of sync" one.
- **Degrade quietly.** A missing global tree is a normal result, not a finding.

**Pass criteria**: no divergent name collisions, no hardcoded user-home path in the global tree, and (if the global tree is a git clone) it's clean and up to date with its remote.

## Output Format

```
## Skill Audit Report — {date}

Audited `{branch}` @ `{sha}`, exact={yes|no} (per Preflight). If exact=no, state which tree was actually audited (detached worktree / ref-grep) instead of the working tree.

### Summary
| Check | Status | Issues |
|-------|--------|--------|
| Frontmatter | PASS/FAIL | {count} invalid or no-op keys |
| Staleness | PASS/FAIL | {count} stale refs |
| Safety Guards | PASS/FAIL | {count} missing guards |
| Consistency | PASS/FAIL | {count} contradictions |
| Efficiency | PASS/WARN | {count} oversized skills |
| Step Compliance | PASS/FAIL | {count} skipped steps |
| Learning Pipeline | PASS/WARN/SKIP | {status} |
| Externally-Synced Skills | PASS/FAIL/SKIP | {count} missing export-description, {count} attached to zero |
| Extension Surfaces | PASS/FAIL | {count} divergent collisions, {count} hardcoded user paths |

### Issues Found
{detailed list of each issue with skill name, what's wrong, and suggested fix}

### Skills Modified
{list of skills that were fixed during the audit}
```

## Auto-Fix Policy

- **Staleness**: Flag only — don't auto-fix (may need investigation)
- **Safety guards**: Auto-add missing warnings from project docs gotchas
- **Consistency**: Flag contradictions — ask user which version is correct
- **Efficiency**: Flag only — restructuring is manual
- **Step compliance**: Flag only — behavioral, not a skill content issue

## Artifacts

Saved to `.claude/skills/skill-creator/skill-creator-workspace/` (or your project's equivalent audit-output directory), **run-stamped — never overwrite a prior run**. Date alone is not unique: two audits on the same day collide and the second silently destroys the first run's evidence. Stamp with date + time:

- `staleness-report-YYYY-MM-DDTHH-mm.json`
- `context-efficiency-YYYY-MM-DDTHH-mm.json`
- `step-compliance-YYYY-MM-DDTHH-mm.json`
- `negative-output-audit-YYYY-MM-DDTHH-mm.json`

Each file should carry the Preflight result so a reader can tell what was audited: `{"generated":"YYYY-MM-DD","branch":"...","auditedSha":"...","exact":true|false,"treeMode":"working-tree|detached-worktree|ref-grep","findings":[...]}`.

**Before writing, test the EXACT destination and refuse to overwrite** — don't rely on a listing glob to detect a collision. A glob built for one filename pattern (e.g. matching only files with `-report-` in the name) silently misses the others, so the clobber happens anyway:

```bash
DEST=".claude/skills/skill-creator/skill-creator-workspace/staleness-report-$(date +%Y-%m-%dT%H-%M).json"
[ -e "$DEST" ] && { echo "REFUSING to overwrite $DEST"; exit 1; }
```

Only list artifacts a check in this skill actually produces. A `trigger-evals.json`/`trigger-results.json` pair left over from a trigger-eval check that doesn't exist here is a promise nothing keeps — a stale listing like that reads as coverage that isn't real. If you add a trigger-eval check later, add its artifact then.
