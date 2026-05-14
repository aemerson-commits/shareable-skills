---
name: pre-merge-review
description: "Comprehensive pre-merge review — security pentesting, performance, scalability, UX consistency, and code hardening. Run before merging dev to main to catch issues before production. Triggers: 'pre-merge review', 'review before merge', 'full code review for merge'. Soft-default: when planning a commit or merge that touches 3+ top-level projects, suggest running this skill before pushing — the cross-project blast radius warrants a review even if no individual change looks risky."
user-invocable: true
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

**Batch 1 — Lint (all frontend projects):** run `npx biome check src/` (or your linter) from each project dir. Stop if any fail.

**Batch 2 — Build (same projects):** each running `npm run build`. Catches type errors, missing imports, bundle-breaking changes.

**Batch 3 — Tests + secrets scan:** unit tests + `grep -rn "SECRET\|PASSWORD\|API_KEY\|CLIENT_SECRET" --include="*.js"` across touched paths.

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
- **Scaffolding/diagnostic routes MUST be removed before commit** — temporary endpoints added mid-session to introspect data (e.g. `/_tables`, `/_schema/:table`, `/debug/*`, `/_probe-*`) get shipped by mistake when they should be deleted once they've served their purpose. Grep the diff for routes prefixed with `_`, `debug`, `probe`, or commented as "temporary" / "diagnostic" / "scaffolding" — every match is a removal candidate.

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

## Live Endpoint Testing

Security and performance agents can test live dev endpoints using service account credentials:

**curl-based** (API testing):
```bash
curl -s -H "CF-Access-Client-Id: $CF_ID" -H "CF-Access-Client-Secret: $CF_SECRET" \
  "https://{{your-app}}.example.com/api/endpoint"
```

**Playwright-based** (UI security/UX testing — see `/webapp-testing` skill):
- Set `extra_http_headers` with auth credentials on browser context
- Test RBAC enforcement visually (admin vs non-admin views)
- Verify CSP headers, security headers on live responses
- Screenshot comparison for UX consistency checks

## Execution — Cascading Agent Teams

Launch 5 domain agents in parallel (all model: "opus"). Each domain agent may spawn sub-agents for deeper analysis:

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
- **Scaffolding/diagnostic routes MUST be removed before commit** — routes prefixed with `_`, `debug`, `probe`, or commented as "temporary" are removal candidates

### UX Consistency (Recurring)
- Chart components MUST use shared tooltip constants — bare tooltip props accumulate
- Modal components MUST support Escape key close
- New views MUST be added to tab visibility arrays
- New CSS files MUST be imported in their component (not App.css)
- Shared formatting functions (dates, currency) must use the shared util — don't duplicate per-view

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
