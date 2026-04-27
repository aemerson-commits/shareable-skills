---
name: model-selection
description: "Per-agent model selection guidance. Reference when dispatching subagents via the Agent tool. Sonnet is the floor — never go below it. Opus for critical review, security, and architectural decisions."
user-invocable: false
---

# Model Selection — Subagent Dispatch Guide

When spawning agents via the `Agent` tool, explicitly choose the right model for the task. Default (no `model` param) inherits from the parent — which is typically Opus. That's wasteful for routine work.

## The two-tier model

| Tier | Model | When to use | Examples |
|------|-------|-------------|---------|
| **Standard** | Sonnet | Default for all work. Implementation, refactoring, research, exploration, file reads, code writes, builds, deploys. | `/audit-components`, `/start-day` research agents, Explore subagents, worktree implementation agents |
| **Critical** | Opus | Decisions with high downside if wrong. Security review, adversarial analysis, multi-file architectural decisions, financial logic verification. | `/review-impl` reviewer agents, `/pre-merge-review`, merge-gating validation agents |

**Floor rule: never dispatch below Sonnet.** Haiku is excluded — the risk of missing something subtle on a task we assumed was simple outweighs the cost savings.

## Opus effort tiers

When using `model: "opus"`, the reasoning effort tier also matters. The `/effort` slash command ladder is:

`low → medium → high → xhigh → max`

`xhigh` is Opus 4.7-exclusive — a tier added between `high` and `max`.

**Recommended practice: when Opus depth is warranted, skip `xhigh` and go straight to `max`.** The marginal cost of `max` is worth it given the blast radius of irreversible decisions (schema migrations, security-critical code, merge-to-main gating). Guessing the right "between" tier adds decision overhead without reliably saving cost. Use `high` when `high` suffices; use `max` when it doesn't.

| Effort | When to use |
|--------|-------------|
| `high` | Default for Opus subagent work where reasoning is adequate — most security reviews, adversarial review, architectural sanity checks. |
| `xhigh` | Skip by default. Only reach for if you have a specific reason `max` is wrong (e.g. budget gate). |
| `max` | Preferred Opus escalation. Irreversible decisions (schema migrations, production incident RCA, security-critical code review, merge gating), subtle multi-layer bugs where `high` came back shallow. |

Note: effort tier is set at the Claude Code session level via `/effort` or `--effort`, not per-`Agent()` call. Subagents inherit the session's effort tier.

## How to apply

When writing Agent tool calls in skills or in-session:

```javascript
// Standard work — explicitly request Sonnet to avoid inheriting Opus
Agent({ model: "sonnet", prompt: "...", description: "..." })

// Critical review — explicitly request Opus
Agent({ model: "opus", prompt: "...", description: "..." })

// Explore subagents — Sonnet is sufficient for file search
Agent({ subagent_type: "Explore", model: "sonnet", prompt: "..." })
```

## Decision heuristic

Ask: **"If this agent misses something, what happens?"**

- "We waste time re-running it" → **Sonnet** (low downside, retry is cheap)
- "A bug ships to production" → **Opus** (high downside, catch it now)
- "We build on a wrong assumption for 2 hours" → **Opus** (compounds — catching it early saves the session)

## Skill mapping template

| Skill type | Agent dispatches | Recommended model |
|-------|-----------------|-------------------|
| Session-start research | 2-4 research agents (notes, memory, ideas) | `sonnet` |
| Component / project audit | parallel project audit agents | `sonnet` |
| Adversarial review | independent reviewer agents | `opus` |
| Pre-merge review | parallel validation agents | `opus` |
| Merge gating | parallel check agents (lint, build, secrets, etc.) | `sonnet` (builds are mechanical) |
| Cascade orchestration | varies by pattern | `sonnet` default, `opus` for review-class agents |
| Worker / service factory | scaffold + verification agents | scaffold=`sonnet`, review=`opus` |
| Session notes | parallel note/roadmap/memory agents | `sonnet` |
| Full-stack build | implementation + review agents | implement=`sonnet`, review=`opus` |

## What NOT to do

- **Don't default to Opus everywhere.** It's 3-5x more expensive than Sonnet for the same task. If a file-search agent runs on Opus, you're burning budget for no quality gain.
- **Don't use Haiku.** The floor is Sonnet. Haiku's cost advantage doesn't justify the risk of shallow reasoning on tasks that look simple but aren't.
- **Don't mix models within a single skill run without reason.** If a review skill dispatches 5 reviewers, all 5 should be Opus — inconsistent model selection makes it hard to compare output quality.
- **Don't override model for background/monitoring agents that run on cron.** Those are scheduled workers, not LLM agents — model selection doesn't apply.
