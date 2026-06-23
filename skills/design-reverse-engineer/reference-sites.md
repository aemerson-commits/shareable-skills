# Design Reference Sites

Curated list of sites with strong design patterns, organized by domain. Each entry includes what to steal and how it applies to your project.

Use `/design-reverse-engineer` to extract a spec from any of these. Start with sites in the domain closest to the view you're building.

---

## Manufacturing / Operations Dashboards

Sites built for people who live in a tool all day — density, clarity, and predictability matter more than visual flair.

### Linear — https://linear.app

Dense operator UI, keyboard-first, zero-chrome aesthetic. One of the most referenced tools in the "serious dashboard" category.

What to steal:
- **Table density**: rows at 36px, no decorative borders, hover highlights a full row with a very subtle background shift (~5% brightness)
- **Status badges**: small, tight radius (4px), semantic color fill at ~15% opacity with full-opacity text — not the vivid pill look
- **Command palette**: `Cmd+K` global, item rows have icon + label + keyboard hint right-aligned — pattern usable for search/filter
- **Typography hierarchy**: 13px body, 11px labels, a single sans-serif (Inter) — proves Inter works when used with discipline, not by default

Apply to: data table row density, job/task list status badges, any future command palette.

---

### Vercel Dashboard — https://vercel.com/dashboard

Status-focused monochrome with a single accent. Each page answers one question clearly.

What to steal:
- **Status dot + text pairs**: small filled circle (6–8px) + status label, no border, no background box — cleaner than a badge approach for simple pass/fail states
- **Monochrome surface hierarchy**: three distinct gray levels (page bg, card bg, inset) with no decorative color anywhere except the single green accent
- **Deployment log view**: fixed-width font, alternating line highlight on hover, timestamp left-aligned in muted — apply to any log/history view
- **Empty state treatment**: centered icon (stroked, not filled) + heading + single-sentence description + one CTA — no decorative illustrations

Apply to: status pages, data-health dashboards, any view with pass/fail status rows.

---

### Railway — https://railway.com

Clean cards with consistent rhythm. Excellent example of a dark dashboard that feels calm rather than heavy.

What to steal:
- **Card grid**: fixed aspect ratio cards, consistent 16px gap, subtle border (`1px solid rgba(255,255,255,0.08)`) — no shadow, border provides separation
- **Typography contrast**: page title at `font-weight: 600`, section headers at `500`, body at `400` — three weights, no bold/italic mixing
- **Inline status**: status text in muted color inline with the metric, not a separate badge — reduces visual noise for secondary states
- **Progress bars**: 4px height, rounded, background `rgba(255,255,255,0.1)`, fill with accent — applies to capacity / progress indicators

Apply to: card grid views, status dashboards, any view with project/status cards.

---

### PlanetScale — https://planetscale.com (URL not verified — site may have changed post-acquisition)

Data-dense tables with calm density. Known for making SQL results readable.

What to steal:
- **Column header style**: uppercase, 11px, letter-spacing 0.05em, muted color — immediately distinguishes headers from data without a heavy background
- **Number alignment**: right-aligned numeric columns with tabular-nums font feature — essential for financial/quantity tables
- **Truncation with tooltip**: single-line cells, `text-overflow: ellipsis`, tooltip on hover for full value — pattern for ID/description columns
- **Filter chip row**: pill chips with `×` dismiss, subtle border, gap-2 wrapping row — cleaner than a dropdown for active filters

Apply to: data tables, numeric reporting views, any view with filterable columns.

---

### Retool — https://retool.com

Admin-tool aesthetic done intentionally. High information density without feeling cramped.

What to steal:
- **Two-tone header**: dark sidebar + lighter main area — strong spatial orientation in complex multi-panel layouts
- **Resizable panel dividers**: drag handle as a 4px strip, subtle on rest, more visible on hover — exact pattern for resizable columns
- **Form layout**: label above input (not beside), compact spacing (label-to-input 4px, field-to-field 12px), group borders at section level
- **Action bar**: sticky bottom bar for bulk actions, appears only when rows selected — consider for batch operations

Apply to: admin panels, settings views, any form-heavy modal.

---

## Information-Dense Apps

### GitHub Issues — https://github.com

The gold standard for state badges, filter chips, and scannable table density.

What to steal:
- **State badge system**: filled background at ~12% opacity, matching full-opacity text, icon left of label — the pattern status badges should follow
- **Filter bar**: search + label chips + state toggle — left-aligned, consistent height, no border on the bar itself
- **Assignee avatar + count**: 20px circle, `-4px` overlap on stacked avatars — compact team representation
- **Timeline comments**: alternating event types (commit, comment, label) with consistent left-border accent and 8px vertical rhythm

Apply to: list view filter bars, status indicators, any view with compound state.

---

### Stripe Dashboard — https://dashboard.stripe.com

The benchmark for financial density. Numbers and amounts done right.

What to steal:
- **Amount display**: large weight (600+), tabular-nums, currency prefix in slightly muted color, negative amounts in red without a badge
- **Sparkline integration**: inline 40px tall sparklines in table cells — no axes, just the trend shape — very low noise
- **Timeline / event log**: time on the left in monospace muted, event description right, subtle horizontal divider — not full-row backgrounds
- **"This period vs last" comparison**: inline percentage delta with directional arrow, green/red, no background pill — just colored text

Apply to: accounting and financial views, monthly summary cards.

---

### Notion Databases — https://notion.so

Flexible multi-view pattern. Shows how the same data can render as table, gallery, board, or calendar.

What to steal:
- **View switcher**: icon-only tabs (table/board/gallery/calendar), 28px hit targets, selected state = filled background on icon
- **Property type icons**: small icon left of property name in headers — instant scanability for column types
- **Inline date display**: relative dates ("2 days ago") in muted color, absolute on hover — reduces cognitive load for recency-focused views
- **Cover image on gallery cards**: aspect-ratio locked image placeholder at top, metadata below — clear visual priority

Apply to: any view that could benefit from alternate display modes (table vs card vs calendar).

---

### Height — https://height.app

Status-focused project management. Notable for its compact, keyboard-navigable task list.

What to steal:
- **Compact task rows**: 32px rows with status icon, title, assignee, due date — left to right priority ordering
- **Status icon system**: 8 distinct status types, each with a unique icon + color, not just color alone (solves color-blindness issue)
- **Due date coloring**: relative urgency — default muted, "due soon" amber, "overdue" red
- **Drag handle visibility**: appears only on row hover, 6px dots, muted — reduces visual noise at rest

Apply to: task/job lists, any table with drag-to-reorder.

---

## Operator-Oriented UIs

### Tulip — https://tulip.co

Manufacturing operator UI specialists. Their marketing site shows the style even without an account.

What to steal:
- **Large hit targets**: operator interfaces use 56px minimum touch targets — essential for environments where gloves or difficult conditions are a factor
- **High contrast status**: traffic-light states (red/amber/green) at full saturation, never muted — operators need to read from a distance
- **Step-by-step workflow**: numbered steps with clear active/complete/upcoming states — consider for multi-step operations
- **Font sizing**: minimum 16px body for operator-facing text, never the 13px density used in management views

Apply to: operator-facing dashboards, tablet mode, any view requiring at-a-glance readability.

---

### Andon Board / Traffic Light Patterns (generic)

Toyota Production System visual management — andon boards, hour-by-hour tracking, traffic light dashboards. No single URL; search "andon board dashboard" for image references.

What to steal:
- **Zone-based layout**: physical areas divided into named zones, each zone gets a status block — maps to machine/operation grouping
- **Traffic light sizing**: status indicators at 40px+ diameter, not small badges — readable from distance
- **Count + target display**: "12 / 16 pieces" with a progress fill, not just a percentage — operators need both numbers
- **Red border on problem state**: entire card gets a colored border, not just a badge — the whole zone card pulses red

Apply to: status card dashboards, any view with machine or resource status.

---

## Editorial / Opinionated Design (for Taste Approach)

Use these when you want to understand what makes a design feel authoritative, not just functional.

### Stripe.com (marketing) — https://stripe.com

Authoritative product design. The benchmark for "technical product that looks premium."

What to steal:
- **Code block styling**: `#0A2540` background, syntax highlighting with exactly 5 colors, `font-size: 14px`, `line-height: 1.6` — apply to any code/log display
- **Feature grid**: 3-column on desktop, each cell has icon top-left, heading, 2-sentence description — no decorative images
- **Gradient usage**: linear gradients used only for hero sections, never for interactive components — rule to follow
- **Button hierarchy**: one filled CTA, one outline secondary, and ghost tertiary — never more than 3 button variants visible at once

Apply to: any marketing-adjacent page, document or report generation visual style.

---

### Figma.com — https://figma.com

Typography-forward design. Strong example of using type scale to create hierarchy without color.

What to steal:
- **Heading scale**: 48/32/24/18/14px — four distinct levels used consistently, never more
- **Transition to action**: CTAs appear on hover over content blocks, not statically — reduces visual clutter at rest
- **Icon sizing discipline**: 16px icons in body text, 20px in headers, 24px in navigation — never mixed within a row
- **Whitespace as a signal**: generous padding around important content, tight padding around secondary — amount of space = importance

Apply to: landing/summary views, any view that needs to communicate hierarchy without a sidebar.

---

### Craftwork.cc — https://craftwork.cc

Editorial feel, premium component marketplace. Good reference for elevated card and product display.

What to steal:
- **Card hover**: border transitions from `transparent` to `rgba(accent, 0.3)` over `200ms` — subtle but clear selection affordance
- **Tag/category treatment**: tags as plain text with `·` separator, not pill badges — much lower visual weight for non-critical metadata
- **Image-first grid**: thumbnail at 16:10 ratio, title below, muted metadata below that — clear visual priority
- **Dark surface elevation**: `bg-surface` vs `bg-elevated` separation done with `+3%` brightness shift, not color change

Apply to: image/document galleries, card-based browsing views.

---

## Component Libraries to Cherry-Pick From

### 21st.dev — https://21st.dev

Premium micro-interaction components, copy-as-prompt format. Strongest source for specific interactive patterns.

What to steal (specific components):
- **Command menu**: full-featured `Cmd+K` implementation with groups, icons, keyboard nav
- **Multi-select**: checkbox-based row selection with select-all, bulk action bar — better than basic multi-select approaches
- **Animated number**: smooth count-up on mount, works with any integer metric
- **Loading skeleton**: content-shaped placeholders, shimmer animation — pattern for KPI cards while data loads

Note: components are React + Tailwind. Check license before copying verbatim; adapt the visual pattern.

---

### shadcn/ui — https://ui.shadcn.com

A popular base component library. Reference for understanding the full component API and available variants.

What to steal (patterns not always used):
- **Combobox**: searchable select with filtering — better than `<select>` for picker components
- **Data Table**: `@tanstack/react-table` integration, column visibility toggle, pagination — consider for complex data views
- **Calendar/DatePicker**: for scheduling date range selection
- **Resizable**: `react-resizable-panels` integration — could replace manual column resize logic

---

### Radix UI — https://radix-ui.com

Accessibility-first primitives. shadcn/ui is built on Radix; go here for the underlying API docs.

What to steal (conceptual patterns):
- **Focus management**: `FocusScope` for trapping focus in modals — audit Dialog components against this
- **Portal rendering**: `Portal` for dropdowns and tooltips that escape overflow containers — fixed-position dropdown pattern
- **Collection API**: the internal pattern for managing lists of items (Listbox, RadioGroup) — useful if building a custom multi-select

---

## Reference Aggregators

### Awesome Design (VoltAgent/awesome-design)

Pre-built `design.md` files extracted from popular sites (11 Labs, Bugatti, Stripe, etc.). 50k+ stars.
GitHub: https://github.com/VoltAgent/awesome-design

Usage: browse the repo for a site similar to your target, copy the `design.md`, adapt tokens to your CSS custom property naming convention. Saves the WebFetch extraction step entirely.

Sites with pre-built specs (as of early 2026, verify current list in repo):
- Stripe — financial/dashboard reference
- Linear — dense table/list reference
- Vercel — status/deploy reference
- Loom — media/content reference
- Notion — flexible view reference

---

## Quick Selection Guide

| Building this... | Start with |
|-----------------|------------|
| Data/order table | GitHub Issues, PlanetScale, Linear |
| Financial view / P&L | Stripe Dashboard |
| Status cards / KPIs | Vercel Dashboard, Railway |
| Operator-facing view | Tulip, Andon Board patterns |
| Modal / dialog | Linear (command palette), shadcn/ui Dialog |
| Admin / settings form | Retool |
| Card grid | Railway, Craftwork.cc |
| Chart / sparkline | Stripe Dashboard |
| Multi-view (table+board) | Notion Databases |
| Premium / elevated feel | Stripe.com marketing, Figma.com |
| Specific micro-interactions | 21st.dev |
