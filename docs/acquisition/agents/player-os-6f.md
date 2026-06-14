# Agent — player-os-6f

**Slice ID:** player-os-6f  
**Branch:** `closure/player-os-6f`

**Owns:**
- `src/routes/(app)/player/armory/**`
- `src/lib/components/player/OperativeLoadoutStudio.svelte`
- `docs/visual-acceptance/sprint-2.22-slice-6f/**`

## Task

Register **J-01**, **J-08**: Armory hologram dossier + qa-strap accent canon (#00d4ff) per PLATFORM_BUILD_MANDATES Wave E.

**Acceptance:** HUD sprint 252 tests pass; VA folder updated if screenshots captured.

## AutomatedVerify

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint252.test.ts
npm run check
npm run build
```

## ManualQaId

QA-301, QA-302

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
