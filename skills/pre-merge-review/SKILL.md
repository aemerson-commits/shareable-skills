---
name: pre-merge-review
description: "Comprehensive pre-merge review — security pentesting, performance, scalability, UX consistency, and code hardening. Run before merging dev to main to catch issues before production. Triggers: 'pre-merge review', 'review before merge', 'full code review for merge'. Soft-default: when planning a commit or merge that touches 3+ top-level projects, suggest running this skill before pushing — the cross-project blast radius warrants a review even if no individual change looks risky."
---

# Pre-Merge Review

Comprehensive review gate before merging dev to main. Dispatches parallel review agents across 5 domains, then compiles a ranked findings report.

## When to Run

- Before every merge to production
- After large feature batches land on dev
- When security-sensitive changes are included (auth, RBAC, API endpoints, workers)
- **Soft-default for 3+ project commits**: When a commit/branch touches 3+ top-level project dirs, suggest this skill before pushing. Rationale: cross-project blast radius — a `shared/` edit can break multiple frontends silently; a multi-project refactor often introduces drift that single-project review misses. The skill's parallel domain agents catch what serial reading misses. Implementation: count distinct top-level dirs in `git diff --name-only HEAD~N..HEAD | awk -F/ '{print $1}' | sort -u`. If ≥3 project dirs, surface the recommendation. User can decline; this is a suggestion, not a gate.

## Pre-Flight Validation (Parallel)

Before dispatching review agents, run these in parallel-batched Bash calls — one batch = one message with multiple tool_use blocks. Sequential runs take ~2min; parallel batches finish in ~35s.

**Batch 1 — Lint (all frontend projects):** run `npm run lint` (or your linter command) from each project dir. Stop if any fail. Use `npm run lint`, NOT a formatter-inclusive check command — formatter-only diffs are not lint errors and will produce false positives that the CI lint gate ignores. Match the canonical command CI runs.

**Batch 2 — Build (same projects):** each running `npm run build`. Catches type errors, missing imports, bundle-breaking changes. **Builds are necessary but NOT sufficient** — consumer *tests* catch what builds miss (see Batch 3).

**Batch 3 — Tests + secrets scan:** run **every consumer project's full test suite** whose code the diff affects — for a `shared/*` change that means running tests for all consumer projects, not just the shared package. A passing build is NOT a passing test: a consumer project can carry a test that asserts the shared module's behavior; builds miss it and the CI test gate catches it only after the push. Plus `grep -rn "SECRET\|PASSWORD\|API_KEY\|CLIENT_SECRET" --include="*.js"` across touched paths.

If any batch surfaces failures, surface them before proceeding — review agents below assume a clean build.

## Review Domains

### 1. Security Penetration Review

Simulate three attacker profiles against all exposed surfaces:

**Profile A — Unauthenticated External Attacker**
- Can they access any API endpoint without authentication?
- Are all worker HTTP endpoints auth-gated?
- Are there CORS misconfigurations allowing cross-origin reads?
- Can they enumerate users, endpoints, or internal data via error messages?
- Rate limiting coverage on all public-facing endpoints
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options on all responses
- Input validation on all user-controllable parameters (SQL injection, XSS, path traversal)
- **Mass assignment**: UPDATE/INSERT endpoints bind an explicit field allowlist — never spread or iterate the request body into SET clauses or column lists. A client adding an unexpected field (`"status":"approved"`, `"role":"admin"`) to the body must not change columns the endpoint didn't intend to expose.
- **Path traversal on file/key builders**: any endpoint that builds a storage key, file path, or filename from a caller-supplied param validates it against a strict pattern (e.g. `^[\w-]+$`-class) so `../`, encoded slashes, or absolute paths can't escape the intended prefix.
- **SSRF on server-side fetches**: no backend route fetches a URL/host/path assembled from caller input beyond an allowlisted route map. Treat any caller-influenced fetch target as a finding, especially on services with access to internal/private-network hosts.

**Profile B — Compromised Regular User (authenticated)**
- Can they access admin endpoints? (RBAC enforcement on every admin route)
- Can they read other users' data?
- Can they submit privileged actions without the required permission?
- Can they escalate privileges via parameter manipulation?
- Are there IDOR vulnerabilities (accessing resources by guessing IDs)?
- Can they exfiltrate data beyond their authorized scope?

**Profile C — Compromised Admin**
- Can they access raw database credentials or service account keys?
- Can they modify worker code or deploy malicious functions?
- Are admin mutations audited? Can audit logs be tampered with?
- Is there a self-lockout prevention? (admin can't remove own admin role)
- Rate limiting on admin write operations
- Can they access other admins' sessions or tokens?

**What to check:**
- Shared API utilities — CORS, JWT verification, rate limiting
- Permission system — role checks, fallback behavior
- All API endpoints — auth guards on every route
- All worker HTTP endpoints — Bearer token auth
- Backend API server — admin auth, SQL parameterization
- Error responses — no stack traces, no internal details
- Headers on all responses — security headers present
- **Scaffolding/diagnostic routes MUST be removed before commit** — temporary endpoints added mid-session to introspect data (e.g. `/_tables`, `/_schema/:table`, `/debug/*`, `/_probe-*`) get shipped by mistake when they should be deleted once they've served their purpose. Grep the diff for routes prefixed with `_`, `debug`, `probe`, or commented as "temporary" / "diagnostic" / "scaffolding" — every match is a removal candidate. If genuinely needed long-term, gate with the same auth as existing analogous routes.
- **The deploy targets, not just the diff.** Every repo-side secret scanner — grep-based scanners, pre-push hooks, hosted secret scanning — is repo-scoped, so a script that was never `git add`ed is invisible to all of them at once, even with no `.gitignore` line naming it as sensitive. If your project deploys to something outside git (a VM, a network share, a bare-metal host), scan that target directly for credential literals, and separately list **target-only files** — present on the target, absent from git — the blind spot where literals accumulate unreviewed. A real incident: several untracked scripts on a production file share each carried a hardcoded database password, one byte-identical to the live credential the running service authenticates with, sitting in plaintext for months. A clean `git diff` says nothing about this class. Treat "target unreachable" as "the check did not run," never as a pass.
- **Never write a credential literal into a maintenance or throwaway script, not even temporarily.** Resolve credentials through a shared helper — env var, then a local `.env`, then wherever the running service's own deploy-time config actually lives — and have it exit non-zero rather than silently falling back to something embedded. Prefer no credential at all when a read-only path (an existing proxy, a health/schema endpoint) already serves the same data without one.
- **Rotation has a coupled blast radius.** If a scratch script's hardcoded credential matches the value the production service authenticates with, rotating one without the other breaks the service. Check what else shares a credential before rotating it.

### 1b. Vibe-Coded Pre-Launch Checklist (behavioral)

Fast-moving / AI-generated ("vibe-coded") features ship correct-looking UI on top of un-audited data paths. Before any such feature merges, walk this checklist explicitly — it is the highest-yield subset of §1, scoped to the mistakes that recur when code is generated quickly:

- [ ] **Every new endpoint has an auth guard.** `POST`/`PUT`/`DELETE` and any data-returning `GET` calls the project's auth middleware. A new route with no guard is the default failure mode.
- [ ] **Identity is server-derived, never client-supplied.** The user's email/role comes from the verified auth token — never from a request body, query param, or header the client controls. Grep the handler for any `body.email`/`?email=` used for scoping.
- [ ] **Ownership / IDOR check on every resource fetch.** Reading or mutating a record by id verifies the caller owns or participates in it. Guessing another id must not return another user's data.
- [ ] **Row-level privacy holds.** List/query endpoints filter to the caller's scope server-side; "company-wide read" is a deliberate, documented exception, not an accident.
- [ ] **Admin routes enforce RBAC server-side.** Role check on the server, not just a hidden nav item. A non-admin curling the endpoint must 403.
- [ ] **No secrets in the client bundle.** Tokens/keys live in environment secrets; the React build references none. Re-run the Batch 3 secrets grep against the new code.
- [ ] **Input validation on every user-controllable param.** Zod or explicit guards; `parseInt`/`JSON.parse` wrapped so bad input is a 4xx with `{ error: string }`, never a 5xx.

**Auth baseline:** establish a baseline auth audit for your project surface (admin endpoints server-side guarded, server-side identity, owner/participant checks intact). Treat any new finding in these areas as a regression, not a pre-existing gap.

### 2. Performance Review

**Bundle Analysis**
- Check build output for each project — bundle sizes, code splitting
- Identify large chunks that could be split further
- Verify lazy loading is used for all non-critical views
- CSS code splitting aligned with component boundaries

**API & Caching**
- Cache TTLs appropriate for data freshness requirements
- Cache invalidation working correctly on mutations
- No N+1 query patterns
- Compression on large cached values
- Unnecessary API calls on page load

**React Rendering**
- useMemo/useCallback used correctly (not over-used or under-used)
- No components causing unnecessary re-renders
- No state in parent that should be in child
- Large lists virtualized or paginated

**Assets**
- Images optimized
- Fonts loaded efficiently
- No render-blocking resources

### 3. Scalability Review

- API rate limits — are we within budget?
- Cache storage patterns — key naming, TTLs, size limits
- Database query efficiency — indexes, query plans
- Worker CPU time budget
- Subrequest limits in complex operations
- Data growth patterns — will current approach work at 2x, 5x, 10x scale?
- **Shared database across environments**: if a migration or schema change applies automatically to a database instance shared by multiple environments (e.g. one DB backing both a dev/staging deployment and production), treat any change pushed to the lower environment as an immediate production change. For a breaking change (rename, DROP, constraint rebuild) on a table production reads: split additive-now work from destructive-later work so production survives the first apply, verify preconditions in the target environment before applying, and confirm the change live in *every* environment that shares the database — a single-environment smoke test is insufficient.

### 4. UX Consistency Review

**Visual Consistency**
- Color tokens used consistently (not hardcoded hex values)
- Typography consistent across views (font sizes, weights, families)
- Spacing and padding patterns consistent
- Theme applied uniformly (no theme leaks)
- Chart styling consistent (tooltips, axes, legends, grid lines)

**Interaction Patterns**
- Loading states consistent (spinners, skeletons, shimmer)
- Error states consistent (messaging, retry buttons, fallbacks)
- Empty states consistent (icons, messages, CTAs)
- Modal patterns consistent (close buttons, escape key, overlay click)
- Table patterns consistent (sorting, filtering, column resizing, export)
- Form patterns consistent (validation, save indicators, disabled states)
- Toast/notification patterns consistent

**Component Reuse**
- Shared components used where available (Modal, EmptyState, KPICard)
- No duplicated component patterns across views
- Consistent prop naming conventions

### 5a. SQL & Migration Discipline (run for any change touching `migrations/` OR `*.js` with `ON CONFLICT` / `INSERT INTO` patterns)

- **`ON CONFLICT` ↔ UNIQUE INDEX invariant**: For every `ON CONFLICT(...)` clause in changed code, verify a UNIQUE INDEX exists in migrations whose columns match the conflict target. Partial indexes (`WHERE` clause) must cover the rows the upsert will hit. SQLite silently degrades unmatched ON CONFLICT to plain INSERT — no error, just data corruption.
  ```bash
  # Quick grep:
  grep -rn "ON CONFLICT" --include="*.js" functions/ workers/
  # For each result, find the matching UNIQUE in migrations:
  grep -rn "UNIQUE" migrations/
  ```
- **Partial UNIQUE migrations need "what's NOT covered" docs**: Any new migration adding a `WHERE`-scoped UNIQUE must explicitly list the rows it does NOT cover and confirm those have alternative protection.
- **SQLite NULL-distinct UNIQUE semantics**: A UNIQUE index on NULLable columns does NOT prevent duplicate rows when those columns are NULL — SQLite treats each NULL as distinct. A UNIQUE on `(a, b, release_no, c)` allows unlimited rows with `release_no=NULL`; `ON CONFLICT` on such a UNIQUE also never fires for NULL rows. When reviewing upserts involving NULLable columns: (a) confirm the column has a NOT NULL sentinel or a generated COALESCE column in the index, OR (b) confirm a DELETE-before-INSERT guard exists in code.
- **Schema drift**: Integration test schemas should match the production schema. After migrations, the test schema needs the same columns + indexes. If integration tests pass but production breaks, schema drift is suspect.
- **Multi-row reads from the database should dedupe defensively**: When reading multiple rows for one logical entity, dedupe by the natural key and prefer the most-recent row. UI should never trust the database to be perfectly clean.
- **Don't repurpose tables whose row-existence carries semantic meaning**: If a table's row means "thing is in state X", UPDATE on that table silently no-ops for items not yet in that state. When a UPDATE matches 0 rows for legitimate input, the table is the wrong store — use a dedicated table for the new data.
- **D1 write counter discipline**: when an endpoint reports `{ updated: N }` to the client, that count MUST come from `result.meta.changes`, not from a loop counter incremented before the result is checked. Incrementing unconditionally while discarding `.meta.changes === 0` masks silent no-ops.

### 5b. A11y onClick on Non-Interactive Elements

```bash
grep -rn 'onClick' project-a/src project-b/src 2>/dev/null \
  | grep -E '<(div|span|tr|li|td)\b' \
  | head -30
```

Each hit needs ONE of:
- `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space → handler) — for div/span used as button
- Replace with `<button>` — preferred when possible
- A documented reason in a comment — drag target, canvas overlay, deliberately non-keyboard surface

Fail the review if any hit has none of those.

Common false positives to skip:
- `<tr onClick>` with `role="button"` already present
- Form rows where the keyboard path is via the inner `<input>` / `<button>`

### 5. Code Quality & Standards

**Consistency**
- Import ordering consistent
- Error handling patterns consistent
- Naming conventions followed (camelCase components, kebab-case CSS)
- File organization follows project structure conventions
- No dead code, unused imports, or commented-out blocks

**Industry Standards**
- OWASP Top 10 compliance
- Accessibility (ARIA labels, keyboard navigation, screen reader support)
- Semantic HTML used correctly
- No `dangerouslySetInnerHTML` without sanitization
- All user-controlled data escaped before rendering
- Environment variables not leaked to client bundles

## Diff-Level Review Pass

**Always `git fetch origin` first and diff against `origin/main`, NOT local `main`.** Local `main` is frequently stale — this repo merges via release-branch PRs on GitHub, so local `main` can sit dozens-to-100+ commits behind `origin/main` while still being a clean ancestor of `dev`. Reviewing `main..dev` against a stale local main wildly inflates scope. Confirm the real base before scoping: `git fetch origin && git merge-base --is-ancestor origin/main dev && echo clean-FF || echo diverged` — if diverged (origin/main carries release commits dev lacks), the two-dot and three-dot diffstats will still match when content is identical (dev ⊇ origin/main), confirming a clean content fast-forward.

Before/alongside the domain agents, scan `git diff origin/main..dev` progressively:

1. `--stat` overview — identify blast radius (which projects and files changed)
2. Per-area diffs — read each changed area for logic correctness
3. Security grep on ADDED lines only:
   ```bash
   git diff origin/main..dev | grep "^+" | grep -iE "api_key|secret|token|dangerouslySetInnerHTML"
   ```
4. Scaffolding/diagnostic-route check — routes added mid-session often get shipped by accident:
   ```bash
   git diff origin/main..dev | grep -iE "^\+.*(probe|debug|temporary|_schema|_tables)"
   ```
5. New-export check on `shared/*` — any new export in `shared/` affects all consumer projects; verify every consumer handles it:
   ```bash
   git diff origin/main..dev -- shared/ | grep "^+export"
   ```

`grep "^+[^+]"` isolates added non-header lines (excludes the `+++` file header lines) for focused analysis.

## Live Endpoint Testing

Security and performance agents can test live dev endpoints using service account credentials:

**curl-based** (API testing):
```bash
curl -s -H "CF-Access-Client-Id: $CF_ID" -H "CF-Access-Client-Secret: $CF_SECRET" \
  "https://your-app.example.com/api/endpoint"
```

**Playwright-based** (UI security/UX testing — see `/webapp-testing` skill):
- Set `extra_http_headers` with auth credentials on browser context
- Test RBAC enforcement visually (admin vs non-admin views)
- Verify CSP headers, security headers on live responses
- Screenshot comparison for UX consistency checks

## Execution — Cascading Agent Teams

**Scale the fan-out to the diff** — 5 domains × sub-agents is the FULL-release shape, not the default. Before dispatching, map the diff against the domains: skip or fold domains the diff can't touch (no worker/API/auth changes → fold Security into Code Quality's checklist; frontend-only → skip Scalability; no UI changes → skip UX). A small release (≤ ~10 files, one project) usually needs 2-3 domain agents with NO sub-agent spawning; reserve the 12-agent cascade for multi-project cuts with security-sensitive surface. State in the report which domains were skipped and why — a skipped domain is a documented judgement, not a blind spot.

Launch the selected domain agents in parallel (all model: "opus"). Each domain agent may spawn sub-agents for deeper analysis:

**Agent 1: Security Penetration Review**
Spawns 3 sub-agents (one per attacker profile):
- Sub-agent A: Unauthenticated External Attacker — tests all workers, CORS, public endpoints
- Sub-agent B: Compromised Regular User — tests RBAC, IDOR, privilege escalation
- Sub-agent C: Compromised Admin — tests credential exposure, audit tampering, self-lockout

**Agent 2: Performance Review**
Spawns 2 sub-agents:
- Sub-agent A: Bundle & Assets — build analysis, code splitting, lazy loading, image optimization
- Sub-agent B: API & Rendering — cache TTLs, N+1 queries, React re-renders, useMemo correctness

**Agent 3: Scalability Review** (single agent, no sub-agents — scope is narrow)

**Agent 4: UX Consistency Review**
Spawns 2 sub-agents:
- Sub-agent A: Visual Consistency — color tokens, typography, spacing, theme, chart styling
- Sub-agent B: Interaction Patterns — loading/error/empty states, modals, tables, forms, toasts

**Agent 5: Code Quality & Standards** (single agent — reads all diffs holistically)

### Synthesis Pipeline
1. Sub-agents report to their parent domain agent
2. Domain agents compile findings with severity ratings (CRITICAL / HIGH / MEDIUM / LOW)
3. Main agent merges all 5 domain reports into ranked findings list

Total agent capacity: up to 12 agents working simultaneously across the 5 domains.

## Post-Review

After executing fixes:
1. Update this skill with new patterns discovered
2. Add new checklist items for recurring issues
3. Update project docs (Known Gotchas) if applicable

## Convention Audits — grep for the ABSENCE, not the presence

A single grep answers "where is X used." A convention audit needs "where should X be and
isn't" — that's a **diff of two sweeps**, not one:

1. **Presence sweep** — every place the convention IS followed (e.g. every `RETURNING`).
2. **Population sweep** — every place it COULD apply (e.g. every `INSERT INTO`). Every hit
   in (2) absent from (1) is a candidate finding.
3. **Check whether a lint already owns it** — grep your scripts/CI config for the topic.
4. **If it does, run it** — a wired-in lint is machine-readable and already enforces the
   rule; don't re-derive by eyeball what CI already checks.

**If step 3 finds nothing and step 2 produced real findings, the deliverable is a lint
script wired into CI — not a list in the review.** A finding list is read once; a lint
holds the line forever. Several long-lived checks originated exactly this way.

## Test-Validity Checks (a green suite is not evidence)

Review the *tests* in the diff with the same suspicion as the code:

- **A commit that adds a REJECTION path needs ACCEPT-side tests, or the overreach is
  invisible.** Tests written alongside a new reject rule naturally assert "the bad input is
  rejected" — which passes just as happily when the rule *also* rejects good input. For any
  new reject/validate/filter rule, demand at least one test proving the *adjacent legitimate*
  input still passes. (Real case: a narrowing fix shipped two overreaches because nothing
  asserted that a valid neighbouring value still parsed.)
- **A regression test must be shown to FAIL on the unfixed code**, and event-based tests are
  the easy way to fool yourself. Writing the "bug reproduces" case with TWO synthetic events
  (one per listener target) simulates two keypresses and passes against buggy code. ONE real
  keypress is ONE event that bubbles through every ancestor. Dispatch a single event on the
  deepest node and let it bubble.
- **A test runner can report green having run NONE of the relevant tests.** A package-local
  config `include` can exclude the very file you care about, and a package may have TWO
  harnesses covering different files. Before trusting a result, confirm the test file you
  care about is actually in the runner's include set — and confirm **a CI job actually
  executes that runner**. A test nothing runs is documentation.
- **Swapping a BLOCKING browser API for an async one changes global event delivery — sweep
  every hand-rolled listener.** Blocking dialogs stop the event loop, so while one is open
  the page receives no keyboard events. A promise-based replacement does not: every
  document/window keydown listener that was previously unreachable-during-a-dialog becomes
  live, and one Escape now hits both the new modal and whatever is underneath. If a shared
  modal stack exists, confirm the hand-rolled modals actually register with it — one project
  found its stack was called from the shared component and nowhere else, so ~40 modals never
  entered it and a single Escape discarded a large unsaved form. The reasoning generalizes to
  any blocking→async swap.
- **A `\b` immediately before a digit is a no-op guard** — a digit is a word character, so
  `/^(PL|FL)\b/` never matches `PL3`. Grep the diff for `\b` and ask what character actually
  follows the boundary in real data; use a negative lookahead when the intent is "not
  followed by more letters."

## Known Patterns to Check (Update Per Review)

### Security (Recurring)
- New API endpoints MUST have auth middleware — easy to miss on new routes
- Use a shared auth helper instead of reading raw headers directly (header spoofing risk)
- Error responses MUST NOT include `error.message` or `err.message` — use generic messages, log server-side
- CORS headers must use shared import, not inline headers
- Workers MUST use timing-safe comparison for Bearer token auth
- Backend admin auth MUST use `crypto.timingSafeEqual`, not `!==`
- `dangerouslySetInnerHTML` MUST use DOMPurify or equivalent sanitization
- Backend body parser needs explicit size limits — default may be too low or undocumented
- Auth middleware that is a no-op (e.g. `next()` with no check) — always verify middleware actually validates
- **Scaffolding/diagnostic routes MUST be removed before commit** — routes prefixed with `_`, `debug`, `probe`, or commented as "temporary" are removal candidates

### UX Consistency (Recurring)
- Chart components MUST use shared tooltip constants — bare tooltip props accumulate
- Modal components MUST support Escape key close
- New views MUST be added to tab visibility arrays
- New CSS files MUST be imported in their component (not App.css)
- Shared formatting functions (dates, currency) must use the shared util — don't duplicate per-view
- Shared `Modal` component uses `useId()` for unique aria-labelledby — don't revert to hardcoded IDs
- Shared `EmptyState` component exists but is often unused — new views should prefer it over ad-hoc empty states

### Performance (Recurring)
- Polling intervals (e.g. 30s data refresh) should be extracted to a named component, not inline in App state
- Large single-view chunks could be lazy-loaded
- Static fallback data loaded on every page load — should only load on API failure

### Code Quality (Recurring)
- Worktree agents may revert recent changes — always check worktree bases before merging
- Unused catch variables cause lint failures — use `catch {` (no binding) when error isn't logged
- Shared utility functions duplicated across projects — consolidate to shared source
- Mock/dev data remaining in production bundle — extract to conditional import
- Dead code from deprecated systems — clean up promptly when systems are removed

### Component-Deletion & CSS-Graduation Discipline (Recurring)

- **A component/feature DELETION must grep for every removed symbol's remaining REFERENCES, not just removed imports.** A deletion can remove props/declarations but leave JSX usages behind — guaranteed `ReferenceError` on the affected render path. Build + tests may stay green if `noUndeclaredVariables` is off and no render test covers that branch. For every deletion diff: `grep` each deleted identifier across the file/project and demand zero hits; add a cheap render test for the touched component's main branch.
- **Before deleting a "duplicate" App.css block, grep ALL render sites of the class.** App.css rules are GLOBAL — components beyond the shared component may depend on them without importing any scoped CSS owner. A block is safe to delete only when every render site imports a CSS owner. Otherwise the "duplicate" is the only styling for those render sites — keep it with a comment explaining its serving role.

## Audit Grep Pack (run during full reviews)

Each row is tied to a real past bug — these greps catch recurrences cheaply.

| Concern | Grep | Pass criterion |
|---------|------|----------------|
| DB bind cap | `grep -rn "IN (" --include=*.js */functions shared/` cross-checked vs `chunkArray` usage | every dynamic IN-clause runs through chunkArray or equivalent (most DBs have a bind-parameter cap) |
| Cache TTL threading | `grep -rn "setCache\|cacheTtl\|expirationTtl" */functions shared/` | route-declared TTL actually flows through to the cache-set call (bugs drop it mid-chain) |
| Bundle size / lazy | `ls -lh */dist/assets/*.js \| sort -k5 -hr` + `grep -rn "React.lazy" */src` | no chunk >200KB without React.lazy |
| a11y onClick | `grep -rn "onClick" */src \| grep -E "<div\|<span\|<tr\|<li"` | each hit has role+tabIndex+onKeyDown or becomes a `<button>` |

### Refactor, Sweep & Fix-Batch Discipline (Recurring)

- **Run a pre-merge review pass AFTER the Phase-B fix-batch, not just after the original feature.** Fixes regress. A "behavior-preserving" extraction can drop an import, causing a `ReferenceError` swallowed by a try/catch — a silent regression that `npm run build` and hundreds of tests miss (if `noUndeclaredVariables` is off, no render test covers the branch). Only a blind multi-domain review after the fix-batch catches it. Treat "we already reviewed the original feature" as insufficient once fixes land on top.
- **Large mechanical refactor / god-component decompose → grep that every symbol the post-refactor code still references is still imported.** Dropped imports survive `npm run build` when `noUndeclaredVariables` is off and only degrade at runtime through a swallowing try/catch. For any decompose/extraction in the diff: `grep` the orchestrator for each function it calls and confirm a matching `import` line still exists. Also blind-diff each extracted block against `git show <main>:<file>` (the original) to confirm byte-equivalent logic.
- **A dedup sweep must re-grep ALL projects AT CLOSEOUT, not from the pre-run snapshot.** A fix-sweep may fix one project, but a parallel extraction agent simultaneously creates a new copy of the buggy code in a different file — a third copy the pre-run grep never saw. After parallel Phase-B agents land, re-run every "fix-once-everywhere" sweep's identifying grep across all consumer projects.
- **A finding that flips a flag / changes a config with an explicit in-code rationale must be re-validated against that rationale before executing.** "Approved at the human gate" does not mean "correct" when the finding itself was wrong — surface the contradiction instead of auto-applying.
- **Integrating worktree-agent commits: `git show --name-only <sha>` FIRST.** The harness `isolation:"worktree"` can branch from a stale base; agents then re-create files a prior wave already landed. If the commit touches already-landed files, don't cherry-pick it whole — `git checkout <sha> -- <project-dir>/` to take only the agent's project files, keep canonical shared, then build-verify.
