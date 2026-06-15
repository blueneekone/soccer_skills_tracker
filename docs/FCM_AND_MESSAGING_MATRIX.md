# FCM & messaging inventory (Epic 5.5)

> **Note:** Full messaging **product** delivery is tracked in **ROADMAP Epic 4** ([`docs/vision/COMMS_HUB.md`](./vision/COMMS_HUB.md)). This doc remains an **infra audit** for Epic 5.5.

Primary implementation: `functions/src/domains/notificationOps.js` (`sendFcmToUids`, `sendMulticast` helpers) with re-exports from `functions/index.js`. Legacy direct `sendMulticast` call sites may still appear in `functions/index.js` for mission/trial triggers.

## Director club broadcast (Epic 4.8 — D-08)

| Layer | Artifact | Role |
|-------|----------|------|
| UI | `DirectorClubBroadcastComposer.svelte` | `/director?tab=comms` — subject/body, all teams or subset; calls `CommsEngine.clubBroadcastMessage`. |
| Client | `comms.svelte.ts` | `httpsCallable(..., 'clubSportBroadcast')` in `us-east1`. |
| Callable | `clubSportBroadcast` (`functions/comms.js`) | Director / platform admin only; fans out to one or all club teams via shared `commitTeamBroadcast`. |
| Persist | `commitTeamBroadcast` | SafeSport minor detection, consent-filtered `ccParentEmails`, `audit_logs`, `team_broadcasts/{msgId}` with `bodyPreview`. |
| Push bus | `onTeamBroadcastCreated` | Firestore create on `team_broadcasts/{msgId}` → FCM via `sendFcmToUids` (`push_announcements`). |

**Flow:** Composer → `clubSportBroadcast` → per-team `commitTeamBroadcast` → `team_broadcasts` doc → `onTeamBroadcastCreated` → consent-filtered player + parent UIDs → FCM.

Coach team broadcast (`safeSportBroadcast`) uses the same `commitTeamBroadcast` → `onTeamBroadcastCreated` path without club fan-out.

## Team broadcast push bus (Epic 4.3)

| Trigger | Collection | Audience | FCM category |
|---------|------------|----------|--------------|
| `onTeamBroadcastCreated` | `team_broadcasts/{msgId}` create | Team players (via `player_lookup` → Auth email) + consent-filtered CC parents | `push_announcements` |
| `onDeploymentCalendarEntryCreated` | `deployment_calendar_entries/{entryId}` create | Writes `team_broadcasts` per team (delegates push to row above) | `push_announcements` |

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

- **Coach → player** messaging is mediated by callables (`sendCoachPlayerMessage` / channel repair) — not all paths use multicast; parental CC on minors is enforced in callable logic and reflected in **`in_app_messages`** / **`messaging_audit`** (`functions/comms.js`, `functions/index.js` ~3558+).
- Broadcast CC parents are filtered at write time (`filterParentsWithCommsConsent`) and re-validated in `onTeamBroadcastCreated` (defence in depth).

## Firestore rules pointers

- **`team_broadcasts`**: coach/director write scope — see `firestore.rules` + `commsSprint412.test.ts`.
- **`in_app_messages`**: director club scope, coach team scope, parent CC lists — `firestore.rules` match ~1512+
- **`messaging_audit`**: director read when `teamId` maps to tenant club — ~1532+
- Policies for **minor-only DMs** and **VPC** intersect with **`playerVpcAllowed()`** (~47+) for training-adjacent reads elsewhere.

## Gap register (closure)

| Id | Status | Notes |
|----|--------|-------|
| **D-08** | **Shipped** | Director broadcast composer + `clubSportBroadcast` + `onTeamBroadcastCreated` push fan-out (Epic 4.8 / 4.3). |
| **D-06** | **Doc sync** | `TOMORROW_IO_API_KEY` is **optional** strike-radius enrich on AEGIS (Open-Meteo + NWS); not required for weather lock or FCM. See [`WEATHER_LOCK_DESIGN.md`](./WEATHER_LOCK_DESIGN.md). |
