# Director OS — Vision

**Product Epic E** · Build status: [`docs/EPIC5_STATUS.md`](../EPIC5_STATUS.md) (Enterprise Logistics)

---

## North star

**Club mission control** — one surface for compliance, multi-team operations, field deployment, licenses, and registrar workflows at org scale.

---

## Primary user

Club directors, technical directors, and registrars (consolidating into Director tabs).

---

## Home screen zones

Route: `/director` (tabbed command center)

| Tab / module | Purpose |
|--------------|---------|
| Teams | Multi-team roster oversight |
| Compliance | Club compliance matrix, holds |
| Household | VPC / household compliance |
| Registrars | Registrar invites, registration ops — [`REGISTRAR_DIRECTOR_MIGRATION.md`](../REGISTRAR_DIRECTOR_MIGRATION.md) |
| Field Ops | Facility map, deployment calendar scaffold |
| Licenses | Club entitlements, read-only billing banners |
| Brand / playbook | Club configuration |

Legacy `/registrar` redirects to `/director?tab=registrars` for eligible roles.

---

## Registrar subsection

**Registrar** is not a separate product epic — it is a **Director tab** for club-wide registration and compliance:

- Compliance matrix parity with legacy registrar console
- Invite flows via `RegistrarInviteTab`
- Migration inventory: [`docs/REGISTRAR_DIRECTOR_MIGRATION.md`](../REGISTRAR_DIRECTOR_MIGRATION.md)
- Decommission standalone `/registrar` after QA parity

---

## Core loops

1. **Compliance** — monitor household/VPC, clearance, billing gates.
2. **Field ops** — facilities, deployment calendar (in progress).
3. **Registration** — registrar workflows → team rosters.
4. **Messaging** — club broadcasts with audit ([`docs/FCM_AND_MESSAGING_MATRIX.md`](../FCM_AND_MESSAGING_MATRIX.md)).

---

## Handoffs

| Direction | Flow |
|-----------|------|
| Director → Team Manager (future) | Policy, registration batches |
| Director → Coach | License/read-only gates, compliance holds |
| Director → Parent | Billing, household linkage |
| Registrar data → Teams | Roster eligibility |

---

## Visual tone

- Enterprise command center — dense tables, map modules, tab IA.
- No Player OS gamification.
- Clear read-only / billing banners when entitlements block downstream personas.

---

## Out of scope

- Player HUD
- Coach tactical/Forge tools (coach persona)
- Platform-global admin (Admin OS)
- State association API integration (future product epic — not Epic 5 logistics)

---

## ROADMAP link

Logistics sprints tracked in [`docs/EPIC5_STATUS.md`](../EPIC5_STATUS.md) (5.1–5.6). Lettered Product Epic E vision vs **Epic 5 in that doc** = same Director logistics theme; old ROADMAP "Epic 5" (state APIs) is deprecated.
