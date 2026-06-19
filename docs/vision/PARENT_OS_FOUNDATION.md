# Parent OS — Premium Foundation

**Canonical material vocabulary for Parent OS** · Vision: [`PARENT_OS.md`](./PARENT_OS.md) · Platform: [`PLATFORM_DESIGN_SYSTEM.md`](./PLATFORM_DESIGN_SYSTEM.md) · Workflows: [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) · Sign-off: [`PARENT_OS_VISUAL_ACCEPTANCE.md`](./PARENT_OS_VISUAL_ACCEPTANCE.md)

---

## 0. Purpose

Parents are **co-op partners** — calm, trustworthy, adult-oriented. This document defines Parent material vocabulary using the same structural sections as [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) but **rejects** operative void deck, gamification chrome, and gold accent.

**Tier 1 surfaces:** `/parent/household`, `/parent/vpc`, `/parent/dashboard`.

### 0.1 Experience criteria vs material vocabulary

Universal bar: [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) §2 Parent row. **This file = Parent material only** — lounge shell, trust markers, flat bento.

---

## 1. Tier A / Tier B primitive table

| Primitive | File path | Technique | When required | Forbidden substitutes |
|-----------|-----------|-----------|---------------|------------------------|
| **Parent lounge shell** | `parent-lounge-shell.css` | Z0 void + Z1 well + Z2 panels | All `/parent/*` Tier 1 | Player `pd-os-deck` |
| **Household module** | `parent/household/+page.svelte` | Operative cards, waiver band, dispatch link | `/parent/household` | Arcade streak UI |
| **VPC ceremony** | `parent/vpc/+page.svelte` | Per-child consent cards, trust copy | `/parent/vpc` | Checkbox-only waiver |
| **Co-op Command** | `parent/dashboard/+page.svelte` | RSVP strip, bounty terminal, Car Ride | `/parent/dashboard` | Player mission rail chrome |
| **Co-op arena** | `CoOpArena` | Shared logging — flat forms | Dashboard co-op band | Gamified XP animation |

---

## 2. Z-depth × material orchestration (Parent lounge)

| Layer | Material | Allowed | Forbidden |
|-------|----------|---------|-----------|
| **Z0 Canvas** | Void base `.parent-lounge-shell` | Calm atmosphere | Player ambient scanlines |
| **Z1 Page well** | 16px inset, 24px gutter | Breathing room | Cramped equal-weight text wall |
| **Z2 Panel** | `--pd-navy-panel`, 8px chamfer, grey trim | Household cards, VPC bands | 24px soft radius pills |
| **Z3 Trust marker** | Shield / consent status emphasis | VPC granted state | Gold celebration confetti |
| **Z4 Nav** | Fixed top chrome `.parent-lounge-z4-nav` | Sidebar + mobile | Player shell rail |

**Lock rule:** Trust surfaces (VPC, waiver) get **clearer** hierarchy than decorative dashboard bands.

---

## 3. Trust contract (Parent-specific)

| Metric | Target | Notes |
|--------|--------|-------|
| VPC step clarity | One primary action per child card | No multi-page mystery |
| Waiver state visible | Signed timestamp when complete | QA-121 |
| COPPA copy | Plain language — benefit of consent stated | [`COPPA_SIGNUP_MATRIX.md`](../COPPA_SIGNUP_MATRIX.md) |
| Error transparency | Callable failures explain retry | No "Something went wrong" alone |

---

## 4. Scroll & physics contract

- **Native document scroll** on all Parent routes.
- No inner scroll traps on household or dashboard.
- Car Ride / RSVP strips flow with document — not sticky over content on 390px.

---

## 5. Typography ratio

| Layer | Family | Use |
|-------|--------|-----|
| **Display** | Sans semibold | Page titles — "Household", "Consent" |
| **Mono** | Geist Mono | Status tags, dispatch codes, dates |
| **Body** | Sans 13–15px | COPPA explanations, debrief prompts |

**Voice:** Supportive partner — celebrate progress without arcade hype. No operative callsign grammar on parent-facing labels (show child name).

---

## 6. Color / light contract

| Token | Use | Misuse |
|-------|-----|--------|
| `--pd-data-cyan` | Primary links, active nav | Player teal wells |
| `--pd-atom-amber` | Pending VPC, approval needed | Anxiety countdowns |
| `--pd-grey-trim` | Borders, secondary labels | Silver decorative markers |
| `--pd-navy-panel` | Card backgrounds | Flat white SaaS cards |
| **Gold** | **FORBIDDEN** | Player-only action focal |

---

## 7. Interaction grammar

- **VPC grant:** loading → success per child; auto-finalize — no director approval step.
- **Waiver sign:** verified commit feedback; read-only after sign.
- **Co-op log:** instant submit feedback; XP handoff to player documented in workflow canon.
- **Car Ride debrief:** surfaces when fixture pending — hidden otherwise (no empty noise).
- **Touch targets ≥ 44px** on VPC grant and waiver CTAs.

---

## 8. Layout patterns (Tier 1)

| Route | layout_pattern | Bands |
|-------|----------------|-------|
| `/parent/household` | `parent-bento-12col` | Operatives · waiver · team link · invites |
| `/parent/vpc` | `parent-trust-form` | Per-child consent ceremony |
| `/parent/dashboard` | `parent-bento-12col` | RSVP · bounty terminal · Car Ride · schedule |

Blueprint: [`parent-lounge-shell.md`](./references/ui/research/blueprints/parent-lounge-shell.md), [`parent-vpc-trust-band.md`](./references/ui/research/blueprints/parent-vpc-trust-band.md)

---

## 9. Anti-patterns (lock list)

- **Player chamfer / `pd-os-deck` frame** on Parent routes.
- **Gamification vocabulary** — XP loot, streak rings, operative rank on parent UI.
- **Gold accent** anywhere on Parent.
- **24px soft card radius** — conflicts with platform chamfer canon (VS-4a).
- **Glassmorphism** on VPC trust surfaces.
- **Shouty marketing** on operational parent pages.

---

## 10. Reference matrix

Sign-off: [`PARENT_OS_VISUAL_ACCEPTANCE.md`](./PARENT_OS_VISUAL_ACCEPTANCE.md) — **390px first**.

| Route | Trust anchor | Must-feel rule | 390px | 1280px |
|-------|--------------|----------------|:-----:|:------:|
| **Household** | Guardian graph | Operatives scannable; waiver state obvious; dispatch CTA clear | ☐ | ☐ |
| **VPC** | Consent ceremony | One child per card; plain COPPA copy; success state legible | ☐ | ☐ |
| **Co-op Command** | Partner dashboard | RSVP + bounty visible; Car Ride calm; no player chrome | ☐ | ☐ |

---

## Cross-links

| Doc | Role |
|-----|------|
| [`AGENT_PARENT_UX_SPRINT_TEMPLATE.md`](./AGENT_PARENT_UX_SPRINT_TEMPLATE.md) | Sprint procedure |
| [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) | WF-PARENT-* gold paths |
| [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) | Tier 1 parent rows |
