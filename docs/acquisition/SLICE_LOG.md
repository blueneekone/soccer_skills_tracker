# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

## fcm-broadcast — 2026-06-14

**Branch:** `closure/fcm-broadcast`  
**Slice:** fcm-broadcast (D-06, D-08)  
**Status:** Done

**Shipped:**
- Synced `FCM_AND_MESSAGING_MATRIX.md` with shipped director broadcast stack: `DirectorClubBroadcastComposer`, `clubSportBroadcast`, `commitTeamBroadcast`, `onTeamBroadcastCreated` → `sendFcmToUids` (`push_announcements`); removed stale pre-ship gap copy; registered D-06/D-08 closure rows.
- Fixed stale TOMORROW_IO doc strings: `WEATHER_LOCK_DESIGN.md` (Tomorrow.io now documented as optional in `weatherOps.js` / `facilityWeatherWebhook.js`); `EPIC5_STATUS.md` (TOMORROW_IO optional, not required for AEGIS deploy).
- Added D-06/D-08 guard tests in `commsSprint48.test.ts` and `commsSprint49.test.ts`.

**Verify:** `npm test -- src/lib/services/__tests__/commsSprint48.test.ts src/lib/services/__tests__/commsSprint49.test.ts` · `npm run check` · `npm run build`

**ManualQaId:** QA-210 (owner checklist only)

## checkr-webhooks (D-01) — 2026-06-14

**Branch:** `closure/checkr-webhooks`  
**Status:** Done  
**Gap:** D-01 — Checkr webhook lifecycle hardening  
**Changed:** `functions/compliance.js`, `functions-compliance/compliance.js`, `functions/__tests__/complianceCheckr.guard.test.js`, `src/lib/compliance/checkrCoachClearance.ts`, `src/lib/compliance/__tests__/checkrCoachClearance.urls.test.ts`, `docs/acquisition/PLATFORM_GAP_REGISTER.md`  
**Hardening:** timing-safe HMAC signature verification (`verifyCheckrWebhookSignature`), idempotency on `checkr_webhook_events/{reportId}`, native Checkr `data.object` payload normalization, status transition guards, `clearedAt`/`expiresAt` on cleared, `revokeRefreshTokens` after claim stamp  
**Verify:** `node --test functions/__tests__/complianceCheckr.guard.test.js` (32 pass) · `npm test -- src/lib/compliance/__tests__/checkrCoachClearance.urls.test.ts` (11 pass) · `npm run check` (0 errors) · `npm run build` (pass)  
**ManualQaId:** QA-204 (owner checklist — webhook path documented)
