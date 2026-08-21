---
name: consult
description: "Get an independent second opinion on a DECISION (not a diff) by writing a consult brief for a second model or agent with its own repo access — one that hasn't seen your reasoning chain. Use when a choice has real tradeoffs, when you've formed a view and want it attacked, or when a plan is about to be committed to. Triggers: 'get a second opinion', 'consult another model on this', 'is this plan right', 'what would a fresh read say'. NOT for reviewing a code diff (use your review/adversarial-review skill) and NOT for continuing your own work (that's a handoff)."
---

# Consult

Send a **decision** to a second model or agent — one with its own access to the repo but none of your conversation — and get back an independent judgment. This is not a second pair of hands. It is a mind that has not been down your road.

## The one idea that makes this work

**Do not transfer your context. Transfer the question.**

The consultant can read the repo, the git history, and whatever project docs exist. What it lacks is the *conversation delta*: the decision at hand, what the user actually wants, what a human is blocked on, what you already ruled out. That's tens of lines, not tens of thousands of tokens.

Transferring more would actively hurt. Handing the consultant your reasoning chain anchors it on your conclusion and turns an independent read into an agreement machine. It's the same failure as a test built from invented inputs: it can confirm a hypothesis but never falsify one.

**Corollary: seal your recommendation.** Put it last, under a `SEALED` marker, so the consultant forms a view before reading it. Lead with your answer and you've bought an expensive echo.

## Consult vs the neighbours

| You want | Use |
|---|---|
| Judgment on a **choice, plan, or tradeoff** | this skill |
| Defects in a **code diff** | your project's code-review / adversarial-review skill |
| A fresh session to **continue your own work** | a handoff skill |
| To interrogate **the user** before work starts | `/grill-me` |

Worth its cost when the decision is hard to reverse, when you notice yourself arguing with yourself, or when the user has to live with the outcome. Waste on a question with an obvious answer.

## Write the brief

Write it somewhere disposable — a scratch directory, never committed to the repo:

```markdown
# Consult — <topic> — <date>

## Decision
<one sentence: the choice that has to be made, and what's blocked on it>

## Options
A. <named option> — <one line>
B. <named option> — <one line>
<a third if it exists; if you can only write two, say so — false binaries are the #1 brief defect>

## Constraints that aren't in the repo
<what the user wants, who decided what, deadlines, politics — the part the consultant
 genuinely can't get anywhere else>

## Evidence
- *ran it* — <claim> (`<command>`, this session)
- *inferred* — <claim, and from what>
- *recalled* — <claim> (<source>, <date>)

## Coordinates
- <path/to/file:line> — <why it matters>
- <commit/PR reference> | <plan doc>

## Already ruled out
<option + reason — prevents rediscovery; the consultant is free to reopen these>

## Question
<the exact question. "Which option, and what would change your mind" beats "thoughts?">

## SEALED — my recommendation (read only after forming your own view)
<your call and reasoning, for the consultant to attack>
```

Rules that matter more than the template:

- **Label every evidence line** *ran it* / *inferred* / *recalled*. Unlabeled claims read as facts and the consultant will build on them.
- **Coordinates, not content.** File/line, commit refs, doc paths. The consultant can read the repo; pasting code wastes both context windows.
- **Never write a secret value into the brief.** Reference it by name and location instead.
- **Re-verify anything important before it goes in.** A recalled claim about current branch or deploy state goes stale fast — check it and relabel it *ran it*, or the consultant should (and will) refuse to lean on it.

## Send it, and keep working

Dispatch however your environment sends work to a second model or agent — a CLI call to another assistant, a background agent, a separate session with a different context. Treat the reply as a push, not something to wait on: keep working, and act on the verdict when it lands rather than polling or blocking the turn on it.

## Follow-ups: resume, don't rebuild

If your tooling supports resuming the same thread, a follow-up is one sentence, not a new brief — the consultant already has the first brief and its own verdict. Re-briefing from cold re-argues the whole case for no reason, and costs roughly what the first brief cost.

## Bring the answer back

- **Report the consultant's verdict as theirs**, not as yours. If you disagree, say so and say why — the user is buying two views; collapsing them into one silently is the failure mode.
- **A disagreement is a finding.** Don't average the two positions into a mushy third. Surface the conflict, pick one, justify it.
- If the consultant flags one of your `inferred`/`recalled` claims as important to its answer, go verify it — that's usually the most valuable thing the consult produces.

## Cost

A cold consult carries real overhead before your brief is even read — expect it to cost minutes at a normal reasoning setting, so run it in the background if you have other work. Don't consult on questions with an obvious answer.

**Escalate reasoning effort only for irreversible decisions** — a schema migration, a production cutover, a security boundary — never as a default and never as a retry because a verdict felt thin. Two cheaper moves come first: resume the existing thread instead of re-briefing it, and check whether you already have an unactioned verdict on this topic before dispatching a new one.
