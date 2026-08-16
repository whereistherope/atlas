"""Static contract checks for the canonical Atlas v0.12.2 workspace."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
widgets_js = (ROOT / "js/widgets.js").read_text()
map_js = (ROOT / "js/map.js").read_text()
widgets_css = (ROOT / "styles/widgets.css").read_text()
map_css = (ROOT / "styles/map.css").read_text()
app_css = (ROOT / "styles/app.css").read_text()


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

# The centre surface has an unbroken definite-height chain shared by all modes.
require(".board-map{min-width:0;position:relative;height:var(--map-pane-height)}" in widgets_css, "board map height missing")
require(".board-map>.network-stage{width:100%;min-width:0;height:100%;min-height:0}" in widgets_css, "network stage height chain missing")
require(".board-map>.network-stage>.map-wrap{width:100%;min-width:0;height:100%;min-height:0}" in widgets_css, "map wrap height chain missing")
require(".board-map #network{width:100%;height:100%;display:block}" in widgets_css, "SVG height chain missing")

# Side lanes share map height. One widget fills it, two split it, and three or
# more retain two-slot height inside a scrolling lane rather than compressing.
require("--widget-side:clamp(220px,18vw,300px)" in widgets_css, "restrained side width missing")
require('zone-left[data-count="1"]' in widgets_css and "grid-template-rows:minmax(0,1fr)" in widgets_css, "single side widget must fill height")
require('zone-left[data-count="2"]' in widgets_css and "grid-template-rows:repeat(2,minmax(0,1fr))" in widgets_css, "two side widgets must split height")
require("grid-auto-rows:calc((100% - var(--workspace-gap))/2)" in widgets_css and "overflow-y:auto" in workspace_geometry, "3+ side widgets must use scrolling two-slot rows")
for count in range(3, 7):
    require(f"--zone-rows:{count}" not in widgets_css, f"side count {count} must not compress into equal rows")
require("overflow:auto" in workspace_geometry, "internal side widget content must scroll")

# Top and Bottom pack 1/2/3/4 across. Bottom is a board-level shelf after the
# complete middle workspace, so side occupancy never constrains its width.
for count, columns in ((1, 1), (2, 2), (3, 3), (4, 4)):
    require(f'[data-count="{count}"]' in widgets_css and f"--zone-cols:{columns}" in widgets_css, f"equal column count {count} missing")
render_home = widgets_js.split("function renderHome(){", 1)[1].split("function updateAtlasClock", 1)[0]
middle_end = render_home.index("</div>${zoneHtml('bottom'", render_home.index('class="board-middle'))
require(render_home.index('class="board-map"') < middle_end, "map must remain inside middle workspace")
require(middle_end < render_home.index("zoneHtml('bottom'"), "Bottom must be a full-workspace shelf after board-middle")

# Tablet is map/Bottom first, then Left and Right in two columns; narrow is a
# single-column stack. Nodes/List/Predict all remain contents of one board-map.
require("@media(max-width:1179px)" in widgets_css and ".board-center{order:0}" in widgets_css, "tablet map-first composition missing")
require(".widget-zone.zone-bottom{order:1}" in widgets_css and ".widget-zone.zone-left{order:2}" in widgets_css and ".widget-zone.zone-right{order:3}" in widgets_css, "tablet map/Bottom/side order missing")
require("repeat(2,minmax(0,1fr))" in workspace_geometry, "tablet two-column widgets missing")
require("@media(max-width:700px)" in widgets_css and "grid-template-columns:minmax(0,1fr)" in workspace_geometry, "narrow single-column stack missing")
require(render_home.count('class="board-map"') == 1 and "networkPanel(null)" in render_home, "Nodes/List/Predict must share one centre pane")
require("mode==='list'" in widgets_js and "mode==='predict'" in widgets_js, "all three modes must render inside networkPanel")
require(".branch-view{position:absolute;inset:0" in map_css, "List must fill the entire map pane")

# List has a recursive directory tree, compact code/title rows, connectors, and
# retained click navigation.
require('<ul class="branch-tree root-children">' in widgets_js, "List root must be a directory tree")
require("childList(child)" in widgets_js, "List descendants must render recursively")
require('data-open-area="${child.id}"' in widgets_js, "List navigation hook missing")
require(".branch-tree li:before" in map_css and ".branch-tree li:after" in map_css, "List hierarchy connectors missing")

# Final composition polish: the shell packs header/main at the top, Predict
# matches the Nodes rail, and one shared responsive condition suppresses sides.
require("align-content:start!important" in app_css, "shell must keep spare height after application content")
require("margin-top:-4px" not in widgets_css, "Atlas board must not compensate for shell row stretching")
require('predict?`<div class="map-command"><button type="button" data-predict-regenerate>Regenerate</button></div>' in widgets_js, "Predict Regenerate must occupy the command slot")
require(".map-wrap .predict-controls .map-hud{display:flex" not in map_css, "Predict must not override Nodes rail geometry")
require(".prediction-mode{background:" not in map_css, "Predict must use the shared Nodes/List map surface background")
responsive = widgets_css.split("@media(max-width:1179px), (max-aspect-ratio:1.339/1){", 1)[1].split("@media(max-width:700px)", 1)[0]
require(".board-middle.has-left.has-right{display:contents}" in responsive, "width/aspect responsive mode must stack the workspace")
require('.widget-position-panel [data-zone="left"],.widget-position-panel [data-zone="right"]{display:none}' in responsive, "the same width/aspect mode must hide side Position choices")
require("widgetCfg(id).zone" in widgets_js, "responsive menu styling must not rewrite saved zones")

# Structural drag and Anchor/Reform contracts remain intact.
drag_setup = map_js.split("// Structural ancestry is defined only by parentId.", 1)[1].split("dragging={kind:'node-group'", 1)[0]
require("isDescendant(x.id,id)" in drag_setup, "drag group must include all structural descendants")
require("profileLinks" not in drag_setup and ".links" not in drag_setup, "associative links must not join drag groups")
require("function anchorMapLayout()" in map_js and "filter(a=>(a.profile||'me')===profileId)" in map_js, "profile-scoped Anchor missing")
require("working={areas:state.areas.map(a=>({...a}))" in map_js, "Reform must use cloned areas")
require("Constellation reformed · Anchor to save" in map_js and "data-map-anchor" in widgets_js, "explicit Anchor flow missing")
require("responsive map control rail" in map_css, "map control rail missing")

print("v0.12.2 canonical workspace contracts: PASS")
