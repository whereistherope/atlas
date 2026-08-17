# Atlas Sync foundation

## v0.12.4 boundary

Atlas remains local-first. The existing IndexedDB record is the current source of truth and the cloud layer does not upload, migrate, seed, restore, or synchronize Atlas content. Supabase supplies authenticated cloud infrastructure only: email/password sign-in, session handling, and a read-only RLS access check.

Atlas Lock and Supabase Auth are independent. Atlas Lock protects the local application/device using its existing PIN, recovery, throttling, session-unlock, and idle-lock behavior. Supabase Auth identifies a cloud user; the official browser client persists and refreshes its own session. Neither system replaces or unlocks the other.

The v0.12.4 feature is strictly Me-only. Local `me` may verify the owned cloud `me` person profile. Alyssa and Us remain entirely local-only. The existing shared cloud `us` row is deliberately dormant: this feature neither queries, displays, modifies, nor synchronizes it. There is no Entangle cloud behavior and no content sync yet.

## Client and security boundary

The client uses the official Supabase JavaScript v2 browser/UMD distribution through jsDelivr’s supported package entry point, pinned exactly to `2.111.0`. The CDN script is optional and excluded from the offline application shell; its failure cannot block classic-script bootstrap. The local config contains the project URL and an `sb_publishable_` key, both intentionally browser-public. Privileged keys—including secret and service-role credentials—are forbidden from client code.

RLS remains the authorization boundary. `AtlasCloud.testAccess()` obtains the authenticated user, reads the unique RLS-visible `Atlas` vault whose `created_by` matches that user, then queries `atlas_profiles` specifically for `profile_key = me`, `kind = person`, the authenticated `owner_user_id`, and that visible vault. The result is verified across both queries. The operation is read-only.

Existing cloud tables are `atlas_vaults`, `atlas_vault_members`, `atlas_profiles`, and `atlas_records`. v0.12.4 does not write to any of them and does not query `atlas_records`.

## Failure behavior

Offline, CDN-unavailable, authentication, session, and Supabase errors are contained inside `AtlasCloud`. Bootstrap does not await cloud initialization, there is no polling or retry loop, and the Sync widget reports a restrained local/offline/error state. All existing local profiles and features remain usable.

## Staged roadmap

1. Me-only connection/auth — v0.12.4.
2. Safe Me-only cloud backup.
3. Safe Me-only cloud restore/pull.
4. Two-way Me sync and conflict handling.
5. Cross-device validation.
6. Design Alyssa, Us, and Entangle separately later.
7. Relay authenticated transport.
8. AI-backed Predict later.
