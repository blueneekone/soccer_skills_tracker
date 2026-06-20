# Platform Workflow Canon

**Gold paths + step-by-step UX states for every Tier 1 surface** · Route authority: [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) · Demo order: [`DEMO_SCRIPT.md`](../acquisition/DEMO_SCRIPT.md) exec cut · QA: [`OWNER_QA_CHECKLIST.md`](./OWNER_QA_CHECKLIST.md)

---

## §0 Authority

1. **Registry wins** on route tier, nav, and demo scope — this doc owns **human journey steps**, not which routes exist.
2. Every **Tier 1** registry row must appear in **GP-ACQ**, **GP-GATE**, **GP-COACH**, or **GP-PARENT** (GP-ACQ-04c satisfies PS-PL03 `/stats`).
3. **Gold path** = minimum acquisition narrative with defined entry, loading, empty, error, blocked, and success states per step.
4. Pixel vocabulary per persona: registry `foundation_doc` + `va_doc` columns.
5. Trust UX gates (`GP-GATE`) must pass before persona gold paths in owner QA.

---

## §1 Gold paths (minimum four)

| id | Name | Scope | Primary QA |
|----|------|-------|------------|
| **GP-ACQ** | Acquisition exec cut | [`DEMO_SCRIPT.md`](../acquisition/DEMO_SCRIPT.md) steps 1–6 | QA-401–406, QA-142 |
| **GP-COACH** | Coach daily loop | Squad hub → Forge deploy → player fulfillment → observe | QA-141, QA-142, QA-134 |
| **GP-PARENT** | Parent co-op loop | Household → VPC → co-op log → dashboard | QA-121–125, QA-131–132 |
| **GP-GATE** | Compliance gates | Login, setup, vpc-pending, coach clearance | QA-010–013, QA-133, QA-161 |

**Prerequisite chain:** `GP-GATE` → `GP-PARENT` (steps 1–2) unlocks player routes → `GP-COACH` step 3 feeds `GP-ACQ` step 4 → `GP-PARENT` step 5 → `GP-ACQ` step 6. Sign out / incognito between persona switches.

---

## §2 Step table format

All gold path steps use this schema:

| Column | Meaning |
|--------|---------|
| `step_id` | Stable id within gold path (e.g. `GP-ACQ-03`) |
| `actor` | Persona performing the step |
| `route` | Registry route |
| `user_action` | What the human does |
| `success_state` | Observable pass criteria |
| `failure_state` | Blocked / error UX requirement |
| `handoff_to` | Next workflow or persona |
| `qa_ids` | Owner QA checklist ids |
| `tier` | Registry tier (1 = acquisition required) |
| `mobile_notes` | 390px-first requirements |

---

### GP-ACQ — Acquisition exec cut (15 min)

| step_id | actor | route | user_action | success_state | failure_state | handoff_to | qa_ids | tier | mobile_notes |
|---------|-------|-------|-------------|---------------|---------------|------------|--------|------|--------------|
| GP-ACQ-01 | parent | `/parent/household` | Sign in; view household graph | Linked operative(s) visible; waiver state clear | Empty household with add-operative CTA | GP-ACQ-02 | QA-121, QA-131, QA-401 | 1 | Cards stack single column; dispatch CTA ≥44px |
| GP-ACQ-02 | parent | `/parent/vpc` | Grant VPC per child | `consent_records` written; child unlocks | Callable error with retry; no children → link household | GP-ACQ-03 (coach) | QA-122, QA-132, QA-402 | 1 | One grant CTA per child card; plain COPPA copy |
| GP-ACQ-03 | coach | `/coach/forge` | Deploy intent with prescription to player | See **§3 Forge success criteria** | Deploy block reason inline; roster error visible | GP-ACQ-04 | QA-142, QA-134, QA-403 | 1 | **390px P1** — full deploy form in document flow; no fixed corner HUD |
| GP-ACQ-04a | player | `/player/dashboard` | Accept bounty on mission rail | Coach intent in `ActiveBounties`; Train CTA arms | Empty rail explains coach assign path | GP-ACQ-04b | QA-101, QA-106, QA-151, QA-404 | 1 | Mission rail readable without horizontal scroll |
| GP-ACQ-04b | player | `/player/workout` | Log session from locked prescription | XP/streak updates on HQ return | Diegetic validation errors | GP-ACQ-05 | QA-102–108, QA-107 | 1 | Execute theater; prescription read-only when armed |
| GP-ACQ-04c | player | `/stats` | Optional: view telemetry after Train | Radar + chart bands load; calm investigation workspace | Empty "AWAITING TELEMETRY" if no logs — not broken layout | — | QA-304 | 1 | Waivable for exec cut; required for full Tier 1 player sign-off |
| GP-ACQ-05 | parent | `/parent/dashboard` | View co-op / schedule strip | RSVP strip + bounty terminal visible | Hidden bands only when no data — not broken layout | GP-ACQ-06 | QA-124, QA-125, QA-405 | 1 | RSVP + bounty above fold on 390px |
| GP-ACQ-06 | any | `/messages` | Open SafeSport comms | Household threads load | Coach→minor DM blocked with policy copy | — | QA-153, QA-406 | 1 | Thread list usable one-handed |

---

### GP-COACH — Coach daily loop

| step_id | actor | route | user_action | success_state | failure_state | handoff_to | qa_ids | tier | mobile_notes |
|---------|-------|-------|-------------|---------------|---------------|------------|--------|------|--------------|
| GP-COACH-01 | coach | `/coach` | Scan squad hub | ≥3 roster signals or explicit empty; Forge link obvious | No team — provisioning hint | GP-COACH-02 | QA-141, QA-163 | 1 | 12-col bento collapses; mono tables scroll horizontally if needed |
| GP-COACH-02 | coach | `/coach/forge` | Build + deploy prescription | §3 Forge criteria | See §3 failure rows | GP-COACH-03 | QA-142, QA-134 | 1 | Full-page workbench; priority boolean toggle |
| GP-COACH-03 | player | `/player/dashboard` | Fulfill bounty → Train | Bounty accepted; XP on return | VPC gate if minor blocked | GP-COACH-04 | QA-101, QA-107, QA-151 | 1 | Player mobile parity |
| GP-COACH-04 | coach | `/coach` | Observe readiness / activity | Telemetry reflects logged session | Stale data — refresh affordance | — | QA-141 | 1 | Sideline scan in 3s |

---

### GP-PARENT — Parent co-op loop

| step_id | actor | route | user_action | success_state | failure_state | handoff_to | qa_ids | tier | mobile_notes |
|---------|-------|-------|-------------|---------------|---------------|------------|--------|------|--------------|
| GP-PARENT-01 | parent | `/parent/household` | Link operative + sign waiver | Waiver timestamp; team dispatch linked | Unsigned waiver blocks training copy | GP-PARENT-02 | QA-121, QA-131 | 1 | Trust-first panels; no player chrome |
| GP-PARENT-02 | parent | `/parent/vpc` | Complete VPC ceremony | Per-child grant success | Pending child card with clear CTA | GP-PARENT-03 | QA-122, QA-132 | 1 | Calm navy; soft radius grammar |
| GP-PARENT-03 | parent | `/parent/log-workout` | Co-op log for child | XP counts toward player progress | Validation errors plain-language | GP-PARENT-04 | QA-123 | 2 | Tier 2 — waivable; mobile form usable |
| GP-PARENT-04 | parent | `/parent/dashboard` | Car Ride + RSVP + bounty | Co-op Command bands visible | Car Ride hidden when no fixture — not error | — | QA-124, QA-125 | 1 | Celebrate without arcade copy |

---

### GP-GATE — Compliance gates

| step_id | actor | route | user_action | success_state | failure_state | handoff_to | qa_ids | tier | mobile_notes |
|---------|-------|-------|-------------|---------------|---------------|------------|--------|------|--------------|
| GP-GATE-01 | any | `/login` | Authenticate | Redirect to `/home` | Invalid email / rate limit | GP-GATE-02 | QA-010, QA-011 | 1 | Magic link + Google visible |
| GP-GATE-02 | any | `/home` | Role router resolves | Persona workspace redirect | Setup incomplete → `/setup` | persona gold path | QA-010 | 1 | Minimal loading state |
| GP-GATE-03 | any | `/setup` | Complete profile provision | Router resumes | Validation errors inline | GP-GATE-04 or persona | QA-013 | 1 | Dispatch code path explained when no team |
| GP-GATE-04 | player | `/vpc-pending` | Minor waits for guardian | Blocked copy + parent-facing hint | — | GP-PARENT-02 | QA-133 | 1 | No training routes until cleared |
| GP-GATE-05 | coach | `/compliance` | Complete Checkr clearance | Redirect to `/coach` when cleared | Embed load failure — retry | GP-COACH-01 | QA-161, QA-204 | 1 | Plain blocked copy |
| GP-GATE-06 | any | `/privacy` | Read legal | Page renders | — | — | QA-012 | 1 | Readable prose |

---

## §3 Forge step — GP-ACQ-03 / GP-COACH-02 success criteria

**Route:** `/coach/forge` · **workflow_id:** `WF-COACH-FORGE` · **layout_pattern:** `coach-forge-workbench` (catalog: `full-page-workbench`)

Owner Phase 5 notes (QA-142) are **acceptance input** for VS-3-Forge (shipped):

| Criterion | Success | Failure (regression) |
|-----------|---------|----------------------|
| Mobile deploy form | Full deploy form visible on **390px** in document scroll — all fields above fold or in single column | Deploy panel not in document flow; `tw-fixed tw-bottom-*` reintroduced; form clipped on mobile |
| Roster scope | Assignable roster visible **OR** clear roster error with refresh — not silent empty dropdown | Roster dropdown empty with no explanation; deploy never enables |
| Deploy enablement | Deploy button enables when **attribute + duration + assignable targets** satisfied; `deployBlockReason` when false | Silent disabled button |
| Priority control | Boolean toggle — priority vs normal mission | Unbounded 0–100+ slider returns |
| Player handoff | Player sees bounty on `/player/dashboard` `ActiveBounties` within seconds | Intent not on mission rail |

**Blueprint:** [`coach-forge-workbench-v1.md`](./references/ui/research/blueprints/coach-forge-workbench-v1.md) · **`ForgeDeployPanel.svelte` shipped (VS-3-Forge)** — verify on live dev.

---

## §4 QA resume gate

Manual QA **Phases 5–11** resume at **Phase 5** after owner signs §4 exit criteria below. Phases 0–4 progress preserved. **WORKFLOW-INTEGRITY** (2026-06-19): GP-ACQ code-path audit + P0 fixes shipped — see **§8** audit table.

### §4 exit criteria (owner sign-off)

| # | Exit criterion | Owner ☐ | Agent evidence |
|---|----------------|:-------:|----------------|
| 1 | [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) gold paths GP-ACQ / GP-COACH / GP-PARENT / GP-GATE reviewed | | This doc merged |
| 2 | [`PLATFORM_DESIGN_SYSTEM.md`](./PLATFORM_DESIGN_SYSTEM.md) layout catalog + shell contract reviewed | | Design system merged |
| 3 | Coach + Parent foundation + VA docs exist for all Tier 1 persona routes | | Registry `foundation_doc` / `va_doc` populated |
| 4 | [`coach-forge-workbench-v1.md`](./references/ui/research/blueprints/coach-forge-workbench-v1.md) signed — full-page workbench, not floating HUD | | Blueprint merged |
| 5 | GP-ACQ steps 1–6 match [`DEMO_SCRIPT.md`](../acquisition/DEMO_SCRIPT.md) exec cut table | | Step table §2 |
| 6 | `npm test -- src/lib/platform/__tests__/productSurfaceRegistry.test.ts` green | | CI / local |
| 7 | Verify VS-3-Forge on live (`ForgeDeployPanel`); GP-ACQ audit §8 table | | WORKFLOW-INTEGRITY Done — owner live retest pending |

**Resume link:** [`OWNER_QA_CHECKLIST.md`](./OWNER_QA_CHECKLIST.md) — **Phase 4b** (NAV-IMPL chrome) then **Phase 5** Coach → Player development loop; optional capstone **Phase 13** full workflow sweep before registry §4 sign-off.

---

## §5 Waivers — Tier 2 optional paths

Per registry §0 — waivable without blocking acquisition sign-off. Deep-link OK; not in exec cut.

| workflow_id | Route | Gold path | Notes |
|-------------|-------|-----------|-------|
| `WF-PARENT-LOG` | `/parent/log-workout` | GP-PARENT-03 | Co-op XP; Tier 2 |
| `WF-PARENT-PAY` | `/parent/payments` | — | Installments |
| `WF-COACH-DRILLS` | `/coach/drills` | — | QA-143/144 optional |
| `WF-COACH-LOGISTICS` | `/coach/logistics` | — | SafeSport broadcast |
| `WF-PLAYER-ARMORY` | `/player/armory` | — | Full demo Act 3 |
| — | `/coach/tactical` | — | Tier 2 War Room; `trinity-shell-glass-hud` layout **forbidden on Tier 1** |

Registry §0 gospel: [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md)

---

## §6 Workflow detail — UX state vocabulary

State vocabulary (all workflows):

| State | Meaning | UX requirement |
|-------|---------|----------------|
| **Entry** | First paint after navigation | 3-second hierarchy; obvious primary action |
| **Loading** | Awaiting Firestore / callable | Skeleton or inline spinner — never blank stall |
| **Empty** | Valid session, no data | Explain next step; CTA to fix |
| **Blocked** | Policy gate | Plain-language reason + link to resolving workflow |
| **Error** | Mutation or fetch failed | Actionable message + retry |
| **Success** | Commit verified | Inline confirmation; handoff CTA |

Extended workflow sections (trust gates, player stats, comms) remain valid reference — step ids above are authoritative for acquisition QA.

---

## §7 Agent usage

Before UX or functional work on a route:

1. Look up `workflow_id` in [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) §1.
2. Find step in gold path tables (§2) for `qa_ids` and mobile_notes.
3. Read `foundation_doc` + `va_doc` for pixel sign-off.
4. Extend sprint tests — never delete prior guards.

---

## §8 GP-ACQ integrity audit (WORKFLOW-INTEGRITY)

**Environment:** live dev · `sports-skill-tracker-dev` · slice date 2026-06-19

| step_id | route | code path | status | gap / fix |
|---------|-------|-----------|--------|-----------|
| GP-ACQ-01 | `/parent/household` | `parent/household/+page.svelte` · household graph | **Pass** | Owner Phase 3 QA-121/131 |
| GP-ACQ-02 | `/parent/vpc` | `parent/vpc/+page.svelte` · consent_records | **Pass** | Owner Phase 3 QA-132 |
| GP-ACQ-03 | `/coach/forge` | `ForgeDeployPanel.svelte` · `team_assignments` write | **Pass** | VS-3-Forge shipped; owner PS-C02 signed 06/19 — re-run QA-142 on live |
| GP-ACQ-04a | `/player/dashboard` | `ActiveBounties.svelte` · accept → stash handoff · `Start session →` CTA | **Pass** | `missionRailEmptyCopy` + `coachIntentReadyToClaim` guards |
| GP-ACQ-04b | `/player/workout` | `coachMissionFlow.ts` handoff · locked prescription · `WORKOUT_HQ_RETURN_PATH` after log | **Pass** | **Fixed:** success overlay → HQ return; `elite_xp_pulse` + `authStore.refresh` |
| GP-ACQ-04c | `/stats` | `stats/+page.svelte` · telemetry bands | **Pass** | Waivable exec cut; owner PS-PL03 signed |
| GP-ACQ-05 | `/parent/dashboard` | RSVP strip + bounty terminal | **Pending QA** | Phase 6 gate |
| GP-ACQ-06 | `/messages` | SafeSport household threads | **Pass** | Owner PS-X01 signed |

**Handoff chain (04a→04b):** Accept on mission rail → `stashQuestTrainHandoff` → `Start session →` → `/player/workout` reads `player_mission_handoff_v1` → `executePlayerWorkoutLog` → acknowledge overlay → `/player/dashboard` XP pulse.

**Owner retest:** [`OWNER_QA_CHECKLIST.md`](./OWNER_QA_CHECKLIST.md) — workflow-mapped checklist with Tier 1 coverage matrix + gold path step index. **Phase 4b** (QA-NAV-01–07) then **Phase 5** — QA-142 live re-verify on 390px + desktop; QA-102 GP-ACQ-04b HQ return after Train log. Optional **Phase 13** capstone before registry §4 initials.

---

## Cross-links

| Doc | Role |
|-----|------|
| [`PLATFORM_DESIGN_SYSTEM.md`](./PLATFORM_DESIGN_SYSTEM.md) | Shared primitives + layout catalog |
| [`COACH_OS_FOUNDATION.md`](./COACH_OS_FOUNDATION.md) | Forge workbench canon |
| [`PARENT_OS_FOUNDATION.md`](./PARENT_OS_FOUNDATION.md) | Parent material vocabulary |
| [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) | Player material vocabulary |
| [`FUNCTIONAL_MVP.md`](./FUNCTIONAL_MVP.md) | Functional acceptance bar |
