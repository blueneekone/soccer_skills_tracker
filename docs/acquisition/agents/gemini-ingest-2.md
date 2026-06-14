# Agent — gemini-ingest-2

**Slice ID:** gemini-ingest-2  
**Branch:** `closure/gemini-ingest-2`

**Owns:**
- `static/portrait/approved/` (second owner PNG only)
- holo default config / manifest wiring

## Task

Register **I-02**: wire owner-approved bust PNG #2 per portrait-gemini-ingest rules.

**Auto-skip:** If no new PNG in `static/portrait/approved/` (beyond existing ingest #1), append SLICE_LOG **Blocked** and exit — do not ask owner.

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
