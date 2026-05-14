# Changelog

## 5.1.0 (2026-05-14)
27 skill updates synced from internal source, sanitized to match v5.0.0 precedent. +772 / -205 lines.

### Development Pipeline
- `/research-gate` — added Persona block (scout mindset, anti-premature-commitment), new State/Timing/Race Hunt 5th agent, Implementation Boundaries block (ALWAYS/ASK/NEVER) in Phase 2 output template
- `/write-plan` — added Vertical Slicing section with good/bad examples, expanded State/Timing/Race Audit table (12 hazard rows), Always/Ask/Never carry-forward checklist item
- `/review-impl` — added full Persona block, new Phase 4c (Mutation Audit / Agent F) + Phase 4d (Write Cycle Test / Agent G), expanded Agent B with State/Timing/Race checklist
- `/grill-me` — tightened data-source question branch (generic DB/API/cache pattern)
- `/cascade-orchestration` — updated research-gate / review-impl agent counts (4→4-5, 3→3-7)
- `/debug-collaborate` — generalized React fiber-walk field-name example

### Build Orchestration
- `/worker-build` — added numeric-DOW caveat (named-days-only rule, `MON-FRI`/`MON`/`TUE` requirement), bulk-redeploy pattern, `node --check` syntax-check pattern, cron trigger re-registration recipe
- `/propagate-feature` — added Pre-Edit Divergence Check + CSS File Mapping subsection
- `/deploy-all` — added source directory gotcha warning

### Quality & Verification
- `/verify-complete` — added 2 new recipes: Shared-component scope claim + RBAC/permission claim (now 10 recipes)
- `/pre-merge-review` — added soft-default recommendation for 3+ project commits, two new SQL discipline rules (don't repurpose semantic tables; D1 write counter discipline), Section 5b A11y onClick guidance
- `/env-audit` — added CF Access AUD-per-app pattern, `wrangler secret put` redeploy gotcha
- `/audit-components` — added UI Label Audits section with charAt-fallback gotcha
- `/data-reconciliation` — added Phase 0 Identifier Probe (probe-before-fanout pattern), Verification Tooling patterns, identifier ambiguity + WHERE filter drop + record absorption added to Common Root Causes
- `/frontend-design` — added tactical patterns: unstable array deps + AbortController infinite loop, CSS shorthand vs longhand override, flex scroll chain requires every ancestor flex, CSS pattern audit before adding styles, modal overlay-click Pattern 1 vs Pattern 2
- `/schema-check` — placeholders for KV namespace ID and DB names

### Session Management
- `/start-day` — added Step 8 (Event Log Review with D1 query example), Step 9 (Friday Wisdom Check)
- `/session-notes` — `property:set` bug workaround (Obsidian 1.12.7 silent no-op), generalized vault paths
- `/insight` — added RUM/web-vitals section with threshold table
- `/triage-ideas` — added Roadmap.md scaffolding template

### Skill Maintenance & Learning
- `/skill-audit` — Check 6 uses auto-detecting CLI (no `CLAUDE_PROJECT_DIR` prefix needed), added SKILL.md Artifacts section
- `/evolve` — auto-detect project-root, Windows headless spawn improvement, 3 scripts updated (git-based project root resolution, direct `node cli.js` spawn, improved path derivation)
- `/wisdom` — tiered-approval architecture (Tier 1/2/3) with safety note and `status` schema table

### Reference & Conventions
- `/model-selection` — generic skill-type categories table
- `/throwaway-script` — replaced project-specific examples with generic cloud-API-probe + OAuth-token + database-probe shapes

### Misc
- `/html-slides` — generic slide-output default path, removed brand-color specifics
- `/worktree-guard` — generic API handler files in conflict patterns

### Skipped (already current after v5.0.0 sanitization)
- `webapp-testing`, `docx`, `full-stack-build`, `persistent-issue`, `deep-root-cause`, `full-stack-trace`, `isolation-test`, `temporal-forensics`, `regression-bisect`, `skill-creator`, `pdf`, `xlsx`, `mcp-builder`, `internal-comms`, `algorithmic-art`, `canvas-design`, `slack-gif-creator`, `theme-factory`, `web-artifacts-builder` — no behavioral changes since v5.0.0; existing sanitized versions remain current

## 5.0.0 (2026-04-27)
- Added `/model-selection` — per-agent model dispatch guide (Sonnet floor, Opus for critical review, effort-tier ladder)
- Added `/throwaway-script` — pattern for one-shot `.mjs` Node scripts that need `.env` secrets (location, ESM form, Windows path quirks)
- Major rewrite of `/verify-complete` — 8 per-claim-type verification recipes (deploy / CI / migration / cron / UI / checklist / schema / multi-item)
- Major additions to `/webapp-testing` — CF Access cookie-injection bypass, UI label audit + visual verification, RBAC Playwright pattern, bootstrap admin short-circuit gotcha
- Added Cron Trigger Verification section to `/worker-build` — silent-stuck gotcha, `modified_on` check, wipe-then-readd remedy, OAuth token expiry
- Updated `/deploy-all` — Monitor tool preferred over `gh run watch`, Opus-max guidance
- Major additions to `/frontend-design` — full design system stack (CSS tokens, Tailwind v4 `@theme inline`, shadcn/ui, theme system, anti-patterns)
- Updated `/pre-merge-review` — pre-flight validation, live endpoint testing, expanded SQL/migration discipline (NULL-distinct, ON CONFLICT)
- Updated `/session-notes` — Feature-Ship Checklist contract, MANDATORY agent dispatches, expanded help-content + skill-usage tracker steps
- Updated `/audit-components` — pre-edit consumer scan, post-edit completeness + re-grep verification
- Updated `/cascade-orchestration` — multi-project deploy-time smoke pattern
- Updated `/debug-collaborate` — React fiber walking for state inspection
- Updated `/worktree-guard` — 6-step worktree agent cherry-pick lifecycle
- Renamed `Reference & Conventions` category in manifest
- Total: 46 skills

## 4.2.0 (2026-04-06)
- Added .gitattributes to silence CRLF warnings
- Added CHANGELOG.md with full version history
- Added Quick Start section to README
- Added categories to manifest.json for skill discoverability
- Moved scripts/ into skills/evolve/scripts/ (evolve-specific, not general infra)
- Fixed missing YAML frontmatter on debug-collaborate and html-slides
- Removed HSS/Huntington company references from html-slides
- Updated GitHub repo description
- Updated installation docs for new structure

## 4.1.0 (2026-04-06)
- Added `/wisdom` skill — weekly knowledge review that cross-references evolve instincts against CLAUDE.md and skills
- Enhanced `/evolve` — full setup guide, two-directory architecture docs, instinct status lifecycle, Windows `windowsHide` fix
- Enhanced `/skill-audit` — added Check 6 (Learning Pipeline Health), generalized for public use
- Enhanced `/start-day` — Friday `/wisdom` prompt
- Renamed manifest from `agent-team-skills` to `shareable-skills`

## 4.0.0 (2026-04-05)
- Added continuous learning pipeline (`/evolve` + observation scripts)
- Added `/html-slides` — one-shot presentation slides from a single prompt
- Added observation hook scripts (`observe.js`, `observer-analyze.js`, `instinct-cli.js`)
- Total: 43 skills

## 3.0.0 (2026-04-04)
- Added 13 new skills: `/full-stack-build`, `/propagate-feature`, `/worker-build`, `/deploy-all`, `/worktree-guard`, `/verify-complete`, `/pre-merge-review`, `/schema-check`, `/env-audit`, `/audit-components`, `/webapp-testing`, `/data-reconciliation`, `/frontend-design`
- Updated 15 existing skills with generalized content
- Total: 41 skills

## 2.0.0 (2026-04-03)
- Added 11 new skills: `/pdf`, `/docx`, `/xlsx`, `/mcp-builder`, `/internal-comms`, `/web-artifacts-builder`, `/algorithmic-art`, `/canvas-design`, `/slack-gif-creator`, `/theme-factory`, `/debug-collaborate`
- Total: 28 skills

## 1.0.0 (2026-04-01)
- Added 6 meta-development skills: `/session-notes`, `/start-day`, `/insight`, `/triage-ideas`, `/skill-audit`, `/skill-creator`
- Total: 17 skills

## 0.1.0 (2026-03-30)
- Initial release — 11 generalized Claude Code skills
- Development pipeline: `/grill-me`, `/research-gate`, `/write-plan`, `/review-impl`, `/cascade-orchestration`
- Diagnostic escalation: `/persistent-issue`, `/deep-root-cause`, `/full-stack-trace`, `/isolation-test`, `/temporal-forensics`, `/regression-bisect`
