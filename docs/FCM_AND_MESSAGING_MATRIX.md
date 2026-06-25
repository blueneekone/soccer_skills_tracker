# FCM & messaging inventory (Epic 5.5)

> **Note:** Full messaging **product** delivery is tracked in **ROADMAP Epic 4** ([`docs/vision/COMMS_HUB.md`](./vision/COMMS_HUB.md)) — **Epic 4.1–4.16d Done**. This doc remains an **infra audit** for Epic 5.5.

Primary implementation: `functions/src/domains/notificationOps.js` (`sendFcmToUids`, `sendMulticast` helpers) with re-exports from `functions/index.js`. Legacy direct `sendMulticast` call sites may still appear in `functions/index.js` for mission/trial triggers.

## Director club broadcast (Epic 4.8 — D-08)

| Layer | Artifact | Role |
|-------|----------|------|
| UI | `DirectorClubBroadcastComposer.svelte` / `CommsClubWideChannel` | Hub + `/director?tab=comms` — subject/body, all teams or subset; calls `CommsEngine.clubBroadcastMessage`. |
| Client | `comms.svelte.ts` | `httpsCallable(..., 'clubSportBroadcast')` in `us-east1`. |
| Callable | `clubSportBroadcast` (`functions/comms.js`) | Director / platform admin only; fans out to one or all club teams via shared `commitTeamBroadcast`. |
| Persist | `commitTeamBroadcast` | Parent-first audience, consent-filtered delivery, `deliveryReport`, `audit_logs`, `team_broadcasts/{msgId}`. |
| Push bus | `onTeamBroadcastCreated` | Firestore create on `team_broadcasts/{msgId}` → FCM via `sendFcmToUids` (`push_announcements`). |
| Omnichannel | `omnichannelOps.js` | Post-FCM email/SMS fallback when feature flags enabled; merges `channels[]` on `deliveryReport` (4.16a). |

**Flow:** Composer → `clubSportBroadcast` → per-team `commitTeamBroadcast` → `team_broadcasts` doc → `onTeamBroadcastCreated` → consent-filtered player + parent UIDs → FCM → optional omnichannel fallback.

Coach team broadcast (`safeSportBroadcast`) and emergency (`emergencyClubBroadcast`) use the same `commitTeamBroadcast` → `onTeamBroadcastCreated` path (emergency adds high-priority FCM + SMS flag path).

## Team broadcast push bus (Epic 4.3 + 4.16a)

| Trigger | Collection | Audience | FCM category |
|---------|------------|----------|--------------|
| `onTeamBroadcastCreated` | `team_broadcasts/{msgId}` create | Consent-filtered parents (`parentRecipientEmails`) + team players (via `player_lookup` → Auth email) | `push_announcements` (high priority when `priority: emergency`) |
| `onDeploymentCalendarEntryCreated` | `deployment_calendar_entries/{entryId}` create | Writes `team_broadcasts` per team (delegates push to row above) | `push_announcements` |

**Omnichannel (4.16a):** After FCM attempt, `processOmnichannelFallbacks` in `omnichannelOps.js` may add `email` or `sms` to `parentDelivered[].channels` when:

- `feature_flags/commsEmailFallback` — SendGrid email for parents with missing push token
- `feature_flags/commsSmsEmergency` — Twilio SMS for `priority: emergency` broadcasts only

Deploy: `npm run deploy:comms-triggers` (or `deploy:comms` bundle).

## Event-driven multicast (legacy / direct)

| Source file | Trigger | Audience | Purpose |
|-------------|---------|----------|---------|
| `notificationOps.js` | `onMissionAssigned` | Athlete (`playerId`) | Push: new training mission → open Armory. |
| `notificationOps.js` | `onAssignmentCreated` | Athlete | Push: drill library assignment. |
| `notificationOps.js` | `onTrialScoreAdded` | Parents (team + player name) | Push: trial score logged for youth. |
| `notificationOps.js` | `onTrialScoreWritten` (verified) | Athlete (`playerId`) | Push: video trial verified on global profile. |
| `facilityWeatherWebhook.js` | Tomorrow.io webhook | Facility staff tokens | Lightning lockdown alert (optional integration). |
| `carRideOps.js` | Car-ride home push | Household | Ride coordination notification. |

## Device tokens

- Collection **`device_tokens`** — registry for FCM; `collectFcmTokensForUids` + `registerDeviceToken` callable (`notificationOps.js`).
- Multicast batches chunk at **500** tokens per `sendMulticast` call.

## Triad / minors / SafeSport

- **Coach → player** messaging is mediated by callables (`sendCoachPlayerMessage` / channel repair) — minors blocked; adult-only direct mail.
- Broadcast parents are filtered at write time (`filterParentsWithCommsConsent`) and re-validated in `onTeamBroadcastCreated` (defence in depth).
- Sponsor digests (4.16c) require `consentSponsor` **and** `consentComms` — never delivered to minor accounts.

## Firestore rules pointers

- **`team_broadcasts`**: coach/director write scope — see `firestore.rules` + `firestoreRulesSprint412.test.ts`.
- **`broadcast_acknowledgements`**: parent immutable ack — 4.16b.
- **`in_app_messages`**: director club scope, coach team scope, household threads.
- **`messaging_audit`**: director read when `teamId` maps to tenant club.
- **`consent_records`**: parent read by `parentEmail` for onboarding banner (4.16d).

## Gap register (closure)

| Id | Status | Notes |
|----|--------|-------|
| **D-08** | **Shipped** | Director broadcast composer + `clubSportBroadcast` + `onTeamBroadcastCreated` push fan-out (Epic 4.8 / 4.3). |
| **D-09** | **Shipped** | Omnichannel email/SMS fallback behind feature flags (Epic 4.16a). |
| **D-06** | **Doc sync** | `TOMORROW_IO_API_KEY` is **optional** strike-radius enrich on AEGIS (Open-Meteo + NWS); not required for weather lock or FCM. See [`WEATHER_LOCK_DESIGN.md`](./WEATHER_LOCK_DESIGN.md). |
