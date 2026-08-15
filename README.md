# Atlas 0.10.10

UI/workspace update. Existing IndexedDB data is preserved.

## Deploy
Replace the files in the root of the GitHub Pages repository:
- `index.html`
- `sw.js`
- `manifest.webmanifest`

## Changes
- Profile, View, Space, Tools and System now use one consistent dropdown-menu pattern.
- Context/control menus live together at the right side of the Atlas command rail.
- Utility panes support Top, Left, Right and Float positions.
- Floating utility panes can be dragged; dragging near the top/left/right edge previews a snap target and docks on release.
- Top dock works in landscape and portrait and gives Scratch/To-do/Upcoming a wide workspace.
- Fixed Atlas wordmark is embedded as a device-independent image asset inside `index.html`.
