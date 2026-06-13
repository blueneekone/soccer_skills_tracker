# Agent 14 — federation NGB export

**Branch:** overnight/fed-ngb

**Owns:** `StateRosterExportPanel.svelte`, export callable, `ngbExportLaunch.test.ts`, `docs/acquisition/FEDERATION_ROADMAP.md`

## Task

Callable `exportStateRoster` (director, clubId, optional teamId) → CSV from player_lookup + household. Director export UI. FEDERATION_ROADMAP: Phase 1 CSV v1, Phase 2 format adapters, Phase 3 sync jobs, Phase 4 API per body. Deploy core if needed.

---

Universal rules: Append SLICE_LOG.md only (agent 21-orch may sync ROADMAP). Do NOT build drag-and-drop club website CMS. Each commit: npm test (slice), npm run check (log count), npm run build. Do not ask questions.
