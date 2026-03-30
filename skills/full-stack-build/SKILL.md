---
name: full-stack-build
description: "Orchestrate agent teams to build features spanning frontend + backend — API design, D1 migrations, React components, integration wiring, and verification. Use for new views with endpoints."
user-invocable: true
---

# Full-Stack Build

Orchestrates the complete lifecycle for features that need both API endpoints and React components. Replaces ad-hoc sequential builds with parallel agent teams: design → build → integrate → verify.

## Arguments

- First argument (required): Feature name (e.g., "Inventory Tracker", "Job Timer Dashboard")
- `--project=<name>` (default: determined from context)
- `--skip-design` — Jump to Phase 3 when design already exists (e.g., after `/write-plan`)
- `--plan=<path>` — Use existing plan document as spec

## When to Use

- New view/tab that needs API endpoints + React components
- Adding a backend-dependent feature to an existing view
- Any work touching BOTH `functions/api/` AND `src/components/`

Do NOT use for: backend-only work (workers, API endpoints), frontend-only work (CSS, component refactor), single-file fixes.

## Prerequisites

If no `--skip-design` and the feature spans 3+ files or unknown APIs, suggest running `/research-gate` first.

## Phase 0: Scope Assessment (Main Agent)

Read the target project to determine scope:
1. Target project's docs for component inventory
2. `{project}/functions/api/` directory — check for endpoint naming conflicts
3. `{project}/migrations/` — determine next migration number
4. Shared API utilities — available server functions

Produce scope object: `project`, `viewType` (isolated/shared-data), `needsDB`, `needsCache`, `existingEndpoints`, `nextMigrationNumber`, `sharedUtilsTouch`.

## Phase 1: Design Sprint (2 Parallel Agents, model: "opus")

Skip if `--skip-design`. Pattern: Fan-Out/Fan-In.

### Agent: Backend Architect

Read `references/api-boilerplate.md` for endpoint/migration templates, then design:

- **API Contract**: Endpoints table (method, query params, purpose, auth, rate limit)
- **DB Schema** (if needed): Table definitions, constraints, indexes, migration file path
- **Cache Keys** (if needed): Key pattern, TTL, compression requirement
- **Data Flow**: Source → transform → cache → response
- **Naming Conflict Check**: Verify endpoint file and action params are unique
- **Shared Utility Impact**: Flag any changes to shared/ that affect other projects

### Agent: Frontend Architect

Read `references/design-review-checklist.md` for UI patterns + `/frontend-design` skill for tokens, then design:

- **Component Hierarchy**: Parent/child tree with props
- **3 UI Layout Options** (user picks one):

  Each option MUST include:
  - Layout description (2-3 sentences)
  - **Default view**: What shows immediately (summary KPIs, primary table)
  - **On-demand**: What expands/appears on interaction (detail panels, filters, charts)
  - Data density level (High / Medium / Low)
  - Which existing view it most resembles
  - Progressive disclosure strategy

- **Shared Components**: Which to reuse (KPICard, ErrorBoundary, Modal, etc.)
- **CSS Strategy**: Class prefix, color tokens, mobile breakpoint approach
- **App.jsx Wiring**: Import type (lazy/direct), sidebar entry, route props

## Phase 2: Design Review (User Checkpoint)

Present compiled design to user:

```markdown
## Full-Stack Design: [Feature]

### API Contract
[Endpoints table from Backend Architect]

### UI Options
**Option A** — [name, density level, 2-line description]
**Option B** — [name, density level, 2-line description]
**Option C** — [name, density level, 2-line description]

### Backend Safety
- [ ] No endpoint naming conflicts
- [ ] No shared util changes breaking other projects
- [ ] DB schema compatible with existing tables
```

**Wait for user to pick UI option.** Save design to `docs/plans/YYYY-MM-DD-{slug}.md`.

## Phase 3: Parallel Build (2 Worktree Agents, model: "opus")

Pattern: Fan-Out/Fan-In. Both agents use `isolation: "worktree"`.

### Agent: Backend Builder (worktree)

Using the approved API contract + `references/api-boilerplate.md` templates:
1. Create DB migration: `{project}/migrations/{NNNN}_{name}.sql`
2. Create endpoint: `{project}/functions/api/{name}.js` — MUST use shared API utilities, OPTIONS handler, auth, parameterized queries
3. Add shared utility exports (if any) — additive only, don't modify existing
4. Run `cd {project} && npm run build` — must pass

### Agent: Frontend Builder (worktree)

Using the chosen UI option + API contract for fetch URLs:
1. Create components: `{project}/src/components/{Name}View.jsx` + sub-components
2. Create hooks if needed: `{project}/src/hooks/use{Name}.js`
3. Add CSS section to `{project}/src/App.css` with `/* === {NAME} VIEW === */` comment
4. Follow: dark theme tokens, AbortController fetching, responsive at 768px, progressive disclosure
5. Do NOT modify App.jsx — that's Phase 4
6. Verify all imports resolve

## Phase 4: Integration (Main Agent)

Sequential — cannot parallelize:
1. **Merge worktrees** — backend first, then frontend. Resolve any file conflicts
2. **Wire App.jsx**: Lazy import + Suspense, sidebar nav entry, ErrorBoundary route case with correct props (see `references/api-boilerplate.md`)
3. **Contract alignment**: Verify frontend fetch URLs match backend endpoint file/action params. Verify response shapes match component expectations
4. **Build**: `cd {project} && npm run lint && npm run build`

## Phase 5: Parallel Verification (4 Agents, model: "opus")

Pattern: Fan-Out/Fan-In. All read-only.

### Agent: API Tester
Trace each endpoint's request path. Verify: OPTIONS preflight, auth present, parameterized queries, error responses include CORS headers, response shape matches frontend expectations.

### Agent: UI Consistency Reviewer
Compare new components against existing views in the same project. Verify: color tokens match (no arbitrary hex), spacing follows patterns, component styling consistent, loading/error states match, theme applied, CSS class prefix unique. See `references/design-review-checklist.md`.

### Agent: Build Verifier
`cd {project} && npm run lint && npm run build`. If shared/ was modified, also build ALL other projects.

### Agent: Impact Reviewer
Check: all new imports resolve, App.jsx routing correct (ErrorBoundary, Suspense, props), DB schema no column collisions, endpoint name/action unique, shared util changes are additive. See `references/design-review-checklist.md`.

## Phase 6: Report

```markdown
## Full-Stack Build Complete: [Feature]

### Files Created
| File | Purpose |
|------|---------|

### Verification
| Check | Status |
|-------|--------|
| API contract | PASS/FAIL |
| UI consistency | PASS/FAIL |
| Build + lint | PASS/FAIL |
| Impact review | PASS/FAIL |

### Next Steps
- [ ] Deploy
- [ ] Run DB migration
- [ ] Visual test: /webapp-testing
```

Fix CRITICAL issues before reporting. List IMPORTANT/MINOR for user decision.

## Escalation

| Situation | Action |
|-----------|--------|
| Shared util breaks other projects | Trigger `/audit-components` |
| Build fails after merge | Dispatch `/full-stack-trace` |
| Design fundamentally wrong | Return to Phase 1 or `/research-gate` |
| Contract mismatch in Phase 5 | Fix in-place, re-run affected verifier |

## Integration

| Skill | Relationship |
|-------|-------------|
| `/write-plan` | **Consumed** via `--plan=` flag |
| `/research-gate` | **Precedes** — run first for complex features |
| `/frontend-design` | **Referenced** by Frontend Architect + UI Consistency agents |
| `/review-impl` | **Replaced** — Phase 5 verification covers this |
| `/cascade-orchestration` | **Foundation** — all phases follow documented patterns |
