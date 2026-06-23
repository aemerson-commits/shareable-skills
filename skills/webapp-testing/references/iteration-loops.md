# Iteration Loops — Detailed Reference

Detailed how-to for the three core verification loops used in `webapp-testing`.
See [SKILL.md](../SKILL.md) for the overview and decision tree.

---

## 1. Temp Playwright Script Iteration Loop

The canonical loop for visual verification of any deployed or locally-served page.
No persistent profile, no CF Access bounce, no MCP lock collision.

### Steps

1. **Write** a throwaway script at `/tmp/verify-<feature>.mjs`
2. **Run** with `node` (use `dotenvx` or your secrets manager when secrets are needed)
3. **Read** the screenshot with the `Read` tool — visually inspect
4. **Edit** the script (add selectors, clicks, state capture) — go to step 2
5. Repeat until screenshots confirm correct rendering

Expect 2–6 cycles. This is normal — even experienced runs iterate.

### Minimal template (CF Access via cookie injection)

```js
// /tmp/verify-<feature>.mjs
import { chromium } from 'playwright';

// Exchange service-token headers for CF_Authorization cookie
const CF_ID     = process.env.CF_ACCESS_CLIENT_ID;
const CF_SECRET = process.env.CF_ACCESS_CLIENT_SECRET;

const res = await fetch('https://{{your-app}}.example.com/', {
  headers: { 'CF-Access-Client-Id': CF_ID, 'CF-Access-Client-Secret': CF_SECRET },
  redirect: 'manual',
});
const setCookie = res.headers.get('set-cookie') || '';
const cfAuth = /CF_Authorization=([^;]+)/.exec(setCookie)?.[1];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addCookies([{ name: 'CF_Authorization', value: cfAuth, domain: '{{your-app}}.example.com', path: '/' }]);
const page = await ctx.newPage();
await page.goto('https://{{your-app}}.example.com/dashboard', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);  // wait for data-driven content
await page.screenshot({ path: '/tmp/screenshots/verify-1.png', fullPage: true });
await browser.close();
```

**Run command** (with secrets pre-loaded in env):
```bash
CF_ACCESS_CLIENT_ID=<id> CF_ACCESS_CLIENT_SECRET=<secret> node /tmp/verify-<feature>.mjs
# Or via your secrets manager:
npx dotenvx run -- node /tmp/verify-<feature>.mjs
```

### Why cookie injection beats the chrome-devtools MCP

Playwright's `context.addCookies()` is **pre-navigation** — the browser sends
`CF_Authorization` on the very first GET. The chrome-devtools MCP can't set cookies
before the first request, so CF Access redirects to `cloudflareaccess.com` before any
JS runs. The cookie approach works on all CF Access-protected sites.

### Wait times

| Content type | Wait |
|---|---|
| Basic page / component | `waitForTimeout(3000)` |
| Heavy data views (large tables, charts) | `waitForTimeout(8000–10000)` |

### Screenshot storage conventions

| Path pattern | Use case |
|---|---|
| `/tmp/verify-<feature>.mjs` | True throwaway — one screenshot, no audit trail |
| `/tmp/screenshots/<feature-state>.png` | Multiple states in one iteration session |
| `.claude/reviews/<feature>/` | Kept as audit evidence (post-deploy, smoke runs) |
| `test-results/smoke-YYYY-MM-DD/` | Formal smoke runs after deploy |

---

## 2. Edit → Build → Screenshot → Read → Iterate (CSS/Layout)

For CSS and component layout work, the loop adds a build step before re-screenshotting.

### Steps

1. **Read** the latest screenshot (or take one if none exists)
2. **Grep** CSS class usage in `src/` to understand current state
3. **Edit** CSS or component
4. **`npm run build`** in the project directory
5. **Re-screenshot** via the temp Playwright script
6. **Read** the new screenshot — if correct, done; otherwise go to step 2

After cleanup, grep for class names to confirm zero orphans.
Always re-read CSS source before each edit — earlier rounds may have changed state.

### Targeted selectors after you navigate

```js
// Click a button to open a modal, then screenshot the modal
await page.click('button.settings-button');
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/screenshots/modal-open.png' });

// Interact with a specific element
await page.fill('input[name="search"]', 'test query');
await page.keyboard.press('Enter');
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/screenshots/after-search.png' });
```

### Email-HTML composition loop

The same Write → Screenshot → Read → iterate cycle applies to standalone HTML email previews (not deployed pages):

```js
// /tmp/verify-email-preview.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const html = readFileSync('/tmp/email-draft/preview.html', 'utf8');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 700, height: 900 });  // email viewport
await page.setContent(html, { waitUntil: 'domcontentloaded' });
await page.screenshot({ path: '/tmp/email-draft/preview.png', fullPage: true });
await browser.close();
```

Run after generating the HTML email draft. Iterate on the HTML template (no build
needed — it's a static file) until the screenshot matches the intended layout.

---

## 3. Deployed Bundle Content Grep

After deploying CSS or JS changes, verify the changes actually survived the Vite
build pipeline and are present in the deployed bundle. HTTP 200 (app shell loads)
passes even when the CSS change didn't make it into the bundle.

### Pattern

```bash
# 1. Load CF Access credentials
CF_ID=$CF_ACCESS_CLIENT_ID
CF_SECRET=$CF_ACCESS_CLIENT_SECRET

# 2. Download the deployed CSS bundle (get the asset hash from the built dist/ first)
curl -s -H "CF-Access-Client-Id: ${CF_ID}" -H "CF-Access-Client-Secret: ${CF_SECRET}" \
  "https://{{your-app}}.example.com/assets/YourView-XXXXX.css" -o /tmp/bundle.css

# 3. Grep for expected selectors
grep -c "your-selector" /tmp/bundle.css
grep -E "your-selector|related-class" /tmp/bundle.css | head -20

# 4. Check JS bundle for module references
grep -oE '"[A-Za-z0-9_/-]+YourComponent[A-Za-z0-9_.-]*"' /tmp/bundle.js | sort -u
```

### Local dist cross-check (before deploy)

```bash
# Find which Vite chunk contains the target selectors
grep -l "your-selector" dist/assets/
ls dist/assets/ | grep -iE "your-component|index-|modal"
grep -lE "your-selector|your-label" dist/assets/
```

### Minified JS bundle tracing

Vite minifies variable names. To trace logic through a minified bundle, use
context-window grep with `-oE '.{0,N}keyword.{0,M}'` to extract readable snippets
that fit within the context window:

```bash
# Trace a keyword with surrounding context (N chars before, M chars after)
grep -oE '.{0,40}yourFunction.{0,200}' /tmp/bundle.js | head -3
grep -oE '.{0,30}yourStateVar.{0,80}' /tmp/bundle.js | grep -i 'token' | head -3
grep -oE '.{0,60}totalAmount.{0,60}' /tmp/bundle.js | head -10

# Find lazy-loaded chunk filenames referenced by the entry bundle
grep -oE '"[^"]*\.css"' /tmp/entry-bundle.js | sort -u
grep -oE '"[A-Za-z0-9_/-]+\.js"' /tmp/entry-bundle.js | grep -i "your-component"

# Count occurrences to confirm a specific fix landed
grep -c "parseInt" dist/assets/YourView-XXXXX.js
grep -o 'yourKey\|yourField' /tmp/bundle.js | sort | uniq -c
```

**Key technique**: `grep -oE '.{0,N}keyword.{0,M}'` extracts only the matched region
plus surrounding context — the output fits in the context window even for
single-line minified files that are megabytes long.

### When to use local dist vs downloaded bundle

| Situation | Use |
|---|---|
| Before deploy — confirm build output | `grep` local `dist/assets/` |
| After deploy — confirm CI didn't use stale cache | Download + grep deployed bundle |
| Rapid fix→deploy→verify loop | Both: local dist first, then deployed after CI |
| CSS vars silently resolve to transparent | Bundle grep only way to confirm token replacement |

### Find asset filename (deployed)

Navigate to the deployed app in a browser, open DevTools Network tab and filter by `.css`
or `.js` to see the hashed filenames. Or grep the entry bundle:

```bash
curl -s -H "CF-Access-Client-Id: ${CF_ID}" -H "CF-Access-Client-Secret: ${CF_SECRET}" \
  "https://{{your-app}}.example.com/assets/index-XXXXX.js" -o /tmp/entry.js
grep -oE '"[^"]*-[A-Za-z0-9_-]{6,12}\.js"' /tmp/entry.js | head -30
```

---

## 4. CF Access Auth Patterns (Full Reference)

### Pattern A — Cookie Injection (PREFERRED for visual checks)

Exchanges CF service-token headers for a `CF_Authorization` JWT cookie, then injects
it before the first navigation. All subsequent SPA `fetch()` calls include the cookie
automatically — no route intercepts needed.

```javascript
const { chromium } = require('playwright')

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

**Note**: Write the cookie-exchange inline or store the snippet in a temp file for
one-off runs. A reusable helper script is convenient but not required.

### Pattern B — extraHTTPHeaders + Route Intercepts

For full admin impersonation: set `extraHTTPHeaders` on the context AND register
specific route intercepts for identity/group/admin APIs.

**Critical order**: register specific intercepts FIRST, catch-all LAST.
Playwright routes match LIFO — last registered, first matched. The catch-all must
call `route.fallback()` for URLs handled by specific intercepts.

**`isAdmin` source**: Find the consolidated auth-init endpoint in your app (e.g.
`/api/auth-init`) that returns role flags. Intercept this to control RBAC UI.

**Hardcoded admin short-circuit**: If your app has a hardcoded list of admin emails
in the frontend, the app may grant admin even when your intercept returns
`isAdmin: false`. Use a non-bootstrap test email to test the non-admin UI path.

```javascript
const TEST_EMAIL = asAdmin ? 'admin@example.com' : 'non-admin-test@example.com';

// --- Register SPECIFIC intercepts FIRST ---
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
    await route.fallback();
    return;
  }
  const headers = { ...route.request().headers(),
    'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
    'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
    'CF-Access-Authenticated-User-Email': TEST_EMAIL,
  };
  await route.continue({ headers });
});
```

### Credential Loading (Node.js CJS)

```javascript
const { chromium } = require('playwright');

const CF_HEADERS = {
  'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
  'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
  'CF-Access-Authenticated-User-Email': 'test-user@example.com',
};
```

### Credential Loading (Shell)

```bash
CF_ID=$CF_ACCESS_CLIENT_ID
CF_SECRET=$CF_ACCESS_CLIENT_SECRET
```

### Server-Side: ALLOW_SERVICE_TOKEN_AUTH

Your auth middleware may require a JWT by default. On dev projects, an
`ALLOW_SERVICE_TOKEN_AUTH=true` env var lets it trust the
`CF-Access-Authenticated-User-Email` header without a JWT.
**Never set on production.**
