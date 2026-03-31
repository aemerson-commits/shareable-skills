# Evolve — Continuous Learning Pipeline

Manage the instinct-based continuous learning system. Instincts are behavioral patterns extracted from tool usage observations that can be promoted into reusable skills.

## Trigger

When the user says "evolve", "check instincts", "learning status", "prune instincts", or "promote patterns".

## Commands

### `/evolve status`
Show the current state of the learning pipeline: observation counts, instinct counts, last analysis time, evolved skills.

```bash
node .claude/scripts/instinct-cli.js status
```

### `/evolve list`
List all instincts with confidence scores, grouped by project and scope.

```bash
node .claude/scripts/instinct-cli.js list
```

### `/evolve`
Analyze instinct clusters and show evolution candidates (skills, commands, agents that could be generated from instinct groups).

```bash
node .claude/scripts/instinct-cli.js evolve
```

### `/evolve generate`
Same as above but actually generates skill/command/agent files from qualified clusters.

```bash
node .claude/scripts/instinct-cli.js evolve --generate
```

### `/evolve prune`
Remove pending instincts older than 30 days (dry run by default).

```bash
# Preview what would be pruned
node .claude/scripts/instinct-cli.js prune

# Actually prune
node .claude/scripts/instinct-cli.js prune --no-dry-run
```

## Architecture

### Data Flow
```
Tool calls → observe.js (hook) → observations.jsonl
                                        ↓
                              observer-analyze.js (Stop hook)
                              checks threshold (50+ new obs)
                                        ↓
                              Spawns claude --model opus
                              Reads observations, writes instincts
                                        ↓
                              instincts/personal/*.md (YAML+MD)
                                        ↓
                              /evolve → clusters → skills
```

### Instinct Schema
```yaml
---
id: kebab-case-id
trigger: "when [condition]"
confidence: 0.7  # 0.3-0.9
domain: code-style|testing|git|debugging|workflow|file-patterns
source: session-observation
scope: project|global
project_id: 12-char-hash
project_name: project-name
created: YYYY-MM-DD
---
# Title
## Action
## Evidence
```

### Confidence Thresholds
| Score | Meaning |
|-------|---------|
| 0.3 | Tentative — suggested but not enforced |
| 0.5 | Moderate — applied when relevant |
| 0.7 | Strong — auto-approved |
| 0.85+ | Core behavior |

### Files
| File | Purpose |
|------|---------|
| `~/.claude/scripts/observe.js` | Hook script — logs tool calls to JSONL |
| `~/.claude/scripts/observer-analyze.js` | Stop hook — triggers Opus analysis at threshold |
| `~/.claude/scripts/instinct-cli.js` | CLI for list/evolve/prune/status |
| `~/.claude/homunculus/` | Root directory for all learning data |
| `~/.claude/homunculus/projects.json` | Project registry |
| `~/.claude/homunculus/projects/<hash>/observations.jsonl` | Raw observations |
| `~/.claude/homunculus/projects/<hash>/instincts/personal/` | Project instincts |
| `~/.claude/homunculus/instincts/personal/` | Global instincts |
| `~/.claude/homunculus/evolved/skills/` | Generated skill files |

## Workflow

1. **Automatic**: Observations accumulate from normal usage (hooks fire on every tool call)
2. **Automatic**: When 50+ new observations accumulate, Opus analyzes and writes instincts
3. **Manual**: Run `/evolve` periodically to review instinct clusters
4. **Manual**: Run `/evolve generate` to create skills from high-confidence clusters
5. **Manual**: Run `/evolve prune` to clean up stale pending instincts