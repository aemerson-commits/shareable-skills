---
name: design-showcase
description: Build a side-by-side visual comparison of 3-7 design variants for a component or view. Dispatches a single Opus agent that produces a self-contained HTML showcase, serves it locally, and lets the user pick a direction. Use when the user wants to explore design options before committing to an implementation.
---

# Design Showcase

Produces a self-contained HTML page with multiple design variants rendered side-by-side. User reviews, picks a direction, then a follow-up implementation pass converts the chosen variant into real code.

## When to use

- Component or view redesign with unclear direction
- Exploring a new design philosophy or pulling inspiration from a reference site
- "Show me options before we commit" requests
- Design reviews where stakeholders need a visual to react to

## When NOT to use

- Minor CSS tweaks (color swap, spacing adjustment) — just make the change
- Single-option tasks where the direction is already decided
- Backend-only work
- Feature flags / A-B testing in production code

## The Workflow

### Step 1 — Read the current component

Read the component file and its CSS. Capture the exact data shape it renders. Note: what information is shown, how it is grouped, what actions exist.

### Step 2 — Define 3-7 design philosophies

Pick from `philosophies.md` or invent new ones for the task. Each variant needs a distinct visual identity — if two variants look similar, merge them or push them further apart. Always include a "Current" baseline (Variant 00) so the user has a reference anchor.

See `philosophies.md` (in this directory) for the full catalog.

### Step 3 — Invent realistic fake data

Write one consistent fake dataset that all variants use. For data-heavy components: use real-sounding identifiers, descriptions, quantities, and dates. Consistent data is critical — variants must differ only in design, not in content.

### Step 4 — Dispatch one Opus agent

```javascript
Agent({
  model: "opus",
  isolation: "none",  // read-only, no code changes
  prompt: `
    Build a self-contained HTML design showcase at c:/tmp/<slug>-showcase/index.html.
    
    Component: <name>
    Fake data: <dataset>
    
    Variants to include:
    00. Current — faithful recreation of the existing design
    01. <Philosophy 1 name> — <one-line description>
    02. <Philosophy 2 name> — <one-line description>
    ...
    
    [Paste philosophy specs from philosophies.md]
    
    Requirements:
    - Single HTML file, no build step, no external JS frameworks
    - Google Fonts via CDN is OK
    - Top nav with anchor links to each variant (#variant-00 through #variant-N)
    - Dark-mode toggle in the nav bar (CSS class toggle, no JS frameworks)
    - Each variant in its own full-width section with a header card showing the variant name and 2-3 bullet design rationale
    - Responsive down to iPad (768px)
    - Include a "Conjunction" blend variant as the last entry
  `
})
```

Use `model: "opus"` — this is creative/design work and the quality difference is significant.

### Step 5 — Serve and present

```bash
cd c:/tmp/<slug>-showcase && npx serve . -p 4321
```

Direct the user to `http://localhost:4321`. Ask them to review and call out which variant number they prefer, or which elements they want to combine.

## Output convention

```
c:/tmp/<component-name>-showcase/
  index.html    # the showcase (self-contained)
```

Slug convention: `info-modal`, `kpi-card`, `data-table`, `entry-form`.

## HTML scaffold guardrails

- No React, Vue, or Angular — vanilla HTML + CSS + minimal JS
- Google Fonts via CDN is allowed (`<link rel="preconnect">` + font link)
- Must include a "Current" control baseline so users have an anchor
- Variants must be visually distinct — if two look the same, cut one or push them apart
- Dark-mode toggle at top (toggle `data-theme="dark"` on `<html>`)
- Responsive to iPad (768px minimum)
- Each section includes a rationale card (what principles guided this variant)
- Use `<template>` for `index.html` structure — see `template.html` in this directory

## Handoff after pick

After the user picks a variant:

1. Do NOT continue in the showcase agent — open a new task
2. Read the picked variant's HTML section to extract the design decisions
3. Implement those decisions in the real component (React + your project's CSS conventions)
4. Follow `/frontend-design` for token usage and component patterns
5. Run `npm run build` to verify before deploying

The showcase is a design artifact, not production code. Treat it as a spec, not a source to copy.

## Example prompt template

```
Redesign the <ComponentName> component. The current design is the baseline.

Produce a showcase at c:/tmp/<slug>-showcase/index.html with these variants:
  00. Current — faithful recreation (baseline reference)
  01. Impeccable — anti-pattern discipline, sharp corners, IBM Plex Sans
  02. UI/UX Pro Max — operator-first, traffic-light urgency, 44pt touch targets
  03. Taste — serif heading, monospace numbers, one accent color
  04. Linear — zero-chrome, keyboard shortcuts, tight 4px grid
  05. 21st.dev — same layout, CSS-only micro-interactions
  06. Conjunction — best-of-all with rationale card

Fake data: <paste dataset here>

Philosophy specs: <paste from philosophies.md>

Requirements: single HTML file, Google Fonts CDN OK, dark-mode toggle, anchor nav, iPad-responsive, rationale card per variant.
```

## Related skills

- `/frontend-design` — design tokens and component patterns (use after picking a variant)
- `/webapp-testing` — Playwright visual verification after implementing the chosen variant
- `/review-impl` — adversarial review before merging the implemented variant
