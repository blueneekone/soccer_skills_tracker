# Owner QA checklist

**Canonical manual testing** for product owner sign-off. Automated gates run via agents/CI — owner confirms pass and executes human-only steps below.

**Environment:** `sports-skill-tracker-dev` · **URL:** https://sstracker.app  
**Tenant:** club `qa_launch_2026` · team `qa_launch_2026_ppc`  
**Provision:** `node scripts/dev-tenant-reset.mjs --provision`

**Prerequisite:** Do not start manual QA until automated gates are green:

```bash
npm run check
npm run deploy:dev:verify
npm run smoke:dev
```

Cross-reference: [`PLATFORM_GAP_REGISTER.md`](../acquisition/PLATFORM_GAP_REGISTER.md) `ManualQaId` column · [`FUNCTIONAL_MVP.md`](./FUNCTIONAL_MVP.md)

> **Supersedes phased pair-program flow:** [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md) — use this checklist for sign-off; prior doc retained for historical phase notes.

---

## Phase 0 — Automated gates (agent/CI runs; owner confirms pass)

- [ ] **QA-000** `npm run check` exits 0
- [ ] **QA-000b** `npm run deploy:dev:verify` green
- [ ] **QA-000c** `npm run smoke:dev` green (post-deploy; hosting + callable probes)
- [ ] **QA-000d** CI green on latest `dev` push (`.github/workflows/ci.yml`)

---

## Phase 1 — VPC golden path & persona functional MVP

Accounts: `ecwaechtler@gmail.com` (super_admin) · `ecwaechtler+parent@gmail.com` · `ecwaechtler+coach@gmail.com` · operative via household.

### Player OS

| ID | Persona | URL | Steps | Expected | Automated pre-check |
|----|---------|-----|-------|----------|-------------------|
| QA-101 | Player | `/player/dashboard` | Sign in post-VPC child | HQ loads identity, missions rail, telemetry | `personaFunctionalMvp.test.ts` |
| QA-102 | Player | `/player/workout` | Free log workout | XP/streak updates on HQ after log | `coachMissionFlow.test.ts` |
| QA-103 | Player | `/player/workout` | 3×25 reps, bilateral **off** | 75 reps to `logTrainingSession` | — |
| QA-104 | Player | `/player/workout` | 1×10 reps, bilateral **on** | 20 reps (10×2) | — |
| QA-105 | Player | `/player/workout` | 30 min + RPE 5, time-only prescription | Session logs; rep count 0 OK | — |
| QA-106 | Player | `/player/dashboard` | View mission rail | Coach-assigned bounty visible | — |
| QA-107 | Player | `/player/dashboard` → Train | Accept intent → Start session | Train **locked by coach**; notes editable only | `coachMissionFlow.test.ts` |
| QA-108 | Player | `/player/workout` | Free log (no mission) | Duration max **120 min** | — |
| QA-109 | Player | `/player/armory` | SYNC IDENTITY | Default portrait or initials OK | — |
| QA-110 | Player | `/player/armory` | Album/set bonus path | 3.4 collectible path still works | — |
| QA-111 | Player | `/player/settings`, billing gates | Attempt gated routes pre/post VPC | VPC/billing gates correct | `epic51CoppaSignup.test.ts` |
| QA-112 | Player | `/player/tracker` | Open from shell nav | Tracker route reachable | `personaFunctionalMvp.test.ts` |

### Parent OS

| ID | Persona | URL | Steps | Expected | Automated pre-check |
|----|---------|-----|-------|----------|-------------------|
| QA-121 | Parent | `/parent/household` | Sign in → waiver | Household + linked operatives | `launchP0Fixes.test.ts` |
| QA-122 | Parent | `/parent/vpc` | VPC ceremony per child | Child training routes unlock | `epic51CoppaSignup.test.ts` |
| QA-123 | Parent | `/parent/log-workout` | Co-op log | Counts toward child progress | — |
| QA-124 | Parent | `/parent/dashboard` | Bounty terminal | Visible/functional | — |
| QA-125 | Parent | `/parent/dashboard` | Car Ride debrief | Surfaces when fixture pending | — |

**VPC golden path (ordered):**

- [ ] **QA-130** Admin bootstrap — super_admin confirms `qa_launch_2026` club/team/users
- [ ] **QA-131** Parent sign-in → passkey → household waiver on `/parent/household`
- [ ] **QA-132** VPC on `/parent/vpc` — auto-finalizes `vpcStatus`, `consent_records`
- [ ] **QA-133** Child operative login → Train/HQ (no `/vpc-pending` block)
- [ ] **QA-134** Coach assigns bounty → appears on player HQ → child trains

### Coach OS

| ID | Persona | URL | Steps | Expected | Automated pre-check |
|----|---------|-----|-------|----------|-------------------|
| QA-141 | Coach | `/coach` | Sign in cleared coach | Squad/roster loads | — |
| QA-142 | Coach | `/coach/forge` | Deploy intent/bounty | Appears on player HQ | `intentModule.test.ts` |
| QA-143 | Coach | `/coach/forge` | Sub-drill picker | Team + club drills (not global only) | `personaFunctionalMvp.test.ts` |
| QA-144 | Coach | `/coach/drills` | Spatial designer save | Persists to `teams/{teamId}/drills` | — |
| QA-145 | Coach | `/coach/match-day` | Open match-day | Roster from `player_lookup`; empty state OK | — |
| QA-146 | Coach | `/coach/logistics` | Compose announcement | Parents receive (Epic 4.1) | `commsSprint41.test.ts` |

### Cross-persona & RL

| ID | Persona | URL | Steps | Expected | Automated pre-check |
|----|---------|-----|-------|----------|-------------------|
| QA-151 | Coach → Player | HQ handoff | Coach bounty → player mission | 6k path works | `personaFunctionalMvp.test.ts` |
| QA-152 | Parent → Player | Co-op log | Parent logs for child | XP path updates | — |
| QA-153 | Coach → Player | `/messages` | Coach→minor DM attempt | Blocked (SafeSport) | `commsSprint42.test.ts` |
| QA-154 | Player | `/player/dashboard` | Adaptive homework band | Visible (heuristic OK at `abPercent: 0`) | `playerRlFunctional.test.ts` |
| QA-155 | Super admin | `/admin/rl-policy` | Optional: `abPercent > 0` smoke | Policy pill + `rl_transitions` (launch default skips) | — |

### Coach clearance (Phase 1 extension)

| ID | Persona | URL | Steps | Expected |
|----|---------|-----|-------|----------|
| QA-161 | Coach | `/compliance` | Uncleared coach sign-in | Redirect to compliance SIEM |
| QA-162 | Director | `/director/compliance` | Clearance matrix | Loads once; audit log below |
| QA-163 | Coach | `/coach` | Post-clearance | Lands on coach HQ |

---

## Phase 2 — P2 overnight features (manual eyes)

- [ ] **QA-201** Director registration assign panel — paid registrant → team assign (`RegistrationRosterAssignPanel`)
- [ ] **QA-202** Parent installments UI — `/parent/payments` schedule + partial status
- [ ] **QA-203** Tournament bracket — director seed/score; public read-only bracket on published event
- [ ] **QA-204** Checkr embed — coach clearance iframe loads; webhook path documented
- [ ] **QA-205** Player tracker nav — bottom rail + enterprise shell parity
- [ ] **QA-206** Federation CSV export — director/registrar `exportStateRoster` download
- [ ] **QA-207** Live stream embed — schedule URL → parent watch (teen external-link fallback)
- [ ] **QA-208** `/acquisition` marketing landing — CTA + footer links
- [ ] **QA-209** Capacitor shell — `npm run native:prepare`; WebView loads sstracker.app (simulator optional)
- [ ] **QA-210** FCM push — parent grants notification permission; director broadcast receives push (device)
- [ ] **QA-221** Director drag-drop roster — paid registrant dragged onto team roster slot (GotSport-style; `comp-roster-dragdrop`)
- [ ] **QA-222** Tournament public bracket — director seed order + double-elim; buyer read-only bracket on marketing event page
- [ ] **QA-223** Federation sync status — director `StateRosterExportPanel` shows last sync time + pending/failed badge
- [ ] **QA-224** Live stream on schedule/match-day — coach sets `liveStreamUrl` on event; parent/player prominent watch link

---

## Phase 3 — Player OS visual VA (if register lists open 6f/6j items)

Screenshot / must-feel sign-off on https://sstracker.app at **1280px** and **390px**:

- [ ] **QA-301** Armory hologram dossier (6f) — holo frame + bust well; no broken PNG stack
- [ ] **QA-302** Armory accent canon — `#00d4ff` / qa-strap per mandates
- [ ] **QA-303** HQ void ≥40% / matte ≤35% (6j rubric)
- [ ] **QA-304** Stats investigation workspace — telemetry band (no nav tile chrome)
- [ ] **QA-305** Train diegetic sliders — `pw-loadbar` vs native range
- [ ] **QA-306** OperativeLoadoutStudio — Swal replaced with diegetic overlay
- [ ] **QA-307** PlayerShell — no generic `.bento-card` chrome injection on Player routes
- [ ] **QA-308** Full VA matrix — [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](./PLAYER_OS_VISUAL_ACCEPTANCE.md) rows owner signs

---

## Phase 4 — Acquisition smoke (demo script)

Walk [`DEMO_SCRIPT.md`](../acquisition/DEMO_SCRIPT.md) — owner records video separately; checklist is pass/fail per step.

- [ ] **QA-401** Exec cut step 1 — Parent household
- [ ] **QA-402** Exec cut step 2 — VPC ceremony
- [ ] **QA-403** Exec cut step 3 — Coach intent deploy
- [ ] **QA-404** Exec cut step 4 — Player Train + XP
- [ ] **QA-405** Exec cut step 5 — Parent dashboard parity
- [ ] **QA-406** Exec cut step 6 — Messages SafeSport gate

---

## Phase 5 — Owner-only diligence (not agent build)

- [ ] **QA-501** Legal / IP review (independent acquirer diligence)
- [ ] **QA-502** Demo video recorded from DEMO_SCRIPT
- [ ] **QA-503** TRACTION / PROSPECTUS / ONE_PAGER refreshed post Wave 3 merge
- [ ] **QA-504** NCSI vendor parity documented (acquirer swap) — no build unless reopened
- [ ] **QA-505** Federation Phase 4 API credentials — acquirer GTM decision
- [ ] **QA-506** Holo VA bust variants — [`AVATAR_MANIFEST.md`](../acquisition/AVATAR_MANIFEST.md)
- [ ] **QA-507** Platform visual system (Gemini research) — read-only; sign waiver if deferring

---

## Sign-off

| Field | Value |
|-------|-------|
| Date | |
| Git commit SHA | |
| Deploy record | [`DEPLOY_RECORD.json`](../acquisition/DEPLOY_RECORD.json) |
| All QA-xxx checked or waived | |

**Waived items (reason required):**

```
QA-id: reason
```

**Owner signature:** _________________________
