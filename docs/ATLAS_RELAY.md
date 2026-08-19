# Atlas Relay — local receptor (Envelope v1)

Relay is the validated local mutation boundary for v0.12.8 automatic **Send to Atlas**. The isolated cloud transport is strictly Me-only and uses explicit user intent from ChatGPT; Alyssa and Us remain local-only. Local IndexedDB remains authoritative, and Relay is not general cloud sync.

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

`version`, `relayId`, `operation`, `profileId`, `target`, and `content` are required. Supported nondestructive operations are `create_note`, `append_note`, and `create_area`. The local receptor preserves the persisted profile IDs `me`, `alyssa`, and `us` for compatibility and diagnostics, but v0.12.8 isolated cloud ingress accepts only `me`. Relay never changes the active profile or searches another profile. `threadKey` is optional source metadata and is the durable semantic thread identifier. A provider conversation ID is not a routing key.

## Create and append semantics

`create_note` requires an exact route or an explicit Inbox/unlinked request (`target.inbox: true`, or `areaId: "inbox"`/`"unlinked"`). It creates an ordinary entry in `state.notes`, including normal type, tags, map visibility, profile, area/topic, space, and timestamps.

`append_note` resolves an exact `noteId` first. Otherwise it requires an exact title and exactly one match in the supplied profile and explicit target context. Zero or multiple matches are rejected. Body text is joined with one blank line, tags are unioned case-insensitively, and `updatedAt` is refreshed. The existing route is retained unless target routing was explicitly supplied.

## Create area semantics

`create_area` requires `content.name` and an exact parent ID, code, or unique case-insensitive name, or an explicit Atlas root. It creates an ordinary area using the existing profile, parent, level, inherited space, code, and map-position semantics. An optional `content.initialNote` creates an ordinary linked note. Existing area positions and unrelated content are not reset.

## Target resolution and isolation

Areas/topics accept an exact persisted ID or code. An exact human name is accepted only when unique within the supplied profile. A topic must be the area itself or its structural descendant. Unknown, ambiguous, cross-profile, and structurally invalid targets reject the entire envelope before mutation; Relay never guesses or silently falls back to Inbox.

## Idempotency ledger, receipts, and provenance

An accepted instruction stores a compact deterministic request fingerprint in the additive `state.relayLedger`, keyed by `relayId`. The fingerprint covers the meaningful resolved operation, profile, target and content plus durable provider/thread metadata; volatile sent/received time is excluded. An exact retry returns the accepted result without writing again. Reusing an ID with changed profile, operation, target, or content is rejected as a Relay ID conflict. Validation always runs before a retry can be accepted.

`state.relayReceipts` is separate human-readable history and retains only the newest 200 entries. Removing a receipt from that bounded list does not remove its durable ledger entry or permit redelivery. Receipts contain the Relay ID, receipt time, profile, operation, resulting record ID, semantic thread key, provider, fingerprint, and accepted status. Version-7 receipts without fingerprints migrate conservatively into the ledger: because their original request cannot be reconstructed, reuse is rejected rather than guessed.

Created notes hold `relaySource`; appended notes hold a bounded `relaySources` history. Provenance includes Relay ID, provider, thread key, sent time, and received time and does not alter the displayed note body. Existing notes do not require these optional fields.

## Automatic isolated ingress (v0.12.8)

Me can configure a Relay Access Key, stored separately in the existing IndexedDB auth store and excluded from Atlas state, exports, and cloud backups. While Atlas is visible and online it calls only `fetch_atlas_relay` and `ack_atlas_relay` in the isolated Atlas Relay Supabase project, checking immediately after local state loads and approximately every five seconds thereafter. Valid instructions are ingested without a second approval. Invalid or ambiguous instructions are rejected safely and retained in local Relay activity. Alyssa and Us remain local only; this ingress is not cloud sync and does not alter the main backup/restore connection.
