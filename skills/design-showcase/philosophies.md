# Design Philosophies Reference

Drop these specs verbatim into an agent prompt as variant definitions. Each is self-contained and ready to use.

---

## 01. Impeccable — Anti-Pattern Discipline

**Core premise**: Teach the LLM what AI slop looks like, then explicitly forbid it.

**Anti-patterns to avoid (call these out in a rationale card):**
- Purple/blue gradients as decoration
- Inter as the default "safe" font choice
- Identical bento-grid layouts with all equal cells
- Glass morphism / frosted glass panels
- Spark lines as filler data viz
- Side-tab accent borders (the left-edge colored stripe)
- Generic pill-shaped buttons
- Purple→pink gradient CTA buttons

**What to do instead:**
- IBM Plex Sans (or similar distinct utilitarian sans)
- Zero to minimal border radius — sharp, not pill-shaped
- Hard 1-2px borders; utilitarian, not decorative
- Rectangular workmanlike buttons with clear labels
- Color used ONLY for status signals (red=late, amber=warning, green=ok)
- Typography as structure: bold weight for headings, regular for data, no decorative font mixing
- Include an "Anti-Patterns Avoided" annotation card as a teaching moment for the viewer

**Mood**: Industrial spec sheet. This is a tool for getting work done, not a SaaS landing page.

---

## 02. UI/UX Pro Max — Operator-First, Function-Before-Form

**Core premise**: Design by function, not by template. Industry-specific reasoning applied.

**Information hierarchy (top to bottom, mandatory):**
1. WHAT IS THIS (item/job identity — largest type)
2. WHEN IS IT DUE (due date as traffic-light state, not a decorative pill)
3. WHERE IS IT (location, assignment)
4. ACTIONS (primary action largest and most prominent — complete, start, escalate)
5. METADATA (quantities, estimates, secondary identifiers — smallest)

**Rules:**
- Primary action button: at least 2x larger than secondary actions
- Due date urgency = traffic-light state (red/amber/green background, not just text color)
- Touch targets minimum 44×44pt for all interactive elements
- State pills use semantic labels: READY / RUNNING / PAUSED / COMPLETE / ISSUE
  (not abstract: "active", "pending", "done")
- High contrast — no "dashboard cute" (no rounded everything, no pastel fills)
- No information below the fold without scrolling — critical data must be visible without interaction
- Operator context: read under challenging lighting, gloves, 10-second glance time

**Font**: System UI stack or Geist — legible at any size, no style statement needed.

---

## 03. Taste — Opinionated Editorial, Anti-SaaS

**Core premise**: Design with an editorial voice. Refuses to look like every other dark dashboard.

**Typography rules:**
- One serif heading font (Fraunces, Cormorant Garamond, or Playfair Display) — headers only
- Monospace for ALL numeric data (IBM Plex Mono, JetBrains Mono, or Fira Code)
- Prose and labels in a neutral sans (not Inter — use DM Sans or Plus Jakarta Sans)

**Layout rules:**
- Asymmetric grid — NOT 12-column equal. One dominant column (2/3) + one sidebar (1/3)
- Numbers get visual weight and breathing room — pad them, size them up, don't crowd
- Prose is small and secondary — label text at 11-12px
- Minimal icons (lucide is fine, use sparingly — only where icon replaces a word)

**Color rules:**
- One strong accent color used in at most 3 places: one is not blue, not green
  (mustard #C9922A, oxblood #7B2226, deep teal #0F5E6B, or slate purple #4A3F6B)
- Background palette: 2 tones max (dark base + slightly lighter surface)
- Status colors are the ONLY colors that appear frequently

**Mood**: An editorial tool built for someone who cares about craft.

---

## 04. Linear — Zero-Chrome, Keyboard-First

**Core premise**: Reverse-engineered from Linear.app. Every pixel earns its place.

**Visual rules:**
- No drop shadows on any element
- No borders on buttons — just subtle background tints (e.g. `rgba(255,255,255,0.06)`)
- Single accent color, used only for the active/selected state and one CTA
- Tight vertical rhythm on a 4px grid (4px, 8px, 12px, 16px, 20px, 24px — nothing else)
- Dividers: 1px at 8% opacity, or no divider (use spacing instead)

**Typography:**
- Inter Tight or Inter — this is the one context where Inter works, because the density is earned
- Tight letter-spacing on headings (`-0.02em`)
- Data labels in uppercase at 10-11px with 0.06em tracking

**Interaction signals:**
- Keyboard shortcut hints next to every primary button (⌘↵ Save, P Play, S Stop, N Next)
- Hint style: small monospace, muted, right-aligned in the button or beside it
- Hover states: background tint shift only, no scale transforms

**Mood**: The tool gets out of the way. The work is the interface.

---

## 05. 21st.dev — Micro-Interaction Polish

**Core premise**: Identical layout to the control; all difference is surface quality and motion.

**What stays the same:** layout, information hierarchy, typography, color palette.

**What changes:**
- Cursor-following radial glow on card hover (CSS `radial-gradient` via custom properties updated by JS mousemove — keep JS minimal)
- Pulsing accent dot on the active timer/status indicator (`@keyframes pulse` with scale + opacity)
- Timer numerals: gentle fade transition between seconds (`transition: opacity 0.15s`)
- Primary action button: multi-layer halo (`box-shadow` with 3 layers: 0px tight, 4px mid, 12px outer — all accent color at decreasing opacity)
- Input focus: glow ring with `box-shadow` spread, not just `outline`
- Badge state transitions: `transition: background-color 0.2s, color 0.2s`

**Rules:**
- CSS-only interactions wherever possible — JS only for the cursor-tracking glow
- All animations respect `@media (prefers-reduced-motion: reduce)` — set motion to zero
- No layout shift from animations — use transform/opacity only, never width/height/padding changes
- Show all states via hover — the showcase HTML is static, so hover = "running" state

**Mood**: The same tool, but it feels alive. Motion as feedback, not decoration.

---

## 06. Conjunction — Best-Of-All Synthesis

**Core premise**: Cherry-pick the strongest element from each philosophy. Document the lineage.

**Synthesis rules (apply in this order):**
1. From **Impeccable**: sharp corners (0px radius on data cells, 2px on buttons), IBM Plex Sans, hard borders
2. From **Pro Max**: state pill labels (READY/RUNNING/PAUSED), primary action rail layout, traffic-light due-date urgency
3. From **Taste**: IBM Plex Mono for all numbers, one strong non-blue accent color, asymmetric grid
4. From **Linear**: keyboard shortcut hints, 4px grid rhythm, no drop shadows
5. From **21st.dev**: cursor-glow on the primary action rail ONLY (not the whole card), pulsing status dot

**Mandatory rationale card:**
Include a visible annotation panel listing which principle each major design decision came from. Format as a 2-column table: "Decision" | "Source philosophy". This makes the synthesis legible and educational.

Example entries:
- Sharp corners → Impeccable
- RUNNING state pill → Pro Max
- Monospace quantities → Taste
- ⌘↵ keyboard hint → Linear
- Primary button halo → 21st.dev

**Mood**: The result of a team that disagreed, then agreed on the best parts.

---

## Adding New Philosophies

When you encounter a design system worth codifying (from a video, article, or real product), add it here following this template:

```markdown
## N. [Name] — [One-line tagline]

**Core premise**: [Why this philosophy exists and what it rejects]

**Rules**: [Specific, actionable constraints — not vague adjectives]

**Mood**: [One sentence evocative description]
```

Keep each philosophy under 150 words. Specificity beats inspiration.
