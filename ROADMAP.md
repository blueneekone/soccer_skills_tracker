# SSTracker — Delivery Roadmap

**Architecture:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)  
**Last updated:** 2026-05-20  
**Current sprint:** **1.8** — Premium HUD shell remediation

This document is the **canonical delivery tracker** for test-driven sprints. Product vision and persona UX live in [`docs/PERSONA_ECOSYSTEM.md`](docs/PERSONA_ECOSYSTEM.md) and [`docs/vision/`](docs/vision/).

---

## How to work a sprint (Cursor)

1. **Design** → Ask mode → update or read vision docs under `docs/vision/`.
2. **Build** → Agent mode → one slice per session; use the explicit file list from the sprint section below.
3. **Verify** before marking done:
   ```bash
   npm test -- <paths from sprint>
   npm run check
   npm run build
   ```

Agent workflow rules: [`.cursor/rules/sst-agent-workflow.mdc`](.cursor/rules/sst-agent-workflow.mdc)

---

## Sprint status — Epic 1: Foundation & Player HUD

| Sprint | Status | Summary | Proof |
|--------|--------|---------|-------|
| 1.1 | Done | 12-col liquid bento, content-hash assets | `liquidBento.css.test.ts`, `tokenCompliance.test.ts`, layout tests |
| 1.2 | Done | UID avatars, COPPA backend hooks | `complianceOps.js`, `user.types.ts` |
| 1.3 | Done | JWT RBAC, tenant isolation | `firestoreRulesSprint13.test.ts`, `roleDerivations.test.ts` |
| 1.4 | Done | Gaming HUD baseline | `playerHudSprint14.test.ts`, `playerDashboard.hud.test.ts` |
| 1.5 | Done | Mission dedup, avatar precision | `playerHudSprint15.test.ts`, `deduplicateMissions.ts` |
| 1.6 | Done | IdentityBentoModule, OperativeHub, HUDContainer | `playerHudSprint16.test.ts` |
| 1.7 | Done | HUD density, mission ellipsis, streak UX | `playerHudSprint17.test.ts` — Engineering pass (padding, ellipsis, streak pulse) — visual remediation continues in 1.8. |
| 1.8 | **Current** | Unified tactical HUD shell, flush embedded panels, Vanguard vectors in metrics column | `playerHudSprint18.test.ts` |

---

## Sprint 1.8 scope — Premium HUD shell remediation

**Goal:** One unified tactical HUD shell — eliminate box-in-box prototype feel, remove duplicate identity/metrics data, repurpose 8-col metrics to Vanguard vectors only.

**In scope:**

- `ROADMAP.md` (this update)
- `src/lib/components/player/dashboard/OperativeHub.svelte`
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte`
- `src/lib/components/player/dashboard/HudMetricsPanel.svelte`
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint18.test.ts` (create)

**Out of scope (defer to Sprint 1.9):**

- ActiveBounties mission row / bracket button redesign
- VanguardProtocolPanel + page layout bento restructure
- Memory capsule empty states
- Coach/parent routes

**Planned follow-ups (document only — do not implement):**

- Sprint 1.9 — Mission log density (ActiveBounties row redesign)
- Sprint 2.0 — Telemetry bento integration + empty state compression

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard
npm run check
npm run build
```

---

## Sprint status — Epic 2: Compliance & Data Vault

| Sprint | Status | Summary | Proof |
|--------|--------|---------|-------|
| 2.1 | Done | COPPA consent gates, PII route blocking | `firestoreRulesSprint21.test.ts`, `route-policies.js` |
| 2.2 | Partial | PII vault, shredder, retention rules | `vaultOps.js`, `shredOps.test.js`, `firestoreRulesSprint22.test.ts` |
| 2.3 | Planned | SafeSport messaging CC | `docs/FCM_AND_MESSAGING_MATRIX.md` |

---

## Product epics (vision — NOT sprint numbers)

Lettered epics avoid collision with **Epic 5** in [`docs/EPIC5_STATUS.md`](docs/EPIC5_STATUS.md) (enterprise logistics / Director OS) and the old ROADMAP "Epic 5" (state association APIs).

| Epic | Theme | Doc |
|------|-------|-----|
| A | Player training/gaming HUD | [`docs/vision/PLAYER_OS.md`](docs/vision/PLAYER_OS.md) |
| B | Parent co-op | [`docs/vision/PARENT_OS.md`](docs/vision/PARENT_OS.md) |
| C | Coach sideline OS | [`docs/vision/COACH_OS.md`](docs/vision/COACH_OS.md) |
| D | Team Manager ops OS | [`docs/vision/TEAM_MANAGER_OS.md`](docs/vision/TEAM_MANAGER_OS.md) |
| E | Director club ops (+ Registrar) | [`docs/vision/DIRECTOR_OS.md`](docs/vision/DIRECTOR_OS.md) |
| F | Platform admin | [`docs/vision/ADMIN_OS.md`](docs/vision/ADMIN_OS.md) |
| G | Recruiter (future) | [`docs/vision/RECRUITER_OS.md`](docs/vision/RECRUITER_OS.md) |
| H | Tutor (future) | [`docs/vision/TUTOR_OS.md`](docs/vision/TUTOR_OS.md) |
| — | Director logistics build status | [`docs/EPIC5_STATUS.md`](docs/EPIC5_STATUS.md) |

---

## Repo map (quick reference)

| Persona | Route | Key components |
|---------|-------|----------------|
| Player | `/player/dashboard` | OperativeHub, IdentityBentoModule, HudMetricsPanel, ActiveBounties, VanguardProtocolPanel |
| Player | `/player/workout`, `/player/tracker`, `/player/armory` | Command Center drawer links |
| Parent | `/parent/dashboard` | CoOpArena, CarRideArena, BountyTerminal |
| Coach | `/coach` | SquadTelemetryView, assignments, drills, match-day |
| Director | `/director` | Compliance, Field Ops, teams, registrars tab |
| Admin | `/admin` | Organizations, users, system settings |

---

## Deprecated / archived

- [`docs/archive/VANGUARD_ROADMAP.md`](docs/archive/VANGUARD_ROADMAP.md) — superseded by this file
- Do **not** create or reference `MASTER_BUILD_ROADMAP.md` (removed; use this file)

---

## Planned roles (document only — not in code yet)

- **`team_manager`** — separate JWT role for audit; background clearance required; team-scoped like coach; narrower ops permissions. See [`docs/vision/TEAM_MANAGER_OS.md`](docs/vision/TEAM_MANAGER_OS.md).
- **`recruiter`**, **`tutor`** — future separate roles. See vision stubs.
