#!/usr/bin/env node
// Observation logger — captures tool calls to JSONL for continuous learning
// Runs as async PreToolUse/PostToolUse hook. Must be fast (<100ms typical).

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Guard: skip if we're inside an observer analysis to prevent recursion
if (process.env.ECC_SKIP_OBSERVE === '1') process.exit(0);

// Use project dir if available (travels with repo), fallback to user profile
const HOMUNCULUS_DIR = process.env.CLAUDE_PROJECT_DIR
  ? path.join(process.env.CLAUDE_PROJECT_DIR, '.claude', 'homunculus')
  : path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'homunculus');
const MAX_IO_LENGTH = 3000;
const SECRET_PATTERNS = [
  /(?:api[_-]?key|token|secret|password|credential|auth)["\s:=]+["']?[A-Za-z0-9_\-./+=]{8,}/gi,
  /(?:Bearer|Basic)\s+[A-Za-z0-9_\-./+=]{20,}/gi,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END/gi,
  // Emails intentionally NOT scrubbed — useful for workflow pattern detection
  /(?:Server|Data Source|Host)=[^;]+;.*(?:Password|Pwd)=[^;]+/gi, // connection strings
  /(?:postgresql|mysql|mongodb|redis):\/\/[^\s"']+/gi, // database URLs
  /(?:userName|password|pwd)\s*[:=]\s*["']?[^\s"',}{]+/gi, // key-value credentials
];

function scrubSecrets(text) {
  if (!text || typeof text !== 'string') return text;
  let scrubbed = text;
  for (const pattern of SECRET_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, '[REDACTED]');
  }
  return scrubbed;
}

function truncate(text, max = MAX_IO_LENGTH) {
  if (!text) return text;
  const str = typeof text === 'string' ? text : JSON.stringify(text);
  return str.length > max ? str.slice(0, max) + `...[truncated ${str.length - max} chars]` : str;
}

function rotateIfLarge(filePath, projectDir) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 10 * 1024 * 1024) {
      const archiveDir = path.join(projectDir, 'observations.archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.renameSync(filePath, path.join(archiveDir, `${path.basename(filePath, '.jsonl')}-${Date.now()}.jsonl`));
    }
  } catch {}
}

function getProjectId(cwd) {
  try {
    const remote = execSync('git remote get-url origin 2>/dev/null', { cwd, encoding: 'utf8' }).trim();
    if (remote) {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(remote).digest('hex').slice(0, 12);
    }
  } catch {}
  // Fallback: hash the cwd
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(cwd || 'unknown').digest('hex').slice(0, 12);
}

function getProjectName(cwd) {
  try {
    return path.basename(execSync('git rev-parse --show-toplevel 2>/dev/null', { cwd, encoding: 'utf8' }).trim());
  } catch {}
  return path.basename(cwd || 'unknown');
}

// Read JSON from stdin
const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const cwd = input.cwd || process.cwd();
    const projectId = getProjectId(cwd);
    const projectName = getProjectName(cwd);

    // Determine event type from hook context
    const hookEvent = input.hook_event_name || (input.tool_response !== undefined ? 'tool_complete' : 'tool_start');
    const isComplete = hookEvent === 'PostToolUse';

    // Extract structural metadata (safe for auto-analysis — no user/external content)
    const toolInput = input.tool_input || {};
    const structural = {
      timestamp: new Date().toISOString(),
      event: isComplete ? 'tool_complete' : 'tool_start',
      tool: input.tool_name || 'unknown',
      // Structural fields only — file paths, command names, patterns. No content bodies.
      file_path: toolInput.file_path || toolInput.filePath || null,
      command_preview: toolInput.command ? toolInput.command.split('\n')[0].slice(0, 120) : null,
      pattern: toolInput.pattern || null,
      glob_pattern: toolInput.glob || toolInput.pattern || null,
      exit_code: isComplete && input.tool_response ? (input.tool_response.exitCode ?? null) : null,
      success: isComplete ? (input.tool_response?.error ? false : true) : null,
      session: input.session_id || 'unknown',
      project_id: projectId,
      project_name: projectName,
    };

    // Full content observation (for manual review only — may contain untrusted data)
    const content = {
      timestamp: structural.timestamp,
      event: structural.event,
      tool: structural.tool,
      input: scrubSecrets(truncate(toolInput ? JSON.stringify(toolInput) : null)),
      output: isComplete ? scrubSecrets(truncate(input.tool_response ? JSON.stringify(input.tool_response) : null)) : null,
      session: structural.session,
      project_id: projectId,
      project_name: projectName,
    };

    const projectDir = path.join(HOMUNCULUS_DIR, 'projects', projectId);
    fs.mkdirSync(projectDir, { recursive: true });

    // Structural stream — fed to automatic Opus observer (injection-safe)
    const structFile = path.join(projectDir, 'observations-structural.jsonl');
    rotateIfLarge(structFile, projectDir);
    fs.appendFileSync(structFile, JSON.stringify(structural) + '\n');

    // Content stream — manual review only via /evolve list --content
    const contentFile = path.join(projectDir, 'observations-content.jsonl');
    rotateIfLarge(contentFile, projectDir);
    fs.appendFileSync(contentFile, JSON.stringify(content) + '\n');

    // Update project registry
    const registryFile = path.join(HOMUNCULUS_DIR, 'projects.json');
    let registry = {};
    try { registry = JSON.parse(fs.readFileSync(registryFile, 'utf8')); } catch {}
    registry[projectId] = {
      name: projectName,
      root: cwd,
      last_seen: new Date().toISOString(),
    };
    fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2));

  } catch (err) {
    // Silent failure — observation logging must never break the user's workflow
    process.exit(0);
  }
});