# Atlas Ops Refinement

Status: design contract for the v0.17 UI phase.

This document defines the Ops skin as a refinement of the existing Atlas dark identity, not a ground-up visual redesign.

## Product position

Atlas Ops is the baseline serious-tool skin. It should feel precise, restrained, architectural and operational without becoming a dense command-centre dashboard, military cosplay, fake hacker UI, or a generic SaaS dark theme.

Core principle:

> complex underneath, calm on top

Ops should preserve the strong parts of the current Atlas identity and improve hierarchy, consistency and polish.

## What stays

The following current behaviours and product structures are not being redesigned by this phase:

- framework-free architecture;
- canonical data model and sync boundary;
- Atlas Lock authentication behaviour;
- graph physics and hierarchy behaviour;
- Nodes / List / Split / Predict capabilities;
- universal Capture and Command behaviours;
- existing Area/Topic, Project, Note, Daily, Calendar, Inbox and widget object models;
- responsive support for desktop, iPad and iPhone;
- persisted `day` and `night` appearance names.

## Appearance model

Atlas retains two appearance modes:

- `day`
- `night`

A separate skin concept is introduced conceptually:

- `ops`
- `frost`

The first implementation target is `ops`.

Skin selection should be treated as presentation state and remain device-local unless a later product decision deliberately adds roaming appearance preferences. Current canonical `canonical_state_v1` does not include the full `state.settings` object, so this phase must not silently expand the sync boundary.

## Ops design principles

### 1. Refine, do not reinvent

The current dark Atlas already contains the foundations of Ops: near-black surfaces, restrained nodes, small technical metadata, thin rules, compact controls and the current lock-screen identity. The goal is to mature that language.

### 2. One primary instrument per surface

Each major screen should have one dominant working object:

- Network: topology field.
- Split: structure + topology relationship.
- Project: Objective / Next Move and project state.
- Note: document canvas.
- Calendar: schedule.
- Home: operating picture.

Supporting controls must remain visually subordinate.

### 3. Negative space is functional

Do not fill empty space merely because it exists. The lock screen demonstrates the desired confidence: sparse telemetry surrounding one meaningful instrument.

### 4. Precision without density

Ops should use technical cues selectively:

- thin rules;
- compact metadata;
- restrained mono typography;
- quiet status indicators;
- clear panel alignment.

It should not expose every capability permanently.

### 5. Sans for content, mono for precision

Primary content, titles, editor text and descriptive copy use the main sans family.

Monospace is reserved for:

- codes;
- timestamps;
- telemetry;
- compact panel metadata;
- statuses;
- graph readouts;
- keyboard hints.

Avoid using uppercase mono styling as the default character of every control.

### 6. Colour has meaning

Night Ops should be predominantly graphite, near-black, off-white and muted steel grey.

Accent colour is sparse and semantic. It should identify active/current/success/warning/error states, not decorate the interface.

Day Ops should behave like an architectural drawing or technical manual rather than a simple inverted night theme: warm pale grey / off-white surfaces, graphite ink, restrained steel or muted olive accents and fine rules.

### 7. Structure should not become boxes everywhere

Use changes in surface tone, spacing and separators before introducing another full border. Hard frames are appropriate around instrument surfaces, editable fields and explicit floating layers; not every block requires a card.

## Core component language

### Shell / header

Target:

- substantially more compact than the current large Atlas-on-left hierarchy;
- Atlas wordmark acts as identity, not page headline;
- profile, navigation context, Space, Capture, Search and System belong to one coherent command surface;
- MEL / UTC remain as quiet telemetry;
- avoid stacked navigation bars unless required by narrow breakpoints;
- touch targets remain generous even when visual chrome is compact.

The header should answer, at a glance:

- where am I?;
- whose Atlas is this?;
- what space am I viewing?;
- what can I do next?;
- is the system healthy?

### Network instrument

The network should remain visually dominant.

Refinements:

- reduce enclosing-panel heaviness;
- standardise top-line metadata and view controls;
- make Controls a compact secondary instrument;
- preserve quiet node/edge styling;
- improve selected/hover/current states without glow or neon;
- add a small network overview/minimap when it can provide real orientation value;
- minimap must represent the live network/camera, not be decorative artwork;
- use registration/viewfinder marks sparingly if useful, especially around the map viewport;
- do not add ambient particles or decorative grid noise that competes with the topology.

### Network minimap

The overview should:

- appear in Nodes and Split when the graph is meaningfully larger than the viewport;
- show the graph footprint and current camera viewport;
- support pointer/touch navigation if practical;
- remain visually quiet;
- hide or simplify on small phone layouts when it obstructs the map;
- derive from the existing graph state rather than maintaining duplicate graph data.

### Nodes / List / Split / Predict selector

- one consistent segmented-control family;
- active state obvious but not filled with strong accent colour;
- same placement and semantics in Nodes and Split;
- Split Swap remains adjacent only when relevant;
- selector should not compete with the network itself.

### Split

Split should feel like one instrument with two coordinated representations, not two boxes placed side-by-side.

- list and graph selections should visibly correlate;
- divider remains direct manipulation and touch-safe;
- structural list side may carry slightly stronger framing than the open map field;
- orientation changes on narrow screens continue to preserve context.

### Widgets

Widgets remain optional modules, not a permanent dashboard wall.

- retain docking/floating capability;
- headers become more compact and consistent;
- minimise unnecessary card radii and heavy frames;
- content density should be determined by the widget's task;
- important named objects should open through shared Atlas actions;
- Recent Notes, Active Now, Milestones and similar modules should follow the same actionable-object contract as Projects and Upcoming where an underlying object exists;
- empty states should expose useful actions in place when appropriate.

Scratch specifically should not dominate the Home screen by default. Its visual weight should reflect its role as a quick utility surface.

### Area / Topic workspaces

- workspace identity and current context should be clearer than panel chrome;
- Projects, Next Moves, Milestones, Recent Notes and Topics should use one panel/action grammar;
- preserve in-place create actions from `workspace-actions.js`;
- do not route ordinary edits back through the structural editor unnecessarily.

### Project Workspace

Project work should read as a focused operational brief, not a generic form.

Priority hierarchy:

1. project identity / state;
2. Objective;
3. Next Move;
4. Tasks / Milestones;
5. metadata.

Rich document capabilities remain intact. Folded task/milestone sections should feel integrated with the project rather than separate admin widgets.

### Note editor

The document is the primary instrument.

Target hierarchy:

- compact command/title bar;
- quiet metadata strip for Type / Area / Topic;
- compact formatting rail;
- large document canvas;
- secondary metadata such as Tags / Map below or progressively disclosed.

On iPad, the editor should allocate the overwhelming majority of visual attention to writing rather than form fields and toolbar borders.

Do not reduce touch target sizes to achieve visual compactness.

### Capture

Capture remains a transient creation surface.

- maintain context inheritance;
- preserve the aligned direct-create routes;
- reduce consumer-card styling where possible;
- type choices remain quickly scannable and touch-friendly;
- no new creation behaviour should bypass the shared Atlas action layer.

### Command palette

The command palette can retain more depth than inline surfaces because it is a temporary overlay.

Refine toward Ops by:

- slightly harder structural hierarchy;
- less generic rounded SaaS treatment;
- consistent result states and metadata styling;
- preserve keyboard behaviour and mobile usability.

### Menus / popovers / dialogs

Use one family for temporary surfaces:

- opaque or near-opaque enough for legibility;
- restrained shadow;
- consistent radius and rule treatment;
- same menu row height/state language;
- Escape and outside-click behaviour preserved;
- no essential action hidden behind hover-only interaction.

### Atlas Lock

The v0.16.7 lock identity is preserved as the strongest current expression of Atlas restraint.

Ops refinement should only align its typography/tokens with the in-app system where beneficial. Do not alter PIN verification, recovery or lockout behaviour.

## Density and hierarchy targets

Relative to current night Atlas:

- reduce border prominence approximately 15–20% where separation can be achieved through spacing/surface tone;
- reduce oversized title hierarchy, especially the Home wordmark treatment;
- increase intentional whitespace around primary instruments;
- reduce all-caps/mono use in ordinary controls;
- keep status/meta text compact but readable on iPad;
- avoid shrinking interactive hit areas below current touch-friendly behaviour.

These are design targets, not blanket CSS percentage transforms.

## Responsive principles

### iPad landscape

Primary reference viewport for first Ops pass.

- header should remain one coherent command area;
- Network receives the majority of usable height/width;
- optional widgets should not squeeze the graph unless deliberately docked;
- Split remains horizontal at suitable widths;
- editor prioritises document space.

### iPad portrait

- controls collapse progressively;
- secondary telemetry can compress or hide before core navigation/actions;
- Split follows the existing vertical contract;
- temporary surfaces must fit inside dynamic viewport height.

### iPhone

- no desktop hover dependency;
- essential actions remain reachable by touch;
- minimap may hide or reduce to a small orientation affordance;
- menus/popovers must not render off-screen;
- editors use sticky/compact action bars only when they do not obscure content.

## First implementation slice

The first Ops implementation should be deliberately narrow and reversible.

Target surfaces:

1. Ops token layer for `day` and `night`;
2. shell/header refinement;
3. Home/network frame and view selector;
4. network Controls presentation;
5. initial widget header/frame standardisation;
6. live network minimap prototype;
7. no editor/workspace/capture restyle yet except where shared tokens safely improve them.

This slice establishes the visual grammar before broader propagation.

## CSS strategy

Do not consolidate historical CSS during the first visual pass.

Preferred approach:

- add a late-loaded Ops visual-system stylesheet;
- add only the minimum JS needed for skin attributes and genuinely new behaviour such as the minimap;
- use semantic variables/tokens rather than repeated literal colours;
- scope Ops overrides so existing `day` / `night` identifiers remain stable;
- migrate surface families incrementally;
- perform CSS deletion/consolidation only as a later visual-regression task.

The first Ops layer must not attempt to rewrite the historical `app.css` cascade wholesale.

## Persistence and sync

A future skin setting should be additive, e.g. presentation state such as `state.settings.skin='ops'`, with a safe default for existing installs.

Before implementation, verify whether it is preferable to store the skin in the existing local settings object or a presentation-specific local preference. Do not include it in `canonical_state_v1` unless a separate decision explicitly makes appearance roam across devices.

Persisted `day` and `night` names must remain unchanged.

## Accessibility / interaction contract

Every Ops change must preserve:

- keyboard access where it exists;
- touch-first usability;
- visible focus states;
- readable contrast;
- direct manipulation of Split/dividers/graph;
- Escape/back/close behaviour;
- recoverability and no mystery state;
- one underlying action for the same Atlas object across graph/list/search/widget surfaces.

The acceptance question remains:

> Would a reasonable user ask: why can't I just…?

## Non-goals for the first Ops pass

- no backend rewrite;
- no canonical schema expansion;
- no graph-physics redesign;
- no wholesale CSS cleanup;
- no Frost implementation yet;
- no animation-heavy HUD effects;
- no decorative fake telemetry;
- no permanent wall of widgets;
- no new framework.

## Proposed implementation sequence

1. Add a scoped Ops token/component layer and skin hook.
2. Refine header/shell at iPad landscape first, then desktop/phone breakpoints.
3. Refine network viewport metadata, selector and Controls.
4. Add the network minimap from existing graph/camera state.
5. Standardise widget framing and make named-object widgets route through shared actions.
6. Validate Nodes / List / Split / Predict responsive behaviour.
7. Apply the Ops component language to Area/Topic workspaces.
8. Apply it to Project Workspace and Note Editor.
9. Align Capture, Command and remaining temporary surfaces.
10. Only after visual stability, consider historical CSS consolidation as a separate regression task.

## Release discipline

Implementation must follow:

current `main` → feature branch → changes → smoke gate → PR → review → merge.

Any new offline-critical stylesheet/script/image must be added to the service-worker app shell and the bootstrap/cache versions must be bumped in lockstep.
