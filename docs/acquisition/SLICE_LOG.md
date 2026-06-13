# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

| When | Agent | Branch | Slice | Status | Notes |
|------|-------|--------|-------|--------|-------|
| 2026-06-13 | 01-docs-dataroom | overnight/docs-dataroom | Full data room | **Done** | INDEX, PROSPECTUS, LIMITATIONS, DEMO_SCRIPT, TRANSFER, SECURITY, FAQ, TRACTION, ONE_PAGER, OUTREACH, NOTABLE_GAPS — linked ARCHITECTURE, FUNCTIONAL_MVP, QA_DEV_PERSONA, FUNCTIONS_DEPLOY, FUNCTIONAL_AUDIT |

## 2026-06-13 — Agent 02 LAUNCH-p0

**Branch:** `overnight/launch-p0`  
**Files:** `parent/household/+page.svelte`, `vpc-pending/+page.svelte`, `scripts/dev-tenant-reset.mjs`, `launchP0Fixes.test.ts`

- Fixed waiver button `&amp;` literal in Svelte text expression → `Sign waiver & authorize`
- Corrected dispatch-code help copy (team code AB-1K2M, not “6-digit team code”)
- Replaced vpc-pending legacy director-link steps with parent self-service household + VPC path
- `dev-tenant-reset --provision` now writes `households/{qa_launch_2026_parent_hh}`, parent `householdId`, team `inviteCode` (`QA-PP26`), and parent JWT claim fast-path

**Verify:** `npm test -- src/lib/registrar/__tests__/launchP0Fixes.test.ts src/lib/registrar/__tests__/epic51CoppaSignup.test.ts src/routes/(app)/parent/household/__tests__/household.layout.test.ts` · `npm run check` · `npm run build`

---

## 07-p2-tracker-nav — 2026-06-13

**Branch:** `overnight/p2-tracker-nav`

**Change:** Added `/player/tracker` to PlayerShell bottom rail (`NAV_LINKS`: label Tracker, icon `game.zap`) and to `athleteHouseholdLinks` in `workspaceNav.js` for enterprise-shell parity.

**Tests:** `personaFunctionalMvp.test.ts` — PlayerShell + workspaceNav tracker guards.

**Verify:** `npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts -t "Tracker|athlete household links Tracker"` · `npm run check` · `npm run build`

## 2026-06-13 — Agent 05 — P2 tournament bracket polish

**Branch:** `overnight/p2-tournament`  
**Slice:** Tournament bracket polish on `tournament_events` baseline

**Shipped:**
- Embedded `TournamentBracket` types on `tournament_events` (single-elimination, 4/8/16/32 teams)
- Pure bracket helpers (`generateSingleEliminationBracket`, `advanceWinner`, round labels)
- `TournamentBracketPanel.svelte` — director seeding, score entry, winner advancement, champion banner
- Director event builder persists `bracket` via `upsertTournamentEvent`
- Published buyer page shows read-only bracket when configured
- Commerce validation: `validateBracket` in `tournamentEventConstants.js` + `upsertTournamentEvent` bracket merge/delete

**Verify:**
- `npm test -- src/lib/tournament/__tests__/p2TournamentBracket.test.ts` — 10 passed
- `npm run check` — 391 errors (pre-existing; unchanged scope)

## P2-CHECKR — Agent 06 (overnight/p2-checkr)

**Status:** Done  
**Branch:** `overnight/p2-checkr`  
**Scope:** Checkr embed polish; remove Ankored user strings from compliance UI.

**Changes:**
- Renamed clearance sub-label kind `ankoredId` → `legacyRecordId`; added `clearanceStatusSubLabelTitle()` for neutral copy ("Legacy screening record ID").
- Removed all user-facing "Ankored" strings from `CoachClearancePanopticon`, `NativeClearanceStatus`, and compliance embed surfaces.
- Polished `CheckrEmbed.svelte`: root wrapper, loading hint, retry button, aria-busy/live states.
- Expanded Checkr ReportsOverview embed styles and `coach-clearance-siem.css` (accordion open state, iframe containment, retry button).
- Updated guard tests (`complianceCheckr.guard.test.js`, `adminCoachClearance.layout.test.ts`) for legacy-record copy and embed polish.

**Verify:**
- `npm test -- src/lib/compliance/__tests__/checkrCoachClearance.urls.test.ts src/routes/(app)/admin/coach-clearance/__tests__/adminCoachClearance.layout.test.ts` — 15 passed
- `node --test functions/__tests__/complianceCheckr.guard.test.js` — 27 passed
- `npm run check` — 391 errors (pre-existing; unrelated to slice)

## 04-p2-payments — 2026-06-13

**Branch:** `overnight/p2-payments`  
**Slice:** P2 parent payment installments UX  
**Owner:** `src/lib/parent/**`, wired to `/parent/payments` + `SeasonRegistration`

### Shipped
- `paymentInstallments.ts` — split fees, schedule builder, ledger aggregation, display helpers
- `paymentInstallmentPrefs.ts` — persist plan choice on parent `users.preferences.paymentInstallmentPlans`
- `loadSeasonPaymentLedger.ts` — aggregate all `season_registrations` per player/season
- `/parent/payments` — per-player installment progress, schedule rows, partial status, next-due CTA
- `SeasonRegistration` — pay-in-full vs 2/3/4-payment picker, installment charge via existing Stripe CF

### Verify
- `npm test -- src/lib/parent/__tests__/paymentInstallments.test.ts` — 8 passed
- `npm run check` — 391 errors (pre-existing)
- `npm run build` — ok

### Notes
- Each installment uses existing `createRegistrationIntent` with partial `feeAmountDollars`; full-season unlock on first partial payment remains a backend follow-up (webhook sets `activeSeasonStatus` on any succeeded PI).
