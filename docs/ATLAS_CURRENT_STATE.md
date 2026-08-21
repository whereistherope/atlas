# Atlas Current State

Authoritative continuation checkpoint for future development sessions.

## Data architecture

- Atlas uses one canonical shared state, with Supabase authoritative once a device is joined to the shared Atlas.
- Local persistence remains an offline/cache/safety layer; it is not a second competing Atlas.
- Network presentation changes must not create a local-only graph path or alter canonical payload semantics unless explicitly scoped.
- Network physics preferences live in `state.settings.networkPhysics` so the chosen graph feel is part of the shared Atlas settings rather than browser-only state.
- Network split-view preference lives in `state.settings.mapSplitRatio`; it is presentation state only and does not duplicate graph/list data.

## Network interaction contracts

- The network is a deterministic constrained-force graph seeded by the Atlas hierarchy; it is not a random force cloud and it is not a rigid fixed-coordinate diagram.
- The same hierarchy and physics settings should produce the same settled base constellation on reload/device.
- The hierarchy/sun grammar supplies the starting shape; bounded force passes let nodes repel/collide and structural links behave as springs so clusters remain readable.
- A weak common centre model keeps the graph coherent and gives the network an overall body.
- Structural parent-child links act as springs and keep recognizable local clusters together.
- Associative/dotted cross-links are visual relationships only and exert zero layout force.
- Filters/scoped views hide or show nodes without redefining the full-profile base constellation.
- Manual dragging remains relative to the hierarchy. Dragging a parent carries descendants; dragging a lower-level child carries only its own descendants.
- Level-5 nodes remain independently selectable and draggable.
- Only the branch actively being dragged is physically pinned during the organic settle.
- Anchor preserves a preferred manual constellation as relative offsets. Those offsets influence future starting positions but do not permanently pin nodes; the graph remains free to relax around them.
- Reform clears manual offsets and returns to the deterministic force-relaxed base layout.

## Network geometry through v0.15.15

- The deterministic seed starts with core/root nodes at equal angular intervals on one compact circular orbit around an invisible centre (`ROOT_RADIUS=184`).
- No preferred oversized gap exists between Work/Life/etc; hierarchy and node size communicate importance.
- Every direct child fan begins with equal angular spacing.
- Every sibling in one seed fan shares the same resolved radius.
- Recursive seed expansion starts from `BASE_CHILD_RADIUS=84`.
- A crowded seed fan may expand enough to preserve `MIN_SIBLING_CLEARANCE=58`; individual sibling radius jitter and two-ring splitting remain prohibited.
- Child fans retain the tighter outward-biased spacing formula established in v0.15.7.
- Seed coordinates are not final coordinates: the hierarchy-aware settle provides a stable starting state, then the organic velocity-based settle removes final angular memory.
- Dense top-level branches must occupy separate readable territories; larger branches naturally claim more room because every node contributes charge/collision pressure.
- Structural/tree links remain quiet straight relationships.
- Associative/dotted cross-links represent the actual source-to-target relationship as a straight clipped line. They are not obstacle-routed and do not use a synthetic centre waypoint or routing lane.
- All normal node labels use the same neutral level-4 typography, sit below their node, and use deterministic collision avoidance.
- The graph exposes five user-tunable parameters: Center, Repel, Link, Distance and Collision. Defaults are all `50`, and each slider updates the settled layout live.
- `Reset defaults` restores all five physics values to `50`.
- Every network control lives in one compact `Controls` details panel: zoom/fit percentage, Reform, Anchor, Depth, Type opacity, Links opacity and all five physics sliders.
- The unified graph-control panel is collapsed by default and its open/closed UI state is deliberately not persisted.
- The final graph uses structural springs, size-aware node charge/collision, no final fan-angle memory, and centroid recentering rather than per-node gravity.
- Root nodes retain only very weak common-centre gravity, but root-to-root repulsion is stronger than ordinary node repulsion so weakly connected top-level nodes do not stack in the middle.
- Persisted manual offsets are soft starting preferences, not permanent pins. Anchored nodes remain participants in repulsion, collision, spring and centre forces after release.

## Network view contract

- The network pane has four explicit modes: Nodes, List, Split and Predict.
- Nodes is the full relationship map; List is the existing structural branch tree; Predict remains the procedural projection view.
- Split renders the same live Nodes map and the same existing List branch tree simultaneously. It must not create a second graph state or a second list data source.
- Split defaults to 60% map / 40% list and stores the chosen proportion in `state.settings.mapSplitRatio`.
- The split divider is the resize control: dragging it changes the map/list proportion live. The ratio is clamped to 25–75% so neither pane can be collapsed accidentally.
- The divider is keyboard accessible with arrow keys plus Home/End and exposes separator ARIA values.
- On narrow/mobile layouts, Split changes from left/right columns to a top/bottom arrangement and applies the same saved ratio to height.
- Nodes, List and Predict remain available as full-pane modes; Split is additive rather than replacing them.
- The map inside Split uses the same camera, graph physics, hierarchy dragging and collapsed graph Controls panel as Nodes mode.

## Version lineage relevant to network geometry and views

- v0.15.3: hierarchy-aware dragging and independently movable level-5 nodes.
- v0.15.4: deterministic guided-map model, relative offsets and Anchor/Reform contract.
- v0.15.5: recursive orbital experiment; inherited directional-path behaviour was rejected.
- v0.15.6: contained constellation clusters; two-ring/radius variation later rejected.
- v0.15.7: approved equal-radius/equal-angle recursive radial fan behaviour.
- v0.15.8: compact circular central-sun seed geometry, fixed recursive expansion/clearance model and uniform below-node labels. Its synthetic centre-hub cross-link routing was later rejected.
- v0.15.9: direct source-to-target cross-links plus restoration of the tighter radial fan angles.
- v0.15.10: changes the radial/sun layout from final placement into a deterministic seed, then applies constrained force relaxation so nodes and whole branch envelopes respond to one another.
- v0.15.11: makes the force model live-tunable with canonical physics settings and a collapsible graph-physics control panel.
- v0.15.12: replaces the split map-control rail plus physics flyout with one collapsible control surface and adds Anchor to the same layout-control group.
- v0.15.13: adds a deterministic velocity-based final settle that removes final-angle memory, uses size-aware node charge/collision and spring links, and changes centre force from per-node gravity to centroid recentering.
- v0.15.14: fixes anchored/manual nodes being incorrectly treated as permanent pins and strengthens root-to-root repulsion so weakly connected core nodes distribute naturally instead of stacking at the graph centre.
- v0.15.15: adds a persisted, resizable Split network view that composes the existing Nodes map and List branch tree side-by-side, with a responsive top/bottom arrangement on narrow screens.

## Development rule

When changing network geometry, distinguish user-approved design constraints from implementation details in previous versions. The network should behave like an Obsidian-style responsive graph while remaining deterministic, hierarchical and visually restrained. Do not reintroduce rigid final radial placement, permanent manual-offset pinning, random physics, synthetic cross-link routing, or cross-link layout forces without explicit approval. Network view changes must reuse canonical graph/list data rather than forking presentation-specific copies.
