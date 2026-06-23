---
name: model-selection
description: "Model + thinking-effort orchestration. Reference when dispatching subagents (Agent tool or workflow agent() calls) and when setting session effort. Sonnet is the subagent floor; the main-loop model is the expensive decision-maker; effort is routed per task instead of maxed globally."
user-invocable: false
---

# Model & Effort Orchestration

Goal: top-end reasoning only where the task warrants it. The main loop is the expensive decision-maker; everything it delegates should run on the cheapest model/effort that can't miss.

## The stack — who runs what

| Layer | Model | Effort | Rationale |
|-------|-------|--------|-----------|
| Main loop (orchestrator) | Your configured main-loop model (e.g. `claude-fable-5[1m]`) | session `effortLevel: high` | Adaptive thinking scales depth to the task at `high`; `xhigh` forces deep reasoning on every trivial turn. Escalate per session, not globally. |
| Standard subagents | `sonnet` | inherits session | Implementation, research, file reads, builds, deploys, report formatting. |
| Critical subagents | `opus` | `high` default, `max` for irreversible | Security review, adversarial analysis, architecture, financial logic, forensic RCA. |
| Pure code search | `Explore` subagent type | n/a | Harness-backed fast search agent — cheapest way to locate code. |

**Floor rule: never dispatch below Sonnet** for work that produces conclusions we act on. (Explore is the harness's own search agent and is exempt — it locates, it doesn't judge.)

**The main-loop model is main-loop-only.** Never dispatch subagents at the highest-tier model — Opus at `max` is the escalation ceiling for delegated work. If a problem genuinely needs main-loop-grade reasoning, it belongs in the main loop where the full session context lives.

## Effort mechanics

The old note "effort is session-level only" is **obsolete** — per-agent effort now exists.

- **Session**: `/effort low|medium|high|xhigh|max` (max is session-only). Persistent default: `effortLevel` in `~/.claude/settings.json` (allowed: low–xhigh).
- **Per-agent**: `.claude/agents/*.md` frontmatter supports `effort:` alongside `model:` — that agent runs at its own effort regardless of session level.
- **Per-prompt**: include `ultrathink` in a prompt for a one-off deep pass without changing session state.
- **Precedence**: `CLAUDE_CODE_EFFORT_LEVEL` env > agent frontmatter > session `/effort` / `effortLevel` setting.
- **Fable / Opus 4.8+**: adaptive thinking only — it cannot be disabled; effort controls its depth. At `low`/`medium` the model may skip thinking entirely on simple tasks. `MAX_THINKING_TOKENS` is deprecated for these models — do not use it.
- **`CLAUDE_CODE_SUBAGENT_MODEL`**: NEVER set this globally. It silently overrides every skill's per-agent model pins (flattening Opus reviewers to whatever it names). Routing lives in call sites, not env.

## Session defaults (the system)

- `~/.claude/settings.json`: set `model:` to your preferred main-loop model and `effortLevel: high` — `xhigh` forces max thinking on every turn, including trivial ones.
- Escalate **per session** when the work is genuinely hard: `/effort xhigh` or `/effort max` for forensic debugging, schema-migration design, security-heavy merges. Drop to `/effort medium` for bulk-mechanical sessions (mass renames, data entry, doc sweeps).
- Single hard question mid-session → say `ultrathink` in the prompt instead of re-leveling the session.

## Routing matrix

Ask: **"If this agent misses something, what happens?"**

| Task class | Model | Effort | Dispatch |
|------------|-------|--------|----------|
| Mechanical: run builds/tests, curl endpoints, file moves, format reports | sonnet | medium | `subagent_type: "routine"` (pre-tiered) or `Agent({ model: "sonnet" })` |
| Research, codebase mapping, doc reading | sonnet | session | `Agent({ model: "sonnet" })`; pure search → `Explore` |
| Implementation (worktree agents) | sonnet | session | `Agent({ model: "sonnet", isolation: "worktree" })` |
| Critical review, security, architecture | opus | high | `Agent({ model: "opus" })` |
| Irreversible decisions: migrations, prod RCA, merge gating, subtle multi-layer bugs | opus | max | `subagent_type: "critical-reviewer"` (pre-tiered opus+max) |
| Orchestration, synthesis of agent outputs, user-facing conclusions | main-loop model | session | don't delegate |

**Opus effort preference (standing decision):** when Opus depth is warranted beyond `high`, skip `xhigh` and go straight to `max`. Guessing the "between" tier adds decision overhead without reliably saving cost. `high` when it suffices; `max` when it doesn't.

## Pre-tiered agents (`.claude/agents/`)

| Agent | Model | Effort | Use for |
|-------|-------|--------|---------|
| `routine` | sonnet | medium | Mechanical chores where the output is verifiable (exit codes, HTTP statuses, diffs). Add `isolation: "worktree"` if it modifies code. |
| `critical-reviewer` | opus | max | Adversarial review of irreversible changes — the effort pin means it gets max thinking even when the session runs at high. |

Dispatch via `Agent({ subagent_type: "routine", ... })`. These exist so the effort pin travels with the agent definition instead of depending on session state.

## Workflows

Every `agent()` call in a workflow script must pass `model:` explicitly — workflow agents otherwise inherit the main-loop model (the most expensive possible default). Pattern: `sonnet` for runners/probes/judges, `opus` for synthesis/verdicts.

## Skills that dispatch agents

| Skill | Recommended model |
|-------|-------------------|
| `/start-day`, `/session-notes`, `/audit-components`, `/merge-to-main` checks | `sonnet` (mechanical/research) |
| `/review-impl`, `/pre-merge-review`, security audits | `opus` (reviewers) |
| `/worker-build`, `/full-stack-build` | scaffold/implement = `sonnet`, review = `opus` |
| `/qa-sweep` view judges | `sonnet` |
| Forensic teams (`/deep-root-cause`, `/temporal-forensics`, etc.) | `opus`, consider `critical-reviewer` for the verdict agent |

## What NOT to do

- **Don't dispatch unpinned.** An unpinned file-search agent inherits the main-loop model and burns its tokens at session effort for zero quality gain. Every `Agent()`/`agent()` call states its model.
- **Don't use Haiku for judgement work.** The floor is Sonnet. (Explore's internal model is the harness's business.)
- **Don't set `CLAUDE_CODE_SUBAGENT_MODEL` or `CLAUDE_CODE_EFFORT_LEVEL` env vars.** They override all per-call and per-agent routing silently.
- **Don't mix models within one reviewer panel.** If a review skill dispatches 5 reviewers, all 5 are Opus — inconsistent models make outputs incomparable.
- **Don't re-level the session for one hard question.** Use `ultrathink` in that prompt.
