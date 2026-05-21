# Admin OS — Vision

**Product Epic F**

---

## North star

Platform operators manage organizations, users, impersonation, and system-wide configuration — isolated from club Director day-to-day ops.

---

## Primary user

`global_admin` / `super_admin` staff and internal operators.

---

## Home screen zones

Route: `/admin`

| Area | Purpose |
|------|---------|
| Organizations | Clubs, cells, license fields |
| Users | Search, role assignment, support |
| System settings | Feature flags, platform config |
| Sports configs | Per-sport drill/synthetic mappings |
| Audit | Cross-tenant audit log (where exposed) |

---

## Core loops

1. **Provision org** — create club, assign cell, seed entitlements.
2. **Support user** — impersonation (policy-gated), password/claim fixes.
3. **Configure platform** — sports configs, RL policy toggles.

---

## Handoffs

| Direction | Flow |
|-----------|------|
| Admin → Director | Org/club stands up → director takes club ops |
| Admin → All personas | Entitlements, feature flags, read-only modes |

---

## Visual tone

- Utilitarian admin console — tables, forms, minimal chrome.
- No persona-specific gamification or coach analytics.

---

## Out of scope

- Club compliance matrix (Director)
- Team-level roster (Coach / Team Manager)
- Player/parent flows

---

## ROADMAP link

Admin hardening sprints: **TBD** — see [`ROADMAP.md`](../../ROADMAP.md) for compliance/foundation priorities first.
