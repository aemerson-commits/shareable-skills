---
name: evolve
description: "Continuous learning pipeline — observes tool usage, detects repeated patterns, and generates instincts (reusable behavioral rules). Pairs with /wisdom for weekly review."
user-invocable: true
---

# Evolve — Continuous Learning Pipeline

Automatic behavioral pattern extraction from Claude Code sessions. Observes tool usage, detects repeated patterns, and generates "instincts" (reusable behavioral rules) that improve future sessions.

## Quick Start

### 1. Install the hooks

Add to your **project-level** settings file (`~/.claude/projects/<project-hash>/settings.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Edit|Write|Read|Glob|Grep|Agent",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/scripts/observe.js\" 2>/dev/null || true",
            "timeout": 5,
            "async": true
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash|Edit|Write|Read|Glob|Grep|Agent",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/scripts/observe.js\" 2>/dev/null || true",
            "timeout": 5,
            "async": true
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/scripts/observer-analyze.js\" 2>/dev/null || true",
            "timeout": 10,
            "async": true
          }
        ]
      }
    ]
  }
}
```

### 2. Add to .gitignore

```gitignore
# Observations (local session data)
.claude/homunculus/projects/*/observations-structural.jsonl
.claude/homunculus/projects/*/observations-content.jsonl
.claude/homunculus/projects/*/observations.archive/
.claude/homunculus/projects/*/.last-analysis
.claude/homunculus/projects/*/.analysis-prompt.md
.claude/homunculus/analysis-log.jsonl

# Generated instincts (local learning data)
homunculus/
```

### 3. Use it

Just work normally. Observations accumulate automatically. After 50+ new observations, the Stop hook triggers Opus analysis which writes instinct files. Run `/evolve status` to check progress.

## Trigger

When the user says "evolve", "check instincts", "learning status", "prune instincts", or "promote patterns".

## Commands

**Important**: The CLI requires `CLAUDE_PROJECT_DIR` to be set. When running manually:
```bash
CLAUDE_PROJECT_DIR="$(pwd)" node .claude/scripts/instinct-cli.js <command>
```

Inside Claude Code sessions, `CLAUDE_PROJECT_DIR` is set automatically by the hook runner.

### `/evolve status`
Show observation counts, instinct counts, last analysis time.

### `/evolve list`
List all instincts with confidence scores, grouped by project and scope.

### `/evolve`
Analyze instinct clusters and show evolution candidates (skills, commands, agents).

### `/evolve generate`
Generate skill/command/agent files from qualified instinct clusters.

### `/evolve prune`
Remove pending instincts older than 30 days (dry run by default). Use `--no-dry-run` to execute.

## Architecture

### Data Flow
```
Tool calls --> observe.js (PreToolUse/PostToolUse hook)
               |
               |-> observations-structural.jsonl (metadata only, injection-safe)
               |-> observations-content.jsonl (full I/O, secrets scrubbed)
                                    |
                     observer-analyze.js (Stop hook)
                     checks: 50+ new obs AND 30min cooldown
                                    |
                     Spawns: claude --print --model opus
                     Reads observations, writes instinct .md files
                                    |
                     homunculus/instincts/<project-id>/*.md
                                    |
                     /evolve --> clusters --> skills
                     /wisdom --> cross-reference --> recommendations
```

### Directory Layout

```
<repo>/
|-- .claude/
|   |-- scripts/
|   |   |-- observe.js              # Hook: logs tool calls to JSONL
|   |   |-- observer-analyze.js     # Hook: triggers analysis at threshold
|   |   |-- instinct-cli.js         # CLI: list/evolve/prune/status
|   |-- homunculus/                  # Observation data (gitignored)
|       |-- projects.json            # Project registry
|       |-- analysis-log.jsonl       # Analysis run history
|       |-- projects/<hash>/
|           |-- observations-structural.jsonl
|           |-- observations-content.jsonl
|           |-- .last-analysis       # Timestamp marker
|           |-- .analysis-prompt.md  # Last analysis prompt
|-- homunculus/                      # Generated instincts (gitignored)
    |-- instincts/<project-id>/
        |-- build-verify-after-edits.md
        |-- prefer-edit-over-write.md
```

### Why two directories?

**Critical design constraint**: Claude Code's Write tool blocks writes to `.claude/` directories, even with `--dangerously-skip-permissions`. This is a hard security restriction.

- **`.claude/homunculus/`** — Observations written by Node.js (`fs.appendFileSync`), no Claude CLI involvement. Works fine.
- **`homunculus/`** (repo root) — Instincts written by the spawned `claude --print` analysis process using the Write tool. Must be outside `.claude/`.

### Instinct Schema
```yaml
---
id: kebab-case-unique-id
trigger: "when [specific condition]"
confidence: 0.7  # 0.3-0.9
domain: code-style|testing|git|debugging|workflow|file-patterns
source: session-observation
scope: project|global
status: pending  # pending|covered|promoted|evolved|contradicted|pruned
project_id: 12-char-hash
project_name: project-name
created: YYYY-MM-DD
---

# Title

## Action
What to do when the trigger condition is met.

## Evidence
- Observed N instances of this pattern
- Specific examples from observations
```

### Confidence Thresholds
| Score | Meaning | Based on |
|-------|---------|----------|
| 0.3 | Tentative — noted but not enforced | 3 occurrences |
| 0.5 | Moderate — applied when relevant | 3-5 occurrences |
| 0.7 | Strong — auto-approved | 6-10 occurrences |
| 0.85+ | Core behavior | 11+ occurrences |

Confidence is boosted +0.05 for confirming evidence and decayed -0.1 for contradicting evidence on subsequent analyses.

## Scripts Reference

### observe.js — Observation Logger

Runs as async PreToolUse/PostToolUse hook. Reads tool call JSON from stdin, writes two JSONL streams:

- **Structural** (metadata only): tool name, file paths, command previews, patterns, exit codes. Safe for automated analysis — no user content.
- **Content** (full I/O): complete tool input/output with secrets scrubbed. For manual review only.

Features:
- Secret scrubbing (API keys, tokens, passwords, connection strings)
- Truncation (3KB per field)
- Auto-rotation at 10MB per file
- Project identification via git remote hash
- Recursion guard (`ECC_SKIP_OBSERVE=1`)

### observer-analyze.js — Analysis Trigger

Runs as async Stop hook. Checks if enough new observations have accumulated:

1. Finds the most recently active project
2. Counts observations since last analysis
3. If 50+ new observations AND 30min cooldown elapsed:
   - Generates analysis prompt with recent observations + existing instincts
   - Spawns `claude --print --model opus` in background
   - The spawned process reads observations, identifies patterns, writes instinct files

Configuration constants:
| Constant | Default | Purpose |
|----------|---------|---------|
| `OBSERVATION_THRESHOLD` | 50 | Minimum new observations before analysis |
| `ANALYSIS_COOLDOWN_MS` | 30 min | Minimum time between analyses |
| `MAX_OBSERVATIONS_TO_ANALYZE` | 200 | Cap on observations per analysis |

### instinct-cli.js — Management CLI

Commands: `status`, `list`, `evolve`, `prune`

Searches for instincts in both `.claude/homunculus/` (legacy) and `homunculus/instincts/` (current) directories. Displays sanitized output to prevent prompt injection from untrusted observation content.

## Platform Notes

### Windows
- `spawn('claude')` fails with ENOENT because Node.js can't resolve `claude.cmd` without a shell. Use `shell: true` in spawn options.
- Add `windowsHide: true` to prevent cmd.exe windows from flashing open.
- Path separators are normalized to forward slashes in the analysis prompt.

### macOS / Linux
- Should work without `shell: true` but it's kept for consistency.
- The `claude` binary is typically at `~/.npm-global/bin/claude` or in `/usr/local/bin/`.

### Settings File Location
Hooks MUST be in the **project-level** settings file:
```
~/.claude/projects/<project-hash>/settings.json
```
NOT in the repo's `.claude/settings.json` — that file is for permissions and project config, not hooks.

## Troubleshooting

### No observations accumulating
- Check hooks are in `~/.claude/projects/<hash>/settings.json` (not `.claude/settings.json`)
- Verify `observe.js` exists at `.claude/scripts/observe.js`
- Test manually: `echo '{}' | CLAUDE_PROJECT_DIR="$(pwd)" node .claude/scripts/observe.js`

### Analyses running but no instincts generated
- **Most likely**: Claude CLI can't write to `.claude/` — instincts must go to `homunculus/` at repo root
- Check analysis log: `tail .claude/homunculus/analysis-log.jsonl`
- Check the analysis prompt for correct write paths

### `spawn claude ENOENT` (Windows)
- Ensure `shell: true` and `windowsHide: true` are set in spawn options

### Too many project hashes
- Worktree agents create unique git remotes, generating separate project IDs
- This is expected — each worktree's observations are independent
- Use `/wisdom` weekly to deduplicate cross-hash instincts

## Workflow

1. **Automatic**: Observations accumulate from normal Claude Code usage (every tool call)
2. **Automatic**: When 50+ new observations accumulate, Opus analyzes and writes instincts
3. **Manual**: `/evolve status` to check observation counts and instinct generation
4. **Manual**: `/evolve list` to review generated instincts
5. **Weekly**: `/wisdom` to cross-reference instincts against skills and CLAUDE.md
6. **Manual**: `/evolve prune` to clean up stale pending instincts (30+ days old)
