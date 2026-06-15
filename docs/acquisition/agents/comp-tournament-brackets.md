# Agent — comp-tournament-brackets

**Slice ID:** comp-tournament-brackets  
**Branch:** `competitive/comp-tournament-brackets`

**Owns:**
- `src/lib/tournament/tournamentBracket.ts`
- `src/lib/components/director/TournamentBracketPanel.svelte`
- `src/routes/(marketing)/events/[eventId]/+page.svelte`
- `src/lib/tournament/__tests__/p2TournamentBracket.test.ts`

## Task — Register E-02, E-03, E-04

1. Double-elimination bracket generation (8-team minimum; document limits in FEDERATION or tournament types)
2. Seeding UX: manual seed order + auto-seed by registration order
3. Public read-only bracket on marketing event page (buyer view)
4. Reopen E-03 in register if currently Done without double-elim code — ship it here

**Acceptance:** `p2TournamentBracket.test.ts` covers single + double elim; public page renders bracket JSON

## AutomatedVerify

```bash
npm test -- src/lib/tournament/__tests__/p2TournamentBracket.test.ts
npm run check
npm run build
```

## ManualQaId

QA-203, QA-222 (add director seed + public bracket walkthrough to OWNER_QA_CHECKLIST)

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. Each commit: npm test (slice), npm run check, npm run build. Permanent rejects R-01–R-03. Manual testing = OWNER_QA_CHECKLIST only.
