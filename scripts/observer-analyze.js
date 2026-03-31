#!/usr/bin/env node
// Automatic observer — analyzes accumulated observations and writes instinct files
// Runs as async Stop hook. Checks threshold, spawns claude CLI for analysis.
// Uses Opus 4.6 for maximum pattern detection quality.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Guard: prevent recursion when observer spawns claude
if (process.env.ECC_SKIP_OBSERVE === '1') process.exit(0);

const HOMUNCULUS_DIR = process.env.CLAUDE_PROJECT_DIR
  ? path.join(process.env.CLAUDE_PROJECT_DIR, '.claude', 'homunculus')
  : path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'homunculus');
const OBSERVATION_THRESHOLD = 50; // minimum new observations before analysis
const ANALYSIS_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes between analyses
const MAX_OBSERVATIONS_TO_ANALYZE = 500;

function getActiveProject() {
  const registryFile = path.join(HOMUNCULUS_DIR, 'projects.json');
  try {
    const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
    // Find most recently seen project
    let latest = null;
    for (const [id, info] of Object.entries(registry)) {
      if (!latest || new Date(info.last_seen) > new Date(latest.last_seen)) {
        latest = { id, ...info };
      }
    }
    return latest;
  } catch { return null; }
}

function countNewObservations(projectId) {
  const projectDir = path.join(HOMUNCULUS_DIR, 'projects', projectId);
  const obsFile = path.join(projectDir, 'observations-structural.jsonl');
  const markerFile = path.join(projectDir, '.last-analysis');

  let lastAnalysis = 0;
  try { lastAnalysis = parseInt(fs.readFileSync(markerFile, 'utf8').trim()); } catch {}

  let count = 0;
  try {
    const lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n');
    for (const line of lines) {
      try {
        const obs = JSON.parse(line);
        if (new Date(obs.timestamp).getTime() > lastAnalysis) count++;
      } catch {}
    }
  } catch {}
  return count;
}

function getRecentObservations(projectId, max = MAX_OBSERVATIONS_TO_ANALYZE) {
  const obsFile = path.join(HOMUNCULUS_DIR, 'projects', projectId, 'observations-structural.jsonl');
  try {
    const lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n');
    return lines.slice(-max); // tail sampling
  } catch { return []; }
}

function getExistingInstincts(projectId) {
  const dirs = [
    path.join(HOMUNCULUS_DIR, 'instincts', 'personal'),
    path.join(HOMUNCULUS_DIR, 'projects', projectId, 'instincts', 'personal'),
  ];
  const instincts = [];
  for (const dir of dirs) {
    try {
      for (const file of fs.readdirSync(dir)) {
        if (file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml')) {
          instincts.push(fs.readFileSync(path.join(dir, file), 'utf8'));
        }
      }
    } catch {}
  }
  return instincts;
}

// Main
const project = getActiveProject();
if (!project) process.exit(0);

const newCount = countNewObservations(project.id);
if (newCount < OBSERVATION_THRESHOLD) process.exit(0);

// Cooldown check
const markerFile = path.join(HOMUNCULUS_DIR, 'projects', project.id, '.last-analysis');
try {
  const lastTime = parseInt(fs.readFileSync(markerFile, 'utf8').trim());
  if (Date.now() - lastTime < ANALYSIS_COOLDOWN_MS) process.exit(0);
} catch {}

// Threshold met — run analysis
const observations = getRecentObservations(project.id);
const existingInstincts = getExistingInstincts(project.id);
const instinctsDir = path.join(HOMUNCULUS_DIR, 'projects', project.id, 'instincts', 'personal');
fs.mkdirSync(instinctsDir, { recursive: true });

const analysisPrompt = `You are analyzing tool usage observations from a Claude Code session to extract reusable behavioral patterns ("instincts").

## Project
Name: ${project.name}
ID: ${project.id}

## Existing Instincts (${existingInstincts.length} total)
${existingInstincts.length > 0 ? existingInstincts.slice(0, 20).join('\n---\n') : 'None yet.'}

## Recent Observations (${observations.length} tool calls)
${observations.join('\n')}

## Task
Analyze the observations for patterns that occur 3+ times:

1. **User corrections**: Follow-up that corrects Claude's approach
2. **Error→fix sequences**: Same error resolved the same way repeatedly
3. **Repeated workflows**: Same tool sequence used multiple times
4. **Tool preferences**: Consistent preference for certain approaches
5. **Code style patterns**: Naming, structure, formatting preferences

For each pattern found, write an instinct file to: ${instinctsDir.replace(/\\/g, '/')}

Use this EXACT format for each file (filename = kebab-case-id.md):

\`\`\`markdown
---
id: kebab-case-unique-id
trigger: "when [specific condition]"
confidence: [0.3-0.9 based on frequency: 3-5 occurrences=0.5, 6-10=0.7, 11+=0.85]
domain: [code-style|testing|git|debugging|workflow|file-patterns]
source: session-observation
scope: project
project_id: ${project.id}
project_name: ${project.name}
created: ${new Date().toISOString().split('T')[0]}
---

# [Title]

## Action
[What to do when trigger fires]

## Evidence
- Observed N instances of this pattern
- [Specific examples from observations]
\`\`\`

Rules:
- Only create instincts for patterns with 3+ observations
- Don't duplicate existing instincts (check the list above)
- Boost confidence of existing instincts by +0.05 if you see confirming evidence (edit the existing file)
- Decay confidence by -0.1 if you see contradicting evidence
- Be specific in triggers — "when writing React components" not "when coding"
- Skip trivial patterns (file reads, basic navigation)

Write each instinct as a separate file. If no meaningful patterns found, write nothing.`;

// Write analysis prompt to temp file
const promptFile = path.join(HOMUNCULUS_DIR, 'projects', project.id, '.analysis-prompt.md');
fs.writeFileSync(promptFile, analysisPrompt);

// Update marker BEFORE spawning (prevents re-triggering)
fs.writeFileSync(markerFile, String(Date.now()));

// Spawn claude CLI in background for analysis
// Uses --print for non-interactive, --model opus for max quality
try {
  const child = spawn('claude', [
    '--print',
    '--model', 'opus',
    '--max-turns', '15',
    '--allowedTools', 'Read,Write,Glob',
    '-p', `Read the analysis prompt at ${promptFile.replace(/\\/g, '/')} and follow its instructions exactly. Write instinct files as specified. Be thorough but only create instincts for genuinely repeated patterns.`
  ], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, ECC_SKIP_OBSERVE: '1' },
  });
  child.unref();

  // Log the analysis trigger
  const logFile = path.join(HOMUNCULUS_DIR, 'analysis-log.jsonl');
  fs.appendFileSync(logFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    project_id: project.id,
    project_name: project.name,
    observations_analyzed: observations.length,
    new_since_last: newCount,
  }) + '\n');
} catch (err) {
  // Silent failure
  process.exit(0);
}
