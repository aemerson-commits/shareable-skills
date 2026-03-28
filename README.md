# Agent Team Skills for Claude Code

A complete development methodology built on parallel agent teams. 11 skills that cover the full lifecycle from intent discovery through implementation to diagnostic debugging.

## The Pipeline

```
/grill-me  →  /research-gate  →  /write-plan  →  build  →  /review-impl
  INTENT        CONSTRAINTS       DECOMPOSITION              EVALUATION
                                  + Done When                + Grading
                                  criteria                   + Playwright
                                                             + Security
```

When things go wrong:
```
/persistent-issue  →  classifies  →  dispatches Team A-E  →  auto-escalates
```

## Skills

### Development Pipeline

| Skill | Purpose | Agents |
|-------|---------|--------|
| `/grill-me` | Interrogate intent before building. One question at a time with recommended answers. | Conversation (no agents) |
| `/research-gate` | Discover constraints before writing code. 4 parallel research agents. | 4 parallel |
| `/write-plan` | Decompose into tasks with acceptance criteria ("Done When"). | Sequential |
| `/review-impl` | Adversarial review with weighted grading (A/B/C/F), 3 code reviewers + Playwright visual verification. | 3 parallel + 1 visual |
| `/cascade-orchestration` | 5 reusable agent team patterns: Fan-Out/Fan-In, Sequential Pipeline, Per-Project Propagation, Cascading Sub-Teams, Conditional Dispatch. | Reference (no agents) |

### Diagnostic Escalation

When a bug persists after a fix attempt, `/persistent-issue` classifies the problem and dispatches the right team:

| Skill | Category | When | Agents |
|-------|----------|------|--------|
| `/persistent-issue` | Router | "not fixed", "still broken" | 1 triage agent |
| `/deep-root-cause` | A: Wrong root cause | Fix applied, same symptom | 3 parallel: Reproducer, Data Flow Tracer, Assumption Auditor |
| `/full-stack-trace` | B: Wrong layer | Fix changed behavior but didn't resolve | 4 sequential: Frontend → API → Backend → Infrastructure |
| `/isolation-test` | C: Multiple factors | Partially works or inconsistent | 3 parallel: Component Isolator, Data Minimizer, Environment Comparator |
| `/temporal-forensics` | D: Intermittent | Comes and goes, seemed fixed | 3 parallel: Race Condition Hunter, Stale State Detective, Timing Profiler |
| `/regression-bisect` | E: Regression | "This used to work" | 3 sequential: Git Bisector, Side Effect Analyzer, Rollback Verifier |

### Auto-Escalation

Use `--cascade` with `/persistent-issue` to auto-escalate through up to 3 teams without stopping:

```
/persistent-issue --cascade
```

The router classifies the issue, tries the matched team first, and if unresolved, escalates to the next team in priority order.

## Installation

### Project-level (recommended)
Copy the `skills/` directory into your project:

```bash
cp -r skills/ your-project/.claude/skills/
```

### Personal (all projects)
Copy to your personal skills directory:

```bash
cp -r skills/ ~/.claude/skills/
```

## Configuration

These skills are designed to work with any codebase out of the box. Some skills reference project conventions that you may want to customize:

- **`/review-impl`**: The grading rubric weights (Functionality 40%, Design 25%, Data integrity 20%, Performance 15%) can be adjusted for your priorities
- **`/write-plan`**: The "Done When" acceptance criteria template can be extended with project-specific assertion types
- **`/grill-me`**: The 7 question branches cover most features; add domain-specific branches in the "Edge Cases" section
- **`/cascade-orchestration`**: The Skill Integration Map is a template — populate it with your project's skill mappings

## Requirements

- Claude Code with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: true` in settings
- `effortLevel: max` recommended for best agent team performance
- All agent dispatches use `model: "opus"` by default

## How It Works

The skills use Claude Code's Agent tool to dispatch parallel subagents. Each skill documents:
- Which agents to dispatch and what they do
- Whether they run in parallel (Fan-Out/Fan-In) or sequential (Pipeline)
- Whether they need worktree isolation (code-modifying agents)
- Escalation paths when the skill doesn't resolve the issue

The `/cascade-orchestration` skill documents the 5 reusable patterns that all other skills follow.

## License

MIT
