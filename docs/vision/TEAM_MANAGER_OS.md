# Team Manager OS — Vision

**Product Epic D** · **Planned role — not in JWT/code yet**

---

## North star

Dedicated **team operations** persona: roster, schedule, registration, and attendance — with a separate JWT role for auditability, without crossing into coach development/tactics tooling.

---

## Primary user

Club volunteers or paid staff who run logistics for one or more teams (travel, registration, practice schedule) but do not assign drills or run the tactical board.

---

## Primary route (future)

`/team-manager` — flat ops dashboard, coach-like information density, different module set.

---

## JWT & access (planned — document only)

- **Role claim:** `team_manager` (separate from `coach` for audit trails).
- **Scope:** Team-scoped like coach — document intent for `getTeamManagerTeams()` pattern mirroring coach team resolution; **do not implement** until a dedicated sprint ships the role.
- **Clearance:** Background check required — same pipeline as coach ([`docs/CLEARANCE.md`](../CLEARANCE.md)); touches minor PII for roster and scheduling.

---

## CAN do

- Roster operations (add/move players at team level within club policy)
- Registration coordination with state/club registrar workflows
- Practice and event scheduling
- Attendance tracking
- Logistics messaging — parent-targeted announcements and Parent Lounge ([`docs/vision/COMMS_HUB.md`](./COMMS_HUB.md) Epic 4.7)

---

## CANNOT do

- Assign drills, XP, or bounties
- Tactical board, Forge, scouting evaluations
- Director club-wide tools (licenses, multi-club field vault, org admin)

---

## Home screen zones (conceptual)

| Module | Purpose |
|--------|---------|
| Roster ops | Active squad list, registration status |
| Schedule | Practices, matches, field assignments |
| Attendance | Session check-in/out |
| Comms | Logistics broadcasts (parent CC enforced) |
| Registration | Pending/completed registrar tasks |

---

## Core loops

1. **Roster sync** — align team list with registrar/Director compliance matrix.
2. **Schedule** — publish practice/event → notify coaches, players, parents.
3. **Attendance** — capture who attended → feed readiness views (coach read-only consumer).
4. **Audit** — every write logs `actorRole: team_manager` for compliance review.

---

## Handoffs

| Direction | Flow |
|-----------|------|
| Director/Registrar → TM | Club policy, eligibility, registration batches |
| TM → Coach | Schedule, attendance, roster changes |
| TM → Parent | Event logistics, registration reminders |
| Coach → TM | Readiness/availability feedback (not authoritative for schedule) |

---

## Visual tone

- Flat ops dashboard — similar **density** to Coach OS, different **modules**.
- No Player OS gamification (streaks, chamfer HUD).
- Professional, audit-friendly labels on actions.

---

## Out of scope (until role ships)

- Implementing `team_manager` in `roleDerivations`, `customClaims`, or `route-policies`
- Building `/team-manager` routes
- Replacing coach assignment or tactical flows

---

## ROADMAP link

Role and route: **Epic 4 Sprint 4.7** (team ops mode) after Epic 1 Player HUD and Epic 2 vault stabilization. See [`ROADMAP.md`](../../ROADMAP.md) Epic 4 table and planned roles section.
