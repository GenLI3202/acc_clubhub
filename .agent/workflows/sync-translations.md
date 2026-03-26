---
description: Sync English and German content with the latest Chinese version
---

# Sync Translations Workflow

This workflow syncs the English (`en/`) and German (`de/`) content with the Chinese (`zh/`) version, which is the source of truth.

## Steps

### 1. Identify Changed Files
Compare the Chinese content files with their English/German counterparts to find what needs updating.

```bash
# List all .qmd files in zh/ directory
Get-ChildItem -Path "content/zh" -Recurse -Filter "*.qmd" | Select-Object FullName
```

### 2. For Each Changed Chinese File
For each `.qmd` file in `content/zh/`:

1. Read the Chinese source file
2. Check if corresponding `en/` and `de/` files exist
3. Compare content (check if zh version is newer or different)
4. If translation needed:
   - Translate the content to English and German
   - Preserve the YAML frontmatter structure (update `lang:` field appropriately)
   - Preserve Quarto-specific syntax (listings, columns, etc.)
   - Update the target files

### 3. Translation Guidelines

When translating:
- **Keep technical terms** (e.g., "Social Ride", "Training Day") in English across all languages
- **Preserve all Quarto syntax** (YAML frontmatter, `:::` blocks, listings)
- **Preserve all links** (adjust paths if needed, but keep same structure)
- **Keep emoji** as-is
- **Translate content naturally** - not word-for-word literal translation

### 4. Files to Process

The workflow should process these content areas:
- `index.qmd` - Homepage
- `about/index.qmd` - About page
- `routes/index.qmd` - Routes listing
- `routes/*.qmd` - Individual route pages
- `events/index.qmd` - Events listing
- `events/*.qmd` - Individual event pages (if any)
- `media/index.qmd` - Media page
- `knowledge/workshop/index.qmd` and subpages
- `knowledge/gear/index.qmd` and subpages
- `knowledge/training/index.qmd` and subpages

### 5. Output

After completion, report:
- Number of files updated
- List of files that were translated
- Any files that need manual review (if translation was uncertain)

## Usage

Run this workflow when you've updated Chinese content and want to sync other languages:

```
/sync-translations
```

Or specify a specific file:

```
/sync-translations content/zh/routes/new-route.qmd
```
