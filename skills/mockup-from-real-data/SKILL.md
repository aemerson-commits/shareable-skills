---
name: mockup-from-real-data
description: "Build a mock of a proposed view from saved real records, check it in both themes at three widths, then judge the finished options before anyone is asked to approve it. Use for a mock of a live view. NOT for comparing style variants (/design-showcase)."
---

# Mockup from real data

A mock of a live view is read as a picture of what the screen will show. A number invented for it
becomes a claim nobody measured, and an approved mock tends to become the build spec. So every
value in the mock comes from a saved pull of real records, and the mock is checked the way a page
is checked before anyone sees it.

All of it lives in a scratch folder. The repo is never written, and production is only read.

## When to use

- A mock of a proposed change to a view that already has real data behind it.
- Several options (Before, A, B, C) of the same view that someone has to choose between.

Not for style exploration with no data question: `/design-showcase` invents one consistent dataset
on purpose.

## Build (one folder per mock item)

1. **Save the pulls first.** Read-only requests and `SELECT`s, each redirected to a file in the
   scratch folder and stamped with the time it was taken. Never a mutating verb, and never a
   test-mode switch that writes.
2. **`data.mjs`** reads only those saved files. Its header comment names the source file of every
   value. A value you do not have is drawn as unknown, never filled in.
3. **`gen.mjs`** imports `data.mjs` and writes ONE fragment, `<section id="item-N">…</section>`.
   Position elements from the real quantities (clock minutes, counts) so the mock stays to scale
   at any width. Escape every interpolated string.
4. **`lint.mjs`** checks the fragment string: it starts with `<section id="item-N"` and ends with
   `</section>`, has no `<html>`, `<head>` or `<body>` tag, no `<script src>`, and no duplicate
   `id`.
5. **`check.mjs`** wraps the fragment in a full document and renders it at 1920, 1180 and 390
   wide, in a dark and a light theme. It reports page overflow and console errors, clicks any
   toggle, and saves a PNG per combination. A scratch folder has no `node_modules`: load the
   repo's Playwright by absolute path
   (`createRequire(import.meta.url)("<repo root>/node_modules/playwright/index.js")`), read-only.
6. **Read every PNG.** Fix what is wrong in `gen.mjs`, never in the built HTML, and rerun steps 3
   to 5.

Parallel items each keep their own folder, so one item's rerun cannot overwrite another's output.

## Judge (when there is more than one option or item)

Judge from a separate folder that reads the build output and never writes to it. Give every item
the same inputs:

1. **Text**: the wrapped page's `innerText` at 1920 dark, to a `.txt`. This is where the wording,
   the ids and whether the numbers agree with each other get checked.
2. **Outline**: headings and ids with their `y` and height, to a `.json`. It shows the order and
   size of the Before block and each option.
3. **Crops**: one PNG per part (Before, option A, option B, …) at the same width, so options
   compare side by side. A full-page shot hides a difference three screens down.
4. **Hover text**: every `title`, `aria-label` and tooltip attribute, de-duplicated and tagged
   with its option, to a `.txt`. Hover text never shows in a screenshot, so this dump is the only
   check it gets.

Write the verdict for one item before opening the next.

## Hand it over

- Give the page colour tokens on `:root` with a dark variant and an explicit `body` background, so
  it reads correctly in whichever theme the reviewer's viewer opens it.
- Say in the question which numbers are real pulls, and from when.
- A later version builds on the newest version that was actually answered, not on the newest one
  you wrote.

## Related

- `/design-showcase`: style variants over invented data.
- `/webapp-testing`: Playwright against a served app page, not a scratch fragment.
