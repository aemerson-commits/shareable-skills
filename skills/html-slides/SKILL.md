---
name: html-slides
description: "Create polished, interactive HTML presentation slides from a single prompt. Output is self-contained HTML."
user-invocable: true
---

# HTML Slides

Create polished, interactive HTML presentation slides from a single prompt. Output is a self-contained HTML file with embedded CSS and JS — no dependencies needed.

## Trigger

When the user asks to create a presentation, slides, deck, or similar. Examples: "make a presentation about X", "create slides for the meeting", "build a deck on Y".

## Output

A single `.html` file saved to the user's specified location (default: `C:/tmp/slides/`). The file is self-contained and can be opened directly in any browser.

## Design Principles

- **Professional and clean** — avoid "AI-flavored" design. Use generous whitespace, strong hierarchy, and restrained color.
- **Dark theme by default** — dark backgrounds (#0f172a to #1e293b range), light text.
- **One idea per slide** — short headlines, supporting bullets or visuals. Never wall-of-text.
- **Keyboard navigation** — arrow keys, spacebar, or click to advance. Show slide counter.
- **Responsive** — works on projector (16:9), laptop screen, or tablet.
- **Print-friendly** — include `@media print` styles for handout mode.

## Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Presentation Title}</title>
  <style>
    /* All styles inline — no external deps */
  </style>
</head>
<body>
  <div class="deck">
    <div class="slide" id="slide-1">...</div>
    <div class="slide" id="slide-2">...</div>
    <!-- ... -->
  </div>
  <div class="slide-counter">1 / N</div>
  <script>
    /* Keyboard/click navigation, slide counter, transitions */
  </script>
</body>
</html>
```

## Slide Types

Support these slide layouts:

| Type | Use |
|------|-----|
| **Title** | Opening slide — large title, subtitle, date/author |
| **Section** | Section divider — large centered text |
| **Content** | Headline + bullet points (3-5 max) |
| **Two-Column** | Side-by-side content, comparison, before/after |
| **Image** | Full-bleed image with caption (user provides URL or base64) |
| **Quote** | Large quote with attribution |
| **Data** | Key metrics, KPI cards, simple charts (CSS-only bar charts) |
| **Timeline** | Horizontal or vertical timeline of events |
| **Summary** | Key takeaways, action items, next steps |

## Navigation JS

```javascript
let current = 0;
const slides = document.querySelectorAll('.slide');
const counter = document.querySelector('.slide-counter');

function showSlide(n) {
  slides.forEach(s => s.classList.remove('active'));
  current = Math.max(0, Math.min(n, slides.length - 1));
  slides[current].classList.add('active');
  counter.textContent = `${current + 1} / ${slides.length}`;
}

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === ' ') showSlide(current + 1);
  if (e.key === 'ArrowLeft') showSlide(current - 1);
  if (e.key === 'Home') showSlide(0);
  if (e.key === 'End') showSlide(slides.length - 1);
});

document.addEventListener('click', e => {
  if (e.clientX > window.innerWidth / 2) showSlide(current + 1);
  else showSlide(current - 1);
});

showSlide(0);
```

## CSS Foundation

- Slides: `width: 100vw; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;`
- Transitions: `opacity` or `transform` with 0.3s ease
- Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Accent color: Derive from topic (blue for tech, green for finance, orange for operations)
- Code blocks: `font-family: 'Fira Code', monospace; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 1.5rem;`

## Workflow

1. Ask user for topic/content if not provided
2. Outline the slide structure (titles only) and confirm with user
3. Generate the full HTML file
4. Save to disk and report the file path
5. Offer to open in browser via Chrome DevTools MCP if available

