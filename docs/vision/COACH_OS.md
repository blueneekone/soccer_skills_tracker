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

Route: `/coach` and sub-routes

| Area | Surfaces | Purpose |
|------|----------|---------|
| Squad hub | `SquadTelemetryView` | Roster density, activity, readiness |
| Assignments | `/coach/assignments` | Mission/bounty assignment to players |
| Drills | `/coach/drills` | Drill library, prescribe work |
| Match-day | `/coach/match-day` | Cartridge simulator, lineup |
| Tactical | `/coach/tactical` | Trinity tactical board |
| Scouting | `/coach/scouting` | Evaluations, notes |
| Forge | `/coach/forge` | Curriculum / content builder |

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
