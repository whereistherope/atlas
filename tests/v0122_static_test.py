"""Static contract checks for the canonical Atlas v0.12.2 workspace."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
widgets_js = (ROOT / "js/widgets.js").read_text()
map_js = (ROOT / "js/map.js").read_text()
widgets_css = (ROOT / "styles/widgets.css").read_text()
map_css = (ROOT / "styles/map.css").read_text()


def require(condition, message):
    if not condition:
        raise AssertionError(message)


# Saved zones remain exact, and empty zones produce no DOM/grid item at all.
adaptive = widgets_js.split("function adaptiveWidgetZones(){", 1)[1].split("function zoneHtml", 1)[0]
for zone in ("top", "left", "right", "bottom", "float"):
    require(f"{zone}:widgetZoneItems('{zone}')" in adaptive, f"{zone} must retain its explicit zone")
zone_html = widgets_js.split("function zoneHtml", 1)[1].split("function floatingWidgets", 1)[0]
require("if(!ids.length)return''" in zone_html, "empty dock zones must not render")
require("window.innerWidth" not in adaptive and ".push(" not in adaptive, "zones must not be reassigned")

# Exactly one canonical desktop composition supports map-only, left-only,
# right-only, and both-side occupancy without !important cascade fights.
for selector in (".board-middle{", ".board-middle.has-left{", ".board-middle.has-right{", ".board-middle.has-left.has-right{"):
    require(selector in widgets_css, f"missing occupancy layout {selector}")
require('grid-template-areas:"center"' in widgets_css, "map-only centre layout missing")
require('grid-template-areas:"left center"' in widgets_css, "left-only layout missing")
require('grid-template-areas:"center right"' in widgets_css, "right-only layout missing")
require('grid-template-areas:"left center right"' in widgets_css, "three-column layout missing")
require("board-middle" not in map_css and "board-center" not in map_css and "board-map" not in map_css, "map.css must not override workspace geometry")
workspace_geometry = widgets_css.split("/* Main home workspace", 1)[1].split("/* Widget internals", 1)[0]
require(not any("!important" in line for line in workspace_geometry.splitlines() if any(token in line for token in (".board-middle", ".board-center", ".board-map", ".widget-zone.zone-left", ".widget-zone.zone-right", ".widget-zone.zone-bottom"))), "canonical workspace geometry must not depend on !important")

# Side lanes and the map share one height; side rows divide it equally and
# widget bodies scroll rather than increasing the map row.
require("height:var(--map-pane-height)" in widgets_css, "map and side lanes must share a height token")
require("grid-template-rows:repeat(var(--zone-rows),minmax(0,1fr))" in widgets_css, "side widgets must divide map height")
for count in range(1, 7):
    require(f'[data-count="{count}"]' in widgets_css and f"--zone-rows:{count}" in widgets_css, f"side row count {count} missing")
require("overflow:auto" in workspace_geometry, "side widget content must scroll")

# Top and Bottom pack 1/2/3/4 across. Bottom remains immediately after the map
# inside centre, so its width always follows the centre column.
for count, columns in ((1, 1), (2, 2), (3, 3), (4, 4)):
    require(f'[data-count="{count}"]' in widgets_css and f"--zone-cols:{columns}" in widgets_css, f"equal column count {count} missing")
render_home = widgets_js.split("function renderHome(){", 1)[1].split("function updateAtlasClock", 1)[0]
require(render_home.index('class="board-map"') < render_home.index("zoneHtml('bottom'"), "Bottom must follow map inside centre")

# Tablet is map/Bottom first, then Left and Right in two columns; narrow is a
# single-column stack. Nodes/List/Predict all remain contents of one board-map.
require("@media(max-width:1179px)" in widgets_css and ".board-center{order:0}" in widgets_css, "tablet map-first composition missing")
require(".widget-zone.zone-left{order:1}" in widgets_css and ".widget-zone.zone-right{order:2}" in widgets_css, "tablet side order missing")
require("repeat(2,minmax(0,1fr))" in workspace_geometry, "tablet two-column widgets missing")
require("@media(max-width:700px)" in widgets_css and "grid-template-columns:minmax(0,1fr)" in workspace_geometry, "narrow single-column stack missing")
require(render_home.count('class="board-map"') == 1 and "networkPanel(null)" in render_home, "all map modes must share one centre pane")
require(".branch-view{position:absolute;inset:0" in map_css, "List must fill the entire map pane")

# List has a recursive directory tree, compact code/title rows, connectors, and
# retained click navigation.
require('<ul class="branch-tree root-children">' in widgets_js, "List root must be a directory tree")
require("childList(child)" in widgets_js, "List descendants must render recursively")
require('data-open-area="${child.id}"' in widgets_js, "List navigation hook missing")
require(".branch-tree li:before" in map_css and ".branch-tree li:after" in map_css, "List hierarchy connectors missing")

# Structural drag and Anchor/Reform contracts remain intact.
drag_setup = map_js.split("// Structural ancestry is defined only by parentId.", 1)[1].split("dragging={kind:'node-group'", 1)[0]
require("isDescendant(x.id,id)" in drag_setup, "drag group must include all structural descendants")
require("profileLinks" not in drag_setup and ".links" not in drag_setup, "associative links must not join drag groups")
require("function anchorMapLayout()" in map_js and "filter(a=>(a.profile||'me')===profileId)" in map_js, "profile-scoped Anchor missing")
require("working={areas:state.areas.map(a=>({...a}))" in map_js, "Reform must use cloned areas")
require("Constellation reformed · Anchor to save" in map_js and "data-map-anchor" in widgets_js, "explicit Anchor flow missing")
require("responsive map control rail" in map_css, "map control rail missing")

print("v0.12.2 canonical workspace contracts: PASS")
