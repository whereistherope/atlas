"""Static contract checks for the Atlas v0.12.2 workspace correction."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
widgets_js = (ROOT / "js/widgets.js").read_text()
map_js = (ROOT / "js/map.js").read_text()
widgets_css = (ROOT / "styles/widgets.css").read_text()
map_css = (ROOT / "styles/map.css").read_text()


def require(condition, message):
    if not condition:
        raise AssertionError(message)


# Saved zones are rendered exactly once in their matching containers.
adaptive = widgets_js.split("function adaptiveWidgetZones(){", 1)[1].split("function zoneHtml", 1)[0]
for zone in ("top", "left", "right", "bottom", "float"):
    require(f"{zone}:widgetZoneItems('{zone}')" in adaptive, f"{zone} must retain its explicit zone")
require("window.innerWidth" not in adaptive and ".push(" not in adaptive, "zones must not be adaptively reassigned")

# Occupancy classes select the exact desktop column composition.
for selector in (".board-middle{", ".board-middle.has-left{", ".board-middle.has-right{", ".board-middle.has-left.has-right{"):
    require(selector in widgets_css, f"missing occupancy layout {selector}")
require('grid-template-areas:"center"' in widgets_css, "empty sides must collapse to the map")
require('grid-template-areas:"left center"' in widgets_css, "left-only layout missing")
require('grid-template-areas:"center right"' in widgets_css, "right-only layout missing")
require('grid-template-areas:"left center right"' in widgets_css, "three-column layout missing")

# Bottom remains inside board-center after board-map; intermediate and narrow
# layouts keep the hero first and use two/one widget columns respectively.
render_home = widgets_js.split("function renderHome(){", 1)[1].split("function updateAtlasClock", 1)[0]
require(render_home.index('class="board-map"') < render_home.index("zoneHtml('bottom'"), "Bottom must follow the map")
require("repeat(2,minmax(0,1fr))!important" in widgets_css, "tablet widget grid must use two columns")
require("@media(max-width:700px)" in widgets_css and "grid-template-columns:minmax(0,1fr)!important" in widgets_css, "narrow widget stack missing")

# Structural dragging includes all parentId descendants, never associative links.
drag_setup = map_js.split("// Structural ancestry is defined only by parentId.", 1)[1].split("dragging={kind:'node-group'", 1)[0]
require("isDescendant(x.id,id)" in drag_setup, "drag group must include all structural descendants")
require("profileLinks" not in drag_setup and ".links" not in drag_setup, "associative links must not join drag groups")

# Anchor remains explicit; Reform continues to modify only a cloned draft.
require("function anchorMapLayout()" in map_js and "filter(a=>(a.profile||'me')===profileId)" in map_js, "profile-scoped Anchor missing")
require("working={areas:state.areas.map(a=>({...a}))" in map_js, "Reform must use cloned areas")
require("Constellation reformed · Anchor to save" in map_js, "Reform must remain unanchored")
require("data-map-anchor" in widgets_js, "Anchor command missing")
require("responsive map control rail" in map_css, "map control rail missing")

print("v0.12.2 static workspace contracts: PASS")
