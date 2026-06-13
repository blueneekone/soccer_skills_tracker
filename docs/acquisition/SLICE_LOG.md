# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

## P2-reg-roster — Agent 03 (2026-06-13)

**Branch:** `overnight/p2-reg-roster`

**Slice:** Registration→roster assign UX for paid `season_registrations`.

**Shipped:**
- `assignSeasonRegistrationToRoster` CF — director/registrar assigns paid registration to team; writes `player_lookup`, `users`, `rosters`, seat entitlements, and `assignedTeamId` on registration.
- `RegistrationRosterAssignPanel` on Director Licenses tab — lists paid registrants, team picker, assign/reassign.
- Firestore composite index: `season_registrations` tenantId + seasonId + paymentStatus.
- Tests extended in `registrationLaunch.test.ts`.

**Verify:** `npm test -- src/lib/coach/logistics/__tests__/registrationLaunch.test.ts` · `npm run check` · `npm run build` · `npm run deploy:core` + firestore indexes
