# Shareable Skills for Claude Code

A complete development methodology built on parallel agent teams. 46 skills + a continuous learning pipeline covering the full lifecycle: intent discovery, constraint research, implementation planning, build orchestration, adversarial review, diagnostic debugging, testing, deployment, document generation, creative tools, session management, skill maintenance, and automated pattern extraction.

## Quick Start

New here? Start with the development pipeline — 5 skills that cover intent → research → planning → build → review:

```bash
# Copy just the skills you want
cp -r skills/grill-me skills/research-gate skills/write-plan skills/review-impl your-project/.claude/skills/
```

Then invoke them in order: `/grill-me` → `/research-gate` → `/write-plan` → build → `/review-impl`. Each skill documents what it does, what agents it dispatches, and when to use it.

Want diagnostics too? Add `/persistent-issue` — it auto-classifies bugs and dispatches the right diagnostic team (A through E).

Want continuous learning? Add `/evolve` + `/wisdom` and the observation hooks. See [Continuous Learning Pipeline](#continuous-learning-pipeline) below.

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

### Build Orchestration

| Skill | Purpose | Agents |
|-------|---------|--------|
| `/full-stack-build` | Orchestrate agent teams to build features spanning frontend + backend — API design, DB migrations, React components, integration wiring, and verification. | 2 designers + 2 builders + 4 verifiers |
| `/propagate-feature` | Replicate features across projects with independent codebases — diff, adapt, apply. | 2 differs + 1 propagator + 2 verifiers |
| `/worker-build` | Factory for building Cloudflare Workers — email reporters, cron jobs, API monitors. | 3 builders + 2 verifiers |
| `/deploy-all` | Parallel deploy all changed projects — detects changes, builds, deploys, watches CI, verifies live URLs. | Orchestrator |
| `/worktree-guard` | Safe worktree merge — diffs each changed file against dev HEAD before copying, flags conflicts. | Single agent |

### Quality & Verification

| Skill | Purpose | Agents |
|-------|---------|--------|
| `/verify-complete` | Verify feature completion with evidence — greps code, runs build, takes screenshots. | Single agent |
| `/pre-merge-review` | Comprehensive pre-merge review — security pentesting, performance, scalability, UX consistency, code hardening. | 5 domains x 1-3 sub-agents (up to 12) |
| `/schema-check` | Verify DB schema, KV keys, and env bindings before writing queries or endpoints. | Single agent |
| `/env-audit` | Audit environment variables across all projects — detect missing secrets, compare code refs against deployed config. | 4 parallel scanners |
| `/audit-components` | Audit component health — verify imports, props, shared utility consistency across all projects. | N project auditors + 2 cross-project |
| `/webapp-testing` | Playwright toolkit for testing web apps — CF Access auth, route intercepts, screenshots. | Single agent |
| `/data-reconciliation` | Trace data through pipeline layers to find where values diverge. For stale/wrong data debugging. | 4 layer samplers |
| `/frontend-design` | UI/UX design patterns, color tokens, and component conventions. | Reference (no agents) |

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
| `/html-slides` | One-shot presentation slides from a single prompt — polished, interactive, self-contained HTML |

### Session Management (requires Obsidian)

| Skill | Purpose |
|-------|---------|
| `/start-day` | Morning briefing: git pull, review session notes, check memory, scan learnings, triage ideas |
| `/session-notes` | End-of-session documentation: completed work, key decisions, learnings, "left off" state |
| `/insight` | Weekly metrics report: development summary, architecture changes, priorities, blocked items |
| `/triage-ideas` | Process Obsidian Ideas.md inbox: classify, confirm with user, route to project roadmap |

### Skill Maintenance & Continuous Learning

| Skill | Purpose |
|-------|---------|
| `/skill-audit` | 6 automated checks: staleness, safety guards, cross-skill consistency, efficiency, step compliance, learning pipeline health |
| `/skill-creator` | Create, test, and optimize new skills with structured eval framework |
| `/evolve` | Continuous learning pipeline — automatic pattern extraction from tool usage, instinct management, skill evolution |
| `/wisdom` | Weekly knowledge review — cross-references instincts against CLAUDE.md and skills, proposes enhancements and cleanup |

### Reference & Conventions

| Skill | Purpose |
|-------|---------|
| `/model-selection` | Per-agent model dispatch guidance — Sonnet floor, Opus for critical review, effort-tier ladder |
| `/throwaway-script` | Pattern for one-shot `.mjs` Node scripts that need `.env` secrets — location, ESM form, Windows path quirks |

## Continuous Learning Pipeline

The `/evolve` skill implements an automatic pattern extraction system inspired by [everything-claude-code](https://github.com/affaan-m/everything-claude-code):

```
Tool calls → observe.js (hook) → observations-structural.jsonl (metadata only)
                                              ↓
                                observer-analyze.js (Stop hook)
                                checks threshold (50+ new observations)
                                              ↓
                                Spawns claude --model opus
                                Reads structural data, writes instinct files
                                              ↓
                                instincts/personal/*.md (YAML+MD)
                                              ↓
                                /evolve → clusters → skills
                                /wisdom → cross-reference → recommendations
```

**Security model**: Observations are split into two streams:
- **Structural** (tool names, file paths, command previews, exit codes) — fed to the automatic Opus observer. Contains no external content, eliminating prompt injection surface.
- **Content** (full input/output with secret scrubbing) — only accessible via CLI with output sanitization. Never fed to automated analysis.

All CLI output passes through `sanitizeForDisplay()` which strips XML-like tags, directive patterns, and collapses code blocks before display.

## Installation

### Project-level (recommended)
Copy the skills you want into your project:

```bash
# All skills
cp -r skills/ your-project/.claude/skills/

# Or just specific ones
cp -r skills/grill-me skills/research-gate your-project/.claude/skills/
```

### Personal (all projects)
Copy to your personal skills directory:

```bash
cp -r skills/ ~/.claude/skills/
```

### Enable continuous learning (optional)

If you installed `/evolve`, copy its scripts and add observation hooks to your **project-level** settings file (`~/.claude/projects/<project-hash>/settings.json`):

```bash
cp -r skills/evolve/scripts/ your-project/.claude/scripts/
```

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Edit|Write|Read|Glob|Grep|Agent",
        "hooks": [{
          "type": "command",
          "command": "node \"$CLAUDE_PROJECT_DIR/.claude/scripts/observe.js\" 2>/dev/null || true",
          "timeout": 5,
          "async": true
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash|Edit|Write|Read|Glob|Grep|Agent",
        "hooks": [{
          "type": "command",
          "command": "node \"$CLAUDE_PROJECT_DIR/.claude/scripts/observe.js\" 2>/dev/null || true",
          "timeout": 5,
          "async": true
        }]
      }
    ],
    "Stop": [
      {
        "hooks": [{
          "type": "command",
          "command": "node \"$CLAUDE_PROJECT_DIR/.claude/scripts/observer-analyze.js\" 2>/dev/null || true",
          "timeout": 10,
          "async": true
        }]
      }
    ]
  }
}
```

## Configuration

These skills work with any codebase out of the box. Customize for your project:

- **`/review-impl`**: The grading rubric weights (Functionality 40%, Design 25%, Data integrity 20%, Performance 15%) can be adjusted for your priorities
- **`/write-plan`**: The "Done When" acceptance criteria template can be extended with project-specific assertion types
- **`/grill-me`**: The 7 question branches cover most features; add domain-specific branches in the "Edge Cases" section
- **`/cascade-orchestration`**: The Skill Integration Map is a template — populate it with your project's skill mappings
- **`/full-stack-build`**: Update `references/api-boilerplate.md` and `references/design-review-checklist.md` with your project's patterns
- **`/frontend-design`**: Replace color tokens and component patterns with your project's design system
- **`/deploy-all`**: Configure the project table with your Cloudflare Pages project names and CI workflows
- **`/env-audit`**: Customize the context table with your project's runtime environments
- **`/schema-check`**: Update the KV key patterns and DB table list with your project's schema
- **Session skills** (`/start-day`, `/session-notes`, `/insight`, `/triage-ideas`): Require [Obsidian](https://obsidian.md) with CLI access. Set `{{vault_path}}` and `{{project}}` placeholders to match your vault structure. Auto-detects Obsidian binary on Windows/macOS/Linux
- **Document skills** (`/pdf`, `/docx`, `/xlsx`): Install required npm packages on first use (`pdf-lib`, `docx`, `exceljs`)
- **Creative skills** (`/algorithmic-art`, `/canvas-design`): Generate standalone HTML files or use canvas APIs

## Requirements

- Claude Code CLI (latest version recommended)
- All agent dispatches use `model: "opus"` by default for best results
- Session management skills require [Obsidian](https://obsidian.md) with CLI access
- Continuous learning pipeline requires Node.js for hook scripts

## How It Works

The skills use Claude Code's Agent tool to dispatch parallel subagents. Each skill documents:
- Which agents to dispatch and what they do
- Whether they run in parallel (Fan-Out/Fan-In) or sequential (Pipeline)
- Whether they need worktree isolation (code-modifying agents)
- Escalation paths when the skill doesn't resolve the issue

The `/cascade-orchestration` skill documents the 5 reusable patterns that all other skills follow.

## License

MIT
