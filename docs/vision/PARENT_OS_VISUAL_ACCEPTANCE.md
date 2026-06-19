# Parent OS — Visual Acceptance Checklist

**Tier 1 parent routes — 390px first** · Material: [`PARENT_OS_FOUNDATION.md`](./PARENT_OS_FOUNDATION.md) · Platform: [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) · Registry: [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md)

**Environment:** `sports-skill-tracker-dev` · QA tenant `qa_launch_2026`

---

## Sign-off gate

1. [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) §5 universal + Parent row
2. [`PARENT_OS_FOUNDATION.md`](./PARENT_OS_FOUNDATION.md) §9 anti-patterns cleared
3. Screenshots at **390×844 first**, then **1280×800**
4. VPC golden path QA-121–132 functional pass required alongside VA

---

## Core acceptance states

| State | Routes | Pass criteria | 390px | 1280px |
|-------|--------|---------------|:-----:|:------:|
| Household — operatives linked | `/parent/household` | Child cards readable; waiver status visible | ☐ | ☐ |
| Household — waiver unsigned | `/parent/household` | Blocked copy + sign CTA obvious | ☐ | ☐ |
| Household — team link | `/parent/household` | Dispatch code path discoverable | ☐ | ☐ |
| VPC — pending child | `/parent/vpc` | Per-child card; grant CTA ≥44px | ☐ | ☐ |
| VPC — granted | `/parent/vpc` | Success state; timestamp/status | ☐ | ☐ |
| Dashboard — co-op | `/parent/dashboard` | Bounty terminal + RSVP strip visible | ☐ | ☐ |
| Dashboard — Car Ride | `/parent/dashboard` | Debrief band when fixture pending; hidden when not | ☐ | ☐ |

---

## Reference matrix (Tier 1)

Per [`PARENT_OS_FOUNDATION.md`](./PARENT_OS_FOUNDATION.md) §10.

| Route | Registry id | workflow_id | Must-feel rule | 390px | 1280px |
|-------|-------------|-------------|----------------|:-----:|:------:|
| **Household** | PS-P01 | `WF-PARENT-HOUSEHOLD` | Co-op partner calm; no player chrome; waiver honest | ☐ | ☐ |
| **Consent (VPC)** | PS-P02 | `WF-PARENT-VPC` | Trust ceremony; plain COPPA; one action per child | ☐ | ☐ |
| **Co-op Command** | PS-P03 | `WF-PARENT-COOP` | Schedule parity visible; celebrate without arcade | ☐ | ☐ |

---

## Mobile-first sweep (390px — required)

| Route | Label | QA ref | 390px |
|-------|-------|--------|:-----:|
| `/parent/household` | Household | QA-121, QA-131 | ☐ |
| `/parent/vpc` | Consent | QA-122, QA-132 | ☐ |
| `/parent/dashboard` | Co-op Command | QA-124, QA-125 | ☐ |

---

## Material guards

| Criterion | Pass | Sign-off |
|-----------|------|:--------:|
| Zero gold accent on Parent Tier 1 | grep / visual | ☐ |
| No `pd-os-deck` / player chamfer on parent pages | visual | ☐ |
| `parent-lounge-shell` Z1 well + Z2 panels on dashboard/household | visual | ☐ |
| 8px chamfer panels (not 24px soft pills) | visual | ☐ |
| No operative jargon in parent headlines | copy review | ☐ |

---

## Sign-off table

| Reviewer | Date | Notes |
|----------|------|-------|
| | | |

**Owner initials (registry §4):** PS-P01 ☐ · PS-P02 ☐ · PS-P03 ☐
