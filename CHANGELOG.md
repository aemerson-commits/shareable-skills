# Changelog

## 5.3.0 (2026-07-17)
18 skill updates synced from internal source (changes since 2026-06-23), sanitized. +206 / −11 lines. No new skills (49 total).

### Development Pipeline
- `/research-gate` — added Scratchpad HTML Discovery Page pattern for stakeholder scoping sessions
- `/write-plan` — expanded living-plan-doc conventions (re-read to recover scope, progressive edits, sub-track forking); added "read both implementations before designing a shared core across parallel worktrees"
- `/cascade-orchestration` — added Seed Agents With Known Hub Paths (name shared hub files up front in fan-out prompts)

### Build Orchestration
- `/deploy-all` — ASCII-only commit messages (dash-parsing CI failure), full-redeploy-after-any-secret-change, verify-production-branch safety bullet
- `/worker-build` — added Business-Logic E2E Verification section (seed → trigger → verify → cleanup beyond deploy-health checks)
- `/worktree-guard` — added Post-Merge Teardown (immediate cleanup + periodic hygiene audit), Sibling Worktrees (per-concurrent-session isolation: create/bootstrap/teardown), shared-hub "keep worktree" conflict rule

### Quality & Verification
- `/pre-merge-review` — added mass-assignment / path-traversal / SSRF checks to Profile A; shared-database-across-environments migration guard in Scalability
- `/schema-check` — added Profile the Data Before Designing a Data Feature (read-only SELECT battery); Prefix-LIKE Index Is Often a No-Op (confirm with EXPLAIN QUERY PLAN)
- `/webapp-testing` — added Server-Generated HTML Template → PNG verification workflow
- `/data-reconciliation` — added snapshot-before-destructive-fix rule (rollback artifact before DELETE/UPDATE)

### Design
- `/frontend-design` — added Collapsible Groups (Expand/Collapse all) pattern; Aligning an Existing Component to the Design System audit loop

### Session Management
- `/start-day` — batched shell calls, `git pull --rebase --autostash` + regen-file conflict recipe, landed-state guard (verify memory claims against live git/CI), skip-if-already-ran wisdom freshness check
- `/session-notes` — derived/materialized backlog files: update sources and regenerate, never hand-edit; route recurring friction into a structured append-only log
- `/insight` — replaced broken frontmatter-write subcommand workaround with embedded-YAML-block-in-create + verify-by-read

### Skill Maintenance & Learning
- `/skill-audit` — explicit `model:` pinning guidance for dispatched check agents
- `/skill-creator` — External CLI dependencies: verify third-party subcommands exist in the installed version before documenting them
- `/wisdom` — Freshness reuse (skip re-running skill-audit if a <7-day result exists); Stamp the run-log at end of Phase 3

### Reference & Conventions
- `/throwaway-script` — added Execution section (`node --check` syntax gate + deterministic-marker bracketing); Cache/KV inspection script shape

## 5.2.0 (2026-06-23)
16 skill updates synced from internal source + 3 new skills (46 → 49 total), sanitized. +661 / −380 on updated skills, plus ~1,900 lines of new skill/reference content.

### New Skills
- `/handoff` (Session Management) — write a disposable session-handoff doc to OS temp so a fresh session/agent can continue one in-flight task slice without re-deriving context
- `/design-showcase` (Design) — build a side-by-side visual comparison of 3–7 design variants for a component/view as a self-contained HTML showcase, then pick a direction before implementing
- `/design-reverse-engineer` (Design) — reverse-engineer a design system from a URL (typography, palette, spacing, components, micro-interactions) into a Claude-ready design spec

### Development Pipeline
- `/grill-me` — added Project Glossary section (read/challenge/sharpen project terms; commit glossary updates alongside the feature)
- `/research-gate` — added Analog Feature Recon section (naming-variant sweep, full-stack read in order, plan with explicit reuse/divergence callouts)
- `/write-plan` — added User Flow diagram section, full Agent Orchestration Spec (file-ownership map, stage design, model + merge-order assignment, guardrails), Execution Modes A/B/C, expanded Plan Quality Checklist
- `/review-impl` — Phase 1 dispatches sonnet (mechanical) + skip rule when the orchestrator built the impl in-session; agent prompts moved to `references/review-checklists.md`; Phase 4 restructured (deterministic e2e-verify runner first, then design-judgment agent on what it can't score); expanded Agent B state/timing/race + refactor checklist
- `/cascade-orchestration` — added "dispatch without an explicit `model:`" anti-pattern row

### Build Orchestration
- `/worker-build` — added CF API token section (OAuth-token extraction pattern, placeholders), Bug-Class Sweep section, improved cron numeric-DOW caveat

### Quality & Verification
- `/pre-merge-review` — added Vibe-Coded Pre-Launch Checklist, Diff-Level Review Pass, "scale the fan-out to the diff" guidance, Component-Deletion & CSS-Graduation discipline, Audit Grep Pack, Refactor/Sweep/Fix-Batch discipline
- `/schema-check` — added Migration Check section (migrations as canonical schema docs, tracked-apply vs `d1 execute` decision tree, destructive-migration exception)
- `/webapp-testing` — added chrome-devtools MCP recovery section, "behind another auth" decision branch, UI Label Audit; created `references/iteration-loops.md` + `scripts/test-local.js`

### Design
- `/frontend-design` — added multi-series chart legend enforcement + color-aware tooltip example, Modal component pattern, CSS pattern audit

### Session Management
- `/start-day` — added 14-day window guard with older-rollup, Pipeline & Plan of Attack (blocked-on-you / agent-ready / needs-scoping buckets), usage-insights reminder before the weekly wisdom check
- `/session-notes` — added incremental-append preference (token economy), Update Project Frontmatter step, sonnet routing
- `/insight` — added p75 (not mean) RUM guidance with nearest-rank SQL, error-trend hot-spot surfacing

### Skill Maintenance & Learning
- `/skill-audit` — added evidence rule (exact-line quoting, hallucination-drop policy, Grep-vs-Explore dispatch)
- `/wisdom` — added usage-signal subsystem (`ingest-usage.mjs` + Phase 1 Step C + Phase 2 usage cross-reference with corroboration/coverage/novel-friction), 2 safety rules

### Reference & Conventions
- `/model-selection` — added the full model stack table, effort mechanics, pre-tiered agents (`routine` / `critical-reviewer`), workflows section, updated routing matrix; generic model-name placeholders

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
- Removed internal company references from html-slides
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
