#!/usr/bin/env node
/**
 * Local Playwright test runner — no external auth required.
 *
 * Usage:
 *   node test-local.js                          # Run all smoke tests against local app
 *   node test-local.js --project frontend       # Test a named project instead
 *   node test-local.js --test smoke             # Run specific test
 *   node test-local.js --headed                 # Show browser (not headless)
 *   node test-local.js --screenshot /tmp/out    # Save screenshots to directory
 *
 * Prerequisites:
 *   - npm run build in the target project
 *   - .dev.vars populated with secrets (if needed)
 *   - dev server running (auto-started if not)
 *
 * Ports:
 *   frontend:   http://localhost:5173   (adjust to your project)
 */

const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

// Parse args
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
};
const hasFlag = (name) => args.includes(`--${name}`);

const PROJECT = getArg('project', 'frontend');
const TEST_NAME = getArg('test', 'smoke');
const HEADED = hasFlag('headed');
const SCREENSHOT_DIR = getArg('screenshot', '/tmp/screenshots');
const PORT = parseInt(getArg('port', '5173'), 10);
const BASE_URL = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, '..', '..', '..');
const PROJECT_DIR = path.join(ROOT, PROJECT);

// Check port availability
function isPortOpen(port) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(1000);
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(port, 'localhost');
  });
}

// Wait for server
async function waitForServer(port, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await isPortOpen(port)) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

// ============================================================
// Test Suites
// ============================================================

const TESTS = {
  // Basic smoke test — page loads, shell renders, no critical console errors
  smoke: async (page, results) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for React hydration + initial renders

    // Check page loaded (not a blank page or error)
    const title = await page.title();
    results.push({ name: 'Page loads', pass: title.length > 0, detail: `Title: "${title}"` });

    // Check shell/nav renders (React must have hydrated)
    const shell = await page.locator('.sidebar, .app-sidebar, nav, [class*="sidebar"], [class*="nav"]').first();
    const shellVisible = await shell.isVisible().catch(() => false);
    results.push({ name: 'App shell renders', pass: shellVisible });

    // Check no critical console errors (filter expected local-dev warnings)
    const criticalErrors = errors.filter(e =>
      !e.includes('manifest.json') && !e.includes('favicon') &&
      !e.includes('401') && !e.includes('Unauthorized') &&
      !e.includes('Failed to load resource') &&
      !e.includes('Cloudflare Access') && !e.includes('get-identity')
    );
    results.push({
      name: 'No critical console errors',
      pass: criticalErrors.length === 0,
      detail: criticalErrors.length > 0 ? criticalErrors.slice(0, 3).join('\n') : '',
    });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${PROJECT}-smoke.png`) });
  },

  // Navigation test — check that main nav items are clickable and load content
  navigation: async (page, results) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Find all nav items
    const navItems = await page.locator('nav a, .sidebar a, [class*="nav-item"]').all();
    results.push({ name: 'Nav items exist', pass: navItems.length > 0, detail: `Found ${navItems.length} nav items` });

    // Click first nav item and verify content loads
    if (navItems.length > 0) {
      await navItems[0].click();
      await page.waitForTimeout(1500);
      const hasContent = await page.locator('main, [class*="content"], [class*="view"]').first().isVisible().catch(() => false);
      results.push({ name: 'Content area renders after nav click', pass: hasContent });
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${PROJECT}-navigation.png`) });
  },

  // API connectivity — check that data loads from the API (not stuck on loading)
  'api-load': async (page, results) => {
    const apiErrors = [];
    page.on('response', resp => {
      if (resp.url().includes('/api/') && resp.status() >= 500) {
        apiErrors.push(`${resp.status()} ${resp.url()}`);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000); // Wait for API data

    // Check no loading spinners still visible (data has arrived)
    const loadingVisible = await page.locator('[class*="spinner"], [class*="loading"], [class*="skeleton"]').first().isVisible().catch(() => false);
    results.push({ name: 'No stuck loading spinners after 5s', pass: !loadingVisible });

    // Check no 5xx API errors
    results.push({ name: 'No 5xx API errors', pass: apiErrors.length === 0, detail: apiErrors.join('\n') });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${PROJECT}-api-load.png`) });
  },
};

// ============================================================
// Main
// ============================================================

(async () => {
  console.log(`\n=== Local Test: ${PROJECT} / ${TEST_NAME} ===\n`);

  // Ensure screenshot dir exists
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // Check if server is already running
  let serverProcess = null;
  const serverUp = await isPortOpen(PORT);

  if (!serverUp) {
    console.log(`Server not running on port ${PORT}. Starting dev server...`);

    // Check if dist exists (for static serving)
    const distDir = path.join(PROJECT_DIR, 'dist');
    if (fs.existsSync(distDir)) {
      // Serve built output
      serverProcess = spawn('npx', ['serve', 'dist', '--port', String(PORT)], {
        cwd: PROJECT_DIR,
        shell: true,
        stdio: 'pipe',
      });
    } else {
      // Start dev server
      serverProcess = spawn('npm', ['run', 'dev', '--', '--port', String(PORT)], {
        cwd: PROJECT_DIR,
        shell: true,
        stdio: 'pipe',
      });
    }

    console.log(`Waiting for server on port ${PORT}...`);
    const ready = await waitForServer(PORT, 60000);
    if (!ready) {
      console.error('Server failed to start within 60s');
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
    console.log('Server ready.\n');
  } else {
    console.log(`Server already running on port ${PORT}\n`);
  }

  // Run test
  const testFn = TESTS[TEST_NAME];
  if (!testFn) {
    console.error(`Unknown test: ${TEST_NAME}. Available: ${Object.keys(TESTS).join(', ')}`);
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: !HEADED });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

    const results = [];
    await testFn(page, results);

    // Report
    console.log('\n--- Results ---');
    let allPass = true;
    for (const r of results) {
      const icon = r.pass ? 'PASS' : 'FAIL';
      console.log(`  [${icon}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
      if (!r.pass) allPass = false;
    }
    console.log(`\n${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}\n`);

    await browser.close();
    if (serverProcess) serverProcess.kill();
    process.exit(allPass ? 0 : 1);

  } catch (err) {
    console.error('Test error:', err.message);
    if (browser) await browser.close();
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  }
})();
