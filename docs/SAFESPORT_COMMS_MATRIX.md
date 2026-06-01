# SafeSport Communications Matrix

> **Disclaimer:** This document maps **SSTracker platform controls** to our **product policy**. It does **not** claim official certification or endorsement by the U.S. Center for SafeSport. Club compliance officers should validate against their governing body requirements.

**North star policy:** [`docs/vision/COMMS_HUB.md`](./vision/COMMS_HUB.md) — household-only adult↔minor interactive messaging.

---

## Policy model vs. legacy code

| Concept | SafeSport industry guidance | SSTracker 4.0 charter *(stricter)* |
|---------|----------------------------|-------------------------------------|
| Rule of Three | Avoid isolated adult↔minor contact; include another adult or parent visibility | **No coach→minor 1:1** at all; staff use **parent-targeted** channels |
| Parent visibility on minor messages | CC parent on coach→minor DMs | **Superseded** — minor does not receive staff interactive inbox |
| Group / team messaging | Preferred for team-wide info | **Announcements** + Parent Lounge; minors via HQ/calendar |
| Household messaging | Not specified by SafeSport directly | **Allowed:** parent↔linked operative only (`householdId` gate) |

Epic 2 Sprint 2.3 (*SafeSport messaging CC*) is **absorbed into Epic 4** — see [`ROADMAP.md`](../ROADMAP.md).

---

## Platform control map

| Control | Location | Current behavior | Target (Epic 4) |
|---------|----------|------------------|-----------------|
| **Rule of Three / broadcast CC** | [`functions/comms.js`](../functions/comms.js) — `safeSportBroadcast` | Team-scoped broadcast; auto-CC parents when minors on roster | Primary **announcement** path; parent-targeted |
| **Coach→player 1:1** | [`functions/src/domains/operativeOps.js`](../functions/src/domains/operativeOps.js) — `sendCoachPlayerMessage` | Writes `in_app_messages`; CCs parents when `minorRecipient` | **Block** coach→minor — Sprint 4.2 |
| **Monitored channels** | `operativeOps.js` — `sendChannelMessage` | Server-enforced membership + `messaging_audit` for `safesportMonitored` channels | Unify with Parent Lounge — Sprint 4.2 |
| **`messaging_audit`** | Firestore + callables | Immutable metadata on coach_player_message, channel sends | Compliance console export — Sprint 4.9 |
| **`consentComms`** | [`src/routes/(app)/parent/vpc/+page.svelte`](../src/routes/(app)/parent/vpc/+page.svelte) | VPC checkbox captured; **not enforced** on send paths | Enforce on all push/message delivery — Sprint 4.2 |
| **Clearance gate** | [`docs/CLEARANCE.md`](./CLEARANCE.md), JWT / route policies | Coach/director clearance for PII-adjacent roles | Required before staff send surfaces — existing + 4.1 |
| **Household gate** | `users.householdId`, `households` collection | Provisioning in operativeOps; used for parent CC resolution | Household **threads** — Sprint 4.11 |

---

## Firestore & rules pointers

| Collection | Rules block | Purpose |
|------------|-------------|---------|
| `in_app_messages` | `firestore.rules` ~1888 | Coach→player mail, parent CC lists |
| `messaging_audit` | `firestore.rules` ~1908 | Director compliance read |
| `team_broadcasts` | `firestore.rules` ~2568 | `safeSportBroadcast` payloads |
| `device_tokens` | `functions/index.js` ~7447+ | FCM registry (dual-path gap — see below) |

Client-direct writes to monitored channels are **blocked** by rules; sends must route through `sendChannelMessage`.

---

## Known gaps (audit — April 2026)

| Gap | Impact | Epic sprint |
|-----|--------|-------------|
| **Orphaned `MessagesTab`** | **Resolved (4.1)** — mounted on [`/coach/logistics`](../src/routes/(app)/coach/logistics/+page.svelte) | — |
| **`/coach/logistics` 404** | **Resolved (4.1)** — route + `ParentAnnouncementCompose` | — |
| **Dual FCM paths** | Event multicast in `index.js` vs. `device_tokens` / comms callables — no unified bus | 4.3 |
| **No messaging tests** | No `firestoreRulesSprint4*.test.ts` or callable integration tests for comms | 4.12 |
| **`sendCoachPlayerMessage` still allows minor DM** | **Resolved (4.2)** — minors blocked; adult-only direct mail | — |
| **`consentComms` not enforced** | **Resolved (4.2)** — filtered on broadcast CC + monitored channel CC repair | — |
| **Parent `/messages` partial** | [`src/routes/(app)/messages/+page.svelte`](../src/routes/(app)/messages/+page.svelte) — CC inbox only; no Parent Lounge | 4.4 |

Inventory reference: [`docs/FCM_AND_MESSAGING_MATRIX.md`](./FCM_AND_MESSAGING_MATRIX.md)

---

## Callable & module index

| Module | Exports / entry points |
|--------|------------------------|
| [`functions/comms.js`](../functions/comms.js) | `safeSportBroadcast`, `safeSportVerify` |
| [`functions/src/domains/operativeOps.js`](../functions/src/domains/operativeOps.js) | `sendCoachPlayerMessage`, `sendChannelMessage`, household provisioning |
| [`functions/index.js`](../functions/index.js) | Re-exports comms handlers; FCM triggers (~7642+) |
| [`src/lib/services/comms.svelte.ts`](../src/lib/services/comms.svelte.ts) | Client wrapper for `safeSportBroadcast` |

---

## ROADMAP link

Implementation sprints: [`ROADMAP.md`](../ROADMAP.md) — Epic 4 table. Sprint **4.0** (this doc + COMMS_HUB) is **documentation only**.
