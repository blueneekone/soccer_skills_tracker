# Comms Platform Standards — Agent Authority

**Authority:** All Epic 4+ comms slices · **Extends** [`COMMS_CHANNEL_CANON.md`](./COMMS_CHANNEL_CANON.md) (registry + delivery) · **Does not replace** [`COMMS_HUB.md`](./COMMS_HUB.md) (policy north star) · **Control map:** [`SAFESPORT_COMMS_MATRIX.md`](../SAFESPORT_COMMS_MATRIX.md)

> **For comms agents:** Read this document **before** any comms edit. Then read [`COMMS_CHANNEL_CANON.md`](./COMMS_CHANNEL_CANON.md) §3–§6 and the current ROADMAP comms sprint row.

---

## 1. North star

SSTracker is a **SafeSport-native club workspace** for youth sports communications — typed channels scoped by club hierarchy, honest delivery semantics, and household-gated minor interactivity. It is **not Discord for minors**: no always-on social graph, no user-created rooms, no coach→minor 1:1 interactive inbox.

Staff reach families through **parent-targeted** surfaces (announcements, Parent Circle, parent↔coach DM). Minors consume schedule and team context through **Player HQ / calendar UI** and **household threads** only.

---

## 2. Borrowed patterns (take / do-not-take)

| Platform | Take | Do **not** take |
|----------|------|-----------------|
| **TeamReach / GroupMe** | Team-scoped broadcast lists; schedule-driven push; parent-first audience | Open member invites; arbitrary group creation; minor accounts in group chat |
| **Discord** | Channel **type** mental model; unread badges; threaded context within typed rooms | User-created servers/channels; always-on voice for youth; minor DMs with staff; public discoverability |
| **Microsoft Teams** | Space hierarchy (club → program → team); staff vs family separation; calendar-linked announcements | Enterprise free-form chat; external guest threads without audit |
| **Slack** | Delivery receipts / read-state transparency for staff sends | Workspace sprawl; cross-club DMs; bot-first UX for parents |

**SSTracker synthesis:** Typed, provisioned channels + SafeSport gates + parent-first `deliveryReport` on every staff send.

---

## 3. Three axes: Space → Category → Modality

Every comms surface is classified on three axes before implementation:

| Axis | Definition | Examples |
|------|------------|----------|
| **Space** | Tenant + hierarchy scope where the channel instance lives | Club, program/season, team, household |
| **Category** | UX grouping in the hub rail — what job the channel does | Families · Game day · Logistics · Staff · Club ops (see [`COMMS_UX_NAV_SPEC.md`](./COMMS_UX_NAV_SPEC.md)) |
| **Modality** | How messages are delivered and consumed | In-app stream · push · email fallback · SMS (emergency only) · calendar mirror · `.ics` export |

**Rule:** A new feature must name all three axes. If it cannot map to an existing `type_id` in [`COMMS_CHANNEL_CANON.md`](./COMMS_CHANNEL_CANON.md) §3, it requires vision + ROADMAP approval before code.

---

## 4. Locked policies

### 4.1 Parent Circle (`parent_lounge`)

| Rule | Detail |
|------|--------|
| **Who posts** | **Parents only** (parents post only) — parent↔parent discussion in a monitored group |
| **Staff role** | **Monitor via export** — coaches and directors do **not** post in Parent Circle; they use announcements + parent↔coach DM |
| **Minor visibility** | **None** — minors never join Parent Circle |
| **Reply model** | Threaded group; server-enforced `safesportMonitored` |
| **Product name** | **Parent Circle** (display) · `parent_lounge` (type_id) |

### 4.2 Parent↔coach DM (`parent_coach_dm`)

| Rule | Detail |
|------|--------|
| **Default (Option A)** | **Bilateral** — parent + assigned coach only |
| **AD opt-in** | Club setting `includeAdOnParentDms` grants **director read-only** access with a **disclosure banner** visible to parent and coach |
| **Minor visibility** | **None** — this is a staff↔parent path, never coach→minor |
| **Status** | **Shipped** — COMMS-PARENT-COACH-DM (`parentCoachDmOps.js`) |

### 4.3 Voice (`parent_voice_session`)

| Rule | Detail |
|------|--------|
| **Purpose** | Scheduled **parent info sessions** — coach Q&A, registration briefings, season kickoff |
| **Participants** | **Coaches + parents only** — **NO minors** |
| **v1 scope** | **Metadata audit only** — schedule, roster of joiners, duration; no in-app WebRTC in v1 |
| **Recording** | **Separate sprint** — requires disclosed consent workflow; not bundled with v1 metadata |
| **Status** | **Shipped** — COMMS-VOICE-V1 (`parentVoiceSessionOps.js`) |

### 4.4 Partner offers (`sponsor_partner`)

| Rule | Detail |
|------|--------|
| **Not a hub chat rail** | Partner offers are **director ops + parent dashboard strip** — not an interactive sponsor chat room |
| **Delivery** | Director-approved templates; `consentSponsor` + `consentComms` dual VPC gate |
| **Minors** | Never recipients |

### 4.5 Universal locks (non-negotiable)

- **No coach→minor 1:1 DM** — blocked at callable + rules; use announcements + HQ intent mirror
- **No minor voice** — voice sessions are parent+coach only
- **No user-created channels** — platform provisions instances from §3 registry only
- **Every staff send returns `deliveryReport`** — UI renders [`DeliveryReceipt`](../../src/lib/components/comms/DeliveryReceipt.svelte); never "roster member" copy when CTA is "Send to parents"
- **`consentComms` gates push/in-app** — skipped parents surface `consent_comms_declined` in receipt

---

## 5. Delivery contract

Normative schema and reason codes: [`COMMS_CHANNEL_CANON.md`](./COMMS_CHANNEL_CANON.md) **§6**.

Client rules (summary):

1. Show `parentDelivered.length` and `parentSkipped` breakdown — not roster athlete count alone
2. Partial delivery = success with amber receipt
3. Omnichannel channels (`in_app`, `push`, `email`, `sms`) appear on `parentDelivered[].channels`

---

## 6. Drift prevention checklist

Before marking any comms slice Done, verify:

- [ ] `src/lib/comms/channelTypes.ts` **shipped** `type_id` rows match [`COMMS_CHANNEL_CANON.md`](./COMMS_CHANNEL_CANON.md) §3 (planned rows exempt until implementation sprint)
- [ ] Every new staff send callable returns `deliveryReport` per §6
- [ ] Compose surfaces use `DeliveryReceipt` — no roster-member-only success copy
- [ ] No coach→minor 1:1 path introduced
- [ ] No user-created channel provisioning
- [ ] Parent Circle remains **parents-post-only**; staff uses announcements + `parent_coach_dm`
- [ ] Partner content stays template/digest — not hub chat rail
- [ ] Extend `commsPhase*.test.ts` / `commsClose.test.ts` / `firestoreRulesSprint412.test.ts` — never delete prior regression tests
- [ ] Max **5 files** per slice unless ROADMAP lists more
- [ ] Do **not** refactor `teamsStore` for mission dedup — use `deduplicateById` in `ActiveBounties`

---

## 7. Explicit non-goals

- Discord/Slack clone for minors or always-on youth social graph
- Coach→minor interactive inbox (including "CC parent" minor DM model — superseded by Epic 4)
- Sponsor or partner interactive chat rooms in `/messages`
- In-app WebRTC voice for v1 (`parent_voice_session` metadata-only first)
- User-created channels, cross-club stranger DMs, unmoderated external messaging
- Claiming official U.S. Center for SafeSport certification
- Recording voice sessions without a dedicated consent sprint

---

## 8. Related document index

| Document | Role |
|----------|------|
| [`COMMS_CHANNEL_CANON.md`](./COMMS_CHANNEL_CANON.md) | Channel Type Registry §3, delivery contract §6, permission matrix §5 |
| [`COMMS_HUB.md`](./COMMS_HUB.md) | Policy north star, notification categories, persona handoffs |
| [`COMMS_UX_NAV_SPEC.md`](./COMMS_UX_NAV_SPEC.md) | Space picker, categories, collapse/mobile rules (PS-X01 nav 2.0) |
| [`COMMS_CALENDAR_INTEGRATION.md`](./COMMS_CALENDAR_INTEGRATION.md) | Event canonical → calendar + broadcast + push + `.ics` |
| [`SAFESPORT_COMMS_MATRIX.md`](../SAFESPORT_COMMS_MATRIX.md) | Platform control map, callable index |
| [`FCM_AND_MESSAGING_MATRIX.md`](../FCM_AND_MESSAGING_MATRIX.md) | Push bus inventory |
| [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) | Persona boundaries |
| [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) | PS-X01 `/messages` |
| [`ROADMAP.md`](../../ROADMAP.md) | Sprint delivery tracker |
