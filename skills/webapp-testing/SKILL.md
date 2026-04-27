---
name: webapp-testing
description: Toolkit for interacting with and testing web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.
license: Complete terms in LICENSE.txt
user-invocable: true
---

# Web Application Testing

## Browser Session Safety (MANDATORY)

**Chrome cleanup safety**: Never broad-scope-kill Chrome processes. Only close pages you opened via a specific page ID. "Browser already running" errors from chrome-devtools MCP mean the MCP profile is in use — reuse it, open an isolated context, or ask the user to close that window.

To test web applications, write native Playwright scripts (Node.js or Python, depending on your environment).

**Helper Scripts Available**:
- `scripts/cf-session.py` - Legacy persistent sessions (cookie-based, requires manual login)
- `scripts/with_server.py` - Manages server lifecycle (supports multiple servers)

**Always run scripts with `--help` first** to see usage. DO NOT read the source until you try running the script first and find that a customized solution is absolutely necessary. These scripts can be very large and thus pollute your context window. They exist to be called directly as black-box scripts rather than ingested into your context window.

## Temp Playwright Script Iteration Loop (canonical)

For any visual UI verification, the reliable loop is:

1. Write a temp script at `/tmp/verify-<feature>.mjs`:
   ```js
   import { chromium } from 'playwright';
   const browser = await chromium.launch({ headless: true });
   const ctx = await browser.newContext();
   // CF Access service-token cookie injection (required for CF Access-protected apps)
   await ctx.addCookies([{ name: 'CF_Authorization', value: process.env.CF_ACCESS_TOKEN, domain: '{{your-app}}.example.com', path: '/' }]);
   const page = await ctx.newPage();
   await page.goto('https://{{your-app}}.example.com/dashboard');
   await page.screenshot({ path: '/tmp/screenshots/verify-1.png', fullPage: true });
   await browser.close();
   ```

2. Run the script with credentials injected from your secrets manager.

3. Read the screenshot with the `Read` tool — visually verify.

4. Edit the script (add selectors, clicks, state capture) — re-run — re-read screenshot.

This beats the MCP chrome-devtools flow for scripted multi-step verification because the temp script is version-controllable (paste into the session notes) and re-runnable in the background.

## Decision Tree: Choosing Your Approach

```
User task → Is the target behind CF Access (dev/prod sites)?
    ├─ Yes → Use CF Access Service Token (PREFERRED — no manual login needed)
    │         1. Set extraHTTPHeaders with CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET
    │         2. Navigate freely — all requests auto-authenticate
    │         3. See "CF Access Bypass" section below
    │
    └─ No → Is it behind another auth (SSO, API key, etc.)?
        ├─ Yes → Use service token / API key headers (PREFERRED)
        │         See "Service Token Authentication" below
        │
        └─ No → Is it static HTML?
            ├─ Yes → Read HTML file directly to identify selectors
            │         ├─ Success → Write Playwright script using selectors
            │         └─ Fails/Incomplete → Treat as dynamic (below)
            │
            └─ No (dynamic webapp) → Is the server already running?
                ├─ No → Run: python scripts/with_server.py --help
                │        Then use the helper + write simplified Playwright script
                │
                └─ Yes → Reconnaissance-then-action:
                    1. Navigate and wait for networkidle
                    2. Take screenshot or inspect DOM
                    3. Identify selectors from rendered state
                    4. Execute actions with discovered selectors
```

## CF Access Bypass — Choose Your Pattern

Two working patterns. Pick based on what you're doing:

| Pattern | Best for | Why |
|---------|----------|-----|
| **`CF_Authorization` cookie injection** (simplest) | Visual verification, multi-page flows, SPAs | Cookie fires on every request including SPA `fetch()` — no route intercepts needed |
| **`extraHTTPHeaders` + route intercepts** | Full admin impersonation (identity, groups, admin flag) | Lets you mock identity + auth endpoints for admin-only UI |

### Pattern A — Cookie Injection (PREFERRED for visual checks)

Under the hood: call the target URL with `CF-Access-Client-Id` + `CF-Access-Client-Secret`
headers, extract the `CF_Authorization` JWT from the `Set-Cookie` response header, then
inject it into a Playwright context before the first navigation. Subsequent `fetch()`
calls in the SPA automatically include the cookie.

```javascript
const { chromium } = require('playwright')

// Exchange service-token headers for CF_Authorization cookie
const CF_ID = process.env.CF_ACCESS_CLIENT_ID
const CF_SECRET = process.env.CF_ACCESS_CLIENT_SECRET

const res = await fetch('https://{{your-app}}.example.com/', {
  headers: { 'CF-Access-Client-Id': CF_ID, 'CF-Access-Client-Secret': CF_SECRET },
  redirect: 'manual',
})
const setCookie = res.headers.get('set-cookie') || ''
const cfAuth = /CF_Authorization=([^;]+)/.exec(setCookie)?.[1]

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
await context.addCookies([{ name: 'CF_Authorization', value: cfAuth, domain: '{{your-app}}.example.com', path: '/' }])
const page = await context.newPage()
await page.goto('https://{{your-app}}.example.com/admin')
```

**Why this beats chrome-devtools MCP**: The MCP can't set cookies _before_ the first
request, so CF Access redirects to `cloudflareaccess.com` before any JS runs. Playwright's
`context.addCookies()` is pre-navigation, so the browser sends `CF_Authorization` on the
first GET.

**NOTE**: If you previously referenced a reusable helper script for this flow, write the
cookie-exchange inline or store the snippet in a temp file for one-off runs.

### Pattern B — extraHTTPHeaders + Route Intercepts

For all CF Access-protected sites, use the service token. This requires **no manual login** — set headers on the browser context and all requests authenticate automatically.

**Server-side `ALLOW_SERVICE_TOKEN_AUTH`**: On dev projects, an env var like `ALLOW_SERVICE_TOKEN_AUTH=true` lets the auth middleware trust a `CF-Access-Authenticated-User-Email` header without a real JWT. Set only on dev — never on production.

**Credentials**: Load from your secrets manager (environment variables, encrypted `.env`, etc.). Never hardcode credentials in scripts or skills.

### Credential Loading

```bash
# Shell — load from environment
CF_ID=$CF_ACCESS_CLIENT_ID
CF_SECRET=$CF_ACCESS_CLIENT_SECRET
```

```javascript
// Node.js — read from process.env (set before running)
const CF_HEADERS = {
  'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
  'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
  'CF-Access-Authenticated-User-Email': 'test-user@example.com',
};
```

### Basic Usage (Node.js CJS)
```javascript
const { chromium } = require('playwright');

const CF_HEADERS = {
  'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
  'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
  'CF-Access-Authenticated-User-Email': 'test-user@example.com',
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  extraHTTPHeaders: CF_HEADERS,
  viewport: { width: 1920, height: 1080 },
});
const page = await context.newPage();
await page.goto('https://{{your-app}}.example.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.screenshot({ path: 'screenshots/app.png' });
await browser.close();
```

### Full Admin Access (Route Intercepts + Header Injection)

Service token `extraHTTPHeaders` only apply to page navigation, NOT to SPA `fetch()` calls. To get full admin access with live API data, you need **two layers**:

1. **Specific intercepts** (register FIRST) — mock identity, group membership, admin status, tab visibility
2. **Catch-all header injection** (register LAST) — inject service token headers into ALL `fetch()` calls

**CRITICAL: Playwright routes match LIFO** (last registered first). The catch-all must use `route.fallback()` for URLs handled by specific intercepts, otherwise it steals the request.

**Finding the real `isAdmin` source**: Many SPAs have a consolidated auth-init endpoint (e.g. `/api/auth-init`) that returns role flags in one payload. Intercept this rather than individual check endpoints to reliably flip admin status for RBAC UI tests.

**Bootstrap admin short-circuit gotcha**: If the app has a hardcoded list of admin emails in the frontend (e.g. `ADMIN_EMAILS = ['superuser@example.com']`), the app may grant admin even when your `/api/auth-init` intercept returns `isAdmin: false`. Use a non-bootstrap test email (e.g. `non-admin-test@example.com`) to test the non-admin UI path.

```javascript
const TEST_EMAIL = asAdmin ? 'admin@example.com' : 'non-admin-test@example.com';

// --- Register SPECIFIC intercepts FIRST ---
// Real source of isAdmin / role flags (adapt endpoint to your app).
await page.route('**/api/auth-init', route => {
  route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ email: TEST_EMAIL, isAdmin: asAdmin, roles: [] }) });
});
await page.route('**/cdn-cgi/access/get-identity', route => {
  route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ email: TEST_EMAIL, name: asAdmin ? 'Admin User' : 'Non Admin' }) });
});
await page.route('**/api/check-group*', route => {
  route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ isMember: asAdmin }) });
});

// --- Register CATCH-ALL LAST ---
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  if (url.includes('/api/auth-init') || url.includes('/api/check-group')) {
    await route.fallback(); // Delegate to specific intercept above
    return;
  }
  const headers = { ...route.request().headers(),
    'CF-Access-Client-Id': CF_HEADERS['CF-Access-Client-Id'],
    'CF-Access-Client-Secret': CF_HEADERS['CF-Access-Client-Secret'],
    'CF-Access-Authenticated-User-Email': TEST_EMAIL,
  };
  await route.continue({ headers });
});
```

## UI Label Audit — Visual Verification (MANDATORY)

When hiding or renaming a UI label (e.g. "Admin" for non-admin users), the same text is often rendered in **multiple places**: sidebar, main header, document title, tab labels, tooltip titles, breadcrumbs. Fixing one site and shipping leaves the others leaking.

**Before claiming a label change is done:**
1. `grep -rn '"YourLabel"' src/` — find ALL render sites
2. Check any default-fallback code paths that humanize a route ID (e.g. `activeView.charAt(0).toUpperCase() + activeView.slice(1)` turns `admin` → `"Admin"` for free, bypassing any lookup map)
3. **Visual verification is mandatory** — HTTP 200 and unit tests don't prove what the user sees. Take a Playwright screenshot of the actual rendered page.

Symptom of this gotcha: your RBAC intercept returns `isAdmin: false`, the JS unit test passes, but a main page header still renders "Admin" through a default fallback path that wasn't gated.

## Key Notes
- **Use `domcontentloaded`** not `networkidle` — React SPAs keep connections alive
- **Wait 3-5s after navigation** for data-driven content; **8-10s for heavy views**
- **Headed mode**: Add `headless: false` when user wants to watch
- **Auth failure signal**: HTTP 307 redirect = service token not accepted
- **Screenshots directory**: Use a consistent path like `screenshots/`

## Example: Using with_server.py

To start a server, run `--help` first, then use the helper:

**Single server:**
```bash
python scripts/with_server.py --server "npm run dev" --port 5173 -- python your_automation.py
```

**Multiple servers (e.g., backend + frontend):**
```bash
python scripts/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python your_automation.py
```

To create an automation script, include only Playwright logic (servers are managed automatically):
```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True) # Always launch chromium in headless mode
    page = browser.new_page()
    page.goto('http://localhost:5173') # Server already running and ready
    page.wait_for_load_state('networkidle') # CRITICAL: Wait for JS to execute
    # ... your automation logic
    browser.close()
```

## Reconnaissance-Then-Action Pattern

1. **Inspect rendered DOM**:
   ```python
   page.screenshot(path='/tmp/inspect.png', full_page=True)
   content = page.content()
   page.locator('button').all()
   ```

2. **Identify selectors** from inspection results

3. **Execute actions** using discovered selectors

## Common Pitfall

- **Don't** inspect the DOM before waiting for `networkidle` on dynamic apps
- **Do** wait for `page.wait_for_load_state('networkidle')` before inspection

## Screenshot Timing

Wait 1-2 seconds after:
- Starting a dev server
- Navigating to a new page
- Theme transitions

before taking screenshots. Without this pause, captures may show loading states or incomplete renders.

## Best Practices

- **Use bundled scripts as black boxes** - Use `--help` to see usage, then invoke directly
- Use `sync_playwright()` for synchronous scripts
- Always close the browser when done
- Use descriptive selectors: `text=`, `role=`, CSS selectors, or IDs
- Add appropriate waits: `page.wait_for_selector()` or `page.wait_for_timeout()`

## Reference Files

- **examples/** - Examples showing common patterns:
  - `element_discovery.py` - Discovering buttons, links, and inputs on a page
  - `static_html_automation.py` - Using file:// URLs for local HTML
  - `console_logging.py` - Capturing console logs during automation
