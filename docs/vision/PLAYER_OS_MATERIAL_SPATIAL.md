# Player OS — Material & Spatial Constitution

**Canonical reference for Epic 1 premium track Sprints 2.16–2.19** · Vision: [`PLAYER_OS.md`](./PLAYER_OS.md) · Acceptance: [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) · Delivery: [`ROADMAP.md`](../../ROADMAP.md)

---

## 1. Purpose

Sprints 2.12–2.15 shipped a cohesive **Tier B** Player Dossier foundation — matte panels, token parity, motion, and route chrome. Post-2.15 visual review found that foundation **insufficient alone** against the product north star: an ultra-premium operative command deck comparable to cinematic sci-fi HUDs (Tron Legacy / Ares, AAA game command decks).

This document closes the gap between **Tier A** premium components (already cinematic) and **Tier B** routes (HQ hub, Stats, Settings) that still read as dark admin UI. It is the constitution for layout (2.16), depth (2.17), material orchestration (2.18), and diegetic UI + energy motion (2.19).

---

## 2. North star mood

Player OS must feel like **mission control in the Grid** — sparse void, emissive geometry, glass holographic data, layered depth, hero operative identity. Borrow from Tron / sci-fi games: **light in space**, not panels on black.

| Principle | Guidance |
|-----------|----------|
| **Age-appropriate** | Mastery and progression tone — not dystopian aggression. COPPA-safe dopamine gates retained. |
| **Coach / Parent OS** | Stay flat audit UI — no gamification bleed. |
| **Quality bar** | Subjective target: billion-dollar operative OS (~4–5/5 against cinematic bar), not cohesive dark sports app (~3.2–3.8/5). |

---

## 3. Tier A vs Tier B

| Tier | Character | Representative surfaces | Quality (cinematic bar) |
|------|-----------|-------------------------|-------------------------|
| **Tier A — Cinematic** | Parallax, holographic foil, SVG bloom, scanlines, glass | `VanguardCard.svelte`, `SkillTreeArena.svelte`, `StickerVariantShell.svelte`, Proving Grounds flows | ~4–5/5 |
| **Tier B — Dossier admin** | `#05050a` fills, 1px hairlines, subtle grain; HQ suppresses shell ambient; OperativeHub scanlines removed | HQ hub (`OperativeHub`, `IdentityBentoModule`), Stats, Settings | ~2–2.5/5 |

**Problem:** Two quality tiers in one product. Tier A islands do not orchestrate into a unified world; Tier B routes dominate daily navigation (HQ, Stats, Settings).

**Goal (2.16–2.19):** Promote Tier A material techniques to Tier B routes without copying every decorative pattern — orchestrate void, depth, glass, and emissive edges into one persistent operative world.

---

## 4. Z-depth model (Z0–Z4)

Replace single-plane panels (`--pd-shadow-elev-1/2` only) with an explicit Z-stack. Implement tokens in `player-dossier.css` during build sprints; spec lives here.

| Layer | Name | Definition | When to use |
|-------|------|------------|-------------|
| **Z0** | Canvas | Black void, grain, vignette, optional perspective grid | Shell background; persists across route transitions |
| **Z1** | Recessed | Inset wells — radar chart, inputs, ghost/empty states | Data read as *projected into* the surface |
| **Z2** | Base panel | `pd-surface-premium` evolution — primary command surfaces | Hub shell, analytics deck, route panels |
| **Z3** | Raised | Mission hero, QM cards, dossier card faces | One focal elevation per viewport region |
| **Z4** | Floating | Strap, rail active tab, modals, scrims | Chrome that sits above content, not inside it |

**Light source (locked):** Top-left highlight, bottom-right glow — consistent across Z1–Z3 so layers read as one lit environment.

**HQ layering map (reference):**

| Element | Z-layer |
|---------|---------|
| Shell canvas / grid | Z0 |
| Identity stage (inset ring + rank) | Z1 inside hub Z2 |
| OperativeHub command surface | Z2 |
| Mission hero card | Z3 |
| Analytics deck | Z2; radar polygon in Z1 well |
| `pd-strap` / world context | Z4 |

**Known regression to fix (2.17):** `ibm-root--premium` transparent override vs inset identity stage — stage must read recessed inside hub, not flat transparent.

---

## 5. Material language

Target material ratios (guidance, not pixel math): **void > emissive edges > glass > matte fill**.

| Material | Role | Techniques |
|----------|------|------------|
| **Void** | Dominant negative space — black canvas, not grey fill boxes | Z0 canvas; ≥40% HQ viewport void at rest (see acceptance doc) |
| **Emissive edge** | Light defines structure | Rim glow on hero mission, rank bar, rail active tab, panel hairlines with teal/gold energy |
| **Glass** | Holographic data layers | Inset wells, subtle blur on radar/inspector wells — not competing glass stacks on command shell |
| **Matte fill** | Supporting panel body | `#05050a` `--pd-panel` — smallest visual weight |

**Bloom / SVG patterns:** Reuse Tier A implementations — `SkillTreeArena.svelte` SVG filter defs, `VanguardCard.svelte` foil/bloom. Shared filter defs for radar/VPP bloom (Stats/HQ parity).

**Youth-safe Tron adjacency:** Cyan/teal data glow + gold action accents. Avoid Ares-aggression palette dominance (blood red, harsh orange wash).

**Optional future lane:** WebGL/shader pass documented but **not required** for 2.18.

---

## 6. Spatial canvas

| Element | Rule |
|---------|------|
| **Grid** | Persistent perspective plane — faint, not static flat grid only |
| **Vignette** | Shell vignette judiciously restored in dossier mode — not zeroed to flat black |
| **Route continuity** | Shared canvas layers persist across player nav — one world, not separate dashboards |
| **Scanlines / noise** | OK on **canvas/atmosphere** (HQ shell); **never** on readable mission text or body copy |

Reconcile with [`PLAYER_OS.md`](./PLAYER_OS.md): scanline policy refined from “no scanlines on command shell” → “no scanlines on readable text; canvas/atmosphere OK.”

---

## 7. Typography hierarchy

Reduce mono-everywhere flatness:

| Layer | Type | Use |
|-------|------|-----|
| **Display** | Geist display | Operative name, route titles, hero mission headline |
| **Data** | Geist Mono | Labels, values, status tags, telemetry eyebrows |
| **Meta** | Muted sans or mono at whisper size | Schedule ghost, secondary meta — not same weight as hero |

Eyebrow / title / panel section rhythm unified in 2.16 layout constitution.

---

## 8. Diegetic UI principles

**Diegetic:** UI reads as part of the operative terminal — Workout session logger, `VanguardCard` CTAs, mission hero chamfer, energy toggles.

**Admin (reject on Player OS):** Generic form controls, bracket buttons, flat settings tabs, duplicate header patterns (`pd-strap` vs `PlayerOsPageStrap` vs Armory custom without rules).

| Surface | Target |
|---------|--------|
| Workout terminal | Reference diegetic grammar |
| Settings | Align controls to HQ chamfer/energy CTAs (2.16) |
| Stats / HQ forms | Inset wells + emissive focus rings, not browser-default feel |

---

## 9. Energy motion

Builds on Sprint 2.15 motion layer — evolves from SaaS fade-in stagger to **energy conduction**:

| Pattern | Description | Sprint |
|---------|-------------|--------|
| **Conduit progress** | XP/rank/mission progress reads as energy filling a conduit, not flat width animation only | 2.19 |
| **Rim pulses** | Active selection, streak-at-risk, rail active tab | 2.15 + 2.19 polish |
| **Layer enter** | Strap (Z4) → hub (Z2) → deck — spatial motion, not equal fade-only stagger | 2.19 |
| **Selection trails** | Tab/slot selection leaves brief emissive trail | 2.19 |

Gated by `prefers-reduced-motion` and `data-dopamine='off'` (retained from 2.15).

**Out of scope for 2.19 impl:** Optional UI audio/haptics — document as future Epic 1.x sensory lane.

---

## 10. Hero identity scale

| Rule | Guidance |
|------|----------|
| **HQ minimum footprint** | Operative identity must dominate the command band — not a 72px chip lost beside admin panels |
| **VanguardCard relationship** | Armory Studio `VanguardCard` is the canonical identity artifact; HQ projects a **hero-scale** operative presence aligned with that quality tier |
| **Profile incomplete** | Silhouette + gold setup CTA still fills identity stage — no warehouse void |

Identity reads as **projection into the Grid**, not an avatar widget on a form.

---

## 11. Anti-patterns

| Anti-pattern | Why it fails |
|--------------|--------------|
| Filled grey boxes as primary layout | Reads admin, not void + light |
| Duplicate headers / habit rows | Breaks diegetic trust (e.g. duplicate daily habit on HQ) |
| Debug / prototype chrome in player builds | `RDR_S6_generic`, `ALPHA` badges — hide in player-facing builds |
| Source-scan-only QA | Tests that enforce flatness (e.g. scanlines removed) false-green against cinematic bar |
| Suppressing **all** atmosphere | HQ zeroing shell ambient → flat black admin |
| Competing glass stacks on command shell | Box-in-box prototype feel |
| Mixed header grammars without rules | `pd-strap` vs `PlayerOsPageStrap` vs route-custom |
| Empty warehouse voids | Ceremonies tab, insufficient TC — use compact CTA states |
| Stats/HQ radar parity break | Different VPP frame/bloom between routes |

---

## 12. Acceptance bar

Full premium track sign-off lives in [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md):

- Material & spatial checklist (Z-layers, emissive edges, holographic radar, void ratio)
- Cinematic reference states (manual QA)
- Tier parity check vs Skill Tree / VanguardCard
- Layer-enter motion criteria (2.19)

**Gate:** Epic 3.4+ and Epic 4.1+ implementation **blocked** until this doc’s sprint mapping (2.16–2.19) is Done and visual acceptance fully signed.

---

## 13. Sprint mapping

| Sprint | Focus | Delivers |
|--------|-------|----------|
| **2.16** | Layout & alignment constitution | Max-width, unified header grammar, HQ composition fixes, debug-chrome policy, Stats/HQ radar parity frame, diegetic Settings alignment |
| **2.17** | Z-depth & layering system | Z0–Z4 tokens, per-route layering map, inset stage regression fix |
| **2.18** | Material orchestration | Tier A → HQ/secondary routes; bloom, glass wells, spatial grid, emissive edges |
| **2.19** | Diegetic UI kit + energy motion | Conduit progress, hero identity scale, route spatial continuity; **lifts gate** for Epic 3.4 / 4.1 |

**Retcon:** Sprint 2.15 Done = motion + checklist shipped; **does not** mean premium-complete or gate-lift alone.

---

## ROADMAP link

**Current build sprint:** [ROADMAP Sprint 2.16 — Layout & alignment constitution](../../ROADMAP.md#sprint-216-scope--layout--alignment-constitution--planned)
