# Skill Tier Unlock Modal (CDO blueprint)

Source: Gemini Vanguard Architect AI · normalized for repo.

**Instrument:** Directive (milestone) + Telemetry (attribute readout)  
**Persona:** Player OS only  
**Aligns with:** earned mastery over casino loops · single gold focal · no success-green · [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](../../../PLAYER_OS_INSTRUMENT_TAXONOMY.md) Directive gold rule

## Structural architecture

- **Z4:** Scrim — `--pd-color-void-0` at **0.8 alpha**, full interaction lockout, no backdrop blur
- **Z3:** Hero container — centered modal chassis
  - Geometry: 45° chamfer-cut corners, **16px cut-depth** (or `--pd-chamfer-depth` after owner §H #2)
  - Border: **2px solid** `--pd-color-gold-0` / `--pd-accent-action`
  - Background: `--pd-panel` (`#05050a`)
- **Z1:** Inner well for skill / tier attributes
  - Inset **8px**, **1px** `--pd-color-grey-0` border

## Visual hierarchy & typography

| Element | Token | Copy pattern |
|---------|-------|--------------|
| Header | `--pd-color-gold-0` | Diegetic e.g. `SYNAPTIC_EVOLUTION_CONFIRMED` · heavy weight |
| Tier status | `--pd-color-amber-0` | Numerical e.g. `TIER_04` |
| Data readout | `--pd-color-cyan-1` / `--pd-accent-data` | Monospaced skill description |
| Divider | `--pd-color-grey-0` | 1px horizontal rule |

## Action system (Player OS exclusive)

| Control | Spec |
|---------|------|
| **Primary** `COMMIT_UPGRADE` | Double-chamfer (trapezoidal) · solid `--pd-color-gold-0` · text `--pd-color-void-0` |
| **Secondary** `DEFER_INTEGRATION` | Transparent fill · 1px `--pd-color-grey-0` border · text `--pd-color-grey-0` |

## Constraints

- Depth via **1px grey trim offset** — not soft drop-shadow glows
- No `border-radius` (chamfer only)
- Celebration tied to **verified tier advance** (armory / skill-tree progression) — not random rewards
- Respect `prefers-reduced-motion` and `data-dopamine=off`

## Rejections

- Standard 4px border-radius
- Soft diffusion / neon glow shadows
- Success-green hex — milestones use **gold only** on Player OS
- Multiple gold CTAs in same viewport

## Implementation target

- New: `SkillTierUnlockModal.svelte`
- Wire: skill-tree or armory tier advance event (`currentTier` change)
- Reuse: shared modal scrim util (VS-1c), `pd-os-btn--primary`, `pd-os-deck__well`
- Do **not** block train/workout loops — defer is non-destructive

## Sprint

`VS-1b` in [`PLATFORM_VISUAL_REDESIGN_PLAN.md`](../PLATFORM_VISUAL_REDESIGN_PLAN.md)
