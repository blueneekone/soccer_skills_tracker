# Agent — orch-wave4

**Slice ID:** orch-wave4  
**Branch:** `competitive/orch-wave4`

**Owns:**
- `docs/acquisition/SLICE_LOG.md`
- `docs/acquisition/PARALLEL_STATUS.md`
- `docs/acquisition/PLATFORM_GAP_REGISTER.md` (summary)
- `ROADMAP.md` (sprint line)
- `docs/acquisition/TRACTION.md`

## Task

1. Merge `competitive/*` → `dev` in order: `comp-competitive-doc-sync` first (doc baseline), then `comp-roster-dragdrop`, `comp-tournament-brackets`, `comp-checkr-lifecycle`, `comp-federation-phase3`, `comp-streaming-schedule`, `comp-capacitor-polish` if exists.
2. Resolve conflicts; prefer competitive branch for slice-owned paths.
3. Update `COMPETITIVE_LAUNCH_ASSESSMENT` 🟡 → ✅ only where code merged + tests green.
4. `PARALLEL_STATUS`: Wave 4 table; next = owner QA or deploy refresh.
5. Register summary counts.

## AutomatedVerify

```bash
npm test -- src/lib/parent/__tests__/launchWave2Complete.test.ts src/lib/gamification/__tests__/personaFunctionalMvp.test.ts
npm run check
npm run build
```

## ManualQaId

QA-503

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. Each commit: npm test (slice), npm run check, npm run build. Permanent rejects R-01–R-03. Manual testing = OWNER_QA_CHECKLIST only.
