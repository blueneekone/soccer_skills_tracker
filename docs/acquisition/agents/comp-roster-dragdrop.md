# Agent — comp-roster-dragdrop

**Slice ID:** comp-roster-dragdrop  
**Branch:** `competitive/comp-roster-dragdrop`

**Owns:**
- `src/lib/components/director/RegistrationRosterAssignPanel.svelte` (extend or replace with drag-drop)
- `src/lib/director/**` (roster assign UX)
- `assignSeasonRegistrationToRoster` CF if payload changes
- `src/lib/coach/logistics/__tests__/registrationLaunch.test.ts`

## Task — Register B-03 REAL build (not assign-panel accept)

GotSport-style drag-drop: paid `season_registrations` → roster slots on director Licenses/Roster tab.

- Drag registrant row onto team roster slot OR reorder within pool
- Persist via existing `assignSeasonRegistrationToRoster` or extended callable
- Empty states, name-only registrant blocked with same hint as LAUNCH-forge-nameonly
- Keep `RegistrationRosterAssignPanel` assign path as fallback OR unify into one panel

**Acceptance:**
- New or extended test file `registrationRosterDragDrop.test.ts` (create if needed)
- `COMPETITIVE_LAUNCH_ASSESSMENT` row "Drag-drop roster from registration" → ✅ after merge (agent appends note in SLICE_LOG; doc-sync slice or this slice updates matrix)

## AutomatedVerify

```bash
npm test -- src/lib/coach/logistics/__tests__/registrationLaunch.test.ts
npm test -- src/lib/director/__tests__/registrationRosterDragDrop.test.ts
npm run check
npm run build
```

## ManualQaId

QA-201, QA-221 (add QA-221 to OWNER_QA_CHECKLIST if new)

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. Each commit: npm test (slice), npm run check, npm run build. Permanent rejects R-01–R-03. Manual testing = OWNER_QA_CHECKLIST only.
