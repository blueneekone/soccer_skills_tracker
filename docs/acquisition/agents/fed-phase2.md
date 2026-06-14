# Agent — fed-phase2

**Branch:** `closure/fed-phase2`

**Owns:** `functions-core/**/ngbExportOps.js`, `src/lib/director/**/StateRosterExportPanel*`, `docs/acquisition/FEDERATION_ROADMAP.md`

## Task

Implement register **C-02** Federation Phase 2 (format adapters):

1. Add `formatAdapterRegistry` with at least one US Soccer / state-association CSV column map atop Phase 1 row model.
2. Director export panel: picker for export profile / body template.
3. Unit tests per adapter in `ngbExportLaunch.test.ts`.
4. Mark Phase 2 progress in `FEDERATION_ROADMAP.md` (this file only in docs/acquisition).

**Acceptance:** Callable returns transformed CSV for selected adapter; tests pass; `npm run deploy:core` script unchanged.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03 or GotSport CMS. Each commit: `npm test -- src/lib/director/__tests__/ngbExportLaunch.test.ts`, npm run check, npm run build. Do not ask questions.
