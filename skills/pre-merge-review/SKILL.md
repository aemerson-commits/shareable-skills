---
name: pre-merge-review
description: "Comprehensive pre-merge review — security pentesting, performance, scalability, UX consistency, and code hardening. Run before merging dev to main to catch issues before production. Triggers: 'pre-merge review', 'review before merge', 'full code review for merge'."
user-invocable: true
---

# Pre-Merge Review

Comprehensive review gate before merging dev to main. Dispatches parallel review agents across 5 domains, then compiles a ranked findings report.

## When to Run

- Before every merge to production
- After large feature batches land on dev
- When security-sensitive changes are included (auth, RBAC, API endpoints, workers)

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
- Can they escalate privileges via parameter manipulation?
- Are there IDOR vulnerabilities (accessing resources by guessing IDs)?
- Can they exfiltrate data beyond their authorized scope?

**Profile C — Compromised Admin**
- Can they access raw database credentials or service account keys?
- Can they modify worker code or deploy malicious functions?
- Are admin mutations audited? Can audit logs be tampered with?
- Is there a self-lockout prevention? (admin can't remove own admin role)
- Rate limiting on admin write operations

**What to check:**
- Shared API utilities — CORS, JWT verification, rate limiting
- Permission system — role checks, fallback behavior
- All API endpoints — auth guards on every route
- All worker HTTP endpoints — Bearer token auth
- Backend API server — admin auth, SQL parameterization
- Error responses — no stack traces, no internal details
- Headers on all responses — security headers present

### 2. Performance Review

**Bundle Analysis**
- Check build output for each project — bundle sizes, code splitting
- Identify large chunks that could be split further
- Verify lazy loading is used for all non-critical views

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

### 3. Scalability Review

- API rate limits — are we within budget?
- Cache storage patterns — key naming, TTLs, size limits
- Database query efficiency — indexes, query plans
- Worker CPU time budget
- Data growth patterns — will current approach work at 2x, 5x, 10x scale?

### 4. UX Consistency Review

**Visual Consistency**
- Color tokens used consistently (not hardcoded hex values)
- Typography consistent across views
- Spacing and padding patterns consistent
- Theme applied uniformly
- Chart styling consistent (tooltips, axes, legends, grid lines)

**Interaction Patterns**
- Loading states consistent
- Error states consistent
- Empty states consistent
- Modal patterns consistent (close buttons, escape key, overlay click)
- Table patterns consistent (sorting, filtering, column resizing)

### 5. Code Quality & Standards

**Consistency**
- Import ordering consistent
- Error handling patterns consistent
- Naming conventions followed
- No dead code, unused imports, or commented-out blocks

**Industry Standards**
- OWASP Top 10 compliance
- Accessibility (ARIA labels, keyboard navigation)
- Semantic HTML used correctly
- No `dangerouslySetInnerHTML` without sanitization
- All user-controlled data escaped before rendering
- Environment variables not leaked to client bundles

## Execution — Cascading Agent Teams

Launch 5 domain agents in parallel (all model: "opus"). Each domain agent may spawn sub-agents for deeper analysis:

**Agent 1: Security Penetration Review**
Spawns 3 sub-agents (one per attacker profile)

**Agent 2: Performance Review**
Spawns 2 sub-agents (Bundle & Assets + API & Rendering)

**Agent 3: Scalability Review** (single agent)

**Agent 4: UX Consistency Review**
Spawns 2 sub-agents (Visual + Interaction Patterns)

**Agent 5: Code Quality & Standards** (single agent)

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
