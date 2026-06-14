# Agent — diegetic-modals

**Slice ID:** diegetic-modals  
**Branch:** `closure/diegetic-modals`

**Owns:**
- `src/lib/components/player/OperativeLoadoutStudio.svelte`
- `src/lib/components/player/PlayerDiegeticOverlay*`
- `src/routes/(app)/player/workout/+page.svelte`

## Task

Register **J-03**, **J-09**: replace Swal in OperativeLoadoutStudio with PlayerDiegeticOverlay; Train diegetic sliders (`pw-loadbar` vs native range).

**Acceptance:** HudSprint 244/250 tests pass; no Swal import on owned paths.

## AutomatedVerify

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint244.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint250.test.ts
npm run check
npm run build
```

## ManualQaId

QA-305, QA-306

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
