# Atlas Document v1 — v0.14.0

## Principle

Atlas rich writing is no longer constrained by Markdown.

- Atlas Document v1 is the authoritative rich representation for upgraded writing surfaces.
- Markdown/plain text remains as a compatibility fallback for search, Relay, export and legacy records.
- Existing Markdown-only records remain valid and are upgraded only when saved through the rich editor.

## Current rich surfaces

- Note body → `note.document`
- Project Objective → `project.objectiveDocument`
- Project Next Move → `project.nextDocument`

Tasks and milestones remain lightweight structured fields.

## Document envelope

```json
{
  "schema": "atlas_document",
  "version": 1,
  "html": "<p>...</p>",
  "plainText": "...",
  "updatedAt": 0
}
```

The HTML is sanitised before storage. Atlas preserves only the tags/attributes needed for its editor, including table spans, column widths, indentation, task-list state and private image references.

## Compatibility

The existing `body`, `objective` and `next` fields are retained. The current editor continues to update them as a Markdown/plain-text fallback when a rich document is saved.

Canonical Supabase state requires no schema migration because note/project objects are already carried as JSON inside the canonical payload. The new document properties travel with those existing objects.

## v0.14.0 editor capabilities

- Indent / outdent buttons
- Tab / Shift+Tab indentation outside table cells
- Table cell merging:
  - selected rectangular cells
  - merge right
  - merge below
  - unmerge
- Persistent table `colspan` / `rowspan`
- Persistent column widths
- Desktop pointer and iPad/touch column-resize handles
- Same document model for Note body and Project Objective / Next Move

## Upgrade behaviour

1. Open an old Markdown-only record: Atlas renders it normally.
2. Edit it visually.
3. Save: Atlas writes Atlas Document v1 and also keeps the compatibility text field.
4. Reopen: Atlas Document v1 is restored first.

No bulk conversion is required.
