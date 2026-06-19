# COACH_FORGE_WORKBENCH_V1 — VS-3-Forge

**Persona:** Coach OS · Tier 1 acquisition surface  
**Route:** `/coach/forge` (`PS-C02`)  
**workflow_id:** `WF-COACH-FORGE`  
**layout_pattern:** `coach-forge-workbench`  
**Status:** Shipped (VS-3-Forge)  
**Authority:** [`COACH_OS_FOUNDATION.md`](../../../COACH_OS_FOUNDATION.md) §8 · [`PLATFORM_WORKFLOW_CANON.md`](../../../PLATFORM_WORKFLOW_CANON.md)

---

## Problem statement

Prior `IntentHUD.svelte` used `tw-fixed tw-bottom-4` glass overlay — blocked mobile deploy UX (owner QA-142 P1). **Resolved:** inline `ForgeDeployPanel.svelte` in document flow per this blueprint.

**Reject (regression):** Trinity HUD overlay pattern on Tier 1 Coach routes.

---

## Layer architecture

| Z | Region | Spec |
|---|--------|------|
| Z4 | Page header | `THE FORGE` title, team scope, drill library link — full width |
| Z2 | IntentArena (main) | Active intents table/list — left column desktop, below deploy on mobile |
| Z2 | Deploy workbench column | Attribute, drill picker, prescription, scope, priority, CTA — **not fixed** |
| Z1 | Inline wells | Prescription sub-fields inset grey trim |
| Z0 | Canvas | `#020202` void — no Player 40% void mandate |

---

## Breakpoints

### 390px (primary — sign-off first)

```
┌─────────────────────────┐
│ Header + team scope     │
├─────────────────────────┤
│ DEPLOY WORKBENCH        │
│ attribute               │
│ drill picker            │
│ sets × reps / RPE       │
│ scope (team / players)  │
│ priority TOGGLE         │
│ [ DEPLOY INTENT ] 44px  │
│ deploy block reason     │
├─────────────────────────┤
│ ACTIVE INTENTS (arena)  │
│ scrolls with document   │
└─────────────────────────┘
```

- Deploy section **above** active intents list
- **No** `position: fixed` on deploy panel
- Roster multi-select: full-width checklist; name-only rows disabled + hint

### ≥768px

```
┌──────────────────────────────────────────────┐
│ Header                                       │
├────────────────────────┬─────────────────────┤
│ IntentArena (flex-1)   │ Deploy column 320px │
│                        │ sticky top optional │
│                        │ in document flow    │
└────────────────────────┴─────────────────────┘
```

`sticky top` allowed inside column — **not** viewport-fixed overlay.

---

## Deploy column fields

| Field | Control | Notes |
|-------|---------|-------|
| Target attribute | Select / chip row | Required |
| Drill | Searchable select + bundle rows | Team + club library |
| Prescription | Sets, reps, bilateral, duration, RPE | Mono labels |
| Scope | Team vs selected players | Roster from engine |
| Priority | **Boolean toggle** — "Priority mission" | Replaces 0–100+ slider |
| Parent verification | Opt-in checkbox | Default off |
| Deploy CTA | Full-width ≥44px | Label cycle per FOUNDATION §7 |

---

## Tokens

| Use | Token |
|-----|-------|
| Panel | `--pd-navy-panel` |
| Border | `--pd-grey-trim` / `#14b8a6` at 20% |
| Primary CTA | `--pd-data-cyan` solid — **not gold** |
| Success rim | `rgba(57,255,20,0.45)` |
| Error | `#ff3040` mono uppercase |
| Typography | Geist Mono labels; sans title |

---

## Components (target file list)

| File | Change |
|------|--------|
| `CoachIntentEngineView.svelte` | Two-column grid; mount deploy inline |
| `ForgeDeployPanel.svelte` | **Done** — inline deploy section (replaced fixed `IntentHUD`) |
| `coach-forge-workbench.css` | **Done** — workbench grid tokens |
| `IntentArena.svelte` | Minor — padding for column layout |

**≤5 files per sprint** — VS-3-Forge may split a/b if needed.

---

## Interaction states (workflow canon)

| State | UI |
|-------|-----|
| Loading roster | Skeleton rows in scope section |
| Roster error | Red mono banner + refresh |
| `canDeploy === false` | `deployBlockReason` above CTA |
| Saving | `[ TRANSMITTING... ]` |
| Success | `[ ✓ INTENT DEPLOYED ]` + arena refresh |
| Error | `[ RETRY DEPLOY ]` + `deployError` |

---

## Rejections

- `tw-fixed tw-bottom-*` HUD overlay
- `backdrop-blur-xl` as primary deploy panel material
- `rounded-2xl` glass card floating over map
- Gold CTA or gold priority slider
- Silent disabled deploy button
- Player operative copy (`[ // INTENT ENGINE ]` may stay mono but no gamification chrome)

---

## Proof

```bash
npm test -- src/lib/coach/intent/__tests__/intentModule.test.ts
npm test -- src/lib/platform/__tests__/productSurfaceRegistry.test.ts
npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts
```

**VA:** [`COACH_OS_VISUAL_ACCEPTANCE.md`](../../../COACH_OS_VISUAL_ACCEPTANCE.md) — Forge 390px row ☑

**Functional:** QA-142 deploy to player HQ — separate slice if roster bug persists

---

## Sprint

`VS-3-Forge` in [`PLATFORM_VISUAL_REDESIGN_PLAN.md`](../PLATFORM_VISUAL_REDESIGN_PLAN.md) — runs **before** Player modal VS-1a in Tier 1 sequencing.
