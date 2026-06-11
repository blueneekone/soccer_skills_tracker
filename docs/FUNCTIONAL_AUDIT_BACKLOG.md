# Functional Audit Backlog — 2026-06-10

**Status (2026-06-10):** **A1–A7, B1–B4, C1–C4, D1–D10, E1–E9, F1–F3, F5 Done.** **F4 deferred** (skill-tree drill launch — post-launch). Operator deploy checklist remains until owner runs all `deploy:*` targets + Firestore rules.

Fresh end-to-end read-only audit of `/player`, `/parent`, `/coach`, `/director` workspaces.
Supersedes the optimistic "all functional epics closed" header in `ROADMAP.md`: that claim
only covered doc-tracked MVP epics (4 / 5 / 2.2). This audit found real wiring gaps, mock
data on live surfaces, and shipped-but-unmounted components — **now closed in code**.

**Severity:** `P0` = dead CTA / core loop broken / mock data on live surface · `P1` = stubbed-but-shipped
feature or persistence bug · `P2` = discoverability / empty-state / edge case.

**Out of scope (deferred):** avatar PNG/portrait art, visual/token polish, file-length warnings, F4 skill-tree drill launch.

> **Note on "callable not found in default functions index":** Firebase resolves callables by
> function **name + region** across the whole project — the split codebase (`functions-core`,
> `-compliance`, `-platform`, `-commerce`, `-rl`, `-integrations`) is only a deploy grouping, not a
> client lookup boundary. Those items are **deploy-completeness** tasks (run every `deploy:*`
> target), NOT code bugs.

---

## P0 — code bugs (surgical, high impact)

| # | Status | Area | Resolution |
|---|--------|------|------------|
| A1 | **Done** | Parent commerce region | `commerce.svelte.ts` uses `getFunctions(undefined, 'us-east1')` |
| A2 | **Done** | Parent nav labels | `workspaceNav.js`: Household → `/parent/household`, Consent (VPC) → `/parent/vpc`, Co-op Command → `/parent/dashboard` |
| A3 | **Done** | Co-op XP | `CoOpEngine.svelte.ts` reads `totalXp ?? armory.totalXP` |
| A4 | **Done** | AdaptiveHomework tier | Keys `users/{email}`; migration errors logged |
| A5 | **Done** | MorningReadinessCard | Uses `authStore.user?.uid` |
| A6 | **Done** | ActionInbox compliance links | Passport/waiver items → `/director?tab=compliance` |
| A7 | **Done** | Director uplinks | `clubId` from `userProfile.clubId ?? tenantId`; New Uplink → `/director?tab=household` |

## P0 — mock/placeholder data reaching live surfaces

| # | Status | Area | Resolution |
|---|--------|------|------------|
| B1 | **Done** | War Room roster | Empty roster leaves bench empty — no `PLAYER 01` / `SLOT 01` placeholders |
| B2 | **Done** | Match-day scoreboard | Scores start at 0–0; GOAL bumps home only (local pad — no Firestore fixture yet) |
| B3 | **Done** | Coach HQ facility card | Live team name, weather coords, roster link — no hardcoded turf/gate strings |
| B4 | **Done** | Director command center KPIs | Firestore-backed teams, invites, seat utilization — no static posture strings |

## P0 — broken core-loop CTAs

| # | Status | Area | Resolution |
|---|--------|------|------------|
| C1 | **Done** | Parent bounty claim | `bountyFromParentBounty` gates claim on `status === 'verified'` (server payout) |
| C2 | **Done** | War Room DEPLOY PLAY | `deployPlay()` persists named tactic snapshot to `teams/{teamId}/tactics` |
| C3 | **Done** | MessagesTab schedule link | `goto('/coach/drills?view=schedule')` |
| C4 | **Done** | War Room exit | Explicit Exit control + `/coach` navigation |

## P1 — persistence / loop bugs

| # | Status | Area | Resolution |
|---|--------|------|------------|
| D1 | **Done** | SeasonRegistration demo pay | No Stripe → error state; no fabricated `onpaid()` |
| D2 | **Done** | Parent payments refresh | `handlePaid()` re-fetches `season_registrations` via `loadData()` |
| D3 | **Done** | Incident report clubId | Falls back to `parentLoungeTeams[0]?.clubId` on `/messages` |
| D4 | **Done** | Bounty funding gate | `isFormValid()` blocks deploy; link to `#parent-funding-source` |
| D5 | **Done** | Field weather lock | AEGIS Open-Meteo + NWS in `weatherEvaluation.js`; scheduled `evaluateFieldWeatherLock` |
| D6 | **Done** | Field ops dual models | `syncFacilityToLegacyField` mirrors map facilities → `fields` collection |
| D7 | **Done** | Playbook CRUD | `PlaybookTab.svelte` edit + delete for `club_playbooks` |
| D8 | **Done** | Staff clearance club scope | `CoachClearancePanopticon` + billing audit accept `clubId` from workspace switcher |
| D9 | **Done** | Forge name-only roster | Team-scope deploy uses `roster.length > 0`; name-only still blocked for individual (OPERATIVES) scope |
| D10 | **Done** | Team Ops roster read-only | By design — mutations on Daily Intel; panel links there |

## P1 — shipped but never mounted (wire or delete)

| # | Status | Component | Mount |
|---|--------|-----------|-------|
| E1 | **Done** | ClipAnalyzer | `/player/media` |
| E2 | **Done** | ProvingGrounds | `/player/proving-grounds` + HQ quick ops |
| E3 | **Done** | MediaVault, TransferPortal | `/player/media`; `/parent/household`; director registrars |
| E4 | **Done** | DrillExecution, IntrinsicSanctuary | `/player/workout`; `/player/tracker` |
| E5 | **Done** | PlayerActivityStreak | Player HQ metrics band |
| E6 | **Done** | NewMessageModal | Team Ops MessagesTab |
| E7 | **Done** | FacilityScheduler, TacticalCommandBoard | Field Station schedule; `/coach/tactics-board` |
| E8 | **Done** | trial-builder | Coach shell nav |
| E9 | **Done** | CoachAccountabilityModule | Director compliance context |

## P2 — discoverability / nav

| # | Status | Area | Resolution |
|---|--------|------|------------|
| F1 | **Done** | Player nav | Comms → `/messages`; HQ quick ops → `/player/tracker` (skill-tree/challenges/passport remain direct URL) |
| F2 | **Done** | Coach nav | Field Station + War Room in `workspaceNav.js` |
| F3 | **Done** | Director nav | Vanguard, Retention, Tournaments in `directorLinks` |
| F4 | **Deferred** | Player skill-tree | Inspect-only surface — drill launch from nodes is post-launch |
| F5 | **Done** | Parent log-workout drills | `loadDrillTitlesForFocus` from Firestore |

## Deploy-completeness (NOT code bugs — owner deploy checklist)

Ensure **every** codebase is deployed so name-addressed callables resolve:
- `deploy:core` — `logTrainingSession`, `parentReviewCompletionProof`, `secureDeployIntent`
- `deploy:compliance` — household/VPC/COPPA, coach clearance, retention, OOB override
- `deploy:platform` — `directorUpsertField`, `secureBookField`, `directorInviteCoach`, `secureAllocateTeamSeats`
- `deploy:commerce` — `createRegistrationIntent`, `upsertTournamentEvent`
- `deploy:rl` — adaptive workout policy
- `deploy:integrations` — upload token, media, `evaluateFieldWeatherLock`
- `firestore.rules`

---

## Build order (completed)

1. ~~P0 surgical code bugs A1–A7~~
2. ~~P0 mock-data-on-live-surface B1–B4~~
3. ~~P0 broken CTAs C1–C4~~
4. ~~P1 persistence bugs D1–D10~~
5. ~~E-series mount-or-delete~~
6. ~~F-series nav/discoverability (except F4 deferred)~~

**Regression guards:** `src/lib/gamification/__tests__/personaFunctionalMvp.test.ts` — `Functional audit backlog A–F` describe block.
