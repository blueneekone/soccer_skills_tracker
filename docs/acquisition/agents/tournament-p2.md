# Agent — tournament-p2

**Branch:** `closure/tournament-p2`

**Owns:** `src/lib/tournament/**`, `src/lib/components/director/**/TournamentBracketPanel*`, `src/lib/components/marketing/**/tournament*`

## Task

Close register **E-02**, **E-04** tournament ops gaps (single-elim v1 already Done):

1. Seeding UX: director can reorder seeds before bracket generation (persist order on `tournament_events.bracket`).
2. Public buyer/read-only view: round labels + champion banner polish; empty bracket state copy.
3. Extend `p2TournamentBracket.test.ts` for seed order + public read path.

**Out of scope:** Double-elim (E-03 Owner/post-launch).

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03. Each commit: `npm test -- src/lib/tournament/__tests__/p2TournamentBracket.test.ts`, npm run check, npm run build. Do not ask questions.
