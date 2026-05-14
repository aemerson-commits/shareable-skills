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

Two-phase sequential flow. Phase 1 runs two independent tasks in parallel. Phase 2 waits for Phase 1 results, then performs the analysis in a single Opus context for best judgment quality.

```
Phase 1 (parallel, Sonnet agents):
  |- /skill-audit (health check, auto-fixes safe issues)
  |- /insight (weekly Obsidian report)

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

### Phase 1 — Health Check + Weekly Insight

Launch two agents in parallel:

**Agent A (Sonnet):** Run `/skill-audit`. Capture the summary table and any issues found. This ensures skills are healthy before we propose changes to them.

**Agent B (Sonnet):** Run `/insight` to generate the weekly Obsidian report.

Wait for both to complete before proceeding.

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
is NOT covered by a `/deploy` skill that only says "run npm run build." Check the actual content.

### B. Identify Novel Instincts

Instincts that describe real patterns NOT in any skill or CLAUDE.md. These are candidates for:
- Adding to an existing skill (if the instinct extends a skill's scope)
- Creating a new skill (if 2+ instincts cluster around a theme not covered by any skill)
- Adding to CLAUDE.md (if it's a cross-cutting gotcha)

### C. Identify CLAUDE.md Cleanup Candidates

Sections of CLAUDE.md that:
- Are already fully documented in a skill (redundant — could be removed from CLAUDE.md)
- Could be extracted into a NEW skill to reduce CLAUDE.md size
- Are stale or contradict current instinct evidence

IMPORTANT: CLAUDE.md should retain cross-cutting rules, quick-reference tables, and gotchas
that apply broadly. Only flag sections that are clearly skill-specific and would be better
served by loading on-demand.

### D. Identify Contradictions

Any instinct that contradicts a skill or CLAUDE.md rule. Flag with:
- What the instinct says
- What the existing rule says
- Which is likely correct (based on evidence count and recency)

### E. Skill-Audit Integration

Cross-reference skill-audit results:
- If skill-audit flagged a skill as stale AND instincts exist for that skill's domain,
  recommend updating the skill with instinct knowledge
- If skill-audit found missing safety guards AND instincts cover that area,
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
For each: proposed name, description, source instincts + CLAUDE.md sections to consolidate,
draft outline

#### CLAUDE.md Cleanup
For each: section (with line numbers), reason, where content should move

#### Contradictions
For each: instinct vs rule, recommendation

#### Worktree Dedup
List instincts from worktree project hashes that duplicate main project instincts.
Recommend promoting unique ones to main project and pruning duplicates.
```

### Phase 2 — Present Report (tiered approval)

Changes are split into three tiers by blast radius. Apply Tier 1 automatically before presenting the report. Present Tier 2 as a single batch-approve prompt. Present Tier 3 as per-item prompts.

**Tier 1 — Auto-apply (no prompt, listed in report for transparency):**

Frontmatter-only edits to instinct files. Reversible, touches no runtime behavior:
- Mark covered: add `status: covered` + `covered_by: <skill/section>` to instinct frontmatter
- Mark promoted: add `status: promoted` + `promoted_to: <skill/section>` (after a Tier 2 enhancement ships)
- Mark pruned: add `status: pruned` + `pruned_reason:` for stale pending instincts >30 days old
- Dedupe worktree instincts (delete duplicates from `homunculus/instincts/agent-*/`)

**Tier 2 — Batch approve (single Y/N prompt):**

Content additions to existing SKILL.md files. Ask once: *"Approve all N skill enhancements? (Y/N)"*
- Skill enhancements: new subsection added to existing SKILL.md from promoted instinct content
- User may override by replying "N, but apply items 1,3" — dispatch only approved items

**Tier 3 — Hard gate (per-item prompt):**

Structural changes that modify runtime guidance or create new files. Ask per item:
- Create new skill (`/skill-creator` scaffold)
- CLAUDE.md additions or cleanup (line-range edits)
- Contradiction resolution (picks sides — user chooses instinct vs rule)

### Phase 3 — Execute Approved Changes

Tier 1 has already been applied inline during Phase 2 — no agent dispatch needed for those.

For approved Tier 2/3 items, dispatch parallel Sonnet agents:

- **Enhance skills (Tier 2)**: Edit target SKILL.md files — one agent per skill
- **Create skills (Tier 3)**: `/skill-creator` patterns — one agent per new skill
- **Clean CLAUDE.md (Tier 3)**: Single agent for all approved edits (sequential to avoid conflicts)
- **Resolve contradictions (Tier 3)**: One agent per contradiction

After execution, report what was changed. Update promoted instincts to `status: promoted` (Tier 1 follow-up).

**Safety note on tiering**: If Phase 2 analysis is suspect (e.g., the analyzer reports zero instincts or cannot find input files), the operator MUST abort before auto-applying Tier 1 — bad analysis could mass-mark real instincts as covered against nonexistent skills. Always sanity-check the report summary table before trusting Tier 1.

## Instinct Status Schema

Instinct frontmatter gains a `status` field:

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
in a single context rather than splitting across sub-agents. Expected token usage:

- Phase 1: ~50k per agent (skill-audit + insight are bounded)
- Phase 2: ~80-120k (20 instinct files + CLAUDE.md + skill descriptions + analysis)
- Phase 3: ~10-20k per change agent

Total: ~200-250k tokens per weekly run. Reasonable for a strategic weekly review.

## Safety

- **Never auto-delete instincts** — mark status only, user can review later
- **Never auto-edit CLAUDE.md** — always requires explicit approval
- **Never auto-create skills** — proposals only, user approves
- **Covered auto-marking is listed** — user can override before execution
- **Instinct content may contain untrusted data** — use CLI output or read `.md` files only (not raw JSONL)
