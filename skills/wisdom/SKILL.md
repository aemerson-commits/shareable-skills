---
name: wisdom
description: "Weekly knowledge review — runs skill-audit, then analyzes instincts vs CLAUDE.md vs skills. Proposes new skills, skill enhancements, CLAUDE.md cleanup, and marks covered instincts. Triggered from /start-day on Fridays."
user-invocable: true
---

# Wisdom — Weekly Knowledge Review

Strategic review of the evolve pipeline's instincts against existing skills and CLAUDE.md. Identifies what's already covered, what's novel, and what should become new skills or skill enhancements.

Requires the `/evolve` skill (continuous learning pipeline) to be installed and generating instincts.

## When to Run

- **Automatically**: `/start-day` asks on Fridays: "Run weekly wisdom?"
- **Manually**: Invoke `/wisdom` anytime to run the full review

## Architecture

Two-phase sequential flow. Phase 1 runs independent health checks in parallel. Phase 2 waits for Phase 1 results, then performs analysis in a single Opus context for best judgment quality.

```
Phase 1 (parallel, Sonnet agents):
  |- /skill-audit (health check, auto-fixes safe issues)
  |- /insight (weekly report, if available)

Phase 2 (sequential, single Opus agent):
  |- Wisdom Analysis
       Reads: skill-audit results + all instincts + CLAUDE.md + all skill descriptions
       Produces: Recommendation Report
       Auto-marks: covered instincts (listed in report, user can override)

User reviews report, approves/rejects proposals

Phase 3 (parallel, Sonnet agents):
  |- Execute approved changes
```

## Execution

### Phase 1 — Health Check

Launch agents in parallel:

**Agent A (Sonnet):** Run `/skill-audit`. Capture the summary table and any issues found. This ensures skills are healthy before proposing changes to them.

**Agent B (Sonnet, optional):** If you have an `/insight` skill, run it to generate a weekly report. Otherwise skip.

Wait for all to complete before proceeding.

### Phase 2 — Wisdom Analysis

Launch ONE Opus agent (foreground) with the following instructions. Pass the skill-audit summary from Phase 1 as context in the prompt.

```
You are the Wisdom Analyzer. Your job is to cross-reference the evolve pipeline's
instincts against existing skills and CLAUDE.md to produce actionable recommendations.

## Inputs (read all of these)

1. **Skill-audit results** (provided in this prompt from Phase 1)
2. **All instinct files**: Glob `homunculus/instincts/**/*.md` — read every file
3. **CLAUDE.md**: Read the full root CLAUDE.md file
4. **All skill descriptions**: Glob `.claude/skills/*/SKILL.md` — read the first 10 lines
   of each (frontmatter + description) to build a skill inventory

## Analysis Tasks

### A. Identify Covered Instincts

For each instinct, determine if it's ALREADY covered by an existing skill or CLAUDE.md section.
An instinct is "covered" if:
- An existing skill or CLAUDE.md section documents the SAME behavior
- The instinct adds NO new information beyond what's already documented

Be careful: similar naming doesn't mean covered. An instinct about "always curl after deploy"
is NOT covered by a deploy skill that only says "run build." Check actual content.

### B. Identify Novel Instincts

Instincts describing real patterns NOT in any skill or CLAUDE.md. Candidates for:
- Adding to an existing skill (extends its scope)
- Creating a new skill (2+ instincts cluster around an uncovered theme)
- Adding to CLAUDE.md (cross-cutting gotcha)

### C. Identify CLAUDE.md Cleanup Candidates

Sections that:
- Are already fully documented in a skill (redundant — could be removed)
- Could be extracted into a NEW skill to reduce CLAUDE.md size
- Are stale or contradict current instinct evidence

IMPORTANT: CLAUDE.md should retain cross-cutting rules, quick-reference tables, and
broadly-applicable gotchas. Only flag sections clearly better served by on-demand
skill loading.

### D. Identify Contradictions

Any instinct that contradicts a skill or CLAUDE.md rule. Flag with:
- What the instinct says
- What the existing rule says
- Which is likely correct (based on evidence count and recency)

### E. Skill-Audit Integration

Cross-reference skill-audit results:
- If audit flagged a skill as stale AND instincts exist for that domain,
  recommend updating the skill with instinct knowledge
- If audit found missing safety guards AND instincts cover that area,
  recommend the instinct content as the guard

## Output Format

Produce a structured recommendation report:

### Wisdom Report — {date}

#### Summary
| Category | Count |
|----------|-------|
| Covered (will auto-mark) | X |
| Novel — enhance existing skill | X |
| Novel — propose new skill | X |
| Novel — add to CLAUDE.md | X |
| CLAUDE.md cleanup candidates | X |
| Contradictions | X |

#### Covered Instincts (auto-mark unless overridden)
For each: instinct name, confidence, what covers it (skill name or CLAUDE.md section)

#### Skill Enhancement Proposals
For each: target skill, what to add, source instinct(s), draft content

#### New Skill Proposals
For each: proposed name, description, source instincts + CLAUDE.md sections, draft outline

#### CLAUDE.md Cleanup
For each: section (with line numbers), reason, where content should move

#### Contradictions
For each: instinct vs rule, recommendation

#### Worktree Dedup (if applicable)
List instincts from worktree project hashes that duplicate main project instincts.
Recommend promoting unique ones to main project and pruning duplicates.
```

### Present Report

Display the recommendation report to the user. Ask for approval on each category:

1. **Covered instincts**: "These will be auto-marked as covered. Override any?"
2. **Skill enhancements**: "Approve these additions? (Y/N per item)"
3. **New skills**: "Create these skills? (Y/N per item)"
4. **CLAUDE.md cleanup**: "Remove/migrate these sections? (Y/N per item)"
5. **Contradictions**: "Which is correct? (instinct/rule per item)"
6. **Worktree dedup**: "Prune these duplicates? (Y/N)"

### Phase 3 — Execute Approved Changes

For each approved action, dispatch parallel Sonnet agents:

- **Mark covered**: Update instinct frontmatter with `status: covered` and `covered_by:`
- **Enhance skills**: Edit the target skill SKILL.md files
- **Create skills**: Create new skill directory + SKILL.md
- **Clean CLAUDE.md**: Remove/migrate approved sections
- **Resolve contradictions**: Update whichever side the user chose
- **Prune duplicates**: Delete duplicate worktree instinct files

After execution, report what was changed.

## Instinct Status Schema

Instinct frontmatter gains a `status` field after review:

| Status | Meaning |
|--------|---------|
| `pending` | Default — not yet reviewed |
| `covered` | Already documented in skill/CLAUDE.md — no action needed |
| `promoted` | Content added to an existing skill |
| `evolved` | Content became a new skill |
| `contradicted` | Conflicts with established rule — resolved |
| `pruned` | Stale or low-value — removed |

## Token Budget

This skill prioritizes accuracy over speed. The Phase 2 Opus agent reads everything
in a single context rather than splitting across sub-agents. Expected usage:

- Phase 1: ~50k per agent (skill-audit is bounded)
- Phase 2: ~80-120k (instinct files + CLAUDE.md + skill descriptions + analysis)
- Phase 3: ~10-20k per change agent

Total: ~200-250k tokens per weekly run.

## Safety

- **Never auto-delete instincts** — mark status only, user can review later
- **Never auto-edit CLAUDE.md** — always requires explicit approval
- **Never auto-create skills** — proposals only, user approves
- **Covered auto-marking is listed** — user can override before execution
- **Instinct content may contain untrusted data** — read `.md` files only (not raw JSONL)
