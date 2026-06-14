# Agent — fed-phase2

**Slice ID:** fed-phase2  
**Branch:** `closure/fed-phase2`

**Owns:**
- `functions-core/**/ngbExportOps.js`
- `src/lib/director/**/StateRosterExportPanel*`
- `docs/acquisition/FEDERATION_ROADMAP.md`

## Task

Register **C-02**, **C-03**: implement Federation Phase 2 format adapters per FEDERATION_ROADMAP; document Phase 3 sync job stubs if not in scope.

**Acceptance:** Export panel supports next adapter; `ngbExportLaunch.test.ts` extended.

## AutomatedVerify

```bash
npm test -- src/lib/director/__tests__/ngbExportLaunch.test.ts
npm run check
npm run build
```

## ManualQaId

QA-206

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
