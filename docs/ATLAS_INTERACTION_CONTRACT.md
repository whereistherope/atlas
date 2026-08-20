# Atlas Interaction Contract

Atlas should feel inevitable: when a user thinks of an action, the obvious control should do the obvious thing with the least necessary ceremony.

This document is a product and implementation contract. New features should fit these rules rather than creating parallel interaction systems.

## 1. Shortest sensible path

Common actions should normally require one action, occasionally two. Do not send a user through a manager, settings page, or unrelated editor merely to perform an ordinary action on the object already in front of them.

## 2. Context does work for the user

Atlas should inherit context it already knows.

- Capture from an Area or Topic should begin linked to that context.
- Creating from a Project should prefer that Project where the relationship is unambiguous.
- Context is a default, never a trap: the user must be able to change it before saving.
- Atlas must not silently guess among multiple materially different targets.

## 3. Direct manipulation before administration

Normal work happens where the object is viewed.

- Named Atlas objects that look actionable should open when selected.
- Substantive content should be editable from the object itself.
- Structural/admin screens are for structural/admin work, not as mandatory waypoints for ordinary creation or editing.

## 4. One capability, one behaviour

Opening, creating, navigating, editing and closing should not have subtly different implementations depending on which surface invoked them.

Reusable Atlas actions should be preferred over duplicate feature-local routing. Search, Predict, Activity, graph nodes, widgets and ordinary UI should ultimately invoke the same object actions.

## 5. Sensible defaults, optional precision

Make the likely safe choice automatically when confidence is high. Ask only when the choice is genuinely ambiguous or consequential.

Never require configuration before action when it can safely be changed afterward. Never silently select an arbitrary Project, Area, profile or destructive target simply because it is first in a list.

## 6. Progressive disclosure

The common path stays clean. Advanced controls should appear when needed rather than permanently occupying the interface.

A user should not need to understand Atlas internals to perform routine work.

## 7. Consistent temporary surfaces

- Escape dismisses the top temporary surface when doing so will not create ambiguous data loss.
- Back returns to the logical previous level.
- Closing a temporary surface should preserve the underlying working context.
- Temporary overlays must not reset navigation merely because they were opened.

## 8. Immediate, quiet feedback

Clicks should acknowledge immediately. Save, create, move and sync actions should visibly confirm success without interruptive success dialogs.

If an operation takes time, the interface must show that the action was received.

## 9. Errors are recoverable and intelligible

Never fail silently. Never expose raw implementation errors as the primary user experience.

An error should communicate:

1. what did not happen;
2. whether the user's work is safe;
3. what the user can do next.

## 10. Undo before confirmation noise

Prefer reversible actions and lightweight history where practical. Confirm genuinely destructive actions; do not place confirmation prompts in front of routine actions.

## 11. Keyboard speed, touch simplicity

Power-user keyboard paths and touch-first paths are two interfaces to the same capabilities.

- Command/Search is the high-speed universal route.
- Touch controls must remain obvious and complete on iPad/phone.
- Keyboard-only functionality is not a substitute for a usable touch path.

## 12. Preserve working state

Atlas should remember useful context such as selected Area, active profile, map mode, expanded working section and relevant scroll/selection state where practical.

The user should not repeatedly reconstruct the same context after closing an editor or temporary surface.

## 13. No mystery state

Local-only, syncing, filtered, hidden, unsaved, selected-profile and selected-space states should be understandable without becoming noisy.

The user should not have to infer why an object disappeared or why an action affected a different context.

## 14. Cross-feature composability

Features should expose capabilities that other Atlas features can call.

Examples:

- Predict opens a Project using the same action as Command/Search.
- Activity opens the same Note editor as a Note card.
- A graph node opens the same Area route as the navigation menu.
- Capture uses the current context rather than creating a separate context system.
- Theme/skin changes presentation, not functionality.

## 15. Performance is part of interaction design

Perceived responsiveness matters. Avoid global DOM observers, repeated whole-page scans and interaction paths that block the interface unnecessarily.

Prefer explicit lifecycle events and bounded work.

## Acceptance question

For every workflow, ask:

> Would a reasonable user ask "why can't I just…?" or "why do I have to do this just to do that?"

If the answer is yes and there is no safety, data-integrity or architectural reason for the friction, the workflow should be redesigned.

## Core journey audit

Every major Atlas feature should be tested through this sequence:

**create → find → open → edit → relate → return → act → recover**

A feature is not polished merely because its isolated screen works. The transitions between those states are part of the feature.
