# Player OS — Visual Acceptance Checklist

> **Sign-off blocks Epic 3.4 / 4.1 launch** even though the delivery gate is technically open after Sprint 2.19 Done.

**Living doc for Epic 1 premium track 2.12.1–2.20** · **Vision:** [`docs/vision/PLAYER_OS.md`](vision/PLAYER_OS.md) · **Platform criteria:** [`docs/vision/PLATFORM_EXPERIENCE_RUBRIC.md`](vision/PLATFORM_EXPERIENCE_RUBRIC.md) · **Canonical material:** [`docs/vision/PLAYER_OS_FOUNDATION.md`](vision/PLAYER_OS_FOUNDATION.md) · **Spatial history:** [`docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md`](vision/PLAYER_OS_MATERIAL_SPATIAL.md) · **Roadmap:** [`ROADMAP.md`](../ROADMAP.md)

- **Automated gate (G9):** [`playerOsCohesion.test.ts`](../src/lib/components/player/dashboard/__tests__/playerOsCohesion.test.ts) — cohesion/density/detail guards + `g9-manifest.json` size proof.
- **Human sign-off (G10):** MCP screenshots at 1280×800 and 390×844 — artifacts in [`docs/vision/va-screenshots/g10-manifest.json`](vision/va-screenshots/g10-manifest.json). Checkboxes below marked ☑ only after PNG capture + visual confirm.
- **Void contract authority (2.20e):** Automated pixel sample in [`playerHudSprint220.test.ts`](../src/lib/components/player/dashboard/__tests__/playerHudSprint220.test.ts) (`Sprint 2.20e`) on [`g10-hq-void-1280x900.png`](vision/va-screenshots/g10-hq-void-1280x900.png) + human HQ capture confirm.

- **Sign-off gate:** Must pass [`PLATFORM_EXPERIENCE_RUBRIC.md`](vision/PLATFORM_EXPERIENCE_RUBRIC.md) §5 universal checks **and** the Player row, in addition to the checklist below.

Sign-off table for premium Player OS surfaces at **1280px** and **390px**. Sprint 2.19 shipped diegetic kit + energy motion; **Epic 3.4 / 4.1** require full sign-off below before shipping features.

## Core acceptance states

| State | Routes | Pass criteria | 1280px | 390px |
|-------|--------|---------------|:------:|:-----:|
| Profile incomplete + no telemetry | HQ (`/player/dashboard`) | Onboarding hero filled; VPP hex empty; mission rail premium | ☐ | ☐ |
| Profile complete + no telemetry | HQ | Hero ring + rank shimmer; no duplicate radar | ☑ | ☐ |
| Full telemetry | HQ, Stats (`/stats`) | Radar + inspector accent; capsules nested strip | ☐ | ☐ |
| Capsule ghost | HQ | Compact ghost card not void | ☑ | ☐ |
| Mobile layout | All player nav routes | No horizontal scroll; panels readable | — | ☑ |
| Reduced motion | HQ | No stagger / shimmer / streak pulse (`prefers-reduced-motion: reduce`) | ☐ | ☐ |
| Dopamine off | HQ + shell routes | `data-dopamine='off'` disables decorative motion | ☐ | ☐ |

## Reference matrix (Sprint 2.20 sign-off)

Per [`PLAYER_OS_FOUNDATION.md`](vision/PLAYER_OS_FOUNDATION.md) §10 — screenshot + must-feel rule at both viewports. Sign-off authority = **G10 MCP reference matrix** + **2.20e automated void sample** on `g10-hq-void-1280x900.png`. Instrument types: [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](vision/PLAYER_OS_INSTRUMENT_TAXONOMY.md).

| Route | Instrument | SIEM/SOAR anchor | Tron/Ares anchor | Game HUD anchor | Must-feel rule | 1280px | 390px |
|-------|------------|------------------|------------------|-----------------|----------------|:------:|:-----:|
| **HQ** (`/player/dashboard`) | Identity + Directive + Nav + Progression + Telemetry stack | Incident overview (severity-lane mission feed) | Grid ops floor (operative spotlight in void) | Mission select screen (one gold “do this now”) | Identity Z3 hero; ≥40% void; one gold focal; shared frame all bands | ☑ | ☑ |
| **Stats** (`/stats`) | Telemetry | Investigation workspace (artifact left, inspector right, timeline below) | Vector analysis terminal | Character sheet | Radar full-width band; workout chart full-width band; no nested borders on radar well | ☑ | ☑ |
| **Train** (`/player/workout`) | Execute | Playbook editor + tail logs | Program upload terminal | Helldivers stratagem input | Shared `pd-os-deck` hero frame; corner brackets + diegetic state copy OK; **NO `pg-scanline`**; title-first route strap matches Player OS; equal-height columns; no inner panel scroll | ☑ | ☑ |
| **Armory** (`/player/armory`) | Identity + Progression | Asset registry + threat-intel feed | Loadout bay / identity disc | Destiny vault | Dossier card preview Z3 standalone; album covers match sticker aspect; command deck tabs unchanged | ☑ | ☑ |
| **Settings** (`/player/settings`) | Execute + Navigation | Configuration deck | Identity calibration terminal | Pause menu config | All controls use diegetic kit; no browser-default toggles | ☑ | ☑ |
| **Tracker** (`/player/tracker`) | Telemetry | Trend dashboard | Memory archive | Co-op replay log | Matching stat row primitive; capsule arena Tier A; not a “log list” | ☑ | ☐ |
| **Skill tree** (`/player/skill-tree`) | Progression (Tier A) | Capability matrix | The Grid root | Talent tree | Already Tier A — defends as reference benchmark | ☑ | ☐ |

## Void contract measurement

Per [`PLAYER_OS_FOUNDATION.md`](vision/PLAYER_OS_FOUNDATION.md) §3 — automated in **Sprint 2.20e** (`playerHudSprint220.test.ts` on `g10-hq-void-1280x900.png`).

| Metric | Threshold | Pass |
|--------|-----------|:----:|
| Black canvas pixels at viewport rest | ≥ 40% (HQ 1280×900) | ☑ |
| Visible matte panel fill ratio | ≤ 35% | ☑ |
| Emissive edges + bloom + light | ≥ 15% of lit (non-void) pixels | ☑ |
| Largest Z2 panel | ≤ 60% viewport width (desktop) | ☐ |
| Hero identity (Z3) min footprint | ≥ 280px ring + 1.5× rank bar height | ☐ |

_Largest Z2 + hero ring rows remain Wave F / manual QA — not blocking Epic 3.4 implementation when pixel ratios pass._

## Tier A primitive parity (replaces subjective tier check)

| Criterion | Pass criteria | Sign-off |
|-----------|---------------|:--------:|
| HQ identity hero | `HologramCardShell` tilt + foil + edge-glow at **1280** and **390**; display callsign on card face; void-visible identity stage (no grey inset well) | ☐ |
| Radar (HQ + Stats) | Matches `AttributeRadar` + `url(#pdDataBloom)` — **no** extra `::before` / `::after` frame | ☐ |
| Workout terminal | Matches G9 Execute frame cohesion — shared `pd-os-deck--hero` tokens; corner brackets + terminal chrome optional; **no animated scan bar** (`pg-scanline` banned on Player OS routes) | ☑ |
| Studio dossier preview | Z3 standalone — not nested inside matte admin panel | ☐ |

## Cinematic reference states (manual QA)

Supplemental states for edge QA (profile incomplete / full telemetry / Studio):

| Reference state | Route | 1280px | 390px |
|-----------------|-------|:------:|:-----:|
| HQ profile-incomplete | `/player/dashboard` | ☐ | ☐ |
| HQ full telemetry | `/player/dashboard` | ☐ | ☐ |
| Armory Studio | `/player/armory` (Studio tab) | ☐ | ☐ |
| Workout terminal | `/player/workout` | ☐ | ☐ |
| Settings (player) | `/player/settings` | ☐ | ☐ |

## Player nav routes (390px sweep)

| Route | Label | 390px |
|-------|-------|:-----:|
| `/player/dashboard` | HQ | ☑ |
| `/stats` | Stats | ☑ |
| `/player/workout` | Train | ☑ |
| `/player/armory` | Armory | ☑ |
| `/player/settings` | Settings | ☑ |

## Motion acceptance

### Sprint 2.15 (shipped)

| Effect | Location | Expected | Pass |
|--------|----------|----------|:----:|
| Staggered enter | HQ strap → hub → analytics deck | 0 / 80 / 160ms `pd-enter-rise` | ☐ |
| XP rank bar fill | Identity rank bar | 600ms width ease-out on load | ☐ |
| Streak pulse | Avatar ring + streak stat cell | Subtle gold pulse when streak active | ☐ |
| Hero mission scale-in | Mission rail hero card | One-shot scale-in on mount | ☐ |
| Secondary route enter | Strap + first panel | Same `pd-enter-rise` stagger | ☐ |

### Sprint 2.19 — layer-enter criteria

_Automated guards: `playerHudSprint219.test.ts` asserts diegetic kit, `pd-layer-enter-z4` / `pd-layer-enter-z2`, conduit shimmer, hero identity scale, route continuity, and gate-lift docs._

| Effect | Location | Expected | Pass |
|--------|----------|----------|:----:|
| Layer enter (Z4→Z2→Z2) | HQ strap → hub → analytics deck | Spatial layer motion — not fade-only stagger | ☐ |
| Conduit progress | Rank bar / mission progress | Energy conduction read — not flat width only | ☐ |
| Route continuity | Player nav transitions | Shared canvas/atmosphere persists — one world | ☐ |

## Sign-off gate

**Epic 3.4+ and Epic 4.1+** — **implementation unblocked** after Sprint 2.20 Done + G10 sign-off; **launch blocked** until Tier A primitive parity rows above are signed at 1280px + 390px per [`PLAYER_OS_FOUNDATION.md`](vision/PLAYER_OS_FOUNDATION.md).

| Reviewer | Date | Notes |
|----------|------|-------|
| | | |
