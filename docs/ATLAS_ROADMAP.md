# Atlas roadmap

This document is the canonical development backlog for Atlas.

## Current development baseline

- `main` = current live production Atlas.
- `refactor-v0.12` = active development branch.
- The v0.12 refactor modularised the previous single-file application without intentionally redesigning behaviour.
- Existing user data compatibility is a hard requirement.

## P0 — Current UI / behaviour fixes

- Melbourne and UTC time/date should appear together as a compact status block at the actual top-right of the Atlas page, outside the main command/banner bar. Both should show `HH:MM:SS` and date. There should be no footer clock. Moving the clocks out of the banner should leave more breathing room for the Atlas wordmark and navigation controls.
- Atlas logo/wordmark rendering must be reliable and identical across devices. The wordmark should have stronger presence and make better use of the banner height rather than appearing undersized within a large empty bar. Keep it left-aligned and allow the navigation/control group on the right to breathe rather than crowding the logo.
- The widget workspace is not genuinely responsive. When widgets are moved, added, or removed, or the screen changes between portrait and landscape, Atlas can leave large dead spaces instead of repacking available space, and widget edges may not align with the workspace.
- Widget layout should preserve user intent but intelligently fill available space across desktop landscape, tablet, and portrait layouts.
- Docking should support modular positions such as top, bottom, left, right, and floating, with sensible responsive rearrangement.
- Node/List map UI still needs polish after the workspace foundation is stable.

## P1 — Map / knowledge workspace

- Preserve `Nodes`, `List`, and `Predict` as the three conceptual views.
- Nodes should remain a genuine navigable relationship map rather than a decorative visualisation.
- Direct parent/child relationships should cluster locally.
- Dragging a structural parent node should move the entire structural branch beneath it while preserving relative positions. For example, dragging `WRK` moves `GOPS` and all structural descendants beneath `GOPS`; dragging `GOPS` moves its own descendants. Dotted associative links to nodes outside that structural branch must not cause those external clusters to move.
- Solid structural connections should remain visually stronger than dotted associative connections.
- Dotted associative links may cross the wider network.
- List view should remain a compact branch/tree representation with restrained typography.

## P1 — Predict redesign

- Current Predict behaviour does not achieve the intended product goal and should be considered experimental.
- Do not keep expanding the procedural pathway-label algorithm.
- Intended Predict behaviour is semantic and context-aware:
  - Work/projects → likely next steps, decisions, dependencies, and pathways.
  - Creative/story work → plausible evolution of ideas, concepts, plots, and knowledge.
  - Film/TV → what to watch next based on stored preferences/notes.
  - Fragrance → what to sample next based on stored favourites/dislikes/notes.
  - Cars/Reading/etc. → equivalent context-aware recommendations.
- A future Predict implementation will likely require an AI/backend reasoning layer and, where appropriate, external knowledge.

## P2 — Stable Atlas Alpha

- Complete the responsive widget workspace.
- Finalise the design system and UI consistency.
- Stabilise Nodes/List navigation and map interaction.
- Test Atlas through real daily use before further large features are added.

## P3 — Atlas Sync / backend

- **v0.12.4:** Me-only Supabase connection/authentication and a read-only RLS vault/profile test. IndexedDB remains the source of truth and no content is synchronized.
- Next stages: safe Me-only backup; safe Me-only restore/pull; two-way Me sync with conflict handling; and cross-device validation.
- Alyssa and Us remain local-only. Their cloud/sharing/Entangle design is a later, separate stage; the existing cloud Us row is dormant and untouched.
- Later stages remain Relay authenticated transport and AI-backed Predict.
- Preserve the profile model:
  - `Me`
  - `Alyssa`
  - `Us`
- Personal profiles remain isolated.
- Explicit `Entangle` actions share selected information with `Us`.

## P4 — Send to Atlas / Relay

- **Implemented in v0.12.3:** local Envelope v1 validation, deterministic profile/area/topic routing, preview, idempotent create/append note ingestion, bounded receipts/provenance, and a manual Relay widget receiver.
- **Not yet connected:** authenticated backend/MCP transport and direct ChatGPT delivery remain future work.
- Future ChatGPT integration allowing commands such as:
  - “Send to Atlas → Quantum Story → Decoherence”
  - “Append this to the existing RCP 2635 note”
- Use durable Atlas areas/topics/threads/tags rather than relying entirely on ChatGPT conversation IDs.
- Future reverse retrieval should allow ChatGPT to request new Atlas context.
- Likely implementation via secure backend/MCP tooling.

## P5 — AI-backed Predict

- Replace procedural Predict with contextual AI reasoning once Sync/backend/Relay foundations exist.
- Generated predictions must remain clearly distinct from stored factual Atlas knowledge until explicitly accepted by the user.
