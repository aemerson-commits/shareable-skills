---
name: frontend-design
description: "UI/UX design patterns, color tokens, and component conventions for consistent dark-themed dashboard interfaces."
user-invocable: true
---

# Frontend Design Guide

Automatically applies when working on frontend UI/UX tasks. Creates distinctive, production-grade interfaces with consistent styling.

## Design Philosophy

Begin by understanding context — purpose, audience, and technical constraints — then commit to a bold aesthetic direction rather than defaulting to common choices.

**Critical Aesthetic Guidance**:
- Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter
- Employ cohesive color strategies with dominant hues and sharp accents
- Leverage animations strategically, particularly one well-orchestrated page load with staggered reveals
- Embrace unexpected layouts with asymmetry, overlap, and grid-breaking elements
- Add atmospheric depth through textures, gradients, and contextual visual effects

**What to Avoid**: Generic AI-generated aesthetics including overused typefaces (Inter, Roboto), predictable layouts, cliched color schemes, and designs lacking context-specific character.

## Implementation Standards

Code should be production-grade and functional while remaining visually striking. The complexity of implementation should match the aesthetic vision — maximalist designs warrant elaborate code with extensive effects, while refined minimalist work demands precision in spacing and typography.

## Color Tokens

### Dark Dashboard Theme (default)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#1a1a2e` | Page/app background |
| Surface | `#16213e` | Card/panel backgrounds |
| Surface border | `#2a2a4a` | Card borders, dividers |
| Primary text | `#e2e8f0` | Main content text |
| Secondary text | `#94a3b8` | Muted/label text |
| Accent blue | `#3b82f6` | Links, active states, primary actions |
| Accent green | `#22c55e` | Success, on-time, positive KPIs |
| Accent red | `#ef4444` | Error, late, negative KPIs |
| Accent yellow | `#f59e0b` | Warning, approaching deadline |
| Accent purple | `#8b5cf6` | Charts accent, secondary status |

### High-Contrast Variant (for bright environments / shop floor)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0f172a` | Page background (darker) |
| Surface | `#1e293b` | Card/panel backgrounds |
| Surface border | `#334155` | Card borders |
| Primary text | `#f8fafc` | Content text (higher contrast) |
| Secondary text | `#94a3b8` | Muted text |

## Component Patterns

### KPI Cards
- Consistent component (e.g., `shared/KPICard.jsx`)
- Grid: 4 columns desktop, 2 mobile (`@media max-width: 768px`)
- Structure: label, value (large), unit/trend, optional delta

### Charts (Recharts)
- **Dark tooltips require THREE props**:
  ```jsx
  <Tooltip
    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
    labelStyle={{ color: '#F9FAFB' }}
    itemStyle={{ color: '#FFFFFF' }}
  />
  ```
- Bundle split: Recharts in `manualChunks` (vite.config.js) — always preserve
- ResponsiveContainer: `height={isMobile ? 200 : 250}` standard

### Tables
- `table-layout: fixed` + `<colgroup>` for resizable columns
- Column widths persist to localStorage
- Sticky headers: `position: sticky; top: 0; z-index: 10`
- Alternate row coloring: `tr:nth-child(even)` with subtle surface variation

### Status Badges
- Color-coded based on status/category functions
- Never use color alone — combine with icon or text

### Modals
- Use `createPortal(modal, document.body)` for overlay modals
- Backdrop: `rgba(0, 0, 0, 0.5)` with blur
- Content max-width: 600px centered
- Support Escape key close

## CSS Architecture

All styles in per-project `App.css` (no CSS-in-JS, no CSS modules):
- Section comments: `/* ==================== VIEW NAME ==================== */`
- Class prefix: view abbreviation (e.g., `.dv-` dashboard, `.ov-` orders)
- Mobile breakpoint: `768px` consistently
- No `!important` unless overriding third-party (Recharts)

## Accessibility Minimums

- Color contrast: 4.5:1 for body text, 3:1 for large text
- Interactive targets: min 44x44px on mobile
- Focus indicators: visible outline on keyboard navigation
- Status indicators: never color-only (combine with icon/text)
