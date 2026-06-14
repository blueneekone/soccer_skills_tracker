# Agent — tournament-p2

**Slice ID:** tournament-p2  
**Branch:** `closure/tournament-p2`

**Owns:**
- `src/lib/tournament/**`
- `src/lib/components/director/**/Tournament*`

## Task

Register **E-02**, **E-04**: tournament seeding UX polish + public buyer read-only bracket polish.

**Acceptance:** `p2TournamentBracket.test.ts` green; published event shows bracket.

## AutomatedVerify

```bash
npm test -- src/lib/tournament/__tests__/p2TournamentBracket.test.ts
npm run check
npm run build
```

## ManualQaId

QA-203

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
