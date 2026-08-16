# Atlas Relay — local receptor (Envelope v1)

Relay is the boundary through which a future trusted transport can ask Atlas to create or append a normal note. In v0.12.3 it is **local only**: it makes no network request and **does not yet allow ChatGPT to write directly into Atlas**. A backend or MCP adapter remains future work.

## Receiving interface

The ordered classic script `js/relay.js` exposes one frozen browser global:

- `AtlasRelay.validate(envelope)` checks the contract and target without writing.
- `AtlasRelay.preview(envelope)` resolves the target and returns a readable plan without writing.
- `await AtlasRelay.ingest(envelope)` repeats validation, applies one note mutation, records a receipt, and saves through normal Atlas persistence.

Incoming strings are treated as untrusted text. Relay never evaluates content, inserts it as HTML, or stores credentials.

## Relay Envelope v1

```json
{
  "version": 1,
  "relayId": "globally-unique-message-id",
  "operation": "create_note",
  "profileId": "me",
  "target": {
    "areaId": "quantum-story",
    "topicId": "decoherence",
    "noteId": null,
    "noteTitle": null
  },
  "content": {
    "title": "Decoherence and public normalisation",
    "body": "Note content...",
    "type": "idea",
    "tags": ["Quantum Story", "Decoherence"],
    "showOnMap": false
  },
  "source": {
    "provider": "chatgpt",
    "threadKey": "creative/quantum-story",
    "sentAt": "2026-08-17T00:00:00Z"
  }
}
```

`version`, `relayId`, `operation`, `profileId`, `target`, and `content` are required. Supported operations are only `create_note` and `append_note`. Profiles are the persisted IDs `me`, `alyssa`, and `us`; Relay never changes the active profile or searches another profile. `threadKey` is optional source metadata and is the durable semantic thread identifier. A provider conversation ID is not a routing key.

## Create and append semantics

`create_note` requires an exact route or an explicit Inbox/unlinked request (`target.inbox: true`, or `areaId: "inbox"`/`"unlinked"`). It creates an ordinary entry in `state.notes`, including normal type, tags, map visibility, profile, area/topic, space, and timestamps.

`append_note` resolves an exact `noteId` first. Otherwise it requires an exact title and exactly one match in the supplied profile and explicit target context. Zero or multiple matches are rejected. Body text is joined with one blank line, tags are unioned case-insensitively, and `updatedAt` is refreshed. The existing route is retained unless target routing was explicitly supplied.

## Target resolution and isolation

Areas/topics accept an exact persisted ID or code. An exact human name is accepted only when unique within the supplied profile. A topic must be the area itself or its structural descendant. Unknown, ambiguous, cross-profile, and structurally invalid targets reject the entire envelope before mutation; Relay never guesses or silently falls back to Inbox.

## Idempotency ledger, receipts, and provenance

An accepted instruction stores a compact deterministic request fingerprint in the additive `state.relayLedger`, keyed by `relayId`. The fingerprint covers the meaningful resolved operation, profile, target and content plus durable provider/thread metadata; volatile sent/received time is excluded. An exact retry returns the accepted result without writing again. Reusing an ID with changed profile, operation, target, or content is rejected as a Relay ID conflict. Validation always runs before a retry can be accepted.

`state.relayReceipts` is separate human-readable history and retains only the newest 200 entries. Removing a receipt from that bounded list does not remove its durable ledger entry or permit redelivery. Receipts contain the Relay ID, receipt time, profile, operation, resulting record ID, semantic thread key, provider, fingerprint, and accepted status. Version-7 receipts without fingerprints migrate conservatively into the ledger: because their original request cannot be reconstructed, reuse is rejected rather than guessed.

Created notes hold `relaySource`; appended notes hold a bounded `relaySources` history. Provenance includes Relay ID, provider, thread key, sent time, and received time and does not alter the displayed note body. Existing notes do not require these optional fields.

## Local manual test

1. Open **Widgets → Relay**.
2. Confirm the state reads **LOCAL** and “External link not configured”.
3. Select **Receive test**, paste an Envelope v1 JSON object, and select **Preview**. Editing the JSON after preview clears the acceptance state and requires another preview.
4. Review the resolved profile, route, note/title, and tags.
5. Select **Accept**. Confirm the note appears in normal Notes/List/Nodes surfaces as applicable and the receipt appears in Relay after reload.

## Future transport boundary

A later authenticated backend/MCP transport may call this same preview/ingest boundary. That work must provide authentication, authorisation, replay controls, delivery, and user consent outside this module. v0.12.3 includes no API key, OAuth flow, webhook, cloud database, MCP credential, external fetch, reverse retrieval, or direct ChatGPT connectivity.
