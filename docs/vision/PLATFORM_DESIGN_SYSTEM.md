# Platform Design System

**Platform cohesion constitution** — shared primitives + persona skin forks · Experience bar: [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) · Build contract: [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) · Routes: [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md)

---

## §0 Authority stack

Sits **below** registry (routes/tiers), **above** persona foundations (material vocabulary).

| Order | Doc | Role |
|-------|-----|------|
| 1 | [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) | Routes, tiers, `layout_pattern`, `workflow_id` |
| 2 | [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) | Gold path steps + UX states |
| 3 | [`PLATFORM_NAVIGATION_CANON.md`](./PLATFORM_NAVIGATION_CANON.md) | Field/desk breakpoints, Option A tabs, skin separation |
| 4 | **This file** | Shared primitives, shell contract, layout catalog |
| 5 | Persona foundations | Player / Coach / Parent material vocabulary |
| 6 | [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) | Accept / reject mandates |
| 7 | [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) | Pass/fail quality bar |

**Hard rule:** Same rubric, **different skin** per persona — never one gamified shell everywhere.

---

## §1 Shared primitives

Expand [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) §3 into actionable build rules:

| Primitive | Rule | Verification |
|-----------|------|--------------|
| **Type scale** | Display → mono label → body; one dominant headline per viewport | Design review / VA |
| **8pt spacing rhythm** | Gap tokens on bento grids; avoid arbitrary `tw-mb-4` / `tw-gap-4` on migrated routes | `tokenCompliance.test.ts` where scoped |
| **Press / focus feedback** | Visible `:active` / `:focus-visible` — border brighten, translate, or rim; **not** opacity-only dimming | [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) §1 |
| **44px touch targets** | Primary controls ≥44px on mobile athletic contexts | Manual 390px sweep |
| **Empty / loading / error grammar** | Persona-toned copy + next-step CTA; no blank stalls | [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) state vocabulary |
| **Icon consistency** | One icon set per shell; mono labels pair with data icons — no mixed decorative styles | Visual review |
| **Native document scroll** | No inner `overflow: auto` traps on primary workspaces | Player mandatory; Coach/Parent required |
| **Trust copy** | Plain-language permissions, VPC, clearance — no mystery failures | Parent VPC + gates |

---

## §2 Shell contract

| Shell | When to use | Tier 1 routes | Component / CSS hooks |
|-------|-------------|---------------|------------------------|
| **PlayerShell** | Player operative command deck | `/player/dashboard`, `/player/workout`, `/stats` | `PlayerShell`, `pd-os-deck`, `player-dossier.css` |
| **Coach workspace** | Flat sideline SIEM — sidebar + main | `/coach`, `/coach/forge`, `/compliance` | Enterprise sidebar + `coach-shell-dashboard.css`; **not** PlayerShell rail |
| **Parent lounge shell** | Trust-first co-op partner | `/parent/household`, `/parent/vpc`, `/parent/dashboard` | `parent-lounge-shell.css` |
| **EnterpriseConsoleShell** | Director / admin tab density | `/director`, `/admin` | Tab shell, dense tables |
| **Trust auth / gate** | Pre-workspace entry | `/login`, `/home`, `/setup`, `/vpc-pending`, `/privacy` | Centered card or gate banner — no persona deck |
| **Comms hub** | Cross-persona SafeSport threads | `/messages` | Persona-aware wrapper |

**Rule:** Do not mount PlayerShell on Coach or Parent Tier 1 routes.

**Navigation law:** Field vs desk chrome, Option A bottom tabs, overflow drawer rules, and content inset — [`PLATFORM_NAVIGATION_CANON.md`](./PLATFORM_NAVIGATION_CANON.md). Registry §2 + `workspaceNav.js` remain href source of truth.

---

## §3 Persona skin forks

| Persona | Premium means | Canvas | Corners | Accent | Gamification |
|---------|---------------|--------|---------|--------|--------------|
| **Player cinematic** | Operative command deck | Void `#000` + ambient grid | Chamfer clip-path | Gold focal + teal data | Full XP / streak / bounties |
| **Coach flat SIEM** | Sideline clarity at speed | Void/navy `#020202` | 8px chamfer | Cyan primary — **no gold** | None — feeds Player only |
| **Parent trust** | Co-op partner calm | Navy lounge well | 8px chamfer (soft radius OK on trust cards) | Cyan + amber pending | None — co-op logging only |
| **Director ops** | Enterprise command | Dense tab shell | Flat tables | Grey trim + amber alerts | None |
| **Admin console** | Platform bootstrap | Form-forward | Flat | Neutral | None |

**Staff admin mobile field skin (NAV-CANON):** Coach, director, admin, registrar, and recruiter roles use `enterprise-console.css` on nav chrome — flat admin bottom bar, no player blur/glow dock, zero gold. See [`PLATFORM_NAVIGATION_CANON.md`](./PLATFORM_NAVIGATION_CANON.md) §4.

Foundation docs: [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) · [`COACH_OS_FOUNDATION.md`](./COACH_OS_FOUNDATION.md) · [`PARENT_OS_FOUNDATION.md`](./PARENT_OS_FOUNDATION.md)

---

## §4 Layout pattern catalog

Registry `layout_pattern` values map to these catalog IDs. Use registry value in code/tests; catalog name in blueprints and sprint prompts.

| Catalog ID | Registry alias(es) | When to use | Tier 1 routes |
|------------|-------------------|-------------|---------------|
| **`full-page-workbench`** | `coach-forge-workbench` | Primary column form + roster in document flow — **NOT** floating HUD | `/coach/forge` |
| **`bento-12col-dashboard`** | `coach-bento-12col`, `parent-bento-12col`, `player-pd-deck` (deck variant) | 12-col liquid bento primary dashboards | `/coach`, `/parent/household`, `/parent/dashboard`, `/player/dashboard` |
| **`tabbed-console`** | Director/admin tab shells | Multi-tab enterprise ops | — (Tier 2+ `/director`) |
| **`investigation-workspace`** | `player-telemetry` | Calm radar + chart bands; no nav tile chrome | `/stats` |
| **`trinity-shell-glass-hud`** | — | **Tier 2 only** — War Room, match-day glass overlays | `/coach/tactical`, `/coach/match-day` — **forbidden on Coach Tier 1** |
| **`trust-auth`** | `trust-auth`, `trust-router` | Login / router | `/login`, `/home` |
| **`trust-form`** | `trust-form`, `parent-trust-form` | Provision / VPC ceremony | `/setup`, `/parent/vpc` |
| **`trust-gate`** | `trust-gate` | Policy blocked states | `/vpc-pending`, `/compliance` |
| **`comms-hub`** | `comms-hub` | SafeSport messaging | `/messages` |
| **`player-pd-deck`** | `player-pd-deck` | Player `pd-os-deck` frame stack | `/player/workout` |
| **`player-execute`** | (subset of pd-deck) | Train Execute theater | `/player/workout` |

**Reject on Tier 1 Coach Forge:** `trinity-shell-glass-hud` / fixed overlay deploy panels — **shipped:** inline `ForgeDeployPanel` in `coach-forge-workbench.css` grid.

Blueprint: [`coach-forge-workbench-v1.md`](./references/ui/research/blueprints/coach-forge-workbench-v1.md)

---

## §5 Mobile-first rule

**Tier 1 must pass 390px before 1280px sign-off.**

| Route group | Primary viewport | Owner QA evidence |
|-------------|------------------|-------------------|
| `/coach/forge` | **390px first** | QA-142 — deploy form full column, no clipped HUD |
| `/parent/household`, `/parent/vpc` | **390px first** | QA-121–132 |
| `/parent/dashboard` | **390px first** | QA-124–125 |
| `/player/dashboard`, `/player/workout` | 390px + 1280px parity | QA-101–108 |
| `/coach` | 390px sidebar collapse | QA-141 |
| `/stats` | 390px — no horizontal scroll | QA-304 |

VA docs: [`COACH_OS_VISUAL_ACCEPTANCE.md`](./COACH_OS_VISUAL_ACCEPTANCE.md) · [`PARENT_OS_VISUAL_ACCEPTANCE.md`](./PARENT_OS_VISUAL_ACCEPTANCE.md)

---

## §6 Anti-patterns (cross-persona)

| Anti-pattern | Why |
|--------------|-----|
| Player chrome on Parent | Breaks co-op trust tone |
| Trinity HUD / `trinity-shell-glass-hud` on Coach Tier 1 Forge | Blocks mobile deploy; violates workbench canon |
| Fixed overlay deploy panel (`tw-fixed tw-bottom-*`) | Regression guard — VS-3-Forge shipped inline `ForgeDeployPanel` |
| Gamification on Coach / Parent | Undermines professional / co-op trust |
| Gold accent on Coach / Parent / Director | Persona boundary — gold is Player action focal only |
| Unique skin per dashboard section | Breaks cohesion — shared frame + inner differentiation |
| Inner scroll traps on primary routes | Breaks premium native flow |

---

## §7 Token families (platform map)

| Family | Prefix / file | Personas |
|--------|---------------|----------|
| Player dossier | `--pd-*` · `player-dossier.css` | Player only |
| Coach SIEM | `--co-*` / vanguard alias · `coach-shell-dashboard.css` | Coach |
| Parent lounge | `parent-lounge-*` · `parent-lounge-shell.css` | Parent |

Reference: [`coach-shell-dashboard-v1.md`](./references/ui/research/blueprints/coach-shell-dashboard-v1.md) · [`token-alias-manifest.md`](./references/ui/research/blueprints/token-alias-manifest.md)

---

## §8 Blueprint index (CDO)

| Blueprint | layout_pattern | Sprint |
|-----------|----------------|--------|
| [`coach-forge-workbench-v1.md`](./references/ui/research/blueprints/coach-forge-workbench-v1.md) | `coach-forge-workbench` | VS-3-Forge |
| [`coach-shell-dashboard-v1.md`](./references/ui/research/blueprints/coach-shell-dashboard-v1.md) | `coach-bento-12col` | VS-3a |
| [`parent-lounge-shell.md`](./references/ui/research/blueprints/parent-lounge-shell.md) | `parent-bento-12col` | VS-4a |
| [`parent-vpc-trust-band.md`](./references/ui/research/blueprints/parent-vpc-trust-band.md) | `parent-trust-form` | VS-4b |

Delivery sequence: [`PLATFORM_VISUAL_REDESIGN_PLAN.md`](./references/ui/research/PLATFORM_VISUAL_REDESIGN_PLAN.md)

---

## Cross-links

| Doc | Role |
|-----|------|
| [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) | Gold paths + UX states |
| [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) | Who owns which routes |
