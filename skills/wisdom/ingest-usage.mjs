#!/usr/bin/env node
// Wisdom Phase 1, Step C — ingest the latest `/insights` usage report.
//
// `/insights` is a built-in Claude Code command the USER runs; wisdom cannot invoke it.
// This script only READS the artifacts a prior `/insights` run left in ~/.claude/usage-data/:
//   - report.html  : the narrative report (suggestions, friction, features-to-try) — rendered prose
//   - facets/*.json: one machine-readable record per analyzed session (the robust signal)
//
// Output (stdout) is the Usage Signal for Phase 2:
//   - freshness verdict
//   - facets aggregate (outcome / friction / success / satisfaction tallies)
//   - path to a tag-stripped report.txt for the Opus analyzer to Read
//
// If no report exists or it's older than FRESH_DAYS, prints "USAGE_SIGNAL: none" and exits 0
// (degrade — wisdom never blocks on /insights; see SKILL.md freshness policy).
//
// Run: node .claude/skills/wisdom/ingest-usage.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FRESH_DAYS = 7;
const dir = path.join(os.homedir(), '.claude', 'usage-data');
const reportHtml = path.join(dir, 'report.html');
const facetsDir = path.join(dir, 'facets');
const reportTxt = path.join(dir, 'report.txt');

function none(reason) {
  console.log(`USAGE_SIGNAL: none — ${reason}`);
  console.log('Run /insights, then re-run wisdom to fold in usage friction.');
  process.exit(0);
}

if (!fs.existsSync(reportHtml)) none('no /insights report on disk');

const ageDays = (Date.now() - fs.statSync(reportHtml).mtimeMs) / 86400000;
if (ageDays > FRESH_DAYS) none(`report is ${ageDays.toFixed(1)} days old (> ${FRESH_DAYS})`);

console.log(`USAGE_SIGNAL: fresh — report.html is ${ageDays.toFixed(1)} days old`);

// --- Aggregate the facets (machine-readable per-session records) ---
const agg = { n: 0, outcome: {}, friction: {}, success: {}, sat: {} };
if (fs.existsSync(facetsDir)) {
  for (const f of fs.readdirSync(facetsDir)) {
    if (!f.endsWith('.json')) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(facetsDir, f), 'utf8')); } catch { continue; }
    agg.n++;
    if (j.outcome) agg.outcome[j.outcome] = (agg.outcome[j.outcome] || 0) + 1;
    for (const k in (j.friction_counts || {})) agg.friction[k] = (agg.friction[k] || 0) + (j.friction_counts[k] || 0);
    if (j.primary_success) agg.success[j.primary_success] = (agg.success[j.primary_success] || 0) + 1;
    for (const k in (j.user_satisfaction_counts || {})) agg.sat[k] = (agg.sat[k] || 0) + (j.user_satisfaction_counts[k] || 0);
  }
}
const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);

console.log(`SESSIONS: ${agg.n}`);
console.log(`OUTCOMES: ${JSON.stringify(agg.outcome)}`);
console.log(`FRICTION (highest first): ${JSON.stringify(top(agg.friction))}`);
console.log(`PRIMARY_SUCCESS (highest first): ${JSON.stringify(top(agg.success))}`);
console.log(`SATISFACTION: ${JSON.stringify(agg.sat)}`);

// --- Strip report.html → report.txt (rendered prose; no embedded JSON) ---
const html = fs.readFileSync(reportHtml, 'utf8');
const txt = html
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
fs.writeFileSync(reportTxt, txt);
console.log(`REPORT_TEXT: ${reportTxt} (${txt.length} chars) — Phase 2: Read this for claude_md_additions, friction categories, features-to-try`);
