---
name: premise-audit
description: Verify a plan's claims about EXISTING code (paths, symbols, endpoint verbs, column types) before agents build on them. Use after /write-plan and BEFORE dispatching a build fan. Not a code review: it audits premises, not the diff.
---

# Premise Audit

A plan is mostly assertions about code that already exists: this endpoint takes POST, that column is an INTEGER, this proxy forwards that param, that view already shows the field. Build agents treat every one as fact. A wrong premise does not fail loudly: the agent builds exactly what the plan said, its own tests pass, and the defect ships.

This audits those premises. It runs **after** the plan is written and **before** the build fan. It is not `/review-impl` or `/pre-merge-review` (those read code that was written) and not `/research-gate` (that gathers constraints before the plan exists).

## When to run it

When a plan will be executed by agents in parallel and a wrong premise is expensive to unwind: several tasks, a migration, an attended deploy, or a hot file many tasks touch. It is costly (a 13-task plan took dozens of agents and tens of minutes), so for a single-task plan read the plan yourself, and skip it when the machine is already loaded with concurrent sessions.

## Shape

### Stage 1 - dimension sweeps (parallel, cheaper model)

One agent per subsystem the plan touches (API, frontend, shared code, tests, infra). Each extracts every claim about EXISTING code in its dimension and checks it against the tree. One structured row per claim.

- **Give every sweep the same base.** Agent worktrees are often cut from a different branch than the one you work on, so each sweep resets to the same ref before reading. Do the reset inside an isolated worktree, never in the caller's checkout, where it would discard uncommitted work.
- **Commit the plan first.** A fresh plan is usually uncommitted, and a worktree has no copy of it; the sweeps would silently audit an older version, or none. Push the plan to a branch and give every sweep that ref, or paste the plan text into each prompt.

### Stage 2 - adversarial refutation (one refuter per finding, stronger model)

Each surviving claim gets an independent agent prompted to **refute** it, defaulting to "refuted" when uncertain. This stage is the skill. On one real run, 54 refutations killed 32 findings and 22 survived: about 60% of plausible "the plan is wrong about the code" findings were themselves wrong. Without it you ship a pile of mostly noise with the real defects buried. Refuters also correct the impact wording of survivors ("every job" became "17 of 36").

### Stage 3 - fold, with the count asserted

Fold survivors into the task that owns each one with a patch script that declares an expected hit count per anchor and writes nothing unless every count matches (see `/throwaway-script`). **Fix every copy of a duplicated command.** A command that appears in a plan, a gate ledger, a README and a CI workflow is four commands; correcting the plan's five copies left fifteen broken ones in the ledger beside it.

## Premise shapes that actually bite

Each would have produced a green build on a false fact:

- **Wrong HTTP verb.** Plan said POST; the route handles GET and PUT and 405s the rest.
- **Field already shipped.** A task to add a field that landed months earlier and was populated on every row.
- **Param silently dropped.** Query params passed through a proxy that is an allowlist reading a different param. No error, just ignored.
- **"No change expected" for behavior nothing builds.** A step to *confirm* a view shows something it does not, so no step builds it.
- **Cross-app state.** One app invalidating another app's query keys. Different client instance; unreachable.
- **A hook that does not exist.** "Apply the filter after the readiness overlay" in a proxy with no overlay.
- **A multi-part edit done in part.** Registering a tab needs three edits; do two and it works on click while every deep link lands elsewhere, with build, lint, tests and CI green.
- **SQL that cannot compile.** An appended `AND NOT (...)` on `INSERT ... VALUES`, which has no `WHERE`; or numbered and positional bind parameters mixed.
- **A type assumption.** A TEXT column makes `MAX(col)` sort as a string and return '9' for a job numbered to 12.

## Internal inconsistency is the tell

When a plan contradicts itself, the contradiction usually points at the defect, not a typo. In the `MAX` case the plan's own worked example was only reachable WITH a `CAST` the SQL lacked: the SQL was wrong and the example was right. Ask which half the rest of the plan depends on.

## Two trees, two truths

A bare line number is the fastest-rotting premise in a plan, and it can be right in two trees at once: one reader finds the symbol at line 1103 on the integration branch, another at 1018 in a stale checkout many commits behind. Agents reading a stale base "correct" the plan toward the wrong number. Have sweeps confirm the **symbol at the path** and treat the number as a hint; state which tree any line number came from.

## Reporting

Return per finding: the claim, whether it survived refutation, severity, the reasoning WITH the command that produced it, and a concrete correction naming the exact text to change. A finding without a correction becomes an argument at fold time.

Rate severity by what a build agent would DO with the false premise. The worst is one that gets built and cements itself in a passing test: it is worse than one that crashes on first run, because the crash gets fixed and the passing test gets trusted. A refuter's repro built from invented inputs can only confirm, never falsify; require real inputs.
