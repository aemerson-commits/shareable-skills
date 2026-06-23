---
name: design-reverse-engineer
description: Reverse-engineer a design system from a given URL — typography, color palette, spacing, component patterns, micro-interactions — and produce a Claude-ready design spec that can guide future UI work. Use when building a new view and you want to anchor it in a proven design system rather than generic AI output.
---

# Design Reverse Engineer

Extract a design system from any URL and produce a reusable spec file for your project.

## When to use

- Starting a new view/component and want to anchor it in proven design rather than generic output
- User points at a site and says "make it look like this"
- Refreshing an existing view — need a reference to measure against
- Exploring what works before writing any code

## When NOT to use

- You already have a design direction — don't reverse-engineer on a whim
- The target site is login-gated and you don't have credentials (capture screenshots via `/webapp-testing` instead)
- The target uses heavy runtime JS that WebFetch can't see through (use Playwright ultra-mode instead)
- Simple one-off style tweaks — use `/frontend-design` token lookup directly

---

## Workflow

### Step 1 — Fetch the URL

Two modes depending on complexity:

**Standard mode (WebFetch)**: Good for static/SSR sites with CSS in `<style>` blocks or linked sheets.
```
WebFetch url="<target>" prompt="Extract all CSS custom properties, font stacks, color values, spacing patterns, and component class names visible in the HTML."
```
Follow up with:
```
WebFetch url="<target>/about" or "/pricing" prompt="Same extraction — compare component variation."
```

**Ultra mode (Playwright via `/webapp-testing`)**: Required when you need hover states, focus rings, animated transitions, or sites with heavy client-side rendering.

Steps for ultra mode:
1. Open target in Chrome via `mcp__chrome-devtools__navigate_page`
2. `mcp__chrome-devtools__take_screenshot` — initial state
3. `mcp__chrome-devtools__hover` over key interactive elements (buttons, nav, cards)
4. Screenshot after each hover
5. `mcp__chrome-devtools__evaluate_script` to dump `getComputedStyle` for target elements:
   ```js
   const el = document.querySelector('.btn-primary');
   const s = getComputedStyle(el);
   JSON.stringify({ bg: s.backgroundColor, color: s.color, radius: s.borderRadius, font: s.fontFamily });
   ```
6. Dump all CSS custom properties from `:root`:
   ```js
   const props = {};
   for (const sheet of document.styleSheets) {
     try {
       for (const rule of sheet.cssRules) {
         if (rule.selectorText === ':root') {
           for (const prop of rule.style) props[prop] = rule.style.getPropertyValue(prop).trim();
         }
       }
     } catch(e) {}
   }
   JSON.stringify(props, null, 2);
   ```

### Step 2 — Extract design tokens

Identify and record:

| Token category | What to capture |
|----------------|----------------|
| **Typography** | Font family names, weights used, size scale (px or rem), line-height values, letter-spacing |
| **Colors** | Background palette (surface/elevated hierarchy), text hierarchy (primary/secondary/muted), accent/action color, semantic colors (error/warning/success), border colors |
| **Spacing** | Base unit (4px? 8px?), common padding/margin values, gap between grid items |
| **Radius** | Button radius, card radius, input radius, badge radius |
| **Shadows** | Elevation levels used, exact `box-shadow` values |
| **Animation** | Transition durations, easing functions, keyframe patterns |

### Step 3 — Identify component patterns

For each major component type found:
- **Buttons**: background, border, text color, radius, hover delta, focus ring, disabled state
- **Cards**: background, border, shadow, padding, radius, hover lift or highlight
- **Tables**: header background, row hover, border style (full grid vs horizontal-only), cell padding
- **Badges/Tags**: background, text, radius, variants (success/warning/error)
- **Forms/Inputs**: border, focus ring, placeholder color, error state
- **Empty states**: illustration vs text-only, CTA placement
- **Loading states**: skeleton vs spinner vs shimmer pattern
- **Modals/Dialogs**: backdrop, surface, padding, header treatment

### Step 4 — Capture micro-interactions (ultra mode only)

Document:
- Hover: background delta, transform (lift? scale?), transition duration
- Focus: ring color, ring offset, outline vs box-shadow approach
- Active/pressed: scale-down, brightness change
- Disabled: opacity level, cursor
- Loading: spinner position, text swap, skeleton pattern

### Step 5 — Write the spec

Save to `.claude/design-references/<slug>.md` (create dir if needed).
Slug = kebab-case site name, e.g. `linear-app.md`, `stripe-dashboard.md`.

---

## Output format

The spec file this skill produces:

```markdown
# <Site Name> Design Reference

Source: <url>
Captured: <YYYY-MM-DD>
Mode: WebFetch | Playwright ultra

## Typography
- Display: <font, weight, size>
- Body: <font, size, line-height>
- Mono/Code: <font>
- Scale: <list of sizes used>

## Color palette

| Token       | Value   | Usage                     |
|-------------|---------|---------------------------|
| bg-app      | #...    | Page background           |
| bg-surface  | #...    | Card/panel backgrounds    |
| bg-elevated | #...    | Hover states              |
| text-primary| #...    | Main content              |
| text-muted  | #...    | Labels, timestamps        |
| accent      | #...    | CTAs, active states       |
| border      | #...    | Standard borders          |

## Spacing

Base unit: 4px / 8px.
Common values: 4, 8, 12, 16, 24, 32, 48, 64 (in px).
Grid columns: N, gap: Xpx.

## Radius

| Element | Value |
|---------|-------|
| Button  | ...   |
| Card    | ...   |
| Input   | ...   |
| Badge   | ...   |

## Components

### Button
- Default: background `#...`, text `#...`, radius `...`
- Hover: background delta `...`, transition `...ms ease`
- Focus: ring `...`
- Disabled: opacity `...`
- (Copy any exposed CSS verbatim here)

### Card
...

### Table
...

### Badge / Tag
...

## Micro-interactions (Playwright ultra only)

| Interaction | Element | Duration | Easing | Effect |
|-------------|---------|----------|--------|--------|
| hover       | .btn    | 150ms    | ease   | bg lighten 10% |
| ...         | ...     | ...      | ...    | ...    |

## What makes this design work

(2-4 sentences: the design philosophy, what creates the cohesion, what's distinctive)

## How to apply this reference

(Which views or components this reference informs, and what specific patterns to borrow)
- Data table → ...
- Info modal → ...
- Form inputs → ...
```

---

## Practical tips

- **Prioritize CSS custom properties** — sites that use them expose the entire token system in one `getComputedStyle` dump
- **Capture dark mode separately** — `prefers-color-scheme: dark` may reveal a different palette; toggle via `mcp__chrome-devtools__evaluate_script`: `document.documentElement.setAttribute('data-theme', 'dark')`
- **Font stack gotchas** — `getComputedStyle` returns the resolved font, not the CSS declaration. Check `<link rel=stylesheet>` for Google Fonts or `@font-face` declarations
- **Spacing rhythm** — look at the inspector's computed margin/padding on a few sibling elements; if they're multiples of 4 or 8 it confirms the base unit
- **Don't copy brand colors** — extract the *palette structure* (how many neutrals, how the accent is used) rather than the exact hex values

---

## Cross-reference

- `/design-showcase` — turn a reference into variant mockups for side-by-side comparison
- `/frontend-design` — your project's design system tokens; map extracted tokens to your equivalents
- `/webapp-testing` — Playwright infrastructure for ultra-mode capture
- `reference-sites.md` (this directory) — curated list of high-quality design references by domain
