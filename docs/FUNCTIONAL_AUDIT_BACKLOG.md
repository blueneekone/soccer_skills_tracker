# Functional Audit Backlog — 2026-06-10

**Status (2026-06-10):** P0 A1–A7, B1–B4, C1–C4, D1–D10, F2–F5, E8, E9 **Done**. E-series mount decisions **remaining** (player/coach unmounted components; operator deploy checklist).

Fresh end-to-end read-only audit of `/player`, `/parent`, `/coach`, `/director` workspaces.
Supersedes the optimistic "all functional epics closed" header in `ROADMAP.md`: that claim
only covered doc-tracked MVP epics (4 / 5 / 2.2). This audit found real wiring gaps, mock
data on live surfaces, and shipped-but-unmounted components.

**Severity:** `P0` = dead CTA / core loop broken / mock data on live surface · `P1` = stubbed-but-shipped
feature or persistence bug · `P2` = discoverability / empty-state / edge case.

**Out of scope (deferred):** avatar PNG/portrait art, visual/token polish, file-length warnings.

> **Note on "callable not found in default functions index":** Firebase resolves callables by
> function **name + region** across the whole project — the split codebase (`functions-core`,
> `-compliance`, `-platform`, `-commerce`, `-rl`, `-integrations`) is only a deploy grouping, not a
> client lookup boundary. Those items are **deploy-completeness** tasks (run every `deploy:*`
> target), NOT code bugs — with one real exception: a **region mismatch** in commerce.

---

## P0 — code bugs (surgical, high impact)

| # | Area | File | Problem | Fix |
|---|------|------|---------|-----|
| A1 | Parent | `src/lib/services/commerce.svelte.ts:139` | `createRegistrationIntent` called via `getFunctions(undefined,'us-central1')`; function deploys in `us-east1` → payment intent always fails | Use `us-east1` region |
| A2 | Parent | `src/lib/shell/workspaceNav.js:58-64` | Sidebar mislabels: "Clearance" → `/parent/household`, "Household" → `/parent/vpc`; VPC ceremony undiscoverable / mis-navigated | Correct labels + routes; add explicit VPC entry |
| A3 | Parent | `src/lib/states/CoOpEngine.svelte.ts:230-236` | Reads child XP from `users/{email}.armory.totalXP`; training writes `users.totalXp` (root) → Co-op console shows 0 XP | Read `totalXp` root field |
| A4 | Player | `src/routes/(app)/player/dashboard/AdaptiveHomework.svelte:100` | Tier migration `setDoc(doc(db,'users',uid))` but user docs are email-keyed; error swallowed → RL tier never persists | Key by email; surface error |
| A5 | Player | `src/lib/components/player/MorningReadinessCard.svelte:42` | `checkAlreadySubmitted()` reads `authStore.currentUser?.uid`; facade exposes `authStore.user` → dup-submit guard dead | Use `authStore.user.uid` |
| A6 | Director | `src/lib/components/shell/ActionInbox.svelte:167-181` | Registrar passport/waiver inbox items link to `?tab=registrars` (staff invites), not `?tab=compliance` (player matrix) | Point compliance items to `?tab=compliance` |
| A7 | Director | `src/routes/(app)/director/uplinks/+page.svelte:45,52-54,149` | Reads `authStore.clubId` (undefined; facade has `tenantId`/`userProfile.clubId`) → permanent "Club context not available"; "New Uplink" → `/director/uplinks/compose` (404) | Resolve clubId correctly; fix/guard compose route |

## P0 — mock/placeholder data reaching live surfaces

| # | Area | File | Problem |
|---|------|------|---------|
| B1 | Coach | `src/routes/(app)/coach/tactical/+page.svelte:226-244` | Empty/error roster falls back to `PLAYER 01…11` / `SLOT 01` placeholder tokens on War Room board (same class as match-day mock already fixed) |
| B2 | Coach | `src/lib/coach/match-day/CoachMatchDayView.svelte:76-77,264,419-421` | Scoreboard seeds hardcoded **2–1**; only GOAL bumps home locally; away never changes; never hydrated from Firestore |
| B3 | Coach | `src/routes/(app)/coach/+page.svelte:289-306` | Facility Ops card shows hardcoded "TURF 2 · LANE A", "GATE 04", "NEXUS-7" |
| B4 | Director | `src/lib/components/director/os/DirectorCommandCenter.svelte:87-90,148-171` | Overview KPI grid hardcodes "Brand sync: OK", "Policy posture: Enforce", "Data region: US", "Orchestration: Live" |

## P0 — broken core-loop CTAs

| # | Area | File | Problem |
|---|------|------|---------|
| C1 | Player | `ActiveBounties.svelte:512-514` + `activeBounties.ts:262-270` | Parent bounty **Claim Reward** only writes `sessionStorage` (`markQuestClaimed`); no payout callable / `bounties/{id}` write → dollar reward is UI-only |
| C2 | Coach | `src/lib/components/coach/TacticalHUD.svelte:24-43` | **DEPLOY PLAY** runs animation only; no `setDoc`/callable/assignment — advertised cartridge deploy is fake |
| C3 | Coach | `src/lib/components/coach/MessagesTab.svelte:197-198,505-507` | "Open training & schedule" → `goto('/coach/drills')` lands on drill **library**, not schedule tab |
| C4 | Coach | `tactical/+page.svelte:134-136` + `tacticalWarRoom.svelte.ts:246-247,448-455` | `showTacticalOverlay.set` is a no-op; Escape/closeOverlay reset engine but don't exit fullscreen War Room route; no in-page exit control |

## P1 — persistence / loop bugs

| # | Area | File | Problem |
|---|------|------|---------|
| D1 | Parent | `SeasonRegistration.svelte:167-180,383-386` | No Stripe key → **demo mode**: 2.5s delay → `onpaid()` with no charge and no `season_registrations` write |
| D2 | Parent | `parent/payments/+page.svelte:214-220` | `handlePaid()` mutates local array only, no Firestore re-query → can show "paid" while backend `none` |
| D3 | Parent | `messages/+page.svelte` + `ReportMessageIncident.svelte:62-64` | Incident report requires `profile.clubId`; parents without it blocked even when child team/club known via `parentLoungeTeams` |
| D4 | Parent | `BountyTerminal.svelte:125-134,415-427` | Bounty deploy allowed without funding source; server rejects → failed-submit loop, no redirect to funding panel |
| D5 | Director | `weatherOps.js:63-65,106-118` | `evaluateFieldWeatherLock` is a stub: no-op unless `WEATHER_LOCK_ENABLED`; with flag + no `TOMORROW_IO_API_KEY`, always `{status:'clear'}` (provider integration not built) |
| D6 | Director | `FieldOpsModule.svelte:197-288` + `DeploymentCalendar.svelte` | Two disconnected data models on one tab: booking grid uses top-level `fields`; deployment calendar uses `clubs/{clubId}/facilities` → can book on grid but can't schedule deployments until facilities separately registered |
| D7 | Director | `PlaybookTab.svelte:86-114,207-241` | Playbook is create+list only; no edit/delete for `club_playbooks` (append-only) |
| D8 | Director | `CoachClearancePanopticon.svelte:67-83` + `compliance/+page.svelte:19-25` | Staff clearance + billing audit use static `userProfile.clubId`, ignore workspace context switcher → multi-club directors see wrong club |
| D9 | Coach | `IntentEngine.svelte.ts:580-588` + `IntentHUD.svelte:535-548` | Name-only roster entries are `assignable:false`; team-scope Forge deploy silently excludes them (legacy rosters) |
| D10 | Coach | `CoachTeamRosterPanel.svelte:45-65` | Team Ops Roster tab is read-only; mutation only on Daily Intel SquadTelemetryView |

## P1 — shipped but never mounted (decide: wire or delete)

| # | Area | Component | Capability lost |
|---|------|-----------|-----------------|
| E1 | Player | `ClipAnalyzer.svelte` | AI movement analysis (real upload, but `analyzeMovement` returns `MOCK_RESPONSES`); unmounted |
| E2 | Player | `ProvingGrounds.svelte` | Self-report drill metrics; unmounted |
| E3 | Player | `MediaVault.svelte`, `TransferPortal.svelte` | Media management, player transfer; unmounted |
| E4 | Player | `DrillExecution.svelte`, `IntrinsicSanctuary.svelte`, `MemoryCapsule.svelte` | Firestore-backed but no `+page` import (parallel impls used instead) |
| E5 | Player | `PlayerActivityStreak.svelte` | `claimStreakFreeze` callable exists; UI unreachable |
| E6 | Coach | `NewMessageModal.svelte` | DM-thread composer; zero route imports |
| E7 | Coach | `FacilityScheduler.svelte`, `TacticalCommandBoard.svelte` | Facility booking; named-tactic save + `analyzeTacticWithAI`; unmounted |
| E8 | Coach | `trial-builder/+page.svelte` | Persists `trials` but no nav link |
| E9 | Director | `CoachAccountabilityModule.svelte` | `getAccountabilityReport` wired; never mounted |

## P2 — discoverability / nav

| # | Area | Problem |
|---|------|---------|
| F1 | Player | `PlayerShell` bottom nav omits `/player/skill-tree`, `/player/tracker`, `/challenges`, `/passport` (all routable) |
| F2 | Coach | `workspaceNav.js:37-43` omits `/coach/drills` (Field Station) and `/coach/tactical` (War Room) |
| F3 | Director | `?tab=vanguard`, `?tab=retention`, `/director/events` render but no nav entry; mobile strip covers 5 of 10+ tabs |
| F4 | Player | `skill-tree` is inspect-only (`[ DRILL MAPPINGS · BACKEND SPRINT ]`); no drill launch from nodes |
| F5 | Parent | `/parent/log-workout` drill list hardcoded per focus area, not from Firestore |

## Deploy-completeness (NOT code bugs — owner deploy checklist)

Ensure **every** codebase is deployed so name-addressed callables resolve:
- `deploy:core` — `logTrainingSession`, `parentReviewCompletionProof`
- `deploy:compliance` — household/VPC/COPPA, coach clearance, retention, OOB override
- `deploy:platform` — `directorUpsertField`, `secureBookField`, `directorInviteCoach`, `secureAllocateTeamSeats`
- `deploy:commerce` — `createRegistrationIntent`, `upsertTournamentEvent`
- `deploy:rl` — adaptive workout policy
- `deploy:integrations` — upload token, media, `evaluateFieldWeatherLock`
- `firestore.rules`

---

## Build order (proposed)

1. **P0 surgical code bugs** A1–A7 (small, isolated, high impact) ← start here
2. **P0 mock-data-on-live-surface** B1–B4 (empty-state pattern, like match-day fix already shipped)
3. **P0 broken CTAs** C1–C4
4. **P1 persistence bugs** D1–D10
5. **E-series** mount-or-delete decisions (needs product calls — surface to owner)
6. **F-series** nav/discoverability
