# Coach OS — Visual Acceptance Checklist

**Tier 1 coach routes — 390px first** · Material: [`COACH_OS_FOUNDATION.md`](./COACH_OS_FOUNDATION.md) · Platform: [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) · Registry: [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md)

**Environment:** `sports-skill-tracker-dev` · QA tenant `qa_launch_2026` / team `qa_launch_2026_ppc`

---

## Sign-off gate

Before claiming Coach Tier 1 visual pass:

1. [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) §5 universal + Coach row
2. [`COACH_OS_FOUNDATION.md`](./COACH_OS_FOUNDATION.md) §9 anti-patterns cleared
3. Screenshots at **390×844 first**, then **1280×800**
4. Functional Forge deploy still passes QA-142 (orthogonal to VA — both required for acquisition)

---

## Core acceptance states

| State | Routes | Pass criteria | 390px | 1280px |
|-------|--------|---------------|:-----:|:------:|
| Squad loaded | `/coach` | ≥3 roster signals or explicit empty; cyan accent; **no gold** | ☐ | ☐ |
| Multi-team coach | `/coach` | Team switcher usable; scope label visible | ☐ | ☐ |
| Forge idle — deploy form | `/coach/forge` | Full-page workbench; deploy fields above fold on mobile | ☐ | ☐ |
| Forge roster empty | `/coach/forge` | Name-only rows disabled + hint; block reason if deploy disabled | ☐ | ☐ |
| Forge deploying | `/coach/forge` | `[ TRANSMITTING... ]` visible; no layout jump | ☐ | ☐ |
| Forge success | `/coach/forge` | `[ ✓ INTENT DEPLOYED ]`; arena refresh | ☐ | ☐ |
| Clearance blocked | `/compliance` | Checkr embed loads; blocked copy plain | ☐ | ☐ |

---

## Reference matrix (Tier 1)

Per [`COACH_OS_FOUNDATION.md`](./COACH_OS_FOUNDATION.md) §10.

| Route | Registry id | workflow_id | Must-feel rule | 390px | 1280px |
|-------|-------------|-------------|----------------|:-----:|:------:|
| **Daily Intel** | PS-C01 | `WF-COACH-INTEL` | Sideline scan in 3s; 12-col bento; mono tables | ☐ | ☐ |
| **The Forge** | PS-C02 | `WF-COACH-FORGE` | **No Trinity HUD overlay**; inline workbench; priority toggle; deploy CTA ≥44px | ☐ | ☐ |
| **Coach clearance** | PS-A05 | `WF-TRUST-COACH-CLEARANCE` | Trust gate — not gamified | ☐ | ☐ |

---

## Mobile-first sweep (390px — required)

| Route | Label | QA ref | 390px |
|-------|-------|--------|:-----:|
| `/coach` | Daily Intel | QA-141 | ☐ |
| `/coach/forge` | The Forge | QA-142 | ☐ |
| `/compliance` | Clearance | QA-161 | ☐ |

**Forge mobile P1 (owner QA):** Deploy form usable one-handed; roster scope readable; no floating panel obscuring arena.

---

## Material guards

| Criterion | Pass | Sign-off |
|-----------|------|:--------:|
| Zero `#fbbf24` / `--pd-accent-action` on Coach Tier 1 routes | grep / visual | ☐ |
| No `tw-fixed tw-bottom-*` deploy panel on `/coach/forge` (post VS-3-Forge) | DOM / screenshot | ☐ |
| 8px chamfer on Z2 modules (not `rounded-2xl` glass card) | visual | ☐ |
| Deploy block reason visible when button disabled | functional + visual | ☐ |

---

## Sign-off table

| Reviewer | Date | Notes |
|----------|------|-------|
| | | |

**Owner initials (registry §4):** PS-C01 ☐ · PS-C02 ☐ · PS-A05 ☐
