# Product Surface Registry

**Gospel truth** for user-facing routes, nav policy, demo scope, and owner QA tiers.  
**Project:** `sports-skill-tracker-dev` · **Branch:** `dev`  
**Authority chain:** This file → `[PLATFORM_WORKFLOW_CANON.md](./PLATFORM_WORKFLOW_CANON.md)` → `[DEMO_SCRIPT.md](../acquisition/DEMO_SCRIPT.md)` exec cut → `[OWNER_QA_CHECKLIST.md](./OWNER_QA_CHECKLIST.md)`

---

## §0 Gospel rules

1. **This registry wins** when it conflicts with `[COACH_OS.md](./COACH_OS.md)` home zones, `[FUNCTIONAL_AUDIT_BACKLOG.md](../FUNCTIONAL_AUDIT_BACKLOG.md)` Done rows (e.g. F2 War Room nav), `[FUNCTIONAL_MVP.md](./FUNCTIONAL_MVP.md)` primary-route lists, or `[ROADMAP.md](../../ROADMAP.md)` scope notes.
2. **Tier 1** — Pre-acquisition demo + owner QA **required**. Must pass or be explicitly waived before sign-off.
3. **Tier 2** — Shipped code may exist; not in primary nav (deep-link OK); **waivable** in QA without blocking functional sale.
4. **Tier 3** — Tabled post-acquisition; agents **do not** extend, nav-link, or prioritize without owner registry update.
5. **Nav policy** — **Tier 1** = pre-acquisition required for functional sign-off (or explicit waiver in §4). **Tier 2+** routes may remain in sidebar per §2; they are waivable and not exec-cut blockers per §0 rules 2–3. `nav_visible=false` = hidden from primary nav (deep-link only) — e.g. War Room PS-C04. Do not remove Tier 2 coach/parent links from §2; they are intentional and waivable.
6. **Nav chrome** — Layout law (field/desk breakpoints, Option A tabs, overflow drawer, skin separation) → [`PLATFORM_NAVIGATION_CANON.md`](./PLATFORM_NAVIGATION_CANON.md). This registry §2 remains **href source of truth**; shells must not duplicate nav arrays.

---

## §1 Master table

Workflow canon: `[PLATFORM_WORKFLOW_CANON.md](./PLATFORM_WORKFLOW_CANON.md)` · Layout catalog: `[PLATFORM_DESIGN_SYSTEM.md](./PLATFORM_DESIGN_SYSTEM.md)` §3


| id       | persona   | route                     | label               | tier | nav_visible | demo_step | qa_ids                                 | workflow_id                | layout_pattern          | foundation_doc                                         | va_doc                                                                | ux_mandate              | primary_module                         | notes                                                                             |
| -------- | --------- | ------------------------- | ------------------- | ---- | ----------- | --------- | -------------------------------------- | -------------------------- | ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| PS-A01   | any       | `/login`                  | Sign in             | 1    | false       | —         | QA-010, QA-011                         | `WF-TRUST-LOGIN`           | `trust-auth`            | —                                                      | —                                                                     | Trust UX                | `login/+page.svelte`                   | Entry; magic link + Google                                                        |
| PS-A02   | any       | `/home`                   | Workspace router    | 1    | false       | —         | QA-010                                 | `WF-TRUST-ROUTER`          | `trust-router`          | —                                                      | —                                                                     | Trust UX                | `home/+page.svelte`                    | Post-auth persona redirect                                                        |
| PS-A03   | any       | `/setup`                  | Account setup       | 1    | false       | —         | QA-013                                 | `WF-TRUST-SETUP`           | `trust-form`            | —                                                      | —                                                                     | Trust UX                | `setup/+page.svelte`                   | Provision / profile completion                                                    |
| PS-A04   | player    | `/vpc-pending`            | VPC gate            | 1    | false       | —         | QA-133                                 | `WF-VPC-GATE`              | `trust-gate`            | —                                                      | —                                                                     | Trust UX                | `vpc-pending/+page.svelte`             | Blocks minors until VPC complete                                                  |
| PS-A05   | coach     | `/compliance`             | Coach clearance     | 1    | false       | —         | QA-161, QA-204                         | `WF-TRUST-COACH-CLEARANCE` | `trust-gate`            | `[COACH_OS_FOUNDATION.md](./COACH_OS_FOUNDATION.md)`   | `[COACH_OS_VISUAL_ACCEPTANCE.md](./COACH_OS_VISUAL_ACCEPTANCE.md)`    | Trust UX                | `compliance/+page.svelte`              | Uncleared coach redirect target                                                   |
| PS-A06   | any       | `/privacy`                | Privacy policy      | 1    | false       | —         | QA-012                                 | `WF-TRUST-PRIVACY`         | `trust-legal`           | —                                                      | —                                                                     | Trust UX                | `privacy/+page.svelte`                 | Legal surface                                                                     |
| PS-A07   | any       | `/terms`                  | Terms of service    | 2    | false       | —         | QA-012                                 | —                          | `trust-legal`           | —                                                      | —                                                                     | Trust UX                | `terms/+page.svelte`                   | Legal; optional if routed                                                         |
| PS-A08   | any       | `/settings`               | Settings terminal   | 2    | false       | —         | QA-111                                 | —                          | `trust-form`            | —                                                      | —                                                                     | Flat analytical         | `settings/+page.svelte`                | Cross-role; not PlayerShell rail                                                  |
| PS-P01   | parent    | `/parent/household`       | Household           | 1    | true        | 1         | QA-121, QA-131, QA-401                 | `WF-PARENT-HOUSEHOLD`      | `parent-bento-12col`    | `[PARENT_OS_FOUNDATION.md](./PARENT_OS_FOUNDATION.md)` | `[PARENT_OS_VISUAL_ACCEPTANCE.md](./PARENT_OS_VISUAL_ACCEPTANCE.md)`  | Flat co-op partner      | `parent/household/+page.svelte`        | Waiver + team dispatch link                                                       |
| PS-P02   | parent    | `/parent/vpc`             | Consent (VPC)       | 1    | true        | 2         | QA-122, QA-132, QA-402                 | `WF-PARENT-VPC`            | `parent-trust-form`     | `[PARENT_OS_FOUNDATION.md](./PARENT_OS_FOUNDATION.md)` | `[PARENT_OS_VISUAL_ACCEPTANCE.md](./PARENT_OS_VISUAL_ACCEPTANCE.md)`  | Trust UX                | `parent/vpc/+page.svelte`              | Auto-finalizes consent_records                                                    |
| PS-P03   | parent    | `/parent/dashboard`       | Co-op Command       | 1    | true        | 5         | QA-124, QA-125, QA-405                 | `WF-PARENT-COOP`           | `parent-bento-12col`    | `[PARENT_OS_FOUNDATION.md](./PARENT_OS_FOUNDATION.md)` | `[PARENT_OS_VISUAL_ACCEPTANCE.md](./PARENT_OS_VISUAL_ACCEPTANCE.md)`  | Flat co-op partner      | `parent/dashboard/+page.svelte`        | RSVP strip, Car Ride debrief                                                      |
| PS-P04   | parent    | `/parent/log-workout`     | Log Workout         | 2    | true        | —         | QA-123, QA-152                         | `WF-PARENT-LOG`            | `parent-bento-12col`    | `[PARENT_OS_FOUNDATION.md](./PARENT_OS_FOUNDATION.md)` | —                                                                     | Flat co-op partner      | `parent/log-workout/+page.svelte`      | Co-op XP path                                                                     |
| PS-P05   | parent    | `/parent/payments`        | Payments            | 2    | true        | —         | QA-202, QA-210                         | `WF-PARENT-PAY`            | `parent-bento-12col`    | `[PARENT_OS_FOUNDATION.md](./PARENT_OS_FOUNDATION.md)` | —                                                                     | Flat co-op partner      | `parent/payments/+page.svelte`         | Installments + push prefs                                                         |
| PS-C01   | coach     | `/coach`                  | Daily Intel         | 1    | true        | —         | QA-141, QA-163                         | `WF-COACH-INTEL`           | `coach-bento-12col`     | `[COACH_OS_FOUNDATION.md](./COACH_OS_FOUNDATION.md)`   | `[COACH_OS_VISUAL_ACCEPTANCE.md](./COACH_OS_VISUAL_ACCEPTANCE.md)`    | Flat sideline analytics | `coach/+page.svelte`                   | Squad hub; Forge chips OK                                                         |
| PS-C02   | coach     | `/coach/forge`            | The Forge           | 1    | true        | 3         | QA-142, QA-134, QA-403                 | `WF-COACH-FORGE`           | `coach-forge-workbench` | `[COACH_OS_FOUNDATION.md](./COACH_OS_FOUNDATION.md)`   | `[COACH_OS_VISUAL_ACCEPTANCE.md](./COACH_OS_VISUAL_ACCEPTANCE.md)`    | Flat sideline analytics | `coach/forge/+page.svelte`             | Full-page workbench; reject HUD overlay                                           |
| PS-C03   | coach     | `/coach/drills`           | Field Station       | 2    | true        | —         | QA-143, QA-144                         | `WF-COACH-DRILLS`          | `coach-bento-12col`     | `[COACH_OS_FOUNDATION.md](./COACH_OS_FOUNDATION.md)`   | —                                                                     | Flat sideline analytics | `coach/drills/+page.svelte`            | Spatial designer; not exec cut                                                    |
| PS-C04   | coach     | `/coach/tactical`         | War Room            | 2    | false       | —         | —                                      | —                          | `coach-bento-12col`     | `[COACH_OS_FOUNDATION.md](./COACH_OS_FOUNDATION.md)`   | —                                                                     | Flat sideline analytics | `coach/tactical/+page.svelte`          | Route retained; nav + HQ hero hidden                                              |
| PS-C05   | coach     | `/coach/tactics-board`    | Tactics board       | 2    | true        | —         | —                                      | —                          | `coach-bento-12col`     | `[COACH_OS_FOUNDATION.md](./COACH_OS_FOUNDATION.md)`   | —                                                                     | Flat sideline analytics | `coach/tactics-board/+page.svelte`     | FacilityScheduler mount                                                           |
| PS-C06   | coach     | `/coach/match-day`        | Match Day           | 2    | true        | —         | QA-145                                 | —                          | `coach-bento-12col`     | `[COACH_OS_FOUNDATION.md](./COACH_OS_FOUNDATION.md)`   | —                                                                     | Flat sideline analytics | `coach/match-day/+page.svelte`         | Full demo Act 2 optional                                                          |
| PS-C07   | coach     | `/coach/scouting`         | Proving Grounds     | 2    | true        | —         | —                                      | —                          | `coach-bento-12col`     | `[COACH_OS_FOUNDATION.md](./COACH_OS_FOUNDATION.md)`   | —                                                                     | Flat sideline analytics | `coach/scouting/+page.svelte`          | Recruit pipeline                                                                  |
| PS-C08   | coach     | `/coach/logistics`        | Team Ops            | 2    | true        | —         | QA-146                                 | `WF-COACH-LOGISTICS`       | `coach-bento-12col`     | `[COACH_OS_FOUNDATION.md](./COACH_OS_FOUNDATION.md)`   | —                                                                     | Flat sideline analytics | `coach/logistics/+page.svelte`         | SafeSport broadcast                                                               |
| PS-C09   | coach     | `/coach/trial-builder`    | Trial Builder       | 3    | true        | —         | —                                      | —                          | `coach-bento-12col`     | —                                                      | —                                                                     | Flat sideline analytics | `coach/trial-builder/+page.svelte`     | Post-acquisition tryout tooling                                                   |
| PS-PL01  | player    | `/player/dashboard`       | HQ                  | 1    | true        | 4         | QA-101, QA-106, QA-151, QA-154, QA-404 | `WF-PLAYER-HQ`             | `player-pd-deck`        | `[PLAYER_OS_FOUNDATION.md](./PLAYER_OS_FOUNDATION.md)` | `[PLAYER_OS_VISUAL_ACCEPTANCE.md](../PLAYER_OS_VISUAL_ACCEPTANCE.md)` | Diegetic Player UX      | `player/dashboard/+page.svelte`        | Missions rail + AdaptiveHomework                                                  |
| PS-PL02  | player    | `/player/workout`         | Train               | 1    | true        | 4         | QA-102–QA-108, QA-107                  | `WF-PLAYER-TRAIN`          | `player-pd-deck`        | `[PLAYER_OS_FOUNDATION.md](./PLAYER_OS_FOUNDATION.md)` | `[PLAYER_OS_VISUAL_ACCEPTANCE.md](../PLAYER_OS_VISUAL_ACCEPTANCE.md)` | Diegetic Player UX      | `player/workout/+page.svelte`          | Locked-by-coach prescription                                                      |
| PS-PL03  | player    | `/stats`                  | Stats               | 1    | true        | —         | QA-304                                 | `WF-PLAYER-STATS`          | `player-telemetry`      | `[PLAYER_OS_FOUNDATION.md](./PLAYER_OS_FOUNDATION.md)` | `[PLAYER_OS_VISUAL_ACCEPTANCE.md](../PLAYER_OS_VISUAL_ACCEPTANCE.md)` | Telemetry calm          | `stats/+page.svelte`                   | Tier 1 player nav; optional for 15-min exec cut — see GP-ACQ-04c (workflow canon) |
| PS-PL04  | player    | `/player/armory`          | Armory              | 2    | false       | —         | QA-109, QA-110, QA-301–QA-302          | —                          | `player-pd-deck`        | `[PLAYER_OS_FOUNDATION.md](./PLAYER_OS_FOUNDATION.md)` | `[PLAYER_OS_VISUAL_ACCEPTANCE.md](../PLAYER_OS_VISUAL_ACCEPTANCE.md)` | Diegetic Player UX      | `player/armory/+page.svelte`           | Full demo Act 3; VA waivable                                                      |
| PS-PL05  | player    | `/player/tracker`         | Tracker             | 2    | false       | —         | QA-112, QA-205                         | —                          | `player-pd-deck`        | `[PLAYER_OS_FOUNDATION.md](./PLAYER_OS_FOUNDATION.md)` | `[PLAYER_OS_VISUAL_ACCEPTANCE.md](../PLAYER_OS_VISUAL_ACCEPTANCE.md)` | Diegetic Player UX      | `player/tracker/+page.svelte`          | Deep-link / PlayerShell rail                                                      |
| PS-PL06  | player    | `/player/settings`        | Settings            | 2    | false       | —         | QA-111                                 | —                          | `player-pd-deck`        | `[PLAYER_OS_FOUNDATION.md](./PLAYER_OS_FOUNDATION.md)` | `[PLAYER_OS_VISUAL_ACCEPTANCE.md](../PLAYER_OS_VISUAL_ACCEPTANCE.md)` | Diegetic Player UX      | `player/settings/+page.svelte`         | PlayerShell edge case                                                             |
| PS-PL07  | player    | `/player/skill-tree`      | Skill tree          | 3    | false       | —         | —                                      | —                          | `player-pd-deck`        | `[PLAYER_OS_FOUNDATION.md](./PLAYER_OS_FOUNDATION.md)` | —                                                                     | Tier A benchmark        | `player/skill-tree/+page.svelte`       | Do not wrap in Tier B panels                                                      |
| PS-PL08  | player    | `/player/proving-grounds` | Proving Grounds     | 3    | false       | —         | —                                      | —                          | `player-pd-deck`        | `[PLAYER_OS_FOUNDATION.md](./PLAYER_OS_FOUNDATION.md)` | —                                                                     | Tier A primitive        | `player/proving-grounds/+page.svelte`  | HQ quick-op deep link                                                             |
| PS-PL09  | player    | `/player/media`           | Media vault         | 3    | false       | —         | —                                      | —                          | `player-pd-deck`        | `[PLAYER_OS_FOUNDATION.md](./PLAYER_OS_FOUNDATION.md)` | —                                                                     | Diegetic Player UX      | `player/media/+page.svelte`            | ClipAnalyzer mount                                                                |
| PS-X01   | any       | `/messages`               | Messages            | 1    | true        | 6         | QA-153, QA-406                         | `WF-COMMS-SAFESPORT`       | `comms-hub`             | —                                                      | —                                                                     | SafeSport comms         | `messages/+page.svelte`                | No coach→minor unsupervised DM                                                    |
| PS-D01   | director  | `/director`               | Director hub        | 2    | true        | —         | QA-225–QA-228                          | —                          | `coach-bento-12col`     | —                                                      | —                                                                     | Enterprise command      | `director/+page.svelte`                | Tab shell; full demo Act 4                                                        |
| PS-D02   | director  | `/director/compliance`    | Staff clearance     | 2    | true        | —         | QA-162, QA-228                         | —                          | `trust-gate`            | —                                                      | —                                                                     | Enterprise command      | `director/compliance/+page.svelte`     | Read-only VPC audit                                                               |
| PS-D03   | director  | `/director/events`        | Tournaments         | 3    | true        | —         | QA-203, QA-222                         | —                          | `coach-bento-12col`     | —                                                      | —                                                                     | Enterprise command      | `director/events/+page.svelte`         | Bracket ops                                                                       |
| PS-ADM01 | admin     | `/admin`                  | Admin hub           | 3    | true        | —         | QA-130                                 | —                          | `trust-form`            | —                                                      | —                                                                     | Admin console           | `admin/+page.svelte`                   | Super_admin bootstrap                                                             |
| PS-ADM02 | admin     | `/admin/rl-policy`        | RL policy           | 3    | false       | —         | QA-155                                 | —                          | `trust-form`            | —                                                      | —                                                                     | Admin console           | `admin/rl-policy/+page.svelte`         | Waivable at `abPercent: 0`                                                        |
| PS-M01   | marketing | `/acquisition`            | Acquisition landing | 2    | false       | —         | QA-208                                 | —                          | `trust-auth`            | —                                                      | —                                                                     | Marketing               | `(marketing)/acquisition/+page.svelte` | Sell diligence CTA                                                                |
| PS-M02   | marketing | `/register/{clubId}`      | Public registration | 2    | false       | —         | QA-227                                 | —                          | `trust-form`            | —                                                      | —                                                                     | Marketing               | `register/[clubId]/+page.svelte`       | Table stakes deep link                                                            |
| PS-M03   | marketing | `/tryouts/{programId}`    | Public tryout       | 2    | false       | —         | QA-226                                 | —                          | `trust-form`            | —                                                      | —                                                                     | Marketing               | `tryouts/[programId]/+page.svelte`     | Full demo Act 4 optional                                                          |
| PS-M04   | marketing | `/`                       | Marketing home      | 3    | false       | —         | —                                      | —                          | `trust-auth`            | —                                                      | —                                                                     | Marketing               | `(marketing)/+page.svelte`             | Pre-auth marketing                                                                |
| PS-F01   | future    | `/team-manager`           | Team Manager        | 3    | false       | —         | —                                      | —                          | `coach-bento-12col`     | —                                                      | —                                                                     | Flat ops                | —                                      | Planned JWT role                                                                  |
| PS-F02   | future    | `/recruiter`              | Recruiter           | 3    | true        | —         | —                                      | —                          | `trust-form`            | —                                                      | —                                                                     | Recruiter terminal      | `recruiter/+page.svelte`               | Clearance-gated                                                                   |
| PS-F03   | future    | `/tutor`                  | Tutor               | 3    | false       | —         | —                                      | —                          | `trust-form`            | —                                                      | —                                                                     | Tutor workspace         | `tutor/+page.svelte`                   | Future persona                                                                    |


**Tier 1 count:** 15 rows (PS-A01–A06, PS-P01–P03, PS-C01–C02, PS-PL01–PL03, PS-X01).

---

## §2 Nav policy (pre-acquisition)

Source: `[src/lib/shell/workspaceNav.js](../../src/lib/shell/workspaceNav.js)`

### Staff admin bucket (NAV-CANON)

Roles using `EnterpriseConsoleShell` with **admin interface skin** on all viewports: `coach`, `director`, `admin`, `global_admin`, `super_admin`, `registrar`, **`recruiter`**. Field chrome: Option A bottom tabs (≤5 Tier 1) + overflow drawer — see [`PLATFORM_NAVIGATION_CANON.md`](./PLATFORM_NAVIGATION_CANON.md) §3c–§4.

### Coach (`coachLinks`) — allowed


| Label           | href                   | Registry id |
| --------------- | ---------------------- | ----------- |
| Daily Intel     | `/coach`               | PS-C01      |
| The Forge       | `/coach/forge`         | PS-C02      |
| Field Station   | `/coach/drills`        | PS-C03      |
| Tactics board   | `/coach/tactics-board` | PS-C05      |
| Match Day       | `/coach/match-day`     | PS-C06      |
| Proving Grounds | `/coach/scouting`      | PS-C07      |
| Team Ops        | `/coach/logistics`     | PS-C08      |
| Trial Builder   | `/coach/trial-builder` | PS-C09      |


**Excluded from nav:** War Room (`/coach/tactical`, PS-C04) — Tier 2, `nav_visible=false`.

### Parent (`parentLinks`) — allowed


| Label         | href                  | Registry id |
| ------------- | --------------------- | ----------- |
| Household     | `/parent/household`   | PS-P01      |
| Co-op Command | `/parent/dashboard`   | PS-P03      |
| Consent (VPC) | `/parent/vpc`         | PS-P02      |
| Log Workout   | `/parent/log-workout` | PS-P04      |
| Payments      | `/parent/payments`    | PS-P05      |
| Messages      | `/messages`           | PS-X01      |


Tier 2 parent links remain in sidebar for co-op parity; waivable in QA per §0.

### Player (`athleteHouseholdLinks`) — Tier 1 nav only


| Label | href                | Registry id |
| ----- | ------------------- | ----------- |
| HQ    | `/player/dashboard` | PS-PL01     |
| Train | `/player/workout`   | PS-PL02     |
| Stats | `/stats`            | PS-PL03     |


**Tier 2 deep-link only (omit from pre-acquisition enterprise nav):** Tracker (`/player/tracker`), Settings (`/player/settings`). PlayerShell bottom rail may still expose Tracker — registry Tier 1 bar is HQ · Train · Stats for acquisition QA.

---

## §3 Contradiction appendix


| Doc / file                                                              | Said                                                                                        | Registry says                                                                | Resolution                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `[COACH_OS.md](./COACH_OS.md)` § Home screen zones                      | Tactical `/coach/tactical` equal home-zone pillar                                           | Tier 2; `nav_visible=false`; no HQ hero CTA                                  | **Registry wins** — Forge + Daily Intel are Tier 1 coach surfaces |
| `[FUNCTIONAL_AUDIT_BACKLOG.md](../FUNCTIONAL_AUDIT_BACKLOG.md)` F2 Done | “War Room in `workspaceNav.js`”                                                             | War Room removed from coach sidebar                                          | **Registry wins** — deep-link route only                          |
| `[FUNCTIONAL_MVP.md](./FUNCTIONAL_MVP.md)` Coach primary routes         | Lists `/coach/drills`, `/coach/match-day`, `/coach/scouting`, `/coach/logistics` as primary | Tier 1 coach = `/coach`, `/coach/forge` only for exec cut                    | **Registry wins** — Tier 2 marked optional in FUNCTIONAL_MVP      |
| `[PERSONA_ECOSYSTEM.md](../PERSONA_ECOSYSTEM.md)` Coach scope           | “tactical board” in shipped scope line                                                      | Tactical board Tier 2 — not acquisition demo                                 | **Registry wins** — link §0 in persona doc                        |
| `[DEMO_SCRIPT.md](../acquisition/DEMO_SCRIPT.md)` full demo Act 2       | Field Station + logistics in 45 min script                                                  | Tier 2 for `/coach/drills`, `/coach/logistics`                               | **Registry wins** — exec cut (15 min) is Tier 1 authority         |
| `[FUNCTIONAL_MVP.md](./FUNCTIONAL_MVP.md)` Player primary routes        | Armory + settings in primary list                                                           | Tier 1 player = dashboard, workout, stats                                    | **Registry wins** — Armory Phase 9 / VA waivable                  |
| `[OWNER_QA_CHECKLIST.md](./OWNER_QA_CHECKLIST.md)` Phase 5              | QA-143/144 same phase as QA-142                                                             | QA-143/144 optional Tier 2 waivers                                           | **Registry wins** — Phase 5 gate = QA-142 + player loop           |
| `[PLATFORM_BUILD_MANDATES.md](./PLATFORM_BUILD_MANDATES.md)` §0 stack   | This file was authority #1 for build/reject                                                 | Registry is authority #1 **for routes/nav**; mandates #2 for UX build/reject | **Both** — registry first for surfaces, mandates for pixel rules  |
| `[ROADMAP.md](../../ROADMAP.md)` open Coach OS work                     | Tactical/assignments hardening TBD                                                          | War Room Tier 2 tabled for acquisition                                       | **Registry wins** — post-acquisition slice                        |


---

## §4 Owner sign-off (Tier 1 only)


| id      | route               | label            | Pass ☐ | Waive ☐ | Initials | Date       |
| ------- | ------------------- | ---------------- | ------ | ------- | -------- | ---------- |
| PS-A01  | `/login`            | Sign in          | Pass   |         |          | 06/19/2026 |
| PS-A02  | `/home`             | Workspace router | Pass   |         |          | 06/19/2026 |
| PS-A03  | `/setup`            | Account setup    | Pass   |         |          | 06/19/2026 |
| PS-A04  | `/vpc-pending`      | VPC gate         | Pass   |         |          | 06/19/2026 |
| PS-A05  | `/compliance`       | Coach clearance  | Pass   |         |          | 06/19/2026 |
| PS-A06  | `/privacy`          | Privacy policy   | Pass   |         |          | 06/19/2026 |
| PS-P01  | `/parent/household` | Household        | Pass   |         |          | 06/19/2026 |
| PS-P02  | `/parent/vpc`       | Consent (VPC)    | Pass   |         |          | 06/19/2026 |
| PS-P03  | `/parent/dashboard` | Co-op Command    | Pass   |         |          | 06/19/2026 |
| PS-C01  | `/coach`            | Daily Intel      | Pass   |         |          | 06/19/2026 |
| PS-C02  | `/coach/forge`      | The Forge        | Pass   |         |          | 06/19/2026 |
| PS-PL01 | `/player/dashboard` | HQ               | Pass   |         |          | 06/19/2026 |
| PS-PL02 | `/player/workout`   | Train            | Pass   |         |          | 06/19/2026 |
| PS-PL03 | `/stats`            | Stats            | Pass   |         |          | 06/19/2026 |
| PS-X01  | `/messages`         | Messages         | Pass   |         |          | 06/19/2026 |


**Owner signature:** Evan Waechtler **Date:** 06/19/2026