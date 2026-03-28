---
name: triage-ideas
description: "Process Obsidian Ideas.md inbox — route ideas to project roadmaps. NOT for direct roadmap edits or reviews."
user-invokable: true
---

# Triage Ideas — Obsidian Inbox to Project Roadmaps

Process the Ideas inbox — route each idea to the appropriate project roadmap.

**Obsidian CLI** (for read/search only — no edit command):
```bash
# Auto-detect binary based on platform:
# Windows: "/c/Users/{username}/AppData/Local/Programs/obsidian/Obsidian.exe"
# macOS:   /Applications/Obsidian.app/Contents/MacOS/Obsidian
# Linux:   obsidian (if on PATH) or flatpak run md.obsidian.Obsidian
# All commands need 2>&1 | grep -v "Loading\|out of date"
```

**Obsidian vault path**: Auto-detect from Obsidian config or ask user on first run. Referred to as `{{vault_root}}` below.
**Roadmap file**: `{{vault_root}}/{{project}}/Roadmap.md`
**Ideas file**: `{{vault_root}}/Ideas.md`

## Step 1 — Read the inbox

```bash
"$OBS" read path="Ideas.md" 2>&1 | grep -v "Loading\|out of date"
```

If the only content is the frontmatter and `# Ideas` header with no bullets, report "Ideas inbox is clear" and stop.

## Step 2 — Classify each idea

Analyze each idea and classify:
- **Project**: Classify by project or area (use your vault's folder structure as a guide)
- **Type**: Roadmap item (future work), Todo (actionable now), or Feature request
- **Priority**: BLOCKING, CRITICAL, High, Medium, Low, or "When needed"
- **Effort**: Low, Medium, Large
- **Table**: Immediate Backlog (actionable items) or Long-Term Ideas (exploratory/future)

Use vault context to flesh out the idea (run searches in parallel):
```bash
"$OBS" search query="{relevant keywords}" limit=10 2>&1 | grep -v "Loading\|out of date"
```

Also read the roadmap to check for duplicates:
```bash
# Use Read tool directly — Obsidian CLI has no edit command
Read file: {{vault_root}}/{{project}}/Roadmap.md
```

Present the triage plan to the user before executing:
```
| # | Idea | Project | Type | Priority | Effort | Table |
|---|------|---------|------|----------|--------|-------|
| 1 | ... | Project A | Roadmap | Medium | Low | Immediate |
| 2 | ... | Project B | Roadmap | Low | Medium | Long-Term |
```

Ask the user to confirm or adjust before proceeding.

## Step 3 — Route to ALL destinations

For each confirmed idea, update the relevant destinations:

### 3a. Obsidian Roadmap.md

Use the **Read tool** then **Edit tool** on the actual file path (NOT Obsidian CLI — it has no edit command):
- **Immediate Backlog items**: Insert new row before sentinel rows (e.g., `| Quality |` or `| When needed |`)
- **Long-Term Ideas items**: Append to the Long-Term Ideas table

Row format for Immediate Backlog:
```
| {Priority} | **{Title}** — {Description} | Ideas inbox {YYYY-MM-DD} | {Effort} |
```

Row format for Long-Term Ideas:
```
| {Priority} | **{Title}** — {Description} | Ideas inbox {YYYY-MM-DD} | {Effort} |
```

### 3b. Database Persistence (optional)

If your project uses a database for roadmap tracking, insert items there too. Example using Cloudflare D1:

```bash
cat > tmp-ideas.sql << 'EOSQL'
INSERT INTO roadmap_items (id, title, description, project, status, createdDate, createdBy, updatedAt, updatedBy, estimatedTime)
VALUES
('idea-xxx', 'Title 1', 'Description. Priority: Medium.', 'My Project', 'planned', 'YYYY-MM-DD', 'claude', 'YYYY-MM-DDTHH:MM:SSZ', 'claude', 'Medium'),
('idea-yyy', 'Title 2', 'Description. Priority: Low.', 'My Project', 'planned', 'YYYY-MM-DD', 'claude', 'YYYY-MM-DDTHH:MM:SSZ', 'claude', 'Large');
EOSQL

# Execute against your database(s) — adjust command and DB name for your setup
npx wrangler d1 execute YOUR_DB_NAME --remote --file=tmp-ideas.sql

rm tmp-ideas.sql
```

Adapt the schema, table name, and execution commands to match your project's database.

### 3c. Other project roadmaps

For items routed to other projects, use the Edit tool on:
`{{vault_root}}/{Project}/Roadmap.md`

If no Roadmap.md exists, create one with the Write tool:
```markdown
---
type: roadmap
last_updated: {today}
---

# {Project} — Roadmap

## Backlog

| Priority | Item | Notes | Effort |
|----------|------|-------|--------|

## Completed
```

## Step 4 — Clear the inbox

Use the **Read tool** then **Edit tool** on `{{vault_root}}/Ideas.md`.

Replace all idea content, leaving only:
```markdown
---
type: ideas
---
# Ideas

```

**IMPORTANT**: Do NOT use Obsidian CLI for editing — it doesn't support it. Always use Read + Edit tools on the actual file path.

## Step 5 — Report summary

```
## Ideas Triaged

Processed X ideas from inbox:
- -> {Project A}/Roadmap.md (Immediate): "idea 1", "idea 2"
- -> {Project A}/Roadmap.md (Long-Term): "idea 3"
- -> {Project B}/Roadmap.md: "idea 4"
- Marked as already done: "idea 5"

Ideas inbox cleared.
```

## Gotchas

- **Obsidian CLI has NO edit command** — always use Read + Edit tools on full file paths
- **Batch DB inserts** — combine all ideas into one SQL file to minimize round-trips
- **Dedup check** — search the roadmap for similar items before adding duplicates
- **Immediate vs Long-Term** — actionable items with clear scope go to Immediate Backlog; exploratory/meta/tooling ideas go to Long-Term Ideas
- **Clean up tmp files** — always remove temporary SQL files after execution
