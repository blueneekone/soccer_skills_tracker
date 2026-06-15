# Agent — comp-federation-phase3

**Slice ID:** comp-federation-phase3  
**Branch:** `competitive/comp-federation-phase3`

**Owns:**
- `functions/src/domains/federationSyncOps.js`
- `functions-core/index.js` (wire callables when ready)
- `src/lib/components/director/**/StateRosterExportPanel.svelte` (sync status panel)
- `docs/acquisition/FEDERATION_ROADMAP.md`

## Task — Register C-03 (Phase 3 — not Phase 4 OAuth)

Wire stubs from `federationSyncOps.js`:

- `getFederationSyncStatus` callable
- `enqueueFederationSyncJob` callable (queue doc + audit)
- Director UI: last sync time, pending/failed badge on `StateRosterExportPanel`
- Phase 4 API per body remains Planned — do not mark C-04 Done

## AutomatedVerify

```bash
npm test -- src/lib/director/__tests__/ngbExportLaunch.test.ts
node functions/__tests__/ngbFormatAdapters.test.js
npm run check
npm run build
```

## ManualQaId

QA-206, QA-223

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. Each commit: npm test (slice), npm run check, npm run build. Permanent rejects R-01–R-03. Manual testing = OWNER_QA_CHECKLIST only.
