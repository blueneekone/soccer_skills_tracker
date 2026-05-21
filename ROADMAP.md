# SSTracker — Delivery Roadmap

**Architecture:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)  
**Last updated:** 2026-05-21  
**Current sprint:** **2.2** — Motion polish + mono/palette finish

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
| 1.8 | Done | Unified tactical HUD shell, flush embedded panels, Vanguard vectors in metrics column | `playerHudSprint18.test.ts` — Unified hub shell + vector strip — mission deck continues in 1.9. |
| 1.9 | Done | Mission deck density — single-line embedded rows, compact CTAs, no bracket UI | `playerHudSprint19.test.ts` |
| 2.0 | Done | Telemetry deck — hub vector strip sync, radar + inspector, remove duplicate grid | `playerHudSprint20.test.ts` |
| 2.1 | Done | Identity metric chips, chamfer CTAs, palette + mono header pass | `playerHudSprint21.test.ts` |
| 2.1.1 | Done | CMD removed; shell nav only | `playerHudSprint14.test.ts` (no PlayerCommandCenter on page) |
| 2.2 | **Current** | Motion polish, gold avatar palette, mono typography lock | `playerHudSprint22.test.ts` |

---

## Sprint 2.0 scope — Telemetry deck (no duplicate vectors)

**Goal:** Eliminate duplicate PAC–AGI telemetry on the page. Hub strip = read-only summary (clickable). Lower panel = radar + detail inspector only — no second 6-card grid. Shared selected-axis state links hub, radar, and inspector.

**In scope:**

- `ROADMAP.md` (this update)
- `src/routes/(app)/player/dashboard/+page.svelte` (shared selectedAxis state, wire bindings, compress capsule ghost)
- `src/lib/components/player/dashboard/HudMetricsPanel.svelte` (clickable vector strip)
- `src/lib/components/player/dashboard/VanguardProtocolPanel.svelte` (radar + inspector; remove vpp-grid)
- `src/lib/components/player/dashboard/AttributeRadar.svelte` (optional axis selection + highlight)
- `src/lib/styles/player-dashboard-hud.css` (strip selection highlight, telemetry deck layout)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint20.test.ts` (create)

**Out of scope (Sprint 2.1+):**

- IdentityBentoModule ring/chip typography refactor
- ActiveBounties further changes
- Full page bento re-layout (moving telemetry into OperativeHub row)
- Coach/parent routes
- svelte-check / phosphor prebuild fixes

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard
npm run check
npm run build
```

---

## Sprint 2.1 scope — Identity metric chips + palette pass

**Goal:** Fix tacky ring/center-text overlap in identity column. Rings show progress only; labels and values live in adjacent chips. Premium chamfer CTAs for profile setup and command center. Gold-forward palette under `.player-hud-root`. Mono typography lock for dashboard section headers.

**In scope:**

- `ROADMAP.md` (this update)
- `src/lib/components/player/dashboard/HudMetricChip.svelte` (new)
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte`
- `src/lib/components/hud/HudSeededRingCanvas.svelte` (small-ring center text guard)
- `src/lib/styles/player-dashboard-hud.css`
- `src/routes/(app)/player/dashboard/+page.svelte` (capsule section header mono pass only)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint21.test.ts` (create)

**Note:** Test file is `playerHudSprint21.test.ts` under `player/dashboard/__tests__/` — NOT `firestoreRulesSprint21.test.ts` (compliance epic).

**Follow-up (Sprint 2.1.1):** Command center trigger removed from identity; shell nav only.

**Out of scope:**

- HudMetricsPanel / VanguardProtocolPanel / ActiveBounties layout changes
- Telemetry selectedAxis behavior
- Coach/parent routes
- svelte-check / phosphor prebuild fixes
- Full PLAYER_OS.md rewrite

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard
npm run check
npm run build
```

---

## Sprint 2.2 scope — Motion polish + mono/palette finish

**Goal:** Final craft pass on player dashboard — gold-forward avatar ring, subtle motion, Geist Mono lock on remaining sans blocks. No layout rearchitecture.

**Note:** Prebuild phosphor fix is a separate commit — do not re-touch unless `npm run build` still fails.

**In scope:**

- `ROADMAP.md` (this update)
- `src/lib/components/player/HudAvatarRing.svelte`
- `src/lib/components/player/UidAvatar.svelte` (if avatar inner glow is off-palette green)
- `src/lib/components/player/dashboard/VanguardProtocolPanel.svelte` (typography only)
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte` (minor motion only if needed)
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint22.test.ts` (create)

**Out of scope:**

- Telemetry layout / selectedAxis / radar inspector structure (2.0 done)
- ActiveBounties mission rows (1.9 done)
- Re-adding Command Center
- Coach/parent routes
- svelte-check 362 errors

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard
node scripts/check-no-phosphor.mjs
npm run build
```

---

## Sprint 1.9 scope — Mission deck density

**Goal:** Make the mission region inside OperativeHub feel like a premium gaming HUD deck — dense single-line rows, one header, no bracket terminal CTAs, no oversized per-row rings.

**In scope:**

- `ROADMAP.md` (this update)
- `src/lib/components/hud/ActiveBounties.svelte`
- `src/lib/styles/hud-telemetry.css`
- `src/lib/styles/player-dashboard-hud.css` (embedded quest overrides only)
- `src/lib/player/dashboard/activeBounties.ts` (compact CTA labels if needed)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint19.test.ts` (create)

**Out of scope (Sprint 2.0+):**

- VanguardProtocolPanel / telemetry dedup / radar layout
- HudMetricsPanel / IdentityBentoModule ring chip refactor
- `+page.svelte` layout changes beyond existing `<ActiveBounties embedded />`
- Coach/parent routes
- Fixing repo-wide svelte-check or phosphor prebuild errors

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard src/lib/player/dashboard
npm run check
npm run build
```

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
