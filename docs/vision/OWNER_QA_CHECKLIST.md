# Owner QA checklist

**Canonical manual testing** for product owner sign-off. Automated gates run via agents/CI — owner confirms pass and executes human-only steps below.

**Environment:** `sports-skill-tracker-dev`  
**Primary QA URLs:** [https://sports-skill-tracker-dev.web.app](https://sports-skill-tracker-dev.web.app) (preferred if custom domain SSL fails) · [https://sstracker.app](https://sstracker.app) (custom domain — may SSL-fail on some clients)  
**Tenant:** club `qa_launch_2026` · team `qa_launch_2026_ppc`  
**Provision:** `node scripts/dev-tenant-reset.mjs --provision`

**Accounts:** `ecwaechtler@gmail.com` (super_admin) · `ecwaechtler+parent@gmail.com` · `ecwaechtler+coach@gmail.com` · operative via household

**Session rules:**

- **Sign out or use incognito between persona switches** — stale auth cookies cause false failures.
- **Do not start Phase 5 (Player) until Phase 3 VPC (QA-132) passes** — minors cannot reach Player OS until household waiver + VPC complete.

**Owner workflow:** Log issues in each phase notes block as you go. Do not stop mid-QA to fix — batch P0/P1 items for a single agent session after Phase 8 or at sign-off.

**Prerequisite:** Do not start manual QA until automated gates are green:

```bash
npm run check
npm run deploy:dev:verify
npm run smoke:dev
```

Cross-reference: [`PLATFORM_GAP_REGISTER.md`](../acquisition/PLATFORM_GAP_REGISTER.md) `ManualQaId` column · [`FUNCTIONAL_MVP.md`](./FUNCTIONAL_MVP.md) · [`DEMO_SCRIPT.md`](../acquisition/DEMO_SCRIPT.md) (exec cut order)

> **Supersedes phased pair-program flow:** [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md) — use this checklist for sign-off; prior doc retained for historical phase notes.

---

## Phase 0 — Automated gates (agent/CI runs; owner confirms pass)

**Gate:** Do not proceed until all four commands pass on latest `dev` deploy.

- [x] **QA-000** `npm run check` exits 0 — gap register G-01
- [x] **QA-000b** `npm run deploy:dev:verify` green — gap register A-06
- [x] **QA-000c** `npm run smoke:dev` green (post-deploy; hosting + callable probes) — gap register M-06
- [x] **QA-000d** CI green on latest `dev` push (`.github/workflows/ci.yml`) — gap register A-04

### Phase 0 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 1 — Site access & environment

**Gate:** Do not proceed until hosting loads, auth works, legal pages render, and tenant provision succeeds.

- [ ] **QA-010** Hosting reachable — `/login` loads on active QA URL (web.app OK if sstracker.app SSL fails)
- [ ] **QA-011** Auth — magic link + Google sign-in for parent account
- [ ] **QA-012** Legal pages — `/privacy` (and terms if routed) load
- [ ] **QA-013** Provision — `node scripts/dev-tenant-reset.mjs --provision` succeeds

### Phase 1 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 2 — Admin bootstrap

**Gate:** Do not proceed until super_admin confirms QA tenant club/team/users exist.

- [ ] **QA-130** Admin bootstrap — super_admin confirms `qa_launch_2026` club/team/users provisioned

### Phase 2 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 3 — Parent onboarding & VPC (UNLOCK GATE — blocks all player QA)

**Gate:** Do not proceed to Phase 5 (Player) until **QA-132** passes and **QA-133** confirms child can reach player routes without `/vpc-pending`.

Order strictly (matches [`FUNCTIONAL_MVP.md`](./FUNCTIONAL_MVP.md) VPC golden path § and [`DEMO_SCRIPT.md`](../acquisition/DEMO_SCRIPT.md) exec cut steps 1–2):

- [ ] **QA-131** Parent sign-in → passkey (if RP origin matches) → `/parent/household` — gap register A-03
- [ ] **QA-121** Household + linked operatives + waiver on `/parent/household` — `parentSignCoppaWaiver` / `households.coppaSigned` — gap register F-02 · pre-check: `launchP0Fixes.test.ts`
- [ ] **QA-122** VPC ceremony `/parent/vpc` per child — gap register F-02 · pre-check: `epic51CoppaSignup.test.ts`
- [ ] **QA-132** VPC auto-finalizes `vpcStatus`, `consent_records` (no director approval step) — gap register F-02
- [ ] **QA-133** Child operative login — no `/vpc-pending` block; can reach player routes — gap register F-02
- [ ] **QA-111** Training routes **blocked before** VPC and **unlocked after** — `/player/settings`, billing gates — gap register F-01 · pre-check: `epic51CoppaSignup.test.ts`

### Phase 3 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 4 — Coach clearance (before coach HQ if testing fresh uncleared coach)

**Gate:** Do not proceed to coach HQ demo until clearance path verified (skip if coach already cleared on tenant).

- [ ] **QA-161** Uncleared coach sign-in → `/compliance` redirect — gap register F-03
- [ ] **QA-204** Checkr embed loads; webhook path documented — gap register D-01 · pre-check: `complianceCheckr.guard.test.js`
- [ ] **QA-162** Director compliance matrix + audit log on `/director/compliance` — gap register F-03
- [ ] **QA-163** Cleared coach lands on `/coach` — gap register F-03

### Phase 4 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 5 — Coach → Player development loop (core acquisition demo)

**Gate:** Do not start this phase until Phase 3 **QA-132** passes. Sign out / incognito when switching coach → player.

Order (matches [`DEMO_SCRIPT.md`](../acquisition/DEMO_SCRIPT.md) exec cut steps 3–4):

- [ ] **QA-141** Coach HQ `/coach` — squad/roster loads — gap register F-03
- [ ] **QA-142** Forge deploy intent/bounty on `/coach/forge` — appears on player HQ — gap register F-03 · pre-check: `intentModule.test.ts`
- [ ] **QA-143** Sub-drill picker — team + club drills (not global only) — gap register F-03 · pre-check: `personaFunctionalMvp.test.ts`
- [ ] **QA-144** Spatial designer save on `/coach/drills` — persists to `teams/{teamId}/drills` — gap register F-03 (optional same session)
- [ ] **QA-134** Coach bounty → player HQ mission rail — gap register F-02
- [ ] **QA-106** Mission rail visible on `/player/dashboard` — gap register F-01
- [ ] **QA-101** Player HQ loads post-VPC — identity, missions rail, telemetry — gap register F-01 · pre-check: `personaFunctionalMvp.test.ts`
- [ ] **QA-107** Accept intent → Train **locked by coach**; notes editable only — gap register K-03 · pre-check: `coachMissionFlow.test.ts`
- [ ] **QA-102** Free log workout on `/player/workout` — XP/streak updates on HQ — gap register F-01 · pre-check: `coachMissionFlow.test.ts`
- [ ] **QA-103** Workout smoke — 3×25 reps, bilateral **off** → 75 reps to `logTrainingSession`
- [ ] **QA-104** Workout smoke — 1×10 reps, bilateral **on** → 20 reps (10×2)
- [ ] **QA-105** Workout smoke — 30 min + RPE 5, time-only prescription — session logs; rep count 0 OK
- [ ] **QA-108** Free log (no mission) — duration max **120 min**
- [ ] **QA-151** Coach → Player HQ handoff — coach bounty → player mission 6k path — gap register F-04 · pre-check: `personaFunctionalMvp.test.ts`
- [ ] **QA-154** Adaptive homework band on `/player/dashboard` — visible (heuristic OK at `abPercent: 0`) — gap register F-04 · pre-check: `playerRlFunctional.test.ts`

### Phase 5 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 6 — Parent table-stakes parity

**Gate:** Do not proceed until Phase 5 core loop passes (coach bounty → player XP).

- [ ] **QA-123** Co-op log on `/parent/log-workout` — counts toward child progress — gap register F-02
- [ ] **QA-124** Dashboard bounty terminal on `/parent/dashboard` — visible/functional — gap register F-02
- [ ] **QA-125** Car Ride debrief on `/parent/dashboard` — surfaces when fixture pending — gap register F-02
- [ ] **QA-202** Parent installments `/parent/payments` — schedule + partial status — gap register B-01, B-05 · pre-check: `paymentInstallments.test.ts`
- [ ] **QA-210** FCM push prefs + director broadcast (device) — gap register D-07, D-08, D-09, H-03 · pre-check: `commsSprint49.test.ts`
- [ ] **QA-152** Parent co-op → child XP path — gap register F-04

### Phase 6 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 7 — Comms & SafeSport

**Gate:** Do not proceed until Phase 5 player loop verified.

- [ ] **QA-146** Coach logistics announcement on `/coach/logistics` — parents receive — gap register F-03 · pre-check: `commsSprint41.test.ts`
- [ ] **QA-153** Coach → minor DM blocked on `/messages` — SafeSport — gap register F-04 · pre-check: `commsSprint42.test.ts`

### Exec cut verification (DEMO_SCRIPT steps 1–6 — checklist only; steps live in phases above)

- [ ] **QA-401** Exec cut step 1 — Parent household (Phase 3: QA-121)
- [ ] **QA-402** Exec cut step 2 — VPC ceremony (Phase 3: QA-122, QA-132)
- [ ] **QA-403** Exec cut step 3 — Coach intent deploy (Phase 5: QA-142)
- [ ] **QA-404** Exec cut step 4 — Player Train + XP (Phase 5: QA-107, QA-102–105)
- [ ] **QA-405** Exec cut step 5 — Parent dashboard parity (Phase 6: QA-124–125)
- [ ] **QA-406** Exec cut step 6 — Messages SafeSport (above)

### Phase 7 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 8 — Director / club ops (competitive + sell diligence)

**Gate:** Do not proceed until Phase 5–7 functional paths pass.

- [ ] **QA-201** Director registration assign panel — paid registrant → team assign — gap register B-02 · pre-check: `registrationLaunch.test.ts`
- [ ] **QA-221** Drag-drop roster — GotSport-style paid registrant onto team slot — gap register B-03 · pre-check: `registrationRosterDragDrop.test.ts`
- [ ] **QA-202** Cross-ref payments if not done in Phase 6 — `/parent/payments` — gap register B-01
- [ ] **QA-203** Tournament bracket — director seed/score; public read-only bracket — gap register E-01, E-02, E-04 · pre-check: `p2TournamentBracket.test.ts`
- [ ] **QA-222** Double-elim public marketing bracket — gap register E-03 · pre-check: `p2TournamentBracket.test.ts`
- [ ] **QA-206** Federation CSV export — director/registrar `exportStateRoster` download — gap register C-01, C-02, C-05 · pre-check: `ngbExportLaunch.test.ts`
- [ ] **QA-223** Federation sync status panel — last sync time + pending/failed badge — gap register C-03 · pre-check: `ngbExportLaunch.test.ts`
- [ ] **QA-224** Live stream on schedule/match-day — coach sets `liveStreamUrl`; parent/player watch link — gap register D-03, D-04 · pre-check: `liveStreamLaunch.test.ts`
- [ ] **QA-207** Live stream embed fallback — teen external link when embed blocked — gap register D-03 · pre-check: `liveStreamLaunch.test.ts`
- [ ] **QA-145** Coach match-day roster on `/coach/match-day` — roster from `player_lookup`; empty state OK — gap register F-03
- [ ] **QA-225** Eligibility matrix — director configure + enforce on registration
- [ ] **QA-226** Public tryout flow — register → RSVP narrative if provisioned (`/tryouts/{programId}`)
- [ ] **QA-227** Public registration — `/register/{clubId}` or club landing CTA
- [ ] **QA-228** Director VPC read-only audit queue — `VpcApprovalQueue` / `consent_records`; no approve action required
- [ ] **QA-229** End-to-end paid registration → assign/drag to roster

### Phase 8 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 9 — Player depth (after core loop)

**Gate:** Do not proceed until Phase 5 core loop passes.

- [ ] **QA-109** Armory SYNC IDENTITY on `/player/armory` — default portrait or initials OK — gap register I-01
- [ ] **QA-110** Armory album/set bonus path — 3.4 collectible path still works
- [ ] **QA-112** Tracker nav — `/player/tracker` reachable from shell — gap register F-01 · pre-check: `personaFunctionalMvp.test.ts`
- [ ] **QA-205** Tracker shell parity — bottom rail + enterprise shell — gap register F-01
- [ ] **QA-155** Optional RL policy `/admin/rl-policy` — `abPercent > 0` smoke — gap register K-02 · **waivable:** heuristic only at launch (`abPercent: 0`)

### Phase 9 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 10 — Acquisition & install surfaces

**Gate:** Do not proceed until Phase 5–8 sell-critical paths pass or are waived with reason.

- [ ] **QA-208** `/acquisition` marketing landing — CTA + footer links
- [ ] **QA-209** Capacitor shell — `npm run native:prepare`; WebView loads active QA URL — gap register H-01, H-04 · pre-check: `nativeShellLaunch.test.ts`
- [ ] **QA-401–405** Exec cut walkthrough — subset of phases above; checklist only (see Phase 7 subsection; no duplicate steps)
- [ ] **QA-230** PWA install prompt — Android `beforeinstallprompt` or iOS Add to Home Screen

### Phase 10 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 11 — Player OS visual VA (waivable for functional sale)

**Gate:** Required only if claiming premium visual OS; **waivable if selling functional OS**.

Screenshot / must-feel sign-off on active QA URL at **1280px** and **390px**:

- [ ] **QA-301** Armory hologram dossier (6f) — holo frame + bust well; no broken PNG stack — gap register J-01
- [ ] **QA-302** Armory accent canon — `#00d4ff` / qa-strap per mandates — gap register J-08
- [ ] **QA-303** HQ void ≥40% / matte ≤35% (6j rubric) — gap register J-06
- [ ] **QA-304** Stats investigation workspace — telemetry band (no nav tile chrome) — gap register J-07
- [ ] **QA-305** Train diegetic sliders — `pw-loadbar` vs native range — gap register J-09
- [ ] **QA-306** OperativeLoadoutStudio — Swal replaced with diegetic overlay — gap register J-03
- [ ] **QA-307** PlayerShell — no generic `.bento-card` chrome injection on Player routes — gap register J-10
- [ ] **QA-308** Full VA matrix — [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](./PLAYER_OS_VISUAL_ACCEPTANCE.md) rows owner signs — gap register J-04

> **Note:** Waivable if selling functional OS; required for premium visual claim.

### Phase 11 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 12 — Owner diligence (not agent build)

**Gate:** Agent build complete; acquirer / legal review only.

- [ ] **QA-501** Legal / IP review (independent acquirer diligence) — gap register M-03
- [ ] **QA-502** Demo video recorded from [`DEMO_SCRIPT.md`](../acquisition/DEMO_SCRIPT.md) — gap register M-02
- [ ] **QA-503** TRACTION / PROSPECTUS / ONE_PAGER refreshed post Wave 3 merge — gap register M-04, L-04
- [ ] **QA-504** NCSI vendor parity documented (acquirer swap) — **Partial** per [`NOTABLE_GAPS.md`](../acquisition/NOTABLE_GAPS.md) (Checkr lifecycle complete; NCSI iframe = acquirer vendor swap) — gap register D-02 · no build unless reopened
- [ ] **QA-505** Federation Phase 4 API credentials — **Partial** per [`NOTABLE_GAPS.md`](../acquisition/NOTABLE_GAPS.md) (CSV v1 + Phase 3 sync shipped; 38-body API = acquirer GTM decision) — gap register C-04
- [ ] **QA-506** Holo VA bust variants — **Blocked** (post-launch busts) — [`AVATAR_MANIFEST.md`](../acquisition/AVATAR_MANIFEST.md) · gap register I-02, I-03
- [ ] **QA-507** Platform visual system (Gemini research) — read-only; sign waiver if deferring — gap register J-05

### Phase 12 — Owner notes

| Field | Value |
| --- | --- |
| Phase result | Pass / Pass with issues / Blocked / Waived |
| Date completed | |
| Tester/browser | |

**Issues found**

```
QA-xxx: [P0|P1|P2] — what happened — expected vs actual
```

**Waivers this phase**

```
QA-xxx: reason
```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Sign-off

| Field                        | Value                                                     |
| ---------------------------- | --------------------------------------------------------- |
| Date                         |                                                           |
| Git commit SHA               |                                                           |
| Deploy record                | [`DEPLOY_RECORD.json`](../acquisition/DEPLOY_RECORD.json) |
| All QA-xxx checked or waived |                                                           |

**Waived items (reason required):**

```
QA-id: reason
```

**Owner signature:** _________________________
