# Agent — player-os-6j

**Slice ID:** player-os-6j  
**Branch:** `closure/player-os-6j`

**Owns:**
- `src/lib/styles/player-dossier.css`
- Player route pages (HQ, stats, settings scope per ROADMAP 6j)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint234.test.ts`

## Task

Register **J-02**, **J-06**, **J-07**, **J-10**: Z2 depth / void % contract / stats rubric alignment / remove PlayerShell generic `.bento-card` injection.

**Acceptance:** Sprint 234 guards pass; void/matte tokens documented in VA notes.

## AutomatedVerify

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint234.test.ts
npm run check
npm run build
```

## ManualQaId

QA-303, QA-304, QA-307

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
