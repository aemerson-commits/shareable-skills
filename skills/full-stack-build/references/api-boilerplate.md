# API Boilerplate Templates

## Pages Function Endpoint Template

```javascript
import { corsHeaders, corsPreflightResponse, checkRateLimit, requireAuth, getAuthEmail } from '../../../shared/api-utils.js';

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight — MUST be first
  if (request.method === 'OPTIONS') return corsPreflightResponse(request, 'GET, POST, OPTIONS');

  // Auth — MUST be before business logic
  const denied = await requireAuth(request, env);
  if (denied) return denied;

  const email = getAuthEmail(request);
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'list': {
        const rows = await env.ADMIN_DB.prepare('SELECT * FROM table_name ORDER BY created_at DESC').all();
        return json(rows.results, 200, request);
      }
      case 'create': {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, request);
        // Rate limit write operations
        const allowed = await checkRateLimit(env.CACHE, `feature-${email}`, { maxRequests: 30 });
        if (!allowed) return json({ error: 'Rate limit exceeded' }, 429, request);
        const body = await request.json();
        // ALWAYS use parameterized queries — never string concatenation
        const result = await env.ADMIN_DB.prepare('INSERT INTO table_name (col1, col2, created_by) VALUES (?, ?, ?)')
          .bind(body.col1, body.col2, email).run();
        return json({ id: result.meta.last_row_id, ...body }, 201, request);
      }
      default:
        return json({ error: `Unknown action: ${action}` }, 400, request);
    }
  } catch (err) {
    console.error(`[feature] Error:`, err);
    return json({ error: 'Internal error' }, 500, request);
  }
}
```

**Key rules:**
- Import from `shared/api-utils.js` — NEVER duplicate CORS/auth locally
- `requireAuth` before any business logic
- Parameterized DB queries (`.bind()`) — never template literals in SQL
- Error responses MUST include `corsHeaders(request)`
- Rate limit write operations
- DB binding: `env.ADMIN_DB` | Cache binding: `env.CACHE`

## DB Migration Template

File: `{project}/migrations/{NNNN}_{name}.sql`

```sql
-- Description of what this migration creates
CREATE TABLE IF NOT EXISTS table_name (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Business columns
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  amount REAL,
  -- Audit columns
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Compound uniqueness (for upsert support)
  UNIQUE(name, created_by)
);

CREATE INDEX IF NOT EXISTS idx_table_name_status ON table_name(status);
CREATE INDEX IF NOT EXISTS idx_table_name_created ON table_name(created_by);
```

**Key rules:**
- `CREATE TABLE IF NOT EXISTS` — idempotent
- `INTEGER PRIMARY KEY AUTOINCREMENT` for all IDs
- `TEXT` for dates with `DEFAULT (datetime('now'))`
- `REAL` for decimals (currency, dimensions)
- `CHECK` constraints for enums
- `UNIQUE` compound keys enable `INSERT ... ON CONFLICT ... DO UPDATE`
- Separate `CREATE INDEX IF NOT EXISTS` statements

## App.jsx Wiring Template

### Isolated view (fetches own data)
```jsx
// 1. Lazy import (near other imports)
const {Name}View = React.lazy(() => import('./components/{Name}View'));

// 2. Sidebar nav entry (in sidebar section)
<a className={`nav-item ${activeView === '{name}' ? 'active' : ''}`}
   onClick={() => setActiveView('{name}')}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {/* Icon path */}
  </svg>
  {Name}
</a>

// 3. Route case (in main content area)
{activeView === '{name}' && (
  <ErrorBoundary key="{name}">
    <Suspense fallback={<div className="loading-screen"><div className="loading-spinner"></div></div>}>
      <{Name}View isMobile={isMobile} isAdmin={isAdmin} />
    </Suspense>
  </ErrorBoundary>
)}
```

### Shared-data view (receives cached data)
```jsx
// Same import and sidebar pattern, but route passes data props:
{activeView === '{name}' && (
  <ErrorBoundary key="{name}">
    <{Name}View data={cache?.data} isMobile={isMobile} cache={cache} />
  </ErrorBoundary>
)}
```
