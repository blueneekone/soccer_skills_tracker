# SafeSport Communications Matrix

> **Disclaimer:** This document maps **SSTracker platform controls** to our **product policy**. It does **not** claim official certification or endorsement by the U.S. Center for SafeSport. Club compliance officers should validate against their governing body requirements.

**North star policy:** [`docs/vision/COMMS_HUB.md`](./vision/COMMS_HUB.md) — household-only adult↔minor interactive messaging.

**Channel registry & delivery contract:** [`docs/vision/COMMS_CHANNEL_CANON.md`](./vision/COMMS_CHANNEL_CANON.md) §3–§6 (Epic 4.13a–4.16d **shipped**).

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

## VPC consent gates (shipped)

| Consent field | VPC UI | Server enforcement | Skip reason |
|---------------|--------|-------------------|-------------|
| `consentComms` | Optional checkbox on `/parent/vpc` | `filterParentsWithCommsConsent` on broadcasts, Parent Lounge CC, push fan-out | `consent_comms_declined` |
| `consentSponsor` | Optional checkbox (separate from comms) | `filterParentsWithSponsorConsent` — requires **both** sponsor + comms (4.16c) | `consent_sponsor_declined` |

**Onboarding (4.16d):** `consentComms` defaults **false** (legal/product choice). [`ParentCommsConsentBanner.svelte`](../src/lib/components/parent/ParentCommsConsentBanner.svelte) on `/parent/dashboard` prompts opt-in → `/parent/vpc`.

---

## Platform control map (current — April 2026)

| Control | Location | Behavior |
|---------|----------|----------|
| **Rule of Three / broadcast** | [`functions/comms.js`](../functions/comms.js) — `safeSportBroadcast`, `clubSportBroadcast`, `emergencyClubBroadcast` | Parent-first `deliveryReport`; consent-filtered delivery; ack metadata when `requiresAck` (4.16b) |
| **Coach→player 1:1** | [`functions/src/domains/operativeOps.js`](../functions/src/domains/operativeOps.js) — `sendCoachPlayerMessage` | **Blocked** for minors; adult-only direct mail |
| **Monitored channels** | `sendChannelMessage` + `commsChannelOps` | Parent Lounge + staff_internal; server-only writes when `safesportMonitored` |
| **`messaging_audit`** | Firestore + callables | Immutable metadata; director compliance export (4.9) |
| **Broadcast read/ack** | [`broadcastAckOps.js`](../functions/src/domains/broadcastAckOps.js) | Parent `acknowledgeBroadcast`; staff `getBroadcastAckStatus` rollup |
| **Sponsor digests** | [`sponsorPartnerOps.js`](../functions/src/domains/sponsorPartnerOps.js) | Director-approved templates only; no sponsor login; no minor recipients |
| **Omnichannel fallback** | [`omnichannelOps.js`](../functions/src/domains/omnichannelOps.js) | Email (`commsEmailFallback` flag); emergency SMS (`commsSmsEmergency` flag); merged on `deliveryReport` |
| **Clearance gate** | [`docs/CLEARANCE.md`](./CLEARANCE.md), JWT / route policies | Coach/director clearance for PII-adjacent roles |
| **Household gate** | `households`, `sendHouseholdMessage` | Parent↔operative threads (4.11) |

---

## Firestore & rules pointers

| Collection | Rules block | Purpose |
|------------|-------------|---------|
| `in_app_messages` | `firestore.rules` | Coach→player mail (adult), household threads |
| `messaging_audit` | `firestore.rules` | Director compliance read |
| `team_broadcasts` | `firestore.rules` | Broadcast payloads + `parentRecipientEmails` |
| `broadcast_acknowledgements` | `firestore.rules` | Immutable parent ack records (4.16b) |
| `consent_records` | `firestore.rules` | VPC grants; parent read by `parentEmail` (4.16d banner) |
| `device_tokens` | `notificationOps.js` | FCM registry |

Client-direct writes to monitored channels are **blocked** by rules; sends must route through callables.

---

## Resolved gaps (Epic 4)

| Gap | Resolution |
|-----|------------|
| Orphaned `MessagesTab` / `/coach/logistics` 404 | 4.1 Team Ops + hub |
| `sendCoachPlayerMessage` minor DM | 4.2 blocked |
| `consentComms` not enforced | 4.2 server filter + 4.16d onboarding banner |
| Parent `/messages` partial | 4.4 Parent Lounge + 4.13a hub |
| No messaging rules tests | 4.12 `firestoreRulesSprint412` |
| Dual FCM paths | 4.3 `onTeamBroadcastCreated` + 4.16a omnichannel merge |

---

## Callable & module index

| Module | Exports / entry points |
|--------|------------------------|
| [`functions/comms.js`](../functions/comms.js) | `safeSportBroadcast`, `clubSportBroadcast`, `emergencyClubBroadcast`, `reportMessageIncident` |
| [`functions/src/domains/broadcastAckOps.js`](../functions/src/domains/broadcastAckOps.js) | `acknowledgeBroadcast`, `getBroadcastAckStatus` |
| [`functions/src/domains/sponsorPartnerOps.js`](../functions/src/domains/sponsorPartnerOps.js) | `createSponsorTemplate`, `approveSponsorTemplate`, `sendSponsorPartnerDigest` |
| [`functions/src/domains/omnichannelOps.js`](../functions/src/domains/omnichannelOps.js) | SendGrid email + Twilio SMS fallback processors |
| [`functions/src/domains/operativeOps.js`](../functions/src/domains/operativeOps.js) | `sendCoachPlayerMessage`, `sendChannelMessage`, household provisioning |
| [`functions/src/domains/commsChannelOps.js`](../functions/src/domains/commsChannelOps.js) | `postChannelSystemMessage`, Parent Lounge / staff_internal provision |
| [`src/lib/services/comms.svelte.ts`](../src/lib/services/comms.svelte.ts) | Client `CommsEngine` — broadcasts, ack, sponsor callables |

---

## ROADMAP link

Implementation sprints: [`ROADMAP.md`](../ROADMAP.md) — Epic 4 table (**4.1–4.16d Done**).
