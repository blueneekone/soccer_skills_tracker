# Coach OS — Premium Foundation

**Canonical material vocabulary for Coach OS** · Vision: [`COACH_OS.md`](./COACH_OS.md) · Platform: [`PLATFORM_DESIGN_SYSTEM.md`](./PLATFORM_DESIGN_SYSTEM.md) · Workflows: [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) · Sign-off: [`COACH_OS_VISUAL_ACCEPTANCE.md`](./COACH_OS_VISUAL_ACCEPTANCE.md)

---

## 0. Purpose

This document is the **single source of truth** for Coach OS pixels — flat **sideline analytics**, not Player operative chrome. Structural template mirrors [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) but **rejects** void % contracts, gold focal, and gamification.

**Tier 1 surfaces:** `/coach` (Daily Intel), `/coach/forge` (The Forge). **Forge = full-page workbench** — not Trinity HUD overlay.

### 0.1 Experience criteria vs material vocabulary

Universal pass/fail: [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) §2 Coach row + §5 checklist. **This file = Coach material only** — SIEM flat modules, cyan accent, mono tables, workbench layout.

---

## 1. Tier A / Tier B primitive table

| Primitive | File path | Technique | When required | Forbidden substitutes |
|-----------|-----------|-----------|---------------|------------------------|
| **Squad telemetry module** | `SquadTelemetryView` | 12-col bento cells, mono density tables | `/coach` hub | Player `pd-os-deck` frame |
| **Intent arena** | `IntentArena.svelte` | Flat list/table of active intents | `/coach/forge` main column | Gamified bounty cards |
| **Intent engine brain** | `IntentEngine.svelte.ts` | Trinity Brain — state only | Forge deploy | UI mixed into engine |
| **Forge workbench shell** | `CoachIntentEngineView.svelte` + `ForgeDeployPanel.svelte` | Full-page header + main + inline deploy column | `/coach/forge` Tier 1 | Fixed floating HUD overlay |
| **Coach shell dashboard** | `coach-shell-dashboard.css` | Z0 void + Z2 navy panels, 8px chamfer | `/coach` | Gold accent, glass default |

**VS-3-Forge shipped:** `ForgeDeployPanel.svelte` + `coach-forge-workbench.css` — regressions only (see §9).

---

## 2. Z-depth × material orchestration (Coach SIEM)

| Layer | Material | Allowed | Forbidden |
|-------|----------|---------|-----------|
| **Z0 Canvas** | Void/navy `#020202` | Ambient grid optional | Player-style 40% void mandate |
| **Z1 Recessed well** | Inset table wells, filter bars | Single grey trim ring | Nested decorative frames |
| **Z2 Module panel** | Navy panel, 8px chamfer, grey border | Top highlight 1px | Gold border, gradient fills |
| **Z3 Hero row** | Active intent / readiness highlight | One cyan focal per viewport | XP loot, streak rings |
| **Z4 Chrome** | Header strip, deploy CTA bar | Hard corners | Floating HUD over content |

**Lock rule:** Max **two** decorative layers per module — same discipline as Player, different materials.

---

## 3. Density contract (Coach-specific)

Coach premium = **scannable density**, not void atmosphere.

| Metric | Target | Measurement |
|--------|--------|-------------|
| First-screen roster rows visible (390px) | ≥ 3 assignable rows or clear empty state | Manual / VA |
| Table label contrast | WCAG AA on primary labels | axe / manual |
| Deploy form fields (Forge) | Full column visible without overlapping arena | 390px screenshot |
| Gold hex on route | **0** instances | grep / test guard |

---

## 4. Scroll & physics contract

- **Native document scroll** on `/coach` and `/coach/forge`.
- **No** fixed overlay blocking >30% of viewport on mobile — verify on live dev after VS-3-Forge.
- Horizontal scroll only for wide tables with visible affordance.

---

## 5. Typography ratio

| Layer | Family | Use |
|-------|--------|-----|
| **Display** | Geist / system sans bold | Route title (`THE FORGE`), team name |
| **Mono** | Geist Mono | Labels, table cells, deploy status tags, `[ TRANSMITTING... ]` |
| **Body** | Mono 11–12px or sans 13px | Helper copy, deploy block reasons |

**Voice:** Professional development tone — roster-first labels. No operative jargon (`AWAITING TELEMETRY` OK on Player only).

---

## 6. Color / light contract

| Token | Use | Misuse |
|-------|-----|--------|
| `--pd-nav-cyan` / `#06b6d4` | Nav active, primary links | Large panel fills |
| `--pd-data-cyan` / `#14b8a6` | Telemetry borders, deploy success rim | Player gold substitute |
| `--pd-atom-amber` | Alerts, pending clearance | Decorative glow |
| **Gold `#fbbf24`** | **FORBIDDEN** on Coach routes | Any Coach CTA |

---

## 7. Interaction grammar

- **Instant deploy feedback** — button label cycles: idle → `[ TRANSMITTING... ]` → `[ ✓ INTENT DEPLOYED ]` / `[ RETRY DEPLOY ]`.
- **Deploy block reason** inline when `canDeploy === false` — never silent disabled button.
- **Roster rows:** name-only athletes disabled with "add email" hint; refresh on error.
- **Priority:** boolean toggle (priority vs normal) — not unbounded 0–100+ slider (owner QA).
- **Touch targets ≥ 44px** on deploy CTA and scope toggles at 390px.

---

## 8. Forge workbench layout (Tier 1 canon)

**Mental model:** Sideline clipboard — full page, not floating glass HUD.

```
┌─────────────────────────────────────────────┐
│ Z4 Header — title, team scope, drill link   │
├──────────────────────┬──────────────────────┤
│ Main — IntentArena   │ Deploy column        │
│ (active intents)     │ attribute, drill,    │
│                      │ prescription, scope, │
│                      │ priority, DEPLOY CTA │
└──────────────────────┴──────────────────────┘
        Mobile: single column — deploy ABOVE fold
```

| Breakpoint | Layout |
|------------|--------|
| **390px** | Deploy column first or sticky top segment; arena below; **no** `fixed bottom` overlay |
| **≥768px** | Two-column workbench; deploy column right rail in document flow |

Blueprint: [`coach-forge-workbench-v1.md`](./references/ui/research/blueprints/coach-forge-workbench-v1.md)

---

## 9. Anti-patterns (lock list)

- **Trinity HUD overlay on Tier 1 Coach routes** — `IntentHUD` `tw-fixed tw-bottom-*` over `IntentArena`. *Rationale:* blocks mobile deploy; owner QA P1 Forge unusable on phone.
- **Gamification chrome** — XP rings, streak, loot, chamfer military Player corners.
- **Gold accent** on any Coach surface.
- **Player `pd-os-deck` frame** on Coach modules.
- **Glassmorphism as default panel** — liquid glass OK on **analytics** only, not deploy form primary material.
- **Unbounded priority slider** — use boolean priority toggle.
- **Silent disabled deploy** — always show `deployBlockReason`.

---

## 10. Reference matrix

Sign-off: [`COACH_OS_VISUAL_ACCEPTANCE.md`](./COACH_OS_VISUAL_ACCEPTANCE.md) — **390px first**, then 1280px.

| Route | SIEM anchor | Must-feel rule | 390px | 1280px |
|-------|-------------|----------------|:-----:|:------:|
| **Daily Intel** (`/coach`) | Squad incident overview | Roster scannable in 3s; cyan nav; no gold | ☐ | ☐ |
| **The Forge** (`/coach/forge`) | Playbook deploy terminal | Full-page workbench; deploy form usable one-thumb; roster scope clear | ☐ | ☐ |
| **Clearance** (`/compliance`) | Trust gate | Checkr embed + plain blocked copy | ☐ | ☐ |

---

## 11. Future-epic gate

- Tier 2 routes (`/coach/drills`, `/coach/tactical`, etc.) may retain Trinity HUD **only** where sprint explicitly scopes — **not** Tier 1 Forge.
- War Room (`/coach/tactical`) Tier 2 — deep-link only; separate skin pass VS-3b.

---

## Cross-links

| Doc | Role |
|-----|------|
| [`AGENT_COACH_UX_SPRINT_TEMPLATE.md`](./AGENT_COACH_UX_SPRINT_TEMPLATE.md) | Sprint procedure |
| [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) | Accept/reject mandates |
| [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) | Tier 1 routes |
