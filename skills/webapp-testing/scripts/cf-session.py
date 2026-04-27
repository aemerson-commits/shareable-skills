"""
Persistent Playwright session for Cloudflare Access-protected dev sites.

Usage:
  python cf-session.py login          # Opens visible browser — log in via CF Access, then close
  python cf-session.py screenshot <url> [output_path]   # Screenshot a page using saved session
  python cf-session.py navigate <url>                   # Navigate and dump page title + URL
  python cf-session.py inspect <url> [selector]         # Screenshot + dump DOM for a selector
  python cf-session.py interactive <url>                # Opens visible browser with saved session
  python cf-session.py status                           # Check if sessions are still valid

Session data is stored in:
  /tmp/pw-sessions/<site-key>/   (one directory per site)

First run: use 'login' to authenticate. Sessions persist across runs until cookies expire.

Configure SITES below with your own CF Access-protected URLs:
"""

import sys
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

SESSION_DIR = Path("/tmp/pw-sessions")

# Configure with your own CF Access-protected URLs:
SITES = {
    "app-a": "https://your-app-a.{{your-domain}}",
    "app-b": "https://your-app-b.{{your-domain}}",
}

def get_site_key(url):
    """Determine which site a URL belongs to."""
    for key, base in SITES.items():
        if base in url or key in url:
            return key
    # Default to portal
    return "portal"

def get_session_dir(site_key):
    return str(SESSION_DIR / site_key)

def ensure_session_dirs():
    for key in SITES:
        (SESSION_DIR / key).mkdir(parents=True, exist_ok=True)

def cmd_login():
    """Open visible browsers for all sites so user can authenticate via CF Access."""
    ensure_session_dirs()
    print("Opening browsers for CF Access login...")
    print("Log in to each site, then close the browser windows when done.\n")

    with sync_playwright() as p:
        contexts = []
        pages = []
        for key, url in SITES.items():
            print(f"  Opening {key}: {url}")
            ctx = p.chromium.launch_persistent_context(
                get_session_dir(key),
                headless=False,
                viewport={"width": 1280, "height": 900},
                args=["--disable-blink-features=AutomationControlled"],
            )
            page = ctx.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            contexts.append(ctx)
            pages.append(page)

        print("\nAll browsers open. Log in to each, then close them when done.")
        print("(Sessions will be saved automatically on close.)\n")

        # Wait for all contexts to be closed by the user
        for ctx in contexts:
            try:
                while len(ctx.pages) > 0:
                    time.sleep(1)
            except Exception:
                pass
            try:
                ctx.close()
            except Exception:
                pass

    print("Sessions saved. You can now use 'screenshot', 'navigate', etc.")

def cmd_screenshot(url, output_path=None):
    """Take a screenshot of a URL using the saved session."""
    site_key = get_site_key(url)
    session_dir = get_session_dir(site_key)

    if not Path(session_dir).exists():
        print(f"Error: No session found for {site_key}. Run 'login' first.")
        sys.exit(1)

    if output_path is None:
        output_path = f"C:/tmp/pw-screenshot-{site_key}-{int(time.time())}.png"

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            session_dir,
            headless=True,
            viewport={"width": 1400, "height": 900},
        )
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle", timeout=30000)

        # Check if we got redirected to CF Access login
        if "cloudflareaccess" in page.url or "access" in page.url.lower():
            print(f"Error: Session expired for {site_key}. Run 'login' to re-authenticate.")
            ctx.close()
            sys.exit(1)

        page.screenshot(path=output_path, full_page=True)
        print(f"Screenshot saved: {output_path}")
        print(f"Page title: {page.title()}")
        print(f"Page URL: {page.url}")
        ctx.close()

    return output_path

def cmd_navigate(url):
    """Navigate to a URL and print page info."""
    site_key = get_site_key(url)
    session_dir = get_session_dir(site_key)

    if not Path(session_dir).exists():
        print(f"Error: No session found for {site_key}. Run 'login' first.")
        sys.exit(1)

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            session_dir,
            headless=True,
            viewport={"width": 1400, "height": 900},
        )
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle", timeout=30000)
        print(f"Title: {page.title()}")
        print(f"URL: {page.url}")

        if "cloudflareaccess" in page.url:
            print("WARNING: Redirected to CF Access login — session expired.")
        ctx.close()

def cmd_inspect(url, selector=None):
    """Screenshot a page and optionally dump a selector's content."""
    site_key = get_site_key(url)
    session_dir = get_session_dir(site_key)
    output_path = f"C:/tmp/pw-inspect-{site_key}-{int(time.time())}.png"

    if not Path(session_dir).exists():
        print(f"Error: No session found for {site_key}. Run 'login' first.")
        sys.exit(1)

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            session_dir,
            headless=True,
            viewport={"width": 1400, "height": 900},
        )
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle", timeout=30000)

        if "cloudflareaccess" in page.url:
            print("Error: Session expired. Run 'login' to re-authenticate.")
            ctx.close()
            sys.exit(1)

        page.screenshot(path=output_path, full_page=True)
        print(f"Screenshot: {output_path}")

        if selector:
            elements = page.query_selector_all(selector)
            print(f"\nFound {len(elements)} elements matching '{selector}':")
            for i, el in enumerate(elements[:20]):
                text = el.inner_text()[:200] if el.inner_text() else ""
                tag = el.evaluate("e => e.tagName")
                classes = el.evaluate("e => e.className")
                bbox = el.bounding_box()
                pos = f" @ ({int(bbox['x'])},{int(bbox['y'])})" if bbox else ""
                print(f"  [{i}] <{tag} class='{classes}'>{text}{pos}")

                # Screenshot individual element if it's visible
                if bbox and i < 5:
                    el_path = output_path.replace(".png", f"-el{i}.png")
                    el.screenshot(path=el_path)
                    print(f"       -> {el_path}")

        ctx.close()

def cmd_interactive(url):
    """Open a visible browser with the saved session for manual inspection."""
    site_key = get_site_key(url)
    session_dir = get_session_dir(site_key)

    if not Path(session_dir).exists():
        print(f"Error: No session found for {site_key}. Run 'login' first.")
        sys.exit(1)

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            session_dir,
            headless=False,
            viewport={"width": 1400, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = ctx.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        print(f"Browser open at {url}. Close the window when done.")

        try:
            while len(ctx.pages) > 0:
                time.sleep(1)
        except Exception:
            pass
        try:
            ctx.close()
        except Exception:
            pass

def cmd_status():
    """Check if saved sessions are still valid."""
    ensure_session_dirs()
    with sync_playwright() as p:
        for key, url in SITES.items():
            session_dir = get_session_dir(key)
            if not any(Path(session_dir).iterdir()):
                print(f"  {key}: NO SESSION (run 'login')")
                continue

            try:
                ctx = p.chromium.launch_persistent_context(
                    session_dir, headless=True, viewport={"width": 800, "height": 600},
                )
                page = ctx.new_page()
                page.goto(url, wait_until="networkidle", timeout=15000)
                if "cloudflareaccess" in page.url or page.title() == "":
                    print(f"  {key}: EXPIRED (run 'login')")
                else:
                    print(f"  {key}: OK — {page.title()}")
                ctx.close()
            except Exception as e:
                print(f"  {key}: ERROR — {e}")

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    cmd = sys.argv[1]

    if cmd == "login":
        cmd_login()
    elif cmd == "screenshot":
        if len(sys.argv) < 3:
            print("Usage: cf-session.py screenshot <url> [output_path]")
            sys.exit(1)
        cmd_screenshot(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    elif cmd == "navigate":
        if len(sys.argv) < 3:
            print("Usage: cf-session.py navigate <url>")
            sys.exit(1)
        cmd_navigate(sys.argv[2])
    elif cmd == "inspect":
        if len(sys.argv) < 3:
            print("Usage: cf-session.py inspect <url> [selector]")
            sys.exit(1)
        cmd_inspect(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    elif cmd == "interactive":
        if len(sys.argv) < 3:
            print("Usage: cf-session.py interactive <url>")
            sys.exit(1)
        cmd_interactive(sys.argv[2])
    elif cmd == "status":
        cmd_status()
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)

if __name__ == "__main__":
    main()