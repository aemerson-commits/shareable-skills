---
name: webapp-testing
description: Toolkit for interacting with and testing web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.
license: Complete terms in LICENSE.txt
user-invocable: true
---

# Web Application Testing

To test web applications, write native Playwright scripts (Python or Node.js, depending on your environment).

**Helper Scripts Available**:
- `scripts/cf-session.py` - Legacy persistent sessions (cookie-based, requires manual login)
- `scripts/with_server.py` - Manages server lifecycle (supports multiple servers)

**Always run scripts with `--help` first** to see usage. DO NOT read the source until you try running the script first and find that a customized solution is absolutely necessary. These scripts can be very large and thus pollute your context window.

## Decision Tree: Choosing Your Approach

```
User task → Is the target behind auth (CF Access, SSO, etc.)?
    ├─ Yes → Use Service Token or API Key (PREFERRED — no manual login needed)
    │         1. Set extraHTTPHeaders with auth credentials
    │         2. Navigate freely — all requests auto-authenticate
    │         3. See "Service Token Authentication" below
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

## Service Token Authentication (PREFERRED)

For auth-protected sites, use service tokens or API keys. Set headers on the browser context and all requests authenticate automatically.

### Basic Usage (Node.js)
```javascript
const { chromium } = require('playwright');

const AUTH_HEADERS = {
  // Replace with your auth mechanism:
  // CF Access: 'CF-Access-Client-Id' + 'CF-Access-Client-Secret'
  // Bearer token: 'Authorization': 'Bearer YOUR_TOKEN'
  // Custom: whatever your auth requires
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  extraHTTPHeaders: AUTH_HEADERS,
  viewport: { width: 1920, height: 1080 },
});
const page = await context.newPage();
await page.goto('https://your-project-dev.pages.dev/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.screenshot({ path: 'screenshots/app.png' });
await browser.close();
```

### Route Intercepts for Full Admin Access

Service token `extraHTTPHeaders` only apply to page navigation, NOT to SPA `fetch()` calls. To get full access with live API data, you need **two layers**:

1. **Specific intercepts** (register FIRST) — mock identity, group membership, admin status
2. **Catch-all header injection** (register LAST) — inject auth headers into ALL `fetch()` calls

**CRITICAL: Playwright routes match LIFO** (last registered first). The catch-all must use `route.fallback()` for URLs handled by specific intercepts, otherwise it steals the request.

```javascript
// --- Register SPECIFIC intercepts FIRST ---
await page.route('**/api/identity', route => {
  route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ email: 'user@example.com', name: 'Test User' }) });
});
await page.route('**/api/check-auth*', route => {
  route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ isAdmin: true }) });
});

// --- Register CATCH-ALL LAST ---
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  if (url.includes('/api/identity') || url.includes('/api/check-auth')) {
    await route.fallback(); // Delegate to specific intercept above
    return;
  }
  const headers = { ...route.request().headers(), ...AUTH_HEADERS };
  await route.continue({ headers });
});
```

### Key Notes
- **Use `domcontentloaded`** not `networkidle` — React SPAs keep connections alive
- **Wait 3-5s after navigation** for data-driven content; **8-10s for heavy views**
- **Headed mode**: Add `headless: false` when user wants to watch
- **Auth failure signal**: HTTP 307 redirect = service token not accepted
- **Screenshots directory**: Use a consistent path like `screenshots/`

## Legacy: Cookie-Based Sessions (cf-session.py)

> **Deprecated in favor of service token approach above.** Only use if service token is unavailable.

For testing auth-protected sites using cookie-based auth (requires manual user login).

```bash
python scripts/cf-session.py login       # User authenticates in visible browser
python scripts/cf-session.py screenshot https://your-dev-site.pages.dev /tmp/screenshot.png
python scripts/cf-session.py status      # Check session validity
```

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
