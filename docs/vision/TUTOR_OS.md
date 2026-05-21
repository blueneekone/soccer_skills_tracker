# Tutor OS — Vision

**Product Epic H** · **Future role**

---

## North star

Supplemental **1:1 instruction** logged against player profiles — clearance-gated, SafeSport-aware, distinct from team coach and team manager personas.

---

## Primary user

Independent or club-affiliated tutors running extra sessions outside team practice.

---

## Home screen zones (conceptual)

Route: `/tutor` (future)

| Module | Purpose |
|--------|---------|
| Roster (scoped) | Players under tutor engagement |
| Session log | Structured supplemental session entry |
| Notes | Development notes visible per club policy |

---

## Core loops

1. **Schedule session** — parent/player visibility per club rules.
2. **Log work** — supplemental reps feed telemetry bus (not duplicate coach assignments).
3. **Review** — coach/director read-only visibility where configured.

---

## Handoffs

| Direction | Flow |
|-----------|------|
| Tutor → Player | Supplemental homework / feedback |
| Parent → Tutor | Consent, scheduling |
| Coach → Tutor | No tactical overlap — tutor does not assign team bounties |
| Compliance → Tutor | Clearance required per [`docs/CLEARANCE.md`](../CLEARANCE.md) |

---

## Visual tone

- Professional, instructional — neither Player arcade HUD nor Coach tactical board.
- Session-first layout; minimal gamification.

---

## Out of scope

- Team tactical board, Forge, match-day
- Director club ops
- Implementing tutor JWT/routes without clearance + product sprint

---

## ROADMAP link

**TBD sprint** — role listed in clearance doc; no delivery sprint in Epic 1/2 track.
