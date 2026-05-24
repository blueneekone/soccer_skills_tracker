# Parent OS — Vision

**Product Epic B**

---

## North star

Parents are **co-op partners**, not spectators. The Parent OS makes it easy to grant consent, log alongside their athlete, fund club obligations, and celebrate progress — without pretending to be a game.

---

## Primary user

Guardians of minor (and teen) players: VPC signers, household admins, car-ride debriefers.

---

## Home screen zones

Route: `/parent/dashboard` (12-col bento where migrated)

| Zone | Component | Purpose |
|------|-----------|---------|
| Co-op | `CoOpArena` | Shared workout logging, celebrate completions |
| Transit | `CarRideArena` | Quick debrief / conversation prompts after sessions |
| Missions | `BountyTerminal` | Parent-visible bounties, approval flows |
| Household | household module | Operatives, VPC status, invites |
| Commerce | payments surfaces | Club fees, entitlements (read-only where gated) |

---

## Core loops

1. **VPC** — complete verifiable parental consent → unlock player training PII routes.
2. **Household** — add/link operatives, manage co-parent access.
3. **Co-op log** — parent logs or confirms training when player cannot.
4. **Car Ride** — lightweight reflection loop after practice.
5. **Bounty terminal** — view/approve coach bounties tied to household operatives.

---

## Handoffs

| Direction | Flow |
|-----------|------|
| Parent → Player | VPC unlock; co-op logs count toward player XP where configured |
| Player → Parent | Progress notifications, capsule sharing |
| Coach → Parent | Announcements, Parent Lounge — **not** direct unsupervised DM to minors |
| Parent → Player (household) | Household threads only — same `householdId` gate (Epic 4.11) |
| Director → Parent | Billing, compliance, household linkage |
| Parent → Director | Payment, dispute, compliance questions |

---

## Visual tone

- Flat, trustworthy, adult-oriented UI — **not** Player OS chamfer/gamification.
- Clear compliance copy for COPPA/VPC steps.
- Bento spacing tokens aligned with platform grid; no arcade chrome.

---

## Out of scope

- Player HUD gamification (streak rings, military clip-path)
- Coach tactical or scouting tools
- Club-wide director field ops
- Team Manager roster scheduling (future TM persona)

---

## ROADMAP link

Parent flows intersect **Epic 2** (COPPA/VPC — Sprint 2.1 done), **Epic 4** (comms hub — [`COMMS_HUB.md`](./COMMS_HUB.md)), and **Epic 5 logistics** (household — see [`docs/EPIC5_STATUS.md`](../EPIC5_STATUS.md)).
