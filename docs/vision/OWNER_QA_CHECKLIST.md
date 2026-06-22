# Owner QA checklist

**Canonical manual testing** for product owner sign-off. Automated gates run via agents/CI — owner confirms pass and executes human-only steps below.

> **Tier authority:** `[PRODUCT_SURFACE_REGISTRY.md](./PRODUCT_SURFACE_REGISTRY.md)` — **Phase 11** = Tier 1 Player OS visual rubric (waivable for functional sale). **Tier 2** QA items (e.g. QA-143/144 Field Station, Phase 9 player depth) may be waived per registry §0 without blocking acquisition sign-off.

## QA status: Phases 0–4 complete · Phase 4b + 5 = acquisition P0 · Phases 6–12 = depth/diligence

**Phases 0–4 progress preserved** (checkmarks + owner notes below). **Acquisition P0** = **Phase 4b** (NAV-IMPL chrome) + **Phase 5** (core loop). **Depth/diligence** = Phases 6–12 + optional **Phase 13** capstone.

`[PLATFORM_WORKFLOW_CANON.md](./PLATFORM_WORKFLOW_CANON.md)` **§8** WORKFLOW-INTEGRITY audit shipped — owner **live retest Phase 5** still required for sign-off. **VS-3-Forge shipped** (`ForgeDeployPanel.svelte`) — re-run QA-142 on live @390px + desktop. **WORKFLOW-INTEGRITY** (06/19): GP-ACQ-04b HQ return after Train log shipped.

**15-minute exec cut:** Session A below → Phase 5 exec-cut lap + Phase 6 (QA-124/125) + Phase 7 (QA-153/406).

**Environment:** `sports-skill-tracker-dev`  
**Primary QA URLs:** [https://sports-skill-tracker-dev.web.app](https://sports-skill-tracker-dev.web.app) (preferred if custom domain SSL fails) · [https://sstracker.app](https://sstracker.app) (custom domain — may SSL-fail on some clients)  
**Tenant:** club `qa_launch_2026` · team `qa_launch_2026_ppc`  
**Provision:** `node scripts/dev-tenant-reset.mjs --provision --club-id qa_launch_2026 --team-id qa_launch_2026_ppc` (auto-purges stale operatives)

**Team dispatch code (QA):** `QA-PP26` on team `qa_launch_2026_ppc`

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

Cross-reference: `[PLATFORM_GAP_REGISTER.md](../acquisition/PLATFORM_GAP_REGISTER.md)` `ManualQaId` column · `[FUNCTIONAL_MVP.md](./FUNCTIONAL_MVP.md)` · `[DEMO_SCRIPT.md](../acquisition/DEMO_SCRIPT.md)` (exec cut order)

> **Supersedes phased pair-program flow:** `[QA_DEV_PERSONA_VERIFICATION.md](../QA_DEV_PERSONA_VERIFICATION.md)` — use this checklist for sign-off; prior doc retained for historical phase notes.

---

## Platform workflow map (how QA maps to the product)

One-page guide — run phases in order below; use **Session A** for the 15-minute exec cut.

### Prerequisite chain

From `[PLATFORM_WORKFLOW_CANON.md](./PLATFORM_WORKFLOW_CANON.md)` §1:

`GP-GATE` → `GP-PARENT` (steps 1–2) **unlocks player routes** → `GP-COACH`/Forge step 3 feeds `GP-ACQ` player steps → `GP-PARENT` dashboard step 5 → `GP-ACQ` messages step 6.

Sign out or incognito between persona switches.

### Four gold paths


| Gold path     | Purpose                    | Primary phases | Exec cut?      |
| ------------- | -------------------------- | -------------- | -------------- |
| **GP-GATE**   | Trust/compliance gates     | 1, 3, 4        | Yes (implicit) |
| **GP-PARENT** | Co-op partner loop         | 3, 6           | Steps 1–2, 5   |
| **GP-COACH**  | Sideline daily loop        | 4, 5           | Step 3         |
| **GP-ACQ**    | Full acquisition narrative | 3, 5, 6, 7     | Steps 1–6      |


### Recommended owner sessions


| Session                     | Scope                    | Time           | Phases / steps                                                                                              |
| --------------------------- | ------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------- |
| **A — Exec cut**            | P0 acquisition narrative | ~45–60 min     | 3 (if not done) → **5** (core) → **6** (QA-124/125) → **7** (QA-153/406) — maps GP-ACQ-01 through GP-ACQ-06 |
| **B — Navigation + mobile** | P0 NAV-IMPL chrome       | ~30 min        | **Phase 4b** — all personas @390px + spot @1280px                                                           |
| **C — Depth + diligence**   | P1/P2 waivable           | As time allows | Phases 8–12                                                                                                 |


### UX state reminder

Every step should show **Entry / Loading / Empty / Blocked / Error / Success** behavior per `[PLATFORM_WORKFLOW_CANON.md](./PLATFORM_WORKFLOW_CANON.md)` §6. Owner notes: log **expected vs actual**; cite `step_id` (e.g. GP-ACQ-04b) when filing issues.

### Tier 1 coverage matrix (registry → QA)

Authority: `[PRODUCT_SURFACE_REGISTRY.md](./PRODUCT_SURFACE_REGISTRY.md)` §1 — **15 Tier 1 rows**. Tier 2 items stay waivable per registry §0; do not demote Tier 1 to optional.


| Registry id | Route               | workflow_id                | Gold path step(s)        | QA id(s)                               | Phase | Tier | Waivable?                   |
| ----------- | ------------------- | -------------------------- | ------------------------ | -------------------------------------- | ----- | ---- | --------------------------- |
| PS-A01      | `/login`            | `WF-TRUST-LOGIN`           | GP-GATE-01               | QA-010, QA-011                         | 1     | 1    | No                          |
| PS-A02      | `/home`             | `WF-TRUST-ROUTER`          | GP-GATE-02               | QA-010                                 | 1     | 1    | No                          |
| PS-A03      | `/setup`            | `WF-TRUST-SETUP`           | GP-GATE-03               | QA-013                                 | 1     | 1    | No                          |
| PS-A04      | `/vpc-pending`      | `WF-VPC-GATE`              | GP-GATE-04               | QA-133                                 | 3     | 1    | No                          |
| PS-A05      | `/compliance`       | `WF-TRUST-COACH-CLEARANCE` | GP-GATE-05               | QA-161, QA-204                         | 4     | 1    | No                          |
| PS-A06      | `/privacy`          | `WF-TRUST-PRIVACY`         | GP-GATE-06               | QA-012                                 | 1     | 1    | No                          |
| PS-P01      | `/parent/household` | `WF-PARENT-HOUSEHOLD`      | GP-PARENT-01, GP-ACQ-01  | QA-121, QA-131, QA-401                 | 3     | 1    | No                          |
| PS-P02      | `/parent/vpc`       | `WF-PARENT-VPC`            | GP-PARENT-02, GP-ACQ-02  | QA-122, QA-132, QA-402                 | 3     | 1    | No                          |
| PS-P03      | `/parent/dashboard` | `WF-PARENT-COOP`           | GP-PARENT-04, GP-ACQ-05  | QA-124, QA-125, QA-405                 | 6     | 1    | No                          |
| PS-C01      | `/coach`            | `WF-COACH-INTEL`           | GP-COACH-01, GP-COACH-04 | QA-141, QA-163                         | 5     | 1    | No                          |
| PS-C02      | `/coach/forge`      | `WF-COACH-FORGE`           | GP-COACH-02, GP-ACQ-03   | QA-142, QA-134, QA-403                 | 5     | 1    | No                          |
| PS-PL01     | `/player/dashboard` | `WF-PLAYER-HQ`             | GP-ACQ-04a, GP-COACH-03  | QA-101, QA-106, QA-151, QA-154, QA-404 | 5     | 1    | No                          |
| PS-PL02     | `/player/workout`   | `WF-PLAYER-TRAIN`          | GP-ACQ-04b               | QA-102–108, QA-107                     | 5     | 1    | No                          |
| PS-PL03     | `/stats`            | `WF-PLAYER-STATS`          | GP-ACQ-04c               | QA-304                                 | 11    | 1    | No (waivable exec cut only) |
| PS-X01      | `/messages`         | `WF-COMMS-SAFESPORT`       | GP-ACQ-06                | QA-153, QA-406                         | 7     | 1    | No                          |


### Gold path step index (step_id → QA)

Compact lookup — full criteria in `[PLATFORM_WORKFLOW_CANON.md](./PLATFORM_WORKFLOW_CANON.md)` §2.


| step_id      | Route                 | Success (canon, one line)                               | QA id(s)                       | Phase |
| ------------ | --------------------- | ------------------------------------------------------- | ------------------------------ | ----- |
| GP-GATE-01   | `/login`              | Redirect to `/home` after authenticate                  | QA-010, QA-011                 | 1     |
| GP-GATE-02   | `/home`               | Persona workspace redirect                              | QA-010                         | 1     |
| GP-GATE-03   | `/setup`              | Router resumes after profile provision                  | QA-013                         | 1     |
| GP-GATE-04   | `/vpc-pending`        | Blocked copy + parent hint; no training routes          | QA-133                         | 3     |
| GP-GATE-05   | `/compliance`         | Redirect to `/coach` when cleared                       | QA-161, QA-204                 | 4     |
| GP-GATE-06   | `/privacy`            | Page renders                                            | QA-012                         | 1     |
| GP-ACQ-01    | `/parent/household`   | Linked operative(s) visible; waiver state clear         | QA-121, QA-131, QA-401         | 3     |
| GP-ACQ-02    | `/parent/vpc`         | `consent_records` written; child unlocks                | QA-122, QA-132, QA-402         | 3     |
| GP-ACQ-03    | `/coach/forge`        | Deploy intent with prescription to player (§3 Forge)    | QA-142, QA-134, QA-403         | 5     |
| GP-ACQ-04a   | `/player/dashboard`   | Coach intent in ActiveBounties; Train CTA arms          | QA-101, QA-106, QA-151, QA-404 | 5     |
| GP-ACQ-04b   | `/player/workout`     | XP/streak updates on HQ return                          | QA-102–108, QA-107             | 5     |
| GP-ACQ-04c   | `/stats`              | Radar + chart bands load; calm investigation workspace  | QA-304                         | 11    |
| GP-ACQ-05    | `/parent/dashboard`   | RSVP strip + bounty terminal visible                    | QA-124, QA-125, QA-405         | 6     |
| GP-ACQ-06    | `/messages`           | Household threads load; coach→minor DM blocked          | QA-153, QA-406                 | 7     |
| GP-COACH-01  | `/coach`              | ≥3 roster signals or explicit empty; Forge link obvious | QA-141, QA-163                 | 5     |
| GP-COACH-02  | `/coach/forge`        | §3 Forge criteria                                       | QA-142, QA-134                 | 5     |
| GP-COACH-03  | `/player/dashboard`   | Bounty accepted; XP on return                           | QA-101, QA-107, QA-151         | 5     |
| GP-COACH-04  | `/coach`              | Telemetry reflects logged session                       | QA-141                         | 5     |
| GP-PARENT-01 | `/parent/household`   | Waiver timestamp; team dispatch linked                  | QA-121, QA-131                 | 3     |
| GP-PARENT-02 | `/parent/vpc`         | Per-child grant success                                 | QA-122, QA-132                 | 3     |
| GP-PARENT-03 | `/parent/log-workout` | XP counts toward player progress                        | QA-123                         | 6     |
| GP-PARENT-04 | `/parent/dashboard`   | Co-op Command bands visible                             | QA-124, QA-125                 | 6     |


---

## Phase 0 — Automated gates (agent/CI runs; owner confirms pass)

**Gate:** Do not proceed until all four commands pass on latest `dev` deploy.

- [x] **QA-000** `npm run check` exits 0 — gap register G-01
- [x] **QA-000b** `npm run deploy:dev:verify` green — gap register A-06
- [x] **QA-000c** `npm run smoke:dev` green (post-deploy; hosting + callable probes) — gap register M-06
- [x] **QA-000d** CI green on latest `dev` push (`.github/workflows/ci.yml`) — gap register A-04

### Phase 0 — Owner notes


| Field          | Value                 |
| -------------- | --------------------- |
| Phase result   | Pass                  |
| Date completed | 06/17/2026            |
| Tester/browser | Evan Waechtler/Chrome |


**Issues found**

```

```

**Waivers this phase**

```

```

- [x] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 1 — Site access & environment

**Gate:** Do not proceed until hosting loads, auth works, legal pages render, and tenant provision succeeds.

- [x] **QA-010** Hosting reachable — `/login` loads on active QA URL (web.app OK if sstracker.app SSL fails)
- [x] **QA-011** Auth — magic link + Google sign-in for parent account
- [x] **QA-012** Legal pages — `/privacy` (and terms if routed) load
- [x] **QA-013** Provision — `node scripts/dev-tenant-reset.mjs --provision` succeeds

### Phase 1 — Owner notes


| Field          | Value                 |
| -------------- | --------------------- |
| Phase result   | Pass with issues      |
| Date completed | 06/17/2026            |
| Tester/browser | Evan Waechtler/Chrome |


**Issues found**

```

```

**Waivers this phase**

```

```

- [x] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 2 — Admin bootstrap

**Gate:** Do not proceed until super_admin confirms QA tenant club/team/users exist.

- [x] **QA-130** Admin bootstrap — super_admin confirms `qa_launch_2026` club/team/users provisioned

### Phase 2 — Owner notes


| Field          | Value                 |
| -------------- | --------------------- |
| Phase result   | Pass                  |
| Date completed | 06/17/2026            |
| Tester/browser | Evan Waechtler/Chrome |


**Issues found**

```

```

**Waivers this phase**

```

```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 3 — Parent onboarding & VPC (UNLOCK GATE — blocks all player QA)

**Gate:** Do not proceed to Phase 5 (Player) until **QA-132** passes and **QA-133** confirms child can reach player routes without `/vpc-pending`.

Order strictly (matches `[FUNCTIONAL_MVP.md](./FUNCTIONAL_MVP.md)` VPC golden path § and `[DEMO_SCRIPT.md](../acquisition/DEMO_SCRIPT.md)` exec cut steps 1–2):

- [x] **QA-131** Parent sign-in → passkey (if RP origin matches) → `/parent/household` — gap register A-03
- [x] **QA-121** Household + linked operatives + waiver on `/parent/household` — `parentSignCoppaWaiver` / `households.coppaSigned` — gap register F-02 · pre-check: `launchP0Fixes.test.ts` · **FIELD-CHROME-HOTFIX-1:** clearance row must exit `SCANNING…` within ~2s (shows `PENDING SIGNATURE` or `SIGNED`; never stuck) · **NAV-WORKFLOW-INTEGRITY (06/20): owner live retest required** — prior pass may be invalid if clearance stuck SCANNING or Menu pin dead on `/parent/household` @390px; re-verify after deploy
- [x] **QA-122** VPC ceremony `/parent/vpc` per child — gap register F-02 · pre-check: `epic51CoppaSignup.test.ts`
- [x] **QA-132** VPC auto-finalizes `vpcStatus`, `consent_records` (no director approval step) — gap register F-02
- [x] **QA-133** Child operative login — no `/vpc-pending` block; can reach player routes — gap register F-02
- [x] **QA-111** Training routes **blocked before** VPC and **unlocked after** — `/player/settings`, billing gates — gap register F-01 · pre-check: `epic51CoppaSignup.test.ts`

### Phase 3 — Owner notes


| Field          | Value                 |
| -------------- | --------------------- |
| Phase result   | Pass with issues      |
| Date completed | 06/17/2026            |
| Tester/browser | Evan Waechtler/Chrome |


**Issues found**

```
QA-131b [P2/P3]: Passkey fails in installed PWA/desktop app on same machine; browser on sstracker.app OK. Likely PWA/WebView vs extension-mediated WebAuthn. Workaround: browser for QA; magic link in installed app.
```

**Waivers this phase**

```

```

- [x] **Continue to next phase?** Yes / No

**Owner freeform**

```
Please see the error message below:

Uncaught (in promise) Yi: Unable to validate origin with rpId
    at Qi (content.js:1:160953)
    at async So.findCredentials (content.js:1:248754)
    at async e.<computed> [as findCredentials] (content.js:1:161488)
    at async content.js:386:251605

"MINOR ACCOUNTS LOCKED" error for COPPA & LIABILITY even though waiver is signed and form shows the date and time signed.

Privacy Log popped when adding the operative by a new callsign (which makes sense now because that's for parents to see if someone accessed their child's data...got it). The link for the query index error popped too. It overflowed outside of the context box. We will need a way for parents to enable/disable the ability to get push notifications whenever their child's data is accessed outside the established baseline.

Complete Profile error appears when authenticating player even though they're linked to a team already.
```

## Phase 4 — Coach clearance (before coach HQ if testing fresh uncleared coach)

**Gate:** Do not proceed to coach HQ demo until clearance path verified (skip if coach already cleared on tenant).

- [x] **QA-161** Uncleared coach sign-in → `/compliance` redirect — gap register F-03
- [x] **QA-204** Checkr embed loads; webhook path documented — gap register D-01 · pre-check: `complianceCheckr.guard.test.js`
- [x] **QA-162** Director compliance matrix + audit log on `/director/compliance` — gap register F-03
- [x] **QA-163** Cleared coach lands on `/coach` — gap register F-03

### Phase 4 — Owner notes


| Field          | Value                 |
| -------------- | --------------------- |
| Phase result   | Pass                  |
| Date completed | 06/19/2026            |
| Tester/browser | Evan Waechtler/Chrome |


**Issues found**

```

```

**Waivers this phase**

```

```

- [x] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 4b — Platform navigation chrome (NAV-OPTION-D + polish)

**Gate:** Run on live dev @ **390px** (phone or DevTools) and spot-check **1280px**. Authority: `[PLATFORM_NAVIGATION_CANON.md](./PLATFORM_NAVIGATION_CANON.md)`. **Do not proceed to Phase 5 sign-off until Phase 4b passes** (Session B).

> **Id choice:** QA-161/162/163 are coach clearance + director compliance (Phase 4). Nav chrome uses **QA-NAV-01–07** to avoid collision.

- [x] **QA-NAV-01** **Player** @390px — Bottom pins: **HQ · Train · Stats** + **Menu** slot; sheet has Tracker / Comms / Armory / Settings + Sign out; **no top bar**; glance band on HQ @390px without scroll
  - **@1280px:** Left rail; no bottom bar
- [x] **QA-NAV-02** **Coach** @390px — Default pins: **Daily Intel · Forge · Messages**; sheet has Tier 2 ops; **no** mobile header or sidebar drawer
  - **@1280px:** Left sidebar; admin flat bar styling
- [x] **QA-NAV-03** **Parent** @390px — Default pins: **Household · VPC · Command**; sheet has Messages, Log Workout, Payments; trust skin on content
  - **@1280px:** Sidebar desk mode
- [ ] **QA-NAV-04** **Pin customize** — Long-press pin slot → pick route → persists after reload (localStorage + Firestore)
- [x] **QA-NAV-05** **Cross-cutting** @390px — **No top mobile header** on any persona; one primary nav surface (pin bar + sheet only); **no floating alpha ReportAnomaly**; **no ⌘K / search trigger** in topbar
- [ ] **QA-NAV-06** **Menu / swipe-up** — Swipe-up from **bottom edge** (not only pin bar) opens same AppMenuSheet as Menu tab
- [x] **QA-NAV-07** **Coach Forge @390px** — Deploy form in document flow with extra vertical space from removed top bar — ties to QA-142
  - **@1280px:** Workbench column layout; ⌘K palette + sidebar Report Anomaly available
- [x] **QA-NAV-08** **Field chrome polish** @390px — Offline banner **above** pin bar (not overlapping nav); director/coach **quick actions** in AppMenuSheet (no floating FAB); sync banner clears within ~15s if hung

### Phase 4b — Owner notes

> **BLOCKED (NAV-WORKFLOW-INTEGRITY — 2026-06-20):** Owner-reported P0 on live dev @390px — clearance stuck `SCANNING…` on `/parent/household`; Menu pin (slot 4) does not open/stay open on `/parent/household` and `/parent/dashboard`. Code + behavioral guards shipped in this slice; **do not check QA-NAV-01–08 below until owner retest passes.** Agents must not mark Phase 4b complete.


| Field          | Value                 |
| -------------- | --------------------- |
| Phase result   | Pass with issues      |
| Date completed | 06/21/2026            |
| Tester/browser | Evan Waechtler/Chrome |


**Issues found**

```
QA-NAV-04 long press doesn't work for adding pins. 
QA-NAV-06 swipe up, nor swiping down on the menu drawer handle, work. 
```

**Waivers this phase**

```

```

- [x] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Phase 5 — Coach → Player development loop (core acquisition demo)

**Gate:** Phase 3 **QA-132** passed · **Phase 4b** nav chrome passed. Sign out / incognito when switching coach → player. **VS-3-Forge shipped** — QA-142 is a live re-verify (mobile document-flow deploy form + roster scope), not a code blocker. **GP-ACQ-04b** HQ return after Train log shipped in WORKFLOW-INTEGRITY.

### Exec cut lap (Session A — 15 min narrative)

Maps `[DEMO_SCRIPT.md](../acquisition/DEMO_SCRIPT.md)` steps 3–4 + cross-refs Phases 6–7 for full GP-ACQ:

- [ ] **QA-403** / GP-ACQ-03 — Coach Forge deploy (detail: QA-142 below)
- [ ] **QA-404** / GP-ACQ-04a–04b — Player accept → Train → XP on HQ (detail: QA-101, QA-106, QA-107, QA-102–105)
- [ ] **QA-405** / GP-ACQ-05 — Parent dashboard parity → Phase 6 QA-124/125
- [ ] **QA-406** / GP-ACQ-06 — Messages SafeSport → Phase 7 QA-153

Full exec cut steps 1–2 live in **Phase 3** (QA-401, QA-402). Consolidated sign-off rows also in **Phase 7** — see Phase 5 for step detail.

Order (matches exec cut steps 3–4 + GP-COACH observe loop):

- [x] **[GP-COACH-01]** **QA-141** Coach HQ `/coach` — squad/roster loads — gap register F-03
  - **Success (canon):** ≥3 roster signals or explicit empty; Forge link obvious
- [ ] **[GP-COACH-02 / GP-ACQ-03]** **QA-142** Forge deploy intent/bounty on `/coach/forge` — appears on player HQ — gap register F-03 · pre-check: `intentModule.test.ts` · **Re-verify on live** (VS-3-Forge shipped)
  - **Success (canon):** Deploy intent with prescription to player — see workflow canon §3 Forge criteria
  - **Mobile:** 390px P1 — full deploy form in document flow; no fixed corner HUD
- [ ] **[GP-COACH-02]** **QA-143** Sub-drill picker — team + club drills (not global only) — gap register F-03 · pre-check: `personaFunctionalMvp.test.ts` · **Tier 2 waiver** (Field Station; not exec-cut gate)
- [ ] **[GP-COACH-02]** **QA-144** Spatial designer save on `/coach/drills` — persists to `teams/{teamId}/drills` — gap register F-03 · **Tier 2 waiver** (optional same session)
- [ ] **[GP-COACH-02 / GP-ACQ-03]** **QA-134** Coach bounty → player HQ mission rail — gap register F-02
- [ ] **[GP-ACQ-04a]** **QA-106** Mission rail visible on `/player/dashboard` — gap register F-01
  - **Success (canon):** Coach intent in ActiveBounties; Train CTA arms
  - **Mobile:** Mission rail readable without horizontal scroll
- [ ] **[GP-ACQ-04a / GP-COACH-03]** **QA-101** Player HQ loads post-VPC — identity, missions rail, telemetry — gap register F-01 · pre-check: `personaFunctionalMvp.test.ts`
  - **Success (canon):** Coach intent in ActiveBounties; Train CTA arms
  - **Mobile:** Mission rail readable without horizontal scroll
- [ ] **[GP-ACQ-04b]** **QA-107** Accept intent → Train **locked by coach**; notes editable only — gap register K-03 · pre-check: `coachMissionFlow.test.ts`
  - **Success (canon):** XP/streak updates on HQ return
  - **Mobile:** Execute theater; prescription read-only when armed
- [ ] **[GP-ACQ-04b]** **QA-102** Free log workout on `/player/workout` — XP/streak updates on HQ — gap register F-01 · pre-check: `coachMissionFlow.test.ts` · **GP-ACQ-04b:** success overlay → Return to HQ
  - **Success (canon):** XP/streak updates on HQ return
  - **Mobile:** Execute theater; prescription read-only when armed
- [ ] **[GP-ACQ-04b]** **QA-103** Workout smoke — 3×25 reps, bilateral **off** → 75 reps to `logTrainingSession`
- [ ] **[GP-ACQ-04b]** **QA-104** Workout smoke — 1×10 reps, bilateral **on** → 20 reps (10×2)
- [ ] **[GP-ACQ-04b]** **QA-105** Workout smoke — 30 min + RPE 5, time-only prescription — session logs; rep count 0 OK
- [ ] **[GP-ACQ-04b]** **QA-108** Free log (no mission) — duration max **120 min**
- [ ] **[GP-COACH-03]** **QA-151** Coach → Player HQ handoff — coach bounty → player mission 6k path — gap register F-04 · pre-check: `personaFunctionalMvp.test.ts`
- [ ] **[GP-ACQ-04a]** **QA-154** Adaptive homework band on `/player/dashboard` — visible (heuristic OK at `abPercent: 0`) — gap register F-04 · pre-check: `playerRlFunctional.test.ts`
- [ ] **[GP-COACH-04]** **QA-141** (observe) Coach HQ — telemetry reflects logged session after player Train

### Phase 5 — Owner notes


| Field          | Value            |
| -------------- | ---------------- |
| Phase result   | Ready for re-run |
| Date completed |                  |
| Tester/browser |                  |


**Issues found (prior session — pre VS-3-Forge / WORKFLOW-INTEGRITY)**

```

```

**Waivers this phase**

```

```

- [ ] **Continue to next phase?** Yes / No

**Owner freeform**

```

```

---

## Post-QA fixes (do not block exec cut)

**Gate:** Run **after** GP-ACQ / Phase 5–7 acquisition sign-off — **not** during exec cut. App is **dark-mode-first**; light theme must not ship broken text — fix scheduled post-QA, not during GP-ACQ.

Authority: `[POST_QA_DARK_SURFACE_CONTRAST_PLAN.md](./POST_QA_DARK_SURFACE_CONTRAST_PLAN.md)` · gap register **U-01**

**Test setup:** Set theme preference to **Light** (Settings or OS light + System) before each row; confirm `html.dark` is absent.

- [ ] **QA-CONTRAST-01** — Login email + password + autofill readable @ light theme preference (`/login`)
- [ ] **QA-CONTRAST-02** — Forge deploy panel all inputs/selects + labels @ light theme (`/coach/forge`)
- [ ] **QA-CONTRAST-03** — Setup wizard inputs readable @ light theme (`/setup`)
- [ ] **QA-CONTRAST-04** — Coach messages DM compose readable @ light theme (`/messages`)

---

## Phase 6 — Parent table-stakes parity

**Gate:** Do not proceed until Phase 5 core loop passes (coach bounty → player XP).

Maps **GP-ACQ-05** and **GP-PARENT-03/04**. **GP-ACQ-05 audit status:** **Pending QA** per workflow canon §8 — owner Phase 6 gate.

- [ ] **[GP-PARENT-03]** **QA-123** Co-op log on `/parent/log-workout` — counts toward child progress — gap register F-02 · **Tier 2 — waivable**
  - **Success (canon):** XP counts toward player progress
  - **Mobile:** Mobile form usable @390px
- [ ] **[GP-PARENT-04 / GP-ACQ-05]** **QA-124** Dashboard bounty terminal on `/parent/dashboard` — visible/functional — gap register F-02
  - **Success (canon):** RSVP strip + bounty terminal visible
  - **Mobile:** RSVP + bounty above fold on 390px
- [ ] **[GP-PARENT-04 / GP-ACQ-05]** **QA-125** Car Ride debrief on `/parent/dashboard` — surfaces when fixture pending — gap register F-02
  - **Success (canon):** Co-op Command bands visible
  - **Mobile:** RSVP + bounty above fold on 390px
- [ ] **QA-202** Parent installments `/parent/payments` — schedule + partial status — gap register B-01, B-05 · pre-check: `paymentInstallments.test.ts` · **Tier 2 — waivable**
- [ ] **QA-210** FCM push prefs + director broadcast (device) — gap register D-07, D-08, D-09, H-03 · pre-check: `commsSprint49.test.ts` · **Tier 2 — waivable**
- [ ] **[GP-PARENT-03]** **QA-152** Parent co-op → child XP path — gap register F-04 · **Tier 2 — waivable**

### Phase 6 — Owner notes


| Field          | Value                                      |
| -------------- | ------------------------------------------ |
| Phase result   | Pass / Pass with issues / Blocked / Waived |
| Date completed |                                            |
| Tester/browser |                                            |


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

- [ ] **QA-146** Coach logistics announcement on `/coach/logistics` — parents receive — gap register F-03 · pre-check: `commsSprint41.test.ts` · **Tier 2 — waivable**
- [ ] **[GP-ACQ-06]** **QA-153** Coach → minor DM blocked on `/messages` — SafeSport — gap register F-04 · pre-check: `commsSprint42.test.ts`
  - **Success (canon):** Household threads load; coach→minor DM blocked with policy copy
  - **Mobile:** Thread list usable one-handed

### Exec cut verification (DEMO_SCRIPT steps 1–6 — sign-off rows only)

Detail lives in Phases 3, 5, 6 above — check here for consolidated exec-cut sign-off:

- [ ] **QA-401** Exec cut step 1 — Parent household (Phase 3: QA-121) · GP-ACQ-01
- [ ] **QA-402** Exec cut step 2 — VPC ceremony (Phase 3: QA-122, QA-132) · GP-ACQ-02
- [ ] **QA-403** Exec cut step 3 — Coach intent deploy (Phase 5: QA-142) · GP-ACQ-03
- [ ] **QA-404** Exec cut step 4 — Player Train + XP (Phase 5: QA-107, QA-102–105) · GP-ACQ-04a–04b
- [ ] **QA-405** Exec cut step 5 — Parent dashboard parity (Phase 6: QA-124–125) · GP-ACQ-05
- [ ] **[GP-ACQ-06]** **QA-406** Exec cut step 6 — Messages SafeSport — **closes GP-ACQ-06** (QA-153 above)

### Phase 7 — Owner notes


| Field          | Value                                      |
| -------------- | ------------------------------------------ |
| Phase result   | Pass / Pass with issues / Blocked / Waived |
| Date completed |                                            |
| Tester/browser |                                            |


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


| Field          | Value                                      |
| -------------- | ------------------------------------------ |
| Phase result   | Pass / Pass with issues / Blocked / Waived |
| Date completed |                                            |
| Tester/browser |                                            |


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

- [ ] **QA-109** Armory SYNC IDENTITY on `/player/armory` — default portrait or initials OK — gap register I-01 · **Tier 2 — waivable**
- [ ] **QA-110** Armory album/set bonus path — 3.4 collectible path still works · **Tier 2 — waivable**
- [ ] **QA-112** Tracker nav — `/player/tracker` reachable from **Player More sheet** (HQ · Train · Stats · More → Tracker) — gap register F-01 · pre-check: `personaFunctionalMvp.test.ts` · **Tier 2 — waivable**
  - **Success (canon):** Deep-link from More sheet; not in primary bottom tab row
- [ ] **QA-205** Tracker shell parity — PlayerShell dossier chrome on `/player/tracker`; More sheet entry only (no duplicate primary tab) — gap register F-01 · **Tier 2 — waivable**
- [ ] **QA-155** Optional RL policy `/admin/rl-policy` — `abPercent > 0` smoke — gap register K-02 · **waivable:** heuristic only at launch (`abPercent: 0`)

### Phase 9 — Owner notes


| Field          | Value                                      |
| -------------- | ------------------------------------------ |
| Phase result   | Pass / Pass with issues / Blocked / Waived |
| Date completed |                                            |
| Tester/browser |                                            |


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
- [ ] **QA-401–405** Exec cut walkthrough — see **Phase 5 exec-cut lap** + **Phase 7** sign-off rows (QA-401–406); no duplicate steps here
- [ ] **QA-230** PWA install prompt — Android `beforeinstallprompt` or iOS Add to Home Screen

### Phase 10 — Owner notes


| Field          | Value                                      |
| -------------- | ------------------------------------------ |
| Phase result   | Pass / Pass with issues / Blocked / Waived |
| Date completed |                                            |
| Tester/browser |                                            |


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
- [ ] **QA-304** Stats investigation workspace — telemetry band (no nav tile chrome) — gap register J-07 · **also satisfies GP-ACQ-04c** (optional exec cut; required full Tier 1 sign-off per registry §4)
- [ ] **QA-305** Train diegetic sliders — `pw-loadbar` vs native range — gap register J-09
- [ ] **QA-306** OperativeLoadoutStudio — Swal replaced with diegetic overlay — gap register J-03
- [ ] **QA-307** PlayerShell — no generic `.bento-card` chrome injection on Player routes — gap register J-10
- [ ] **QA-308** Full VA matrix — `[PLAYER_OS_VISUAL_ACCEPTANCE.md](./PLAYER_OS_VISUAL_ACCEPTANCE.md)` rows owner signs — gap register J-04

> **Note:** Waivable if selling functional OS; required for premium visual claim.

### Phase 11 — Owner notes


| Field          | Value                                      |
| -------------- | ------------------------------------------ |
| Phase result   | Pass / Pass with issues / Blocked / Waived |
| Date completed |                                            |
| Tester/browser |                                            |


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
- [ ] **QA-502** Demo video recorded from `[DEMO_SCRIPT.md](../acquisition/DEMO_SCRIPT.md)` — gap register M-02
- [ ] **QA-503** TRACTION / PROSPECTUS / ONE_PAGER refreshed post Wave 3 merge — gap register M-04, L-04
- [ ] **QA-504** NCSI vendor parity documented (acquirer swap) — **Partial** per `[NOTABLE_GAPS.md](../acquisition/NOTABLE_GAPS.md)` (Checkr lifecycle complete; NCSI iframe = acquirer vendor swap) — gap register D-02 · no build unless reopened
- [ ] **QA-505** Federation Phase 4 API credentials — **Partial** per `[NOTABLE_GAPS.md](../acquisition/NOTABLE_GAPS.md)` (CSV v1 + Phase 3 sync shipped; 38-body API = acquirer GTM decision) — gap register C-04
- [ ] **QA-506** Holo VA bust variants — **Blocked** (post-launch busts) — `[AVATAR_MANIFEST.md](../acquisition/AVATAR_MANIFEST.md)` · gap register I-02, I-03
- [ ] **QA-507** Platform visual system (Gemini research) — read-only; sign waiver if deferring — gap register J-05

### Phase 12 — Owner notes


| Field          | Value                                      |
| -------------- | ------------------------------------------ |
| Phase result   | Pass / Pass with issues / Blocked / Waived |
| Date completed |                                            |
| Tester/browser |                                            |


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

## Phase 13 — Full platform workflow sweep (optional capstone)

**Gate:** Phase 5 core loop + **Phase 4b** nav chrome pass first. Single ordered pass before final sign-off — checkboxes only; cite `step_id` in owner notes if any row fails.


| ☐   | step_id      | Persona switch | Route                 | Action                               | Pass if                           | QA ref                                                            |
| --- | ------------ | -------------- | --------------------- | ------------------------------------ | --------------------------------- | ----------------------------------------------------------------- |
| ☐   | GP-GATE-01   | any            | `/login`              | Authenticate                         | Redirect to `/home`               | QA-010, QA-011                                                    |
| ☐   | GP-GATE-02   | any            | `/home`               | Role router                          | Persona workspace redirect        | QA-010                                                            |
| ☐   | GP-GATE-03   | any            | `/setup`              | Complete provision (if needed)       | Router resumes                    | QA-013                                                            |
| ☐   | GP-GATE-04   | player         | `/vpc-pending`        | Spot-check block (if minor pre-VPC)  | Blocked copy + parent hint        | QA-133                                                            |
| ☐   | GP-GATE-05   | coach          | `/compliance`         | Spot-check clearance (if uncleared)  | Redirect to `/coach` when cleared | QA-161                                                            |
| ☐   | GP-GATE-06   | any            | `/privacy`            | Read legal                           | Page renders                      | QA-012                                                            |
| ☐   | GP-ACQ-01    | **parent**     | `/parent/household`   | View household graph                 | Linked operative(s); waiver clear | QA-121, QA-401                                                    |
| ☐   | GP-ACQ-02    | **parent**     | `/parent/vpc`         | Grant VPC per child                  | Child unlocks                     | QA-122, QA-402                                                    |
| ☐   | GP-ACQ-03    | **coach**      | `/coach/forge`        | Deploy intent to player              | Bounty on player HQ               | QA-142, QA-403                                                    |
| ☐   | GP-ACQ-04a   | **player**     | `/player/dashboard`   | Accept bounty                        | Train CTA armed                   | QA-101, QA-404                                                    |
| ☐   | GP-ACQ-04b   | **player**     | `/player/workout`     | Log session                          | XP on HQ return                   | QA-102, QA-404                                                    |
| ☐   | GP-ACQ-04c   | **player**     | `/stats`              | View telemetry (optional)            | Radar + charts load               | QA-304                                                            |
| ☐   | GP-ACQ-05    | **parent**     | `/parent/dashboard`   | Co-op / schedule strip               | RSVP + bounty terminal            | QA-124, QA-405                                                    |
| ☐   | GP-ACQ-06    | **any**        | `/messages`           | SafeSport comms                      | Coach→minor DM blocked            | QA-153, QA-406                                                    |
| ☐   | GP-COACH-01  | **coach**      | `/coach`              | Scan squad hub                       | Roster signals or empty state     | QA-141                                                            |
| ☐   | GP-COACH-02  | **coach**      | `/coach/forge`        | Deploy prescription                  | §3 Forge criteria                 | QA-142                                                            |
| ☐   | GP-COACH-03  | **player**     | `/player/dashboard`   | Fulfill bounty → Train               | XP on return                      | QA-107, QA-151                                                    |
| ☐   | GP-COACH-04  | **coach**      | `/coach`              | Observe activity                     | Telemetry reflects session        | QA-141                                                            |
| ☐   | GP-PARENT-01 | **parent**     | `/parent/household`   | Link operative + waiver              | Waiver timestamp                  | QA-121                                                            |
| ☐   | GP-PARENT-02 | **parent**     | `/parent/vpc`         | VPC ceremony                         | Per-child grant                   | QA-122                                                            |
| ☐   | GP-PARENT-03 | **parent**     | `/parent/log-workout` | Co-op log (**waivable** Tier 2)      | XP toward child                   | QA-123                                                            |
| ☐   | GP-PARENT-04 | **parent**     | `/parent/dashboard`   | Car Ride + RSVP + bounty             | Co-op bands visible               | QA-124, QA-125                                                    |
| ☐   | Phase 4b     | all personas   | —                     | NAV-IMPL chrome @390px + spot 1280px | QA-NAV-01–07 pass                 | Phase 4b                                                          |
| ☐   | **Sign-off** | owner          | —                     | Registry §4 Tier 1 table initials    | All 15 Tier 1 rows Pass or Waive  | `[PRODUCT_SURFACE_REGISTRY.md](./PRODUCT_SURFACE_REGISTRY.md)` §4 |


### Phase 13 — Owner notes


| Field          | Value                                      |
| -------------- | ------------------------------------------ |
| Phase result   | Pass / Pass with issues / Blocked / Waived |
| Date completed |                                            |
| Tester/browser |                                            |


**Issues found**

```
step_id: [P0|P1|P2] — expected vs actual
```

**Waivers this phase**

```
step_id / QA-id: reason
```

- [ ] **Continue to sign-off?** Yes / No

**Owner freeform**

```

```

---

## Sign-off


| Field                        | Value                                                     |
| ---------------------------- | --------------------------------------------------------- |
| Date                         |                                                           |
| Git commit SHA               |                                                           |
| Deploy record                | `[DEPLOY_RECORD.json](../acquisition/DEPLOY_RECORD.json)` |
| All QA-xxx checked or waived |                                                           |


**Waived items (reason required):**

```
QA-id: reason
```

**Owner signature:** _________________________