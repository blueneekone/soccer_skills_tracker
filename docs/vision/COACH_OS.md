# Coach OS — Vision

**Product Epic C**

---

## North star

A flat, high-density **sideline analytics** workspace: roster readiness, drill assignment, match-day tools, and development tracking — zero gamification chrome.

---

## Primary user

Team coaches responsible for athlete development, session planning, and match-day decisions.

---

## Home screen zones

Route: `/coach` and sub-routes · **Tier authority:** [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md)

| Area | Route | Tier | Nav | Purpose |
|------|-------|------|-----|---------|
| Squad hub | `/coach` | 1 | visible | `SquadTelemetryView` — roster density, activity, readiness |
| The Forge | `/coach/forge` | 1 | visible | Intent deploy (Epic 8) — `$lib/coach/intent` |
| Field Station | `/coach/drills` | 2 | visible | Drill library, spatial designer — optional QA (QA-143/144) |
| Team Ops | `/coach/logistics` | 2 | visible | SafeSport parent announcements |
| Match-day | `/coach/match-day` | 2 | visible | Cartridge simulator, lineup |
| Proving Grounds | `/coach/scouting` | 2 | visible | Evaluations, recruit pipeline |
| War Room | `/coach/tactical` | 2 | **hidden** | Trinity tactical board — deep-link only pre-acquisition |
| Tactics board | `/coach/tactics-board` | 2 | visible | FacilityScheduler / command board |
| Trial Builder | `/coach/trial-builder` | 3 | visible | Post-acquisition tryout tooling |

---

## Core loops

1. **Plan** — pick drills / macrocycle nodes → assign to squad or individuals.
2. **Observe** — match-day and practice telemetry → evaluation grades.
3. **Assign** — bounties appear on Player OS `ActiveBounties`.
4. **Adjust** — readiness and XP trends inform next session (flat charts, no loot UI).

---

## Handoffs

| Direction | Flow |
|-----------|------|
| Coach → Player | Assignments, drills, XP via verified logs |
| Coach → Team Manager (future) | Readiness flags, attendance gaps (TM owns schedule) |
| Director → Coach | Compliance holds, license/read-only gates |
| Player → Coach | Completed bounties, workout logs |

---

## Visual tone

- Flat analytical modules; Switzer/Geist Mono tables.
- Liquid glass acceptable on **coach** surfaces; **no** chamfered Player OS military corners.
- 12-col bento on primary coach dashboard where migrated.

## Foundation & layout canon

- **Material vocabulary:** [`COACH_OS_FOUNDATION.md`](./COACH_OS_FOUNDATION.md) — SIEM modules, density, Forge workbench layout.
- **Visual acceptance:** [`COACH_OS_VISUAL_ACCEPTANCE.md`](./COACH_OS_VISUAL_ACCEPTANCE.md) — Tier 1 routes, 390px first.
- **Forge layout:** `full-page-workbench` (`coach-forge-workbench`) — inline deploy column in document flow; **reject** fixed `IntentHUD` Trinity HUD overlay on Tier 1. Blueprint: [`coach-forge-workbench-v1.md`](./references/ui/research/blueprints/coach-forge-workbench-v1.md).
- **Workflow steps:** [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) GP-ACQ-03, GP-COACH-02.

## Design criteria

Platform bar: [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) §2 — **Coach row**.

- Premium = sideline clarity at speed — density and legibility, not flash.
- 3-second judgment: roster/readiness scannable; first action obvious on squad hub.
- **No** gamification chrome — XP/streak/loot UI stays on Player routes only.
- Mono tables and flat charts; instant feedback on assignments and match-day actions.
- See rubric §5 before shipping Coach UX changes.

---

## Boundary vs Team Manager

| Coach owns | Team Manager owns (planned) |
|------------|----------------------------|
| Drills, XP, tactical board, Forge, scouting evaluations | Roster ops, registration coordination, practice/event scheduling, attendance |
| Development tracks & bounties | Logistics messaging (SafeSport parent CC) |
| Match-day tactics | Field/deployment calendar (with Director) |

Do not merge TM logistics into Coach OS or vice versa without an explicit sprint.

---

## Out of scope

- Player gamification HUD
- Club-wide director compliance matrix (Director/registrar)
- Parent VPC flows
- Platform admin

---

## ROADMAP link

Coach surfaces span multiple historical epics. Next dedicated Coach OS sprint: **TBD** — track tactical/assignments hardening in [`ROADMAP.md`](../../ROADMAP.md) as sprints are scheduled.
