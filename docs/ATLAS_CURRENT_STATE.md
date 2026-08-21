# Atlas Current State

Authoritative continuation checkpoint for future development sessions.

## Data architecture

- Atlas uses one canonical shared state, with Supabase authoritative once a device is joined to the shared Atlas.
- Local persistence remains an offline/cache/safety layer; it is not a second competing Atlas.
- Network presentation changes must not create a local-only graph path or alter canonical payload semantics unless explicitly scoped.

## Network interaction contracts

- The network is a guided deterministic map, not a force-layout cloud.
- The same hierarchy should produce the same base constellation on reload/device.
- Filters/scoped views hide or show nodes without reshuffling the base map.
- Cross-links are visual relationships only and do not influence node placement.
- Manual dragging remains relative to the guided hierarchy.
- Dragging a parent carries descendants; dragging a lower-level child carries only its own descendants.
- Level-5 nodes remain independently selectable and draggable.
- Anchor preserves deliberate local offsets; Reform returns to the clean deterministic base layout.

## Approved network geometry through v0.15.9

- Core/root nodes sit at equal angular intervals on one compact circular orbit around an invisible centre (`ROOT_RADIUS=184`).
- No preferred oversized gap exists between Work/Life/etc; hierarchy and node size communicate importance.
- Every direct child fan uses equal angular spacing.
- Every sibling in one fan shares the same resolved radius.
- Recursive expansion starts from the same `BASE_CHILD_RADIUS=84` at every generation.
- A crowded fan may expand only enough to preserve `MIN_SIBLING_CLEARANCE=58`; individual sibling radius jitter and two-ring splitting are prohibited.
- Child fans retain the tighter outward-biased spacing formula established in v0.15.7, avoiding the wider fan regression introduced by the first v0.15.8 implementation.
- Structural/tree links remain quiet and do not influence placement.
- Associative/dotted cross-links represent the actual source-to-target relationship as a straight clipped line. They are not routed around unrelated nodes and do not use a synthetic centre waypoint or routing lane. If the direct line naturally crosses the centre void, another branch, or another relationship line, it simply does so.
- All normal node labels use the same neutral level-4 typography, sit below their node, and use deterministic collision avoidance so labels do not occupy another node.

## Version lineage relevant to network geometry

- v0.15.3: hierarchy-aware dragging and independently movable level-5 nodes.
- v0.15.4: deterministic guided-map model, stable sectors, relative offsets, Anchor/Reform contract.
- v0.15.5: recursive orbital experiment; inherited directional-path behaviour was rejected.
- v0.15.6: contained constellation clusters; two-ring/radius variation later rejected.
- v0.15.7: approved equal-radius/equal-angle recursive radial fan behaviour.
- v0.15.8: approved compact circular central-sun root geometry, fixed recursive expansion/clearance model and uniform below-node labels. Its synthetic centre-hub cross-link routing and widened fan-angle implementation were not user-approved and are corrected in v0.15.9.
- v0.15.9: direct source-to-target cross-links plus restoration of the tighter approved radial fan angles while preserving the v0.15.8 circular sun, fixed expansion step and clearance rule.

## Development rule

When changing network geometry, distinguish user-approved design constraints from implementation details in previous versions. Do not treat a merged experimental implementation as a new design requirement unless subsequent user feedback approved it.
