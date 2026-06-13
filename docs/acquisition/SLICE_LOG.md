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

| Slice | Branch | Tests | Check | Build | Notes |
|-------|--------|-------|-------|-------|-------|
| 16-marketing-acq | overnight/marketing-acq | marketingLanding.test.ts | 391 errors (pre-existing) | pass | `/acquisition` route, acquisitionContent.ts, landing CTA + footer links, test guards |

## P2-reg-roster — Agent 03 (2026-06-13)

**Branch:** `overnight/p2-reg-roster`

**Slice:** Registration→roster assign UX for paid `season_registrations`.

**Shipped:**
- `assignSeasonRegistrationToRoster` CF — director/registrar assigns paid registration to team; writes `player_lookup`, `users`, `rosters`, seat entitlements, and `assignedTeamId` on registration.
- `RegistrationRosterAssignPanel` on Director Licenses tab — lists paid registrants, team picker, assign/reassign.
- Firestore composite index: `season_registrations` tenantId + seasonId + paymentStatus.
- Tests extended in `registrationLaunch.test.ts`.

**Verify:** `npm test -- src/lib/coach/logistics/__tests__/registrationLaunch.test.ts` · `npm run check` · `npm run build` · `npm run deploy:core` + firestore indexes

| Slice | Branch | Agent | Status | Proof |
|-------|--------|-------|--------|-------|
| LAUNCH-fed-ngb | overnight/fed-ngb | 14 | Done | `exportStateRoster` callable (director/registrar, clubId, optional teamId) → CSV v1 from `player_lookup` + `households`; `StateRosterExportPanel` on Director Roster tab; `FEDERATION_ROADMAP.md` Phases 1–4; `ngbExportLaunch.test.ts` |

## 15-live-stream — overnight/live-stream

- `liveStreamUrl` on `team_workouts` scheduled events + `teams/{teamId}/match_sessions`
- Coach paste: YouTube / Vimeo / Mux in schedule panel + match-day sideline
- Parent `LiveStreamWatch` — Watch live with allowlisted iframe embed
- Teen 13–16 guard: external link fallback (no third-party iframe)
- Guards: `src/lib/live-stream/__tests__/liveStreamLaunch.test.ts`

## Agent 10 — check-stores (2026-06-13)

**Branch:** `overnight/check-stores`  
**Scope:** `src/lib/stores/**`, `src/lib/auth/**`  
**Check (scope):** 1 → 0 errors  
**Check (repo):** 391 → 390 errors  
**Fix:** `passkeys.ts` — double-cast legacy raw-options response to `PublicKeyCredentialRequestOptionsJSON` after `challenge` guard.  
**Tests:** `npm test -- src/lib/stores/auth/__tests__/ src/lib/auth/__tests__/` — 52 passed  
**Files:** 1 (`src/lib/auth/passkeys.ts`)

---

## 11-check-coach-dir — 2026-06-13

**Branch:** `overnight/check-coach-dir`  
**Scope:** `src/lib/coach/**`, `src/lib/director/**`, `src/lib/compliance/**`  
**Check (scope):** 8 → 0 errors (full repo: 391 → 383)  
**Files (4):** `CoachDrillsView.svelte`, `IntentEngine.svelte.ts`, `IntentHUD.svelte`, `CoachIntentEngineView.svelte`  
**Fixes:** typed `scheduleEventKind`; Modal `titleSlot` snippets; `expiresAt` cast via `unknown`; `MouseEventHandler` prop defaults; `resolve(route, {})` for typed route ID  
**Tests:** 11 files, 100 passed  
**Build:** pass

## Agent 13 — check-player (2026-06-13)

- **Branch:** `overnight/check-player`
- **Scope:** `src/lib/player/**`, `src/lib/gamification/**`, `src/lib/hud/**`
- **Check errors:** 2 → 0 (repo total 391 → 389)
- **Files:** `rlPolicyCache.ts` (parse `ExplanationCode` union), `CoachMissionDrillExecutionPanel.svelte` (complexityRank cast via unknown)
- **Tests:** `npm test -- src/lib/player/workout/__tests__/coachMissionFlow.test.ts src/lib/player/__tests__/ src/lib/player/dashboard/__tests__/ src/lib/hud/__tests__/` — 115 passed
- **Build:** `npm run build` — ok

## 08-check-routes — 2026-06-13

- **Branch:** `overnight/check-routes`
- **Scope:** `src/routes/**` (24 files, 200 → 0 check errors)
- **Repo total:** 391 → 191 check errors
- **Fixes:** typed `AdminClubCtx` context; removed invalid `aria-hidden` on `Icon`; TS interfaces for Firestore/CF payloads; `WorkoutFocus`/`OverlayVariant` state types; `$props()` rune fixes; `rsvpStatus` state; plain path hrefs (avoid `resolve()` arity)
- **Verify:** `npm test -- src/routes/(app)/admin/organizations/__tests__ src/routes/(app)/parent/household/__tests__ src/routes/(app)/admin/overview/__tests__` (14 passed); `npm run check` (routes 0); `npm run build` (ok)

## 09-check-components — batch 1 (Icon, shell, shared resolve)

- **Branch:** overnight/check-components
- **Scope:** Icon.svelte, Modal.svelte, resolveAppPath helper, shell/hud/compliance/recruiter fixes
- **check (components):** 164 → 0 (full scope zero after all batches)
- **check (repo):** 391 → 168
- **tests:** Icon.test.ts, noPhosphor.test.ts, activeBounties.test.ts — pass
- **build:** pass

## 09-check-components — batch 2 (coach, admin, director)

- **Scope:** coach/admin/director component type fixes
- **check (components):** 0
- **tests/build:** pass (same slice)

## 09-check-components — batch 3 (field-ops, player, docs)

- **Scope:** field-ops, player dashboard, CHECK_ZERO_STATUS
- **check (components):** 0 end
- **tests/build:** pass

---

## 2026-06-13 — Agent 18 gemini-ingest-1 (`overnight/gemini-ingest-1`)

**Scope:** Wire first owner-approved bust `bust_teen_long_light_away.jpeg` → precomposed holo default for teen bodyScale.

**Files:**
- `static/portrait/precomposed.config.json` — first bust row + `defaultForBodyScale: teen`
- `scripts/generate-portrait-manifest.mjs` — emits `precomposedBusts.manifest.json`
- `src/lib/avatars/renderLayeredPortrait.js` — resolve/render precomposed raster SVG
- `src/lib/avatars/portraitV2Schema.ts` — teen defaults match bust parts (light/long/away)
- `docs/vision/references/ASSET_LICENSES.md` — Owner ☑ row
- `src/lib/gamification/__tests__/playerLoadoutSprint35mGeminiIngest.test.ts` — ingest guards
- `src/lib/gamification/__tests__/playerLoadoutSprint35iB.test.ts` — teen default expectations
- `src/lib/gamification/__tests__/playerLoadoutSprint35mArt.test.ts` — precomposed teen holo path

**Verify:**
- `npm run generate:portraits` — 16 parts + 1 precomposed bust
- `npm test -- src/lib/gamification/__tests__/playerLoadoutSprint35mGeminiIngest.test.ts src/lib/gamification/__tests__/playerLoadoutSprint35mDocsGemini.test.ts` — 31/31 pass
- `npm run check` — 391 errors, 162 warnings (pre-existing; unchanged scope)
- `npm run build` — pass

**Owner next:** hard-refresh `/player/dashboard` holo → approve ☑ or reject with notes.

## 2026-06-13 — Agent 17 native-shell (`overnight/native-shell`)

**Slice:** Capacitor 6 wrap of `sstracker.app` with parent-first default route.

**Shipped:**
- `capacitor.config.ts` — remote WebView `https://sstracker.app/parent/household`, app id `app.sstracker.parent`
- `ios/`, `android/` — Capacitor 6 native projects (`cap add` + sync)
- `src/lib/native/nativeShell.ts` — parent-first route constants + Capacitor detection
- `src/lib/components/native/NativeShellRedirect.svelte` — in-app pivot from `/` and `/login`
- `docs/NATIVE_SHELL.md` — acquirer build handoff (store submission out of scope)
- `src/lib/native/__tests__/nativeShellLaunch.test.ts` — 6 guards

**Verify:**
```bash
npm test -- src/lib/native/__tests__/nativeShellLaunch.test.ts  # 6 passed
npm run check  # 391 errors (pre-existing)
npm run build   # ok
```

**Deferred:** App Store / Play Store submission (acquirer).

## 2026-06-13 — agent 21-orch poll cycle 1

**Base commit:** `843e44b` (RUNNER-0 bootstrap) on all `overnight/*` branches.

| Agent | Branch | Status | Notes |
|-------|--------|--------|-------|
| 01-docs-dataroom | overnight/docs-dataroom | Pending | No slice commit |
| 02-launch-p0 | overnight/launch-p0 | Pending | No slice commit |
| 03-p2-reg-roster | overnight/p2-reg-roster | Pending | No slice commit |
| 04-p2-payments | overnight/p2-payments | Pending | No slice commit |
| 05-p2-tournament | overnight/p2-tournament | Pending | No slice commit |
| 06-p2-checkr | overnight/p2-checkr | Pending | No slice commit |
| 07-p2-tracker-nav | overnight/p2-tracker-nav | Pending | No slice commit |
| 08-check-routes | overnight/check-routes | Pending | No slice commit |
| 09-check-components | overnight/check-components | Pending | No slice commit |
| 10-check-stores | overnight/check-stores | Pending | No slice commit |
| 11-check-coach-dir | overnight/check-coach-dir | Pending | No slice commit |
| 12-check-parent-admin | overnight/check-parent-admin | Pending | Blocked on 04 merge |
| 13-check-player | overnight/check-player | Pending | No slice commit |
| 14-fed-ngb | overnight/fed-ngb | Pending | No slice commit |
| 15-live-stream | overnight/live-stream | Pending | No slice commit |
| 16-marketing-acq | overnight/marketing-acq | Pending | No slice commit |
| 17-native-shell | overnight/native-shell | Pending | No slice commit |
| 18-gemini-ingest-1 | overnight/gemini-ingest-1 | Pending | `bust_teen_long_light_away.jpeg` in manifest |
| 19-gemini-ingest-2 | overnight/gemini-ingest-2 | Pending | No slice commit |
| 20-gemini-ingest-3 | overnight/gemini-ingest-3 | Pending | No slice commit |
| 21-orch | overnight/orch | Done | Poll + PARALLEL_STATUS + PARALLEL_SUMMARY + ROADMAP/COMPETITIVE sync |
| 22-check-final | overnight/check-final | Pending | Phase 2 — after 08–13 |
| 23-vitest-ci | overnight/vitest-ci | Pending | Phase 2 — after check=0 |
| 24-deploy-verify | overnight/deploy-verify | Pending | Phase 2 — last |

**Phase 1:** 0/19 feature agents started · **Phase 2:** not started · **Merge target:** `overnight/base` → `dev`

---
