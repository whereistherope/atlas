# Atlas Current State

Authoritative continuation checkpoint for future development sessions.

## Data architecture

- Atlas uses one canonical shared state, with Supabase authoritative once a device is joined to the shared Atlas.
- Local persistence remains an offline/cache/safety layer; it is not a second competing Atlas.
- Network presentation changes must not create a local-only graph path or alter canonical payload semantics unless explicitly scoped.
- Network physics preferences live in `state.settings.networkPhysics` so the chosen graph feel is part of the shared Atlas settings rather than browser-only state.

## Network interaction contracts

- The network is a deterministic constrained-force graph seeded by the Atlas hierarchy; it is not a random force cloud and it is not a rigid fixed-coordinate diagram.
- The same hierarchy and physics settings should produce the same settled base constellation on reload/device.
- The hierarchy/sun grammar supplies the starting shape; a bounded relaxation pass lets nodes and top-level branch envelopes repel/collide so clusters do not overlap or become cramped.
- A weak common centre force keeps the graph coherent and gives the network an overall body.
- Structural parent-child links act as springs and keep recognizable local clusters together.
- Associative/dotted cross-links are visual relationships only and exert zero layout force.
- Filters/scoped views hide or show nodes without redefining the full-profile base constellation.
- Manual dragging remains relative to the hierarchy. During a manual move, the moved branch is treated as fixed while surrounding nodes receive a short deterministic settle around it.
- Dragging a parent carries descendants; dragging a lower-level child carries only its own descendants.
- Level-5 nodes remain independently selectable and draggable.
- Anchor preserves the settled/manual constellation as relative offsets; Reform clears those offsets and returns to the deterministic force-relaxed base layout.

## Network geometry through v0.15.11

- The deterministic seed starts with core/root nodes at equal angular intervals on one compact circular orbit around an invisible centre (`ROOT_RADIUS=184`).
- No preferred oversized gap exists between Work/Life/etc; hierarchy and node size communicate importance.
- Every direct child fan begins with equal angular spacing.
- Every sibling in one seed fan shares the same resolved radius.
- Recursive seed expansion starts from `BASE_CHILD_RADIUS=84`.
- A crowded seed fan may expand enough to preserve `MIN_SIBLING_CLEARANCE=58`; individual sibling radius jitter and two-ring splitting remain prohibited.
- Child fans retain the tighter outward-biased spacing formula established in v0.15.7.
- Seed coordinates are not final coordinates: the network relaxes them against node collisions, branch-envelope collisions, structural spring lengths and the common centre force.
- Dense top-level branches must occupy separate readable territories; a large branch such as Ground Ops should push neighbouring clusters away rather than overlap them.
- Structural/tree links remain quiet straight relationships.
- Associative/dotted cross-links represent the actual source-to-target relationship as a straight clipped line. They are not obstacle-routed and do not use a synthetic centre waypoint or routing lane.
- All normal node labels use the same neutral level-4 typography, sit below their node, and use deterministic collision avoidance.
- v0.15.11 exposes five user-tunable graph parameters: Center, Repel, Link, Distance and Collision. Defaults are all `50`, and each slider updates the settled layout live.
- The physics control is a compact floating `details` panel attached to the map, collapsed by default so it does not permanently consume network space. Its open/closed UI state is not persisted.
- `Reset defaults` restores all five physics values to `50`.

## Version lineage relevant to network geometry

- v0.15.3: hierarchy-aware dragging and independently movable level-5 nodes.
- v0.15.4: deterministic guided-map model, relative offsets and Anchor/Reform contract.
- v0.15.5: recursive orbital experiment; inherited directional-path behaviour was rejected.
- v0.15.6: contained constellation clusters; two-ring/radius variation later rejected.
- v0.15.7: approved equal-radius/equal-angle recursive radial fan behaviour.
- v0.15.8: compact circular central-sun seed geometry, fixed recursive expansion/clearance model and uniform below-node labels. Its synthetic centre-hub cross-link routing was later rejected.
- v0.15.9: direct source-to-target cross-links plus restoration of the tighter radial fan angles.
- v0.15.10: changes the radial/sun layout from final placement into a deterministic seed, then applies constrained force relaxation so nodes and whole branch envelopes respond to one another, stay separated and retain an overall centred shape.
- v0.15.11: makes the force model live-tunable with canonical physics settings and a collapsible graph-physics control panel.

## Development rule

When changing network geometry, distinguish user-approved design constraints from implementation details in previous versions. The network should behave like an Obsidian-style responsive graph while remaining deterministic, hierarchical and visually restrained. Do not reintroduce rigid final radial placement, random physics, synthetic cross-link routing, or cross-link layout forces without explicit approval.
