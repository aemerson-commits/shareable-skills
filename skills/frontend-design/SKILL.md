---
name: frontend-design
description: "Design system guide — CSS tokens, Tailwind v4, shadcn/ui components, theming, and UI conventions for consistent dark-themed dashboard interfaces."
user-invocable: true
---

# Frontend Design Guide

Automatically applies when working on frontend UI/UX tasks. Creates distinctive, production-grade interfaces with consistent styling.

## Design System Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Tokens** | `shared/theme.css` (CSS custom properties) | Color, spacing, typography, radius, shadows, z-index |
| **Themes** | `shared/ThemeToggle.jsx` (multiple presets) | Theme switching via `data-theme` attribute on `<html>` |
| **Animations** | `shared/animations.css` | Shared keyframes + reduced-motion support |
| **Utilities** | Tailwind CSS v4 (`@tailwindcss/vite`) | Utility-first classes, no preflight (coexists with vanilla CSS) |
| **Components** | shadcn/ui | Accessible primitives: Button, Dialog, Input, Badge, Table, etc. |
| **Existing CSS** | Per-project `App.css` | Unlayered vanilla CSS (wins specificity over Tailwind @layer) |

## Design Tokens (`shared/theme.css`)

All colors, spacing, and visual properties use CSS custom properties. **Never hardcode hex values** — use tokens.

### Color Tokens

| Token | Dark Value | Usage |
|-------|-----------|-------|
| `--bg-app` | `#111827` | Page/app background |
| `--bg-surface` | `#1F2937` | Card/panel backgrounds |
| `--bg-elevated` | `#374151` | Hover states, secondary bg |
| `--bg-inset` | `#0F172A` | Inset/recessed areas |
| `--text-primary` | `#F9FAFB` | Main content text |
| `--text-secondary` | `#9CA3AF` | Labels, descriptions |
| `--text-muted` | `#6B7280` | Hints, timestamps |
| `--accent` | `#3B82F6` | Primary actions, links |
| `--accent-hover` | `#2563EB` | Hover on accent |
| `--accent-muted` | `#60A5FA` | Light accent variant |
| `--status-error` | `#EF4444` | Errors, late items |
| `--status-warning` | `#F59E0B` | Warnings, approaching due |
| `--status-success` | `#10B981` | Success, on-time |
| `--status-info` | `#3B82F6` | Informational |
| `--border-default` | `#374151` | Standard borders |
| `--border-subtle` | `#1F2937` | Subtle dividers |

### Spacing Scale

`--space-xs` (0.25rem) through `--space-3xl` (3rem). Use in CSS: `padding: var(--space-md)`.

### Typography Scale

`--text-xs` (0.75rem) through `--text-3xl` (1.875rem). Use: `font-size: var(--text-sm)`.

### Radius, Shadows, Z-Index

- Radius: `--radius-sm` through `--radius-full`
- Shadows: `--shadow-sm` through `--shadow-xl`
- Z-index: `--z-base` (1) through `--z-toast` (9999)

## Tailwind v4 Integration

Tailwind v4 is installed via `@tailwindcss/vite` plugin. **No preflight** — existing CSS is preserved.

### @theme inline Mapping

The `@theme inline` block in `index.css` maps your tokens to Tailwind utilities:

**shadcn/ui standard names** (used by shadcn components internally):
- `bg-primary` → `var(--accent)` (your accent color)
- `text-primary-foreground` → `#ffffff` (text on primary buttons)
- `bg-background` → `var(--bg-app)`
- `text-foreground` → `var(--text-primary)`
- `bg-card` → `var(--bg-surface)`
- `bg-secondary` / `bg-muted` / `bg-accent` → `var(--bg-elevated)` (shadcn "accent" = hover bg)
- `text-muted-foreground` → `var(--text-muted)`
- `bg-destructive` → `var(--status-error)`
- `border` (default) → `var(--border-default)`
- `ring-ring` → `var(--accent)`

**Custom names** (use in your own Tailwind code):
- `bg-app`, `bg-surface`, `bg-elevated`, `bg-inset` — layout backgrounds
- `bg-accent-primary`, `bg-accent-hover` — accent color (distinct from shadcn `bg-accent`)
- `bg-error`, `bg-warning`, `bg-success`, `bg-info` — status colors
- `text-text-primary`, `text-text-secondary`, `text-text-muted` — text colors
- `border-border-subtle` — subtle borders

### Specificity Rules

- Unlayered CSS (existing `App.css`) **always wins** over Tailwind's `@layer utilities`
- When migrating a component to Tailwind, remove its CSS rules to avoid conflicts
- `rgba()` values stay as-is until converted to `oklch()` or Tailwind opacity modifiers (`bg-primary/15`)

## shadcn/ui Components

### Setup

- Config: `components.json` (style: new-york, jsx, zinc base)
- Utility: `src/lib/utils.js` — `cn()` function (clsx + tailwind-merge)
- Path alias: `@/*` → `./src/*` (in vite.config.js + jsconfig.json)
- Components: `src/components/ui/*.jsx`

### Available Components

| Component | Import | Usage |
|-----------|--------|-------|
| `Button` | `@/components/ui/button` | Actions, CTA. Variants: default, destructive, outline, secondary, ghost, link |
| `Dialog` | `@/components/ui/dialog` | Modal dialogs. Use DialogContent, DialogHeader, DialogTitle, etc. |
| `Input` | `@/components/ui/input` | Form text inputs |
| `Badge` | `@/components/ui/badge` | Status badges. Variants: default, secondary, destructive, outline |
| `Table` | `@/components/ui/table` | Data tables (Table, TableHeader, TableBody, TableRow, TableCell) |
| `DropdownMenu` | `@/components/ui/dropdown-menu` | Context menus, action menus |
| `Tooltip` | `@/components/ui/tooltip` | Hover tooltips (needs TooltipProvider) |
| `Sonner` (Toast) | `@/components/ui/sonner` | Toast notifications via sonner |
| `Card` | `@/components/ui/card` | Content cards (Card, CardHeader, CardTitle, CardContent) |
| `Tabs` | `@/components/ui/tabs` | Tab navigation (Tabs, TabsList, TabsTrigger, TabsContent) |

### Usage Pattern

```jsx
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function MyComponent({ isLate }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={isLate ? 'destructive' : 'default'}>
        {isLate ? 'Late' : 'On Time'}
      </Badge>
      <Button variant="outline" size="sm">
        View Details
      </Button>
    </div>
  )
}
```

### Adding New shadcn Components

```bash
npx shadcn@latest add <component-name> --yes --overwrite
```

Components generate as `.jsx` into `src/components/ui/`. No TypeScript cleanup needed.

## Theme System

### Theme Presets

Themes work by swapping CSS custom property values via `[data-theme="X"]` selectors in `shared/theme.css`. A `ThemeToggle` component persists the choice to localStorage.

Example presets to support:

| Group | Themes |
|-------|--------|
| Auto | System (follows OS) |
| Standard | Dark (default), Light, Dim, High Contrast |
| Popular | Midnight, Nord, Dracula, Catppuccin |
| Classic | Solarized Dark, Solarized Light |

### Adding a New Theme

1. Add theme object to `THEMES` array in `ThemeToggle.jsx`
2. Add `[data-theme="your-theme"]` selector block in `theme.css` with all token overrides
3. Light themes: set `color-scheme: light` and ensure stronger contrast (`--text-primary: #0F172A`)

## Component Patterns

### KPI Cards

Use a consistent `KPICard` component for metric cards across all projects:
- Grid: 4 columns desktop, 2 mobile (`@media max-width: 768px`)
- Structure: label, value (large), unit/trend, optional delta

### Charts (Recharts)

**Dark tooltips require THREE props**:
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
- Sticky headers: `position: sticky; top: 0; z-index: var(--z-sticky)`
- Alternate row coloring: `tr:nth-child(even)` with subtle surface variation

### Modals

Use a shared modal component with:
- Focus trap (`useModalA11y` or native `<dialog>` + `showModal()`)
- Overlay-click-to-close: `if (e.target === e.currentTarget) onClose()` on the overlay
- Backdrop: `rgba(0, 0, 0, 0.5)` with optional blur
- Escape key close
- Scroll lock on body while open

## CSS Architecture

| Location | Scope |
|----------|-------|
| `shared/theme.css` | Design tokens (all projects) |
| `shared/animations.css` | Keyframes (all projects) |
| `{project}/src/index.css` | Tailwind imports + @theme mapping |
| `{project}/src/App.css` | Vanilla CSS (view-specific styles) |
| `{project}/src/components/ui/` | shadcn/ui components |

### Migration Path

When rewriting a view to use Tailwind + shadcn:
1. Build the new version alongside the old (or in a test route)
2. Use shadcn components for structure (Dialog, Table, Card, Tabs, Button)
3. Use Tailwind utilities for layout and spacing
4. Remove the old CSS rules from App.css
5. Keep domain-semantic styles (status colors, chart configs) in CSS or constants

## Accessibility

- Color contrast: 4.5:1 body, 3:1 large text (High Contrast theme = WCAG AAA)
- Interactive targets: min 44x44px on mobile
- Focus indicators: visible ring via `focus-visible:ring-ring/50`
- Reduced motion: `@media (prefers-reduced-motion: reduce)` zeroes all animations
- Status: never color-only — combine with icon/text

## Anti-Patterns to Avoid (AI-Slop Signals)

These patterns appear in the majority of AI-generated UIs. Avoid them by default unless there is a specific, intentional reason.

| Anti-pattern | What it looks like | Better alternative |
|---|---|---|
| **Purple/indigo gradients** | `background: linear-gradient(135deg, #6366F1, #8B5CF6)` as a "hero" | Use your `--accent` token consistently; gradients only for data viz |
| **Inter-by-default** | Loading Inter because it's the AI default, not because it fits | Use fonts with discipline (defined scale, no arbitrary sizes) |
| **Bento grids** | 3x2 card grid where every card has a different height and an icon top-left | Grid layout with consistent card heights; icon choice driven by meaning, not decoration |
| **Glass morphism** | `backdrop-filter: blur(12px)` + `background: rgba(255,255,255,0.1)` + `border: 1px solid rgba(255,255,255,0.2)` | Solid surface elevation using `--bg-elevated`; blur only for modals over complex backgrounds |
| **Spark lines everywhere** | Tiny 40px sparklines added to every metric card to look "data-rich" | Sparklines only when the trend is the insight; use plain numbers when the current value is what matters |
| **Side-tab indicator borders** | Left border on active tab item as the only active state signal | Combine border with background color change; border-only fails on low contrast themes |
| **Identical pill buttons** | All buttons are `border-radius: 999px` regardless of context | Radius should match the component family — table action buttons at `--radius-sm`, modal CTAs at `--radius-md` |
| **Decorative hero illustrations** | 3D robot or abstract illustration as page header | Data visualization or functional illustration only; no illustration if it conveys no information |
| **Shadow stacking** | `box-shadow` on every card + every button + every input | Pick one elevation tier per component type and stick to it |
| **Random animation** | `transition: all 0.3s ease` added to every element | Only transition properties that actually change; explicit property names + durations matched to interaction type |

## Porting a Showcase Variant to Real Code

After `/design-showcase` and the user picks a variant, porting it into the real component has a specific failure mode worth calling out.

**The drift trap**: Worktree agents dispatched via `Agent({ isolation: "worktree" })` branch from a shared reference point, NOT current HEAD. If parallel sessions have been modifying the target file, the worktree agent ports against a stale base — cherry-picking then conflicts.

**Detection**: before accepting an agent's port commit, check `git log <worktree-base>..HEAD -- <target-file>`. If non-empty, the agent was working from stale context.

**Resolution pattern**:
1. If the CSS additions are purely additive (new scoped classes) — cherry-pick with `git checkout --ours <target.jsx>` to keep your current JSX and accept ONLY the CSS.
2. Apply the JSX design edits directly with the `Edit` tool against current HEAD.
3. Build, commit, push.

**Prefer additive edits over reordering**. If the showcase variant spec includes "reorder sections", save that for a separate follow-up — it's much riskier than adding a new pill or strip. Ship the high-signal additions first.

## Tactical Patterns

- **Recharts tooltips**: Need THREE style props for dark theme (`contentStyle`, `labelStyle`, `itemStyle`)
- **Recharts bundle**: Split via `manualChunks` in vite.config.js — always keep this config
- **Dropdown in scrollable tables**: `position:fixed` + `getBoundingClientRect()` — `absolute` gets clipped by `overflow-x:auto`
- **localStorage validation**: Cross-reference saved columns against `DEFAULT_COLUMNS` to filter stale entries
- **ISO date timezone shift**: `new Date('2026-03-20')` → midnight UTC → day before in local timezone. Fix: parse YYYY-MM-DD as `new Date(year, month-1, day)` for local display. Don't round-trip already-ISO strings through `toISOString()`

## See Also

- `/design-showcase` — for exploratory redesigns, run a showcase first. Dispatches a single Opus agent that builds a self-contained HTML page with 3-7 design variants side-by-side. User picks a direction, then implement using the tokens and patterns above.
- `/design-reverse-engineer` — extract design tokens and component patterns from any URL; use when anchoring a new view to a proven reference before building
- `/webapp-testing` — Playwright visual verification after implementing a chosen variant
