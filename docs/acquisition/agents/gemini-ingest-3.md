# Agent — gemini-ingest-3

**Slice ID:** gemini-ingest-3  
**Branch:** `closure/gemini-ingest-3`

**Owns:**
- `static/portrait/approved/` (third owner PNG only)
- holo default config / manifest wiring

## Task

Register **I-03**: wire owner-approved bust PNG #3.

**Auto-skip:** If no third PNG in `static/portrait/approved/`, append SLICE_LOG **Blocked** and exit.

## AutomatedVerify

```bash
npm run generate:portraits
npm test -- src/lib/gamification/__tests__/playerLoadoutSprint35mArt.test.ts
npm run check
npm run build
```

## ManualQaId

QA-506

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
