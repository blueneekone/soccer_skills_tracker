# Agent — fcm-broadcast

**Branch:** `closure/fcm-broadcast`

**Owns:** `docs/FCM_AND_MESSAGING_MATRIX.md`, `docs/WEATHER_LOCK_DESIGN.md` (TOMORROW_IO note only), `src/lib/services/__tests__/commsSprint48.test.ts`, `src/lib/services/__tests__/commsSprint49.test.ts`

## Task

Sync docs to code truth (register **D-08**, **D-06**):

1. Update `FCM_AND_MESSAGING_MATRIX.md` — document `clubSportBroadcast`, `DirectorClubBroadcastComposer`, `onTeamBroadcastCreated` FCM fan-out (no longer a product gap).
2. Resolve TOMORROW_IO stale language: optional enrich only; AEGIS Open-Meteo + NWS is primary path.
3. Add matrix row for director club broadcast if missing.

**Acceptance:** Matrix no longer lists director broadcast composer as gap; comms sprint tests still pass.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03. Each commit: `npm test -- src/lib/services/__tests__/commsSprint48.test.ts src/lib/services/__tests__/commsSprint49.test.ts`, npm run check, npm run build. Do not ask questions.
