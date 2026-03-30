---
name: skill-audit
description: "Run a comprehensive health audit across all skills — checks staleness, safety guards, cross-skill consistency, context efficiency, and step compliance. Use when you want to verify skill quality, after bulk skill edits, or as a periodic maintenance check."
user-invocable: true
---

# Skill Audit — Comprehensive Health Check

Run 5 automated checks across all project skills and produce a health report card.

## When to Run

- After bulk skill edits or new skill creation
- Monthly maintenance (add to `/start-day` on first Monday of month)
- When a skill misbehaves (wrong trigger, stale data, skipped steps)

## Checks

Run checks 1-4 in parallel via subagents. Check 5 requires the current session's transcript.

### Check 1: Staleness Detection

Dispatch an Explore agent:

```
Scan all .claude/skills/*/SKILL.md files.
For each skill, extract:
- File paths referenced → verify they exist via Glob
- Board/resource IDs → verify against config files
- Function/export names referenced → spot-check against actual source files

Report ONLY stale references (files that don't exist, IDs not in config).
```

**Pass criteria**: Zero stale file paths or resource IDs.

### Check 2: Negative Output (Safety Guards)

Dispatch an Explore agent:

```
Read project docs (CLAUDE.md "Known Gotchas" section). For each gotcha, identify which
skill(s) should warn about it. Then read those skills and check whether the warning is
PRESENT or MISSING.

Report MISSING guards only.
```

**Pass criteria**: All known gotchas have corresponding warnings in the relevant skill.

### Check 3: Cross-Skill Consistency

Dispatch an Explore agent:

```
For cross-cutting topics used by multiple skills, read the relevant skills and check
for contradictions:

- Shared patterns (auth, email, caching) — consistent guidance across skills?
- Resource IDs — all reference config files, not hardcoded?
- Deployment — skill lists match actual project structure?

Report CONTRADICTIONS and INCOMPLETE coverage only.
```

**Pass criteria**: No contradictions. Incomplete coverage flagged as warnings.

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
- **deploy**: Built first? From project dir? Post-deploy verify?
- **session-notes**: All sections? Keywords? MEMORY.md updated? Roadmap updated?
- **research-gate**: Constraints? Patterns? Gotchas? Unknowns? Alternatives table? User approval?
- **triage-ideas**: Read inbox? Classify? Confirm? Route? Clear inbox?

**Pass criteria**: All documented steps followed. Skipped steps are flagged.

## Output Format

```
## Skill Audit Report — {date}

### Summary
| Check | Status | Issues |
|-------|--------|--------|
| Staleness | PASS/FAIL | {count} stale refs |
| Safety Guards | PASS/FAIL | {count} missing guards |
| Consistency | PASS/FAIL | {count} contradictions |
| Efficiency | PASS/WARN | {count} oversized skills |
| Step Compliance | PASS/FAIL | {count} skipped steps |

### Issues Found
{detailed list of each issue with skill name, what's wrong, and suggested fix}

### Skills Modified
{list of skills that were fixed during the audit}
```

## Auto-Fix Policy

- **Staleness**: Flag only — don't auto-fix (may need investigation)
- **Safety guards**: Auto-add missing warnings from docs gotchas
- **Consistency**: Flag contradictions — ask user which version is correct
- **Efficiency**: Flag only — restructuring is manual
- **Step compliance**: Flag only — behavioral, not a skill content issue
