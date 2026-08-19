# Atlas v0.13.1 — Direct Note Editor

Acceptance scope:

- Existing plain-text note bodies remain valid and render without migration.
- Tap/click a rendered note card to open the direct editor.
- Markdown-backed formatting: H2/H3, bold, italic, bullets, numbered lists, checklists, links, quotes, inline code, fenced code, and tables.
- Table insertion provides a three-column starter table and rendered tables scroll horizontally on narrow screens.
- Image insertion uses the private `atlas-note-assets` Supabase Storage bucket; the canonical note stores only an `atlas-asset://` reference.
- Private images are rendered through short-lived signed URLs for authenticated Atlas users.
- Image uploads are limited to 10 MB by both client and storage bucket configuration.
- Edit/Preview toggle is usable on iPad/mobile; the formatting toolbar scrolls horizontally on narrow screens.
- Save mutates the existing note record and calls the normal Atlas `save()` path so canonical sync remains authoritative.
- System → Notes → Detail also opens the same direct editor.

Manual acceptance test:

1. Open an existing note and confirm its old plain text is intact.
2. Add heading, bold, italic, list and checklist formatting; preview and save.
3. Insert a table, edit the cell text, preview and save.
4. Insert a photo from iPad Photos/Files, wait for upload confirmation, preview and save.
5. Confirm the formatted note and image render after reopening Atlas.
6. Open Atlas on a second signed-in device and confirm the formatted note and image appear there.
7. Edit the note on the second device and confirm the first device receives the change through canonical sync.
