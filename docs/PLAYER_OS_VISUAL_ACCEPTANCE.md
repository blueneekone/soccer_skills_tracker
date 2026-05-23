# Player OS — Visual Acceptance Checklist

**Living doc for Epic 1 premium track 2.12.1–2.19** · **Vision:** [`docs/vision/PLAYER_OS.md`](vision/PLAYER_OS.md) · **Material constitution:** [`docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md`](vision/PLAYER_OS_MATERIAL_SPATIAL.md) · **Roadmap:** [`ROADMAP.md`](../ROADMAP.md)

Sign-off table for premium Player OS surfaces at **1280px** and **390px**. Tick each row after manual QA. Sprint 2.15 shipped motion + baseline states; **Epic 3.4 / 4.1 remain blocked** until material/spatial rows pass and track **2.19 Done**.

## Core acceptance states

| State | Routes | Pass criteria | 1280px | 390px |
|-------|--------|---------------|:------:|:-----:|
| Profile incomplete + no telemetry | HQ (`/player/dashboard`) | Onboarding hero filled; VPP hex empty; mission rail premium | ☐ | ☐ |
| Profile complete + no telemetry | HQ | Hero ring + rank shimmer; no duplicate radar | ☐ | ☐ |
| Full telemetry | HQ, Stats (`/stats`) | Radar + inspector accent; capsules nested strip | ☐ | ☐ |
| Capsule ghost | HQ | Compact ghost card not void | ☐ | ☐ |
| Mobile layout | All player nav routes | No horizontal scroll; panels readable | — | ☐ |
| Reduced motion | HQ | No stagger / shimmer / streak pulse (`prefers-reduced-motion: reduce`) | ☐ | ☐ |
| Dopamine off | HQ + shell routes | `data-dopamine='off'` disables decorative motion | ☐ | ☐ |

## Material & spatial acceptance (2.16–2.19)

| Criterion | Pass criteria | 1280px | 390px |
|-----------|---------------|:------:|:-----:|
| Z-layer depth | Can you perceive ≥3 distinct Z-layers on HQ at rest? (canvas, recessed well, raised hero, floating strap) | ☐ | ☐ |

_Automated token guards: `playerHudSprint217.test.ts` asserts Z1–Z4 tokens wired to selectors; manual sign-off on this row still required._
| Emissive edges | Visible on active mission hero + rank bar + rail active tab | ☐ | ☐ |
| Holographic radar | Radar reads as inset well + bloom; **same VPP frame on Stats and HQ** | ☐ | ☐ |

_Automated guards: `playerHudSprint218.test.ts` asserts `pdDataBloom`, spatial canvas restore, scanline scope, emissive tokens, glass well boundaries._
| Identity stage | Recessed inside hub — not transparent flat (`ibm-root--premium` regression) | ☐ | ☐ |
| Debug / prototype chrome | No debug strings or prototype badges in player-facing builds | ☐ | ☐ |
| Diegetic Settings | Settings controls match diegetic kit (document pass/fail vs HQ chamfer CTAs) | ☐ | ☐ |
| Void ratio | ≥40% of HQ viewport reads as black canvas, not grey fill (guidance) | ☐ | ☐ |

## Cinematic reference states (manual QA)

Sign off each route at 1280px + 390px against the cinematic bar in [`PLAYER_OS_MATERIAL_SPATIAL.md`](vision/PLAYER_OS_MATERIAL_SPATIAL.md):

| Reference state | Route | 1280px | 390px |
|-----------------|-------|:------:|:-----:|
| HQ profile-incomplete | `/player/dashboard` | ☐ | ☐ |
| HQ full telemetry | `/player/dashboard` | ☐ | ☐ |
| Armory Studio | `/player/armory` (Studio tab) | ☐ | ☐ |
| Workout terminal | `/player/workout` | ☐ | ☐ |
| Settings (player) | `/settings` | ☐ | ☐ |

## Tier parity check

| Criterion | Pass criteria | Sign-off |
|-----------|---------------|:--------:|
| HQ material quality | HQ material quality ≥ Skill Tree arena / VanguardCard studio preview (subjective) | ☐ |

## Player nav routes (390px sweep)

| Route | Label | 390px |
|-------|-------|:-----:|
| `/player/dashboard` | HQ | ☐ |
| `/stats` | Stats | ☐ |
| `/player/workout` | Train | ☐ |
| `/player/armory` | Armory | ☐ |
| `/settings` | Settings | ☐ |

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

| Effect | Location | Expected | Pass |
|--------|----------|----------|:----:|
| Layer enter (Z4→Z2→Z2) | HQ strap → hub → analytics deck | Spatial layer motion — not fade-only stagger | ☐ |
| Conduit progress | Rank bar / mission progress | Energy conduction read — not flat width only | ☐ |
| Route continuity | Player nav transitions | Shared canvas/atmosphere persists — one world | ☐ |

## Sign-off gate

**Epic 3.4+ and Epic 4.1+ blocked** until all rows above are signed at 1280px + 390px and ROADMAP marks **2.19 Done**.

| Reviewer | Date | Notes |
|----------|------|-------|
| | | |
