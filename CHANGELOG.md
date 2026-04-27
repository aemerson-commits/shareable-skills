# Changelog

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
