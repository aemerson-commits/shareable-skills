#!/usr/bin/env node
// Instinct CLI — manage, evolve, prune, and promote instincts
// Usage: node instinct-cli.js <command> [options]
// Commands: list, evolve, prune, promote, status
//
// SECURITY: Content from observations-content.jsonl is UNTRUSTED.
// All content output is sanitized through sanitizeForDisplay() before
// being printed, to prevent prompt injection when Claude reads CLI output.

const fs = require('fs');
const path = require('path');
const HOMUNCULUS_DIR = process.env.CLAUDE_PROJECT_DIR
  ? path.join(process.env.CLAUDE_PROJECT_DIR, '.claude', 'homunculus')
  : path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'homunculus');
const PRUNE_MAX_AGE_DAYS = 30;
const PROMOTE_MIN_PROJECTS = 2;
const PROMOTE_CONFIDENCE_THRESHOLD = 0.8;

// Sanitize untrusted content before displaying to Claude.
// Strips patterns that could be interpreted as instructions or system prompts.
function sanitizeForDisplay(text, maxLen = 200) {
  if (!text || typeof text !== 'string') return '';
  let s = text
    .replace(/<\/?(?:system|user|assistant|function|tool)[^>]*>/gi, '[tag-removed]')
    .replace(/(?:^|\n)\s*(?:IMPORTANT|CRITICAL|OVERRIDE|IGNORE|SYSTEM|INSTRUCTION)[:\s]/gi, '[directive-removed]')
    .replace(/```[\s\S]*?```/g, '[code-block]')  // collapse code blocks
    .replace(/\n{3,}/g, '\n\n');                   // collapse whitespace
  return s.length > maxLen ? s.slice(0, maxLen) + '...' : s;
}

// Parse YAML frontmatter from markdown
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: match[2] };
}

function loadInstincts(dirs) {
  const instincts = [];
  for (const dir of dirs) {
    try {
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.md') && !file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        const { meta, body } = parseFrontmatter(content);
        instincts.push({ file: path.join(dir, file), ...meta, body, confidence: parseFloat(meta.confidence) || 0.5 });
      }
    } catch {}
  }
  return instincts;
}

function getAllProjects() {
  const projectsDir = path.join(HOMUNCULUS_DIR, 'projects');
  try {
    return fs.readdirSync(projectsDir).filter(d => {
      try { return fs.statSync(path.join(projectsDir, d)).isDirectory(); } catch { return false; }
    });
  } catch { return []; }
}

// --- Commands ---

function cmdList() {
  const projects = getAllProjects();
  const globalInstincts = loadInstincts([
    path.join(HOMUNCULUS_DIR, 'instincts', 'personal'),
    path.join(HOMUNCULUS_DIR, 'instincts', 'pending'),
  ]);

  console.log(`\n=== Global Instincts (${globalInstincts.length}) ===`);
  for (const i of globalInstincts.sort((a, b) => b.confidence - a.confidence)) {
    console.log(`  [${i.confidence.toFixed(2)}] ${sanitizeForDisplay(i.id || path.basename(i.file), 40)} — ${sanitizeForDisplay(i.trigger || 'no trigger', 60)} (${i.domain || '?'})`);
  }

  for (const pid of projects) {
    const projectInstincts = loadInstincts([
      path.join(HOMUNCULUS_DIR, 'projects', pid, 'instincts', 'personal'),
    ]);
    if (projectInstincts.length === 0) continue;
    let registry = {};
    try { registry = JSON.parse(fs.readFileSync(path.join(HOMUNCULUS_DIR, 'projects.json'), 'utf8')); } catch {}
    const name = registry[pid]?.name || pid;
    console.log(`\n=== ${name} (${projectInstincts.length}) ===`);
    for (const i of projectInstincts.sort((a, b) => b.confidence - a.confidence)) {
      console.log(`  [${i.confidence.toFixed(2)}] ${sanitizeForDisplay(i.id || path.basename(i.file), 40)} — ${sanitizeForDisplay(i.trigger || 'no trigger', 60)} (${i.domain || '?'})`);
    }
  }
}

function cmdEvolve(options = {}) {
  const generate = options.generate || false;
  const allInstincts = [];

  // Load all instincts
  allInstincts.push(...loadInstincts([path.join(HOMUNCULUS_DIR, 'instincts', 'personal')]));
  for (const pid of getAllProjects()) {
    allInstincts.push(...loadInstincts([path.join(HOMUNCULUS_DIR, 'projects', pid, 'instincts', 'personal')]));
  }

  if (allInstincts.length === 0) {
    console.log('No instincts to evolve. Run observations first.');
    return;
  }

  // Group by domain
  const byDomain = {};
  for (const i of allInstincts) {
    const d = i.domain || 'unknown';
    if (!byDomain[d]) byDomain[d] = [];
    byDomain[d].push(i);
  }

  // Cluster by normalized trigger
  const STRIP_WORDS = new Set(['when', 'creating', 'writing', 'adding', 'implementing', 'testing', 'using', 'in', 'a', 'the', 'for', 'to', 'with']);
  function normalizeTrigger(trigger) {
    if (!trigger) return '';
    return trigger.toLowerCase().split(/\s+/).filter(w => !STRIP_WORDS.has(w)).sort().join(' ');
  }

  const clusters = [];
  for (const [domain, instincts] of Object.entries(byDomain)) {
    const triggerGroups = {};
    for (const i of instincts) {
      const key = normalizeTrigger(i.trigger);
      if (!triggerGroups[key]) triggerGroups[key] = [];
      triggerGroups[key].push(i);
    }

    for (const [trigger, group] of Object.entries(triggerGroups)) {
      if (group.length >= 2) {
        const avgConf = group.reduce((s, i) => s + i.confidence, 0) / group.length;
        let type = 'skill';
        if (group.length >= 3 && avgConf >= 0.75) type = 'agent';
        if (domain === 'workflow' && avgConf >= 0.7) type = 'command';
        clusters.push({ domain, trigger, type, instincts: group, avgConfidence: avgConf });
      }
    }
  }

  // Sort by cluster size then confidence
  clusters.sort((a, b) => b.instincts.length - a.instincts.length || b.avgConfidence - a.avgConfidence);

  console.log(`\n=== Evolution Candidates (${clusters.length} clusters from ${allInstincts.length} instincts) ===\n`);
  for (const c of clusters) {
    console.log(`  [${c.type.toUpperCase()}] ${c.domain}/${sanitizeForDisplay(c.trigger || 'ungrouped', 60)} — ${c.instincts.length} instincts, avg confidence ${c.avgConfidence.toFixed(2)}`);
    for (const i of c.instincts) {
      console.log(`    - ${sanitizeForDisplay(i.id, 40)} (${i.confidence.toFixed(2)})`);
    }
  }

  // Cross-project promotion candidates
  const idProjects = {};
  for (const pid of getAllProjects()) {
    const instincts = loadInstincts([path.join(HOMUNCULUS_DIR, 'projects', pid, 'instincts', 'personal')]);
    for (const i of instincts) {
      if (!i.id) continue;
      if (!idProjects[i.id]) idProjects[i.id] = [];
      idProjects[i.id].push({ projectId: pid, confidence: i.confidence });
    }
  }
  const promotable = Object.entries(idProjects)
    .filter(([, projects]) => projects.length >= PROMOTE_MIN_PROJECTS)
    .filter(([, projects]) => {
      const avg = projects.reduce((s, p) => s + p.confidence, 0) / projects.length;
      return avg >= PROMOTE_CONFIDENCE_THRESHOLD;
    });

  if (promotable.length > 0) {
    console.log(`\n=== Promotion Candidates (${promotable.length}) ===`);
    for (const [id, projects] of promotable) {
      const avg = (projects.reduce((s, p) => s + p.confidence, 0) / projects.length).toFixed(2);
      console.log(`  ${id} — seen in ${projects.length} projects, avg confidence ${avg}`);
    }
  }

  if (generate && clusters.length > 0) {
    const evolvedDir = path.join(HOMUNCULUS_DIR, 'evolved', 'skills');
    fs.mkdirSync(evolvedDir, { recursive: true });
    let generated = 0;
    for (const c of clusters.filter(cl => cl.type === 'skill')) {
      const skillName = c.trigger.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `${c.domain}-pattern`;
      const skillDir = path.join(evolvedDir, skillName);
      fs.mkdirSync(skillDir, { recursive: true });
      const content = `# ${skillName}\n\n${c.domain} skill evolved from ${c.instincts.length} instincts (avg confidence ${c.avgConfidence.toFixed(2)}).\n\n## Trigger\n\n${c.instincts[0]?.trigger || 'Auto-detected pattern'}\n\n## Behaviors\n\n${c.instincts.map(i => `- **${i.id}**: ${i.body?.split('\n').find(l => l.startsWith('## Action'))?.replace('## Action', '').trim() || i.trigger}`).join('\n')}\n`;
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);
      generated++;
    }
    console.log(`\nGenerated ${generated} skill files in ${evolvedDir}`);
  }
}

function cmdPrune(options = {}) {
  const maxAge = options.maxAge || PRUNE_MAX_AGE_DAYS;
  const dryRun = options.dryRun !== false;
  const now = Date.now();
  let pruned = 0;

  const pendingDirs = [path.join(HOMUNCULUS_DIR, 'instincts', 'pending')];
  for (const pid of getAllProjects()) {
    pendingDirs.push(path.join(HOMUNCULUS_DIR, 'projects', pid, 'instincts', 'pending'));
  }

  for (const dir of pendingDirs) {
    try {
      for (const file of fs.readdirSync(dir)) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const { meta } = parseFrontmatter(content);
        let created;
        if (meta.created) {
          created = new Date(meta.created).getTime();
        } else {
          created = fs.statSync(filePath).mtimeMs;
        }
        const ageDays = (now - created) / (1000 * 60 * 60 * 24);
        if (ageDays >= maxAge) {
          if (dryRun) {
            console.log(`  [DRY RUN] Would prune: ${file} (${Math.round(ageDays)} days old)`);
          } else {
            fs.unlinkSync(filePath);
            console.log(`  Pruned: ${file} (${Math.round(ageDays)} days old)`);
          }
          pruned++;
        } else if (ageDays >= maxAge - 7) {
          console.log(`  Warning: ${file} expires in ${Math.round(maxAge - ageDays)} days`);
        }
      }
    } catch {}
  }
  console.log(`\n${dryRun ? 'Would prune' : 'Pruned'} ${pruned} pending instincts (max age: ${maxAge} days)`);
}

function cmdStatus() {
  const projects = getAllProjects();
  let totalInstincts = 0;
  let totalObservations = 0;

  console.log('\n=== Continuous Learning Status ===\n');

  // Global
  const globalInstincts = loadInstincts([
    path.join(HOMUNCULUS_DIR, 'instincts', 'personal'),
    path.join(HOMUNCULUS_DIR, 'instincts', 'pending'),
  ]);
  totalInstincts += globalInstincts.length;
  console.log(`Global instincts: ${globalInstincts.length}`);

  // Per project
  for (const pid of projects) {
    const instincts = loadInstincts([path.join(HOMUNCULUS_DIR, 'projects', pid, 'instincts', 'personal')]);
    totalInstincts += instincts.length;

    let obsCount = 0;
    const obsFile = path.join(HOMUNCULUS_DIR, 'projects', pid, 'observations-structural.jsonl');
    try { obsCount = fs.readFileSync(obsFile, 'utf8').trim().split('\n').length; } catch {}
    totalObservations += obsCount;

    let lastAnalysis = 'never';
    try {
      const ts = parseInt(fs.readFileSync(path.join(HOMUNCULUS_DIR, 'projects', pid, '.last-analysis'), 'utf8'));
      lastAnalysis = new Date(ts).toISOString();
    } catch {}

    const registry = JSON.parse(fs.readFileSync(path.join(HOMUNCULUS_DIR, 'projects.json'), 'utf8') || '{}');
    const name = registry[pid]?.name || pid;
    console.log(`\n${name} (${pid}):`);
    console.log(`  Observations: ${obsCount}`);
    console.log(`  Instincts: ${instincts.length}`);
    console.log(`  Last analysis: ${lastAnalysis}`);
  }

  // Analysis log
  const logFile = path.join(HOMUNCULUS_DIR, 'analysis-log.jsonl');
  let analysisCount = 0;
  try { analysisCount = fs.readFileSync(logFile, 'utf8').trim().split('\n').length; } catch {}

  console.log(`\n--- Totals ---`);
  console.log(`Total instincts: ${totalInstincts}`);
  console.log(`Total observations: ${totalObservations}`);
  console.log(`Total analyses run: ${analysisCount}`);

  // Evolved skills
  const evolvedDir = path.join(HOMUNCULUS_DIR, 'evolved', 'skills');
  let evolvedCount = 0;
  try { evolvedCount = fs.readdirSync(evolvedDir).filter(d => fs.statSync(path.join(evolvedDir, d)).isDirectory()).length; } catch {}
  console.log(`Evolved skills: ${evolvedCount}`);
}

// --- CLI ---
const [,, cmd, ...args] = process.argv;
const options = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--generate') options.generate = true;
  if (args[i] === '--dry-run') options.dryRun = true;
  if (args[i] === '--no-dry-run') options.dryRun = false;
  if (args[i] === '--max-age' && args[i + 1]) { options.maxAge = parseInt(args[++i]); }
}

switch (cmd) {
  case 'list': cmdList(); break;
  case 'evolve': cmdEvolve(options); break;
  case 'prune': cmdPrune(options); break;
  case 'status': cmdStatus(); break;
  default:
    console.log('Usage: node instinct-cli.js <list|evolve|prune|status> [--generate] [--dry-run] [--max-age N]');
}
