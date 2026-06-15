# Agent — comp-competitive-doc-sync

**Slice ID:** comp-competitive-doc-sync  
**Branch:** `competitive/comp-competitive-doc-sync`

**Owns:**
- `docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md`
- `docs/acquisition/NOTABLE_GAPS.md`
- `docs/acquisition/PLATFORM_GAP_REGISTER.md` (reopen rows only)
- `docs/acquisition/TRACTION.md`

## Task

1. Reopen register rows falsely marked Done without competitor parity: **B-03** (drag-drop), **E-03** (double-elim if not in code), **D-02** (NCSI — set Partial not Done), **C-04** (38-body API — Partial not Done unless code exists).
2. Sync `NOTABLE_GAPS.md` (Last updated today) — remove stale webhook/eligibility partials fixed in Wave 3.
3. Update `COMPETITIVE_LAUNCH_ASSESSMENT` executive summary: Wave 4 in progress; list remaining 🟡 until slices merge.
4. Add `WAVE_4_MANIFEST` link to `INDEX.md` if missing.
5. Do **not** mark competitive rows ✅ until corresponding Wave 4 code slice merges — only doc truth + reopened register statuses.

## AutomatedVerify

```bash
npm test -- src/lib/parent/__tests__/launchWave2Complete.test.ts
```

## ManualQaId

none

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. Each commit: npm test (slice), npm run check, npm run build. Permanent rejects R-01–R-03. Manual testing = OWNER_QA_CHECKLIST only.
