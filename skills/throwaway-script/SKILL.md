---
name: throwaway-script
description: Pattern for writing & executing throwaway .mjs Node scripts that need .env secrets — covers location choice, ES-module form, Windows + Git Bash path quirks, and noise filtering. Use for ad-hoc API probes, polling, calibration runs, smoke verification.
user-invocable: false
---

# throwaway-script

## When to use

Use this pattern for a single-shot script that needs `process.env.*` from `.env`. Examples: probe an API for a specific response shape, hit a cloud provider's API to verify a resource is registered, run a one-off database calibration query, inspect a cache key, verify a deploy is live.

**Not for:**
- Persistent tooling → build a Worker / service / CLI instead
- Simple shell one-liners that don't need secrets → `curl` + `jq` directly
- Anything you'll re-run more than 2-3 times → promote it to a real script in the project

## Location decision

| Path | When to use |
|------|-------------|
| Session scratchpad / OS temp dir (e.g. `$SCRATCHPAD` if the harness injects one, else `/tmp/<name>.mjs`) | **Default.** Investigation probes, DB/SQL behavior tests, API shape checks. Isolated from the repo, so nothing exploratory can be accidentally committed. |
| Inside the repo — a session worktree, or `.claude/reviews/<feature>-verify.mjs` | **Required whenever the script has a BARE npm import** (see below). Also use when the script should be committed as evidence of a verification. |
| A gitignored scratch dir inside the repo (e.g. `.scratch/patch-<what>.mjs`) | **Mechanical source-file rewrites** — see § Patch scripts below. Needs a repo-relative path to read/write the target, so it has to live in the repo, not the OS scratchpad. |
| Project root | **Never.** Pollutes the git working tree. |

Default to the scratchpad. Move into the repo when you need real dependencies, or when you want the script committed as evidence.

### Patch scripts — mechanical source transformations

When the same edit has to land in a dozen+ places in one file — renaming a pattern throughout a
component, converting a tag format everywhere it appears, a conditional touched at every call
site — write a Node script that reads the target file, transforms it, and writes it back. Keep
single-point edits in your normal editor tool; reach for a patch script only when the
transformation itself is the unit of work.

```bash
node --check patch-something.mjs && echo OK
node patch-something.mjs && grep -c "expected-pattern" path/to/target.jsx
npm run build > build.log 2>&1; echo "EXIT=$?"
```

Verify by grepping the **target** for the post-condition, not by re-reading the script — the
script running without throwing says nothing about whether it matched anything.

**Lint the target by hand — a post-edit auto-lint hook keyed to editor-tool calls does not fire
for it.** If your harness runs a lint hook wired to `Edit`/`Write`/`MultiEdit` tool invocations, a
patch script writing through `fs` from a shell-invoked process is invisible to it: the edit lands
with zero lint coverage. A build does not close that gap — it catches syntax and type breakage,
never a lint-only rule. Run the linter on the target file explicitly before calling the patch done:

```bash
npx <linter> check path/to/target.jsx   # e.g. biome check / eslint
```

Same shape as any other tool-matched hook a shell-level write slips past — the hook trusts the
tool name, not the file's actual change.

A repo-local scratch dir is also exposed to `git add -A` sweeping a leftover patch script into an
unrelated commit. Gitignore the directory you use for these, and prefer an explicit pathspec
`git add <files>` over `-A` on any commit made while a patch script is still on disk.

### The bare-import trap

`node_modules` lives in the **repo**. A script written to an OS scratchpad resolves bare
specifiers from its own directory upward and never reaches it — `import { chromium } from
'playwright'` dies with `ERR_MODULE_NOT_FOUND`. Built-ins (`node:fs`), relative imports
(`./x`), absolute paths, and global `fetch` all work fine from anywhere; a script using only
those is the healthy scratchpad case.

The tell is that this looks like a missing dependency and isn't — the package is installed,
just not reachable from where the file sits. **Fix by moving the script into the repo**, not
by installing anything (a stray install into a shared tree is far more damaging than the
original problem).

Worth a write-time guard if you hit it more than once: a hook that fires only on
*out-of-repo path × bare specifier* catches it before the write, which is cheaper than a
write → run → diagnose → move cycle. One project marked this "cheap to hit, cheap to fix"
and closed it, then paid that cycle three more times in four days before gating it.

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

## Execution

**Syntax-check before the first real run**: `node --check path/to/script.mjs` catches import typos and bracket errors instantly, instead of burning a full secrets-load + network round trip to discover a mistake. This matters more once the script is about to touch a production system — a syntax error caught here is far cheaper than one caught mid-run against live infrastructure.

**Bracket the run with a deterministic marker** (`echo MARK_START; ...; echo MARK_END`) when the output needs to be trusted for a decision — in a long agent session, tool-result channels can occasionally return truncated or misleading output, and a marker plus the process's actual exit code is more trustworthy than the narrative text alone.

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

### Cache/KV inspection

Most cache and KV APIs offer a CLI or SDK "get key" call — prefer that over writing a script when a single lookup will do. Reach for a script only when you need to correlate multiple keys or transform the result.

### Smoke verification (post-deploy)

For simple endpoint checks, prefer `curl` directly over a script — it's one line. Reach for a script when you need to thread auth headers, follow redirects intelligently, or assert on response shape.

## Anti-patterns

- **Script at project root** — pollutes `git status`. Use a temp dir or a tracked `.claude/reviews/`.
- **Hardcoded secrets** — defeats the point of an env loader. Always `process.env.*`.
- **CommonJS `require()`** — modern Node is ESM-friendly. Use `import` + `.mjs` extension.
- **Skipping the noise filter** — `.env` loaders are loud. Pipe through `grep -v "Loading\|injected\|suppress"` (or your loader's silent flag) so real output stands out.
- **`/tmp/` on Windows without thought** — Git Bash translates it to the user's AppData Temp. Use explicit `C:/tmp/` paths in both the Bash invocation and the script itself.
- **Running scripts without `--env-file` or a loader** — symptoms look like "API returned 401 / no token" but the real cause is `.env` never loaded.
