# Design Review Checklists

## Backend Safety Check (Phase 2)

Used by main agent before approving design for build.

- [ ] **Endpoint naming**: New file `functions/api/{name}.js` doesn't collide with existing endpoints
- [ ] **Action params**: New `?action=` values don't collide with existing handlers in the same file
- [ ] **DB schema**: New table names don't collide with existing tables
- [ ] **DB columns**: No column names that shadow SQLite reserved words
- [ ] **Shared util impact**: Changes to `shared/` are additive (new exports, not modified existing)
- [ ] **Cross-project safety**: If shared/ modified, changes don't break other projects
- [ ] **Cache key patterns**: New keys don't collide with existing patterns
- [ ] **Auth pattern**: Endpoint uses `requireAuth` + `getAuthEmail` from shared utilities
- [ ] **Rate limiting**: Write operations use `checkRateLimit`

## UI Consistency Check (Phase 5 — UI Consistency Reviewer)

Compare new components against 2+ existing views in the same project.

### Color & Theme
- [ ] Background uses project's standard background token
- [ ] Surface uses project's standard surface + border tokens
- [ ] Text: primary and secondary colors match project palette
- [ ] Accent colors: blue, green, red consistent with project palette
- [ ] No arbitrary hex values outside the palette

### Components
- [ ] Shared KPICard used for metric display (not custom divs)
- [ ] ErrorBoundary wrapping the view in App.jsx
- [ ] Loading state matches existing pattern
- [ ] Error state matches existing pattern (message + retry button)
- [ ] Empty state uses shared component or matches existing views

### Tables
- [ ] `table-layout: fixed` with `<colgroup>` for resizable columns
- [ ] Sticky header (`position: sticky; top: 0`)
- [ ] Alternating row colors or hover highlight
- [ ] Scrollable wrapper with `overflow-x: auto`

### Charts (if Recharts used)
- [ ] Tooltip with THREE dark theme props: `contentStyle`, `labelStyle`, `itemStyle`
- [ ] Grid uses shared constants for dash and stroke
- [ ] ResponsiveContainer with appropriate height (200px mobile, 250px+ desktop)

### Responsive
- [ ] Mobile breakpoint at 768px
- [ ] KPI grid collapses (4-col → 2-col → 1-col)
- [ ] Table horizontally scrollable on mobile
- [ ] Filters collapsed by default on mobile

### CSS
- [ ] Class prefix unique to this view (e.g., `.inv-` for inventory)
- [ ] Section comment `/* === {NAME} VIEW === */` in App.css
- [ ] No `!important` unless overriding third-party lib
- [ ] No inline styles except dynamic values (width, color based on data)

## Impact Review Check (Phase 5 — Impact Reviewer)

### Imports
- [ ] All new imports resolve to real files (Glob verify)
- [ ] No circular imports introduced
- [ ] Shared util imports use correct alias or relative path

### App.jsx Routing
- [ ] Lazy import with Suspense fallback
- [ ] ErrorBoundary wrapping with unique `key` prop
- [ ] Correct props passed (isMobile, isAdmin, data, cache — per view type)
- [ ] Sidebar nav entry with `activeView` match

### DB Schema
- [ ] No column name collisions with existing tables
- [ ] Foreign keys reference existing tables correctly
- [ ] Indexes cover expected query patterns
- [ ] Migration number is sequential (no gaps, no duplicates)

### Endpoints
- [ ] No file name collision in `functions/api/`
- [ ] No action/endpoint param collision within the file
- [ ] CORS headers on ALL responses (including errors)
- [ ] No `err.message` leaked in production error responses

### Shared Utilities
- [ ] Changes are additive (new exports only)
- [ ] If existing exports modified, ALL consumers verified
- [ ] Each project's local utils re-exports new shared functions
