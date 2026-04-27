---
name: throwaway-script
description: Pattern for writing & executing throwaway .mjs Node scripts that need .env secrets — covers location choice, ES-module form, Windows + Git Bash path quirks, and noise filtering. Use for ad-hoc API probes, polling, calibration runs, smoke verification.
user-invocable: false
---

# throwaway-script

## When to use

Use this pattern for a single-shot script that needs `process.env.*` from `.env`. Examples: probe an API for a specific response shape, hit a cloud provider's API to verify a resource is registered, run a one-off database calibration query, inspect a KV/cache key, verify a deploy is live.

**Not for:**
- Persistent tooling → build a Worker / service / CLI instead
- Simple shell one-liners that don't need secrets → `curl` + `jq` directly
- Anything you'll re-run more than 2-3 times → promote it to a real script in the project

## Location decision

| Path | When to use |
|------|-------------|
| OS temp dir (e.g. `/tmp/<name>.mjs` on Linux/macOS, `C:/tmp/<name>.mjs` on Windows) | True throwaway — won't be re-run. No cleanup needed. |
| `.claude/reviews/<feature>-verify.mjs` (or similar audit dir in your repo) | Kept as audit trail. Re-runnable. Use when the script documents a verification step. |
| Project root | **Never.** Pollutes git working tree. |

Default to the OS temp dir. Switch to a tracked `.claude/reviews/` (or equivalent) only when you want the script committed as evidence of a verification.

## Script form (ES module)

Use ESM (`import`/`export`), not CommonJS (`require`). Node 18+ supports top-level `await` in `.mjs` files.

```javascript
import process from 'node:process';

// Top-level await is fine in .mjs
const token = process.env.SOME_SECRET;
if (!token) throw new Error('SOME_SECRET not set — check .env');

const res = await fetch('https://example.com/api', {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
```

If you need a self-contained wrapper (e.g. for explicit error propagation):

```javascript
import process from 'node:process';

(async () => {
  const token = process.env.SOME_SECRET;
  if (!token) throw new Error('SOME_SECRET not set');
  // ... your logic
})().catch(err => { console.error(err); process.exit(1); });
```

## Loading .env secrets

Two common approaches:

**A — Native (Node 20.6+):** use `--env-file`:

```bash
node --env-file=.env /tmp/my-script.mjs
```

**B — A `.env` loader of your choice** (e.g. `dotenv`, `dotenvx` if you want encrypted env):

```bash
npx dotenv -- node /tmp/my-script.mjs
```

If your loader prints log lines (e.g. `[loader][info] injected 12 keys`), filter them so real script output stays visible:

```bash
npx <loader> -- node /tmp/my-script.mjs 2>&1 | grep -v "Loading\|injected\|suppress"
```

If CWD isn't the project root, point the loader at your `.env` explicitly (loaders typically have `--env-file` or `--cwd`).

## Windows + Git Bash — path gotcha

On Windows with Git Bash, `/tmp/foo` resolves to `C:\Users\<you>\AppData\Local\Temp\foo` — **not** `C:/tmp/foo`. Node sees whichever Windows path Bash hands it.

**Safest approach:** write Windows paths directly using forward slashes, which Node accepts on Windows:

```bash
node C:/tmp/my-script.mjs
```

**If passing a runtime path argument from Bash to Node:**

```bash
TMP_WIN=$(cygpath -w /tmp)
node C:/tmp/my-script.mjs "$TMP_WIN/data.json"
```

Inside the script, write output paths as Windows-style or use `path.resolve()`:

```javascript
import path from 'node:path';
const out = path.resolve('C:/tmp/result.json');
```

## Common script shapes

### Cloud API probe (verify a resource exists)

Read provider credentials from `process.env`, hit the API, print the response:

```javascript
import process from 'node:process';

const token = process.env.PROVIDER_API_TOKEN;
const acct  = process.env.PROVIDER_ACCOUNT_ID;
if (!token || !acct) throw new Error('Missing PROVIDER_API_TOKEN / PROVIDER_ACCOUNT_ID');

const res = await fetch(
  `https://api.example.com/accounts/${acct}/resources/my-resource`,
  { headers: { Authorization: `Bearer ${token}` } }
);
console.log(JSON.stringify(await res.json(), null, 2));
```

### OAuth-stored token probe

Some CLIs (e.g. cloud provider tools) cache OAuth tokens in a config file. Read it from the script if you need to call the API directly:

```javascript
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Adjust path for your tool — check docs for where it stores its config
const cfgPath = path.join(os.homedir(), '.config', 'mytool', 'config.toml');
const cfg = fs.readFileSync(cfgPath, 'utf8');
const token = cfg.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
if (!token) throw new Error('No oauth_token found — re-login');

// ... use token in fetch
```

### Database shape probe

Install your driver locally if not present (`npm install <driver>` in your script's dir):

```javascript
import sql from 'mssql'; // or 'pg', 'mysql2', etc.
import process from 'node:process';

const pool = await sql.connect({
  server:   process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options:  { encrypt: false, trustServerCertificate: true },
});
const result = await pool.request().query('SELECT TOP 5 * FROM your_table');
console.log(JSON.stringify(result.recordset, null, 2));
await pool.close();
```

### Smoke verification (post-deploy)

For simple endpoint checks, prefer `curl` directly over a script — it's one line. Reach for a script when you need to thread auth headers, follow redirects intelligently, or assert on response shape.

## Anti-patterns

- **Script at project root** — pollutes `git status`. Use a temp dir or a tracked `.claude/reviews/`.
- **Hardcoded secrets** — defeats the point of an env loader. Always `process.env.*`.
- **CommonJS `require()`** — modern Node is ESM-friendly. Use `import` + `.mjs` extension.
- **Skipping the noise filter** — `.env` loaders are loud. Pipe through `grep -v "Loading\|injected\|suppress"` (or your loader's silent flag) so real output stands out.
- **`/tmp/` on Windows without thought** — Git Bash translates it to the user's AppData Temp. Use explicit `C:/tmp/` paths in both the Bash invocation and the script itself.
- **Running scripts without `--env-file` or a loader** — symptoms look like "API returned 401 / no token" but the real cause is `.env` never loaded.
