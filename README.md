# Agent Team Skills for Claude Code

A complete development methodology built on parallel agent teams. 28 skills covering the full lifecycle: intent discovery, constraint research, implementation planning, adversarial review, diagnostic debugging, document generation, creative tools, session management, and skill maintenance.

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
| `/debug-collaborate` | Multi-agent collaborative debugging — parallel hypothesis generation and testing. | 4 parallel |

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

### Document & Data Generation

| Skill | Purpose |
|-------|---------|
| `/pdf` | Full PDF toolkit — read, create, merge, split, OCR, watermark, encrypt, fill forms, extract |
| `/docx` | Create, read, edit, manipulate Word documents (.docx) with TOC, letterhead, templates |
| `/xlsx` | Read, create, edit, convert spreadsheet files (.xlsx, .xlsm, .csv, .tsv) |
| `/internal-comms` | Write internal communications — status reports, newsletters, FAQs, incident reports |
| `/mcp-builder` | Build MCP servers for LLM-service integration (Python FastMCP or Node/TypeScript) |

### Creative Tools

| Skill | Purpose |
|-------|---------|
| `/web-artifacts-builder` | Build elaborate multi-component claude.ai HTML artifacts with React, Tailwind, shadcn/ui |
| `/algorithmic-art` | Generative art via p5.js with seeded randomness — flow fields, particle systems |
| `/canvas-design` | Create visual art (.png, .pdf) — posters, designs, static artwork |
| `/slack-gif-creator` | Create animated GIFs optimized for Slack with constraints and validation |
| `/theme-factory` | Style artifacts with 10 pre-set themes or generate custom themes on-the-fly |

### Session Management (requires Obsidian)

| Skill | Purpose |
|-------|---------|
| `/start-day` | Morning briefing: git pull, review session notes, check memory, scan learnings, triage ideas |
| `/session-notes` | End-of-session documentation: completed work, key decisions, learnings, "left off" state |
| `/insight` | Weekly metrics report: development summary, architecture changes, priorities, blocked items |
| `/triage-ideas` | Process Obsidian Ideas.md inbox: classify, confirm with user, route to project roadmap |

### Skill Maintenance

| Skill | Purpose |
|-------|---------|
| `/skill-audit` | 5 automated checks: staleness, safety guards, cross-skill consistency, efficiency, step compliance |
| `/skill-creator` | Create, test, and optimize new skills with structured eval framework |

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

These skills work with any codebase out of the box. Customize for your project:

- **`/review-impl`**: The grading rubric weights (Functionality 40%, Design 25%, Data integrity 20%, Performance 15%) can be adjusted for your priorities
- **`/write-plan`**: The "Done When" acceptance criteria template can be extended with project-specific assertion types
- **`/grill-me`**: The 7 question branches cover most features; add domain-specific branches in the "Edge Cases" section
- **`/cascade-orchestration`**: The Skill Integration Map is a template — populate it with your project's skill mappings
- **Session skills** (`/start-day`, `/session-notes`, `/insight`, `/triage-ideas`): Require [Obsidian](https://obsidian.md) with CLI access. Set `{{vault_name}}` and `{{project}}` placeholders to match your vault structure. Auto-detects Obsidian binary on Windows/macOS/Linux
- **Document skills** (`/pdf`, `/docx`, `/xlsx`): Install required npm packages on first use (`pdf-lib`, `docx`, `exceljs`)
- **Creative skills** (`/algorithmic-art`, `/canvas-design`): Generate standalone HTML files or use canvas APIs

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
