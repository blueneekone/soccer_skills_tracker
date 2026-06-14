# Agent — fcm-broadcast

**Slice ID:** fcm-broadcast  
**Branch:** `closure/fcm-broadcast`

**Owns:**
- `docs/FCM_AND_MESSAGING_MATRIX.md`
- `src/lib/services/__tests__/commsSprint48.test.ts`
- `src/lib/services/__tests__/commsSprint49.test.ts`

## Task

Register **D-06**, **D-08**: sync FCM matrix doc with shipped `DirectorClubBroadcastComposer`, `clubSportBroadcast`, `onTeamBroadcastCreated`; fix stale TOMORROW_IO copy references.

**Acceptance:** Matrix reflects code; comms sprint tests pass.

## AutomatedVerify

```bash
npm test -- src/lib/services/__tests__/commsSprint48.test.ts src/lib/services/__tests__/commsSprint49.test.ts
npm run check
npm run build
```

## ManualQaId

QA-210

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
