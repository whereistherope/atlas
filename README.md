# Atlas v0.11.2

This release adds a denser relationship workflow without changing Atlas content storage.

## New in this build
- List mode now presents top-level parent titles in a dedicated left column, with child code + title branches on the right.
- Melbourne and UTC clocks/dates now appear at both the top and bottom of Atlas.
- Dragging a parent node moves its directly connected child nodes with it.
- Reform uses a tighter local-cluster layout so direct child nodes remain close to their parent while separate branches retain breathing room.
- Dotted cross-connections render at roughly 62% of the selected direct-link opacity.
- New Predict view procedurally extrapolates idea/knowledge filaments from existing leaf nodes. It is deliberately non-destructive and does not save projected nodes into Atlas.
- Predict includes Regenerate, pan and zoom controls.
- Type and link opacity controls continue to support 0–100%.

## Deployment
Replace `index.html`, `sw.js`, and `manifest.webmanifest` in the GitHub Pages repository. Keep the icon files in the repository root.
