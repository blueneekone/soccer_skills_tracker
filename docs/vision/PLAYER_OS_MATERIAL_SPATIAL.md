# Player OS — Material & Spatial Constitution

> **Sections 9–11 superseded by [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) as of Sprint 2.20 planning. Use Foundation doc for material/anti-pattern guidance.**

**Canonical reference for Epic 1 premium track Sprints 2.16–2.19** · Foundation: [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) · Vision: [`PLAYER_OS.md`](./PLAYER_OS.md) · Acceptance: [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) · Delivery: [`ROADMAP.md`](../../ROADMAP.md)

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

**Known regression to fix (2.17):** ~~`ibm-root--premium` transparent override vs inset identity stage~~ — **fixed 2.17:** stage uses `--pd-z1-well-bg` + `--pd-z1-inset-shadow`; IBM premium layers transparent on top.

**Implemented tokens (2.17)** in `player-dossier.css`:

- `--pd-z0-canvas` (alias `--pd-bg`)
- `--pd-z1-inset-shadow`, `--pd-z1-well-bg`
- `--pd-z2-panel-shadow`
- `--pd-z3-raised-shadow`
- `--pd-z4-float-shadow`
- `--pd-z-highlight-top`, `--pd-z-glow-br`
- Utilities: `.pd-z1-recessed`, `.pd-z2-panel`, `.pd-z3-raised`, `.pd-z4-float`

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

**Implemented (2.18):**

- `pdDataBloom` global SVG filter in `VanguardVFX.svelte` — teal-tuned, youth-safe; referenced by `AttributeRadar.svelte` via `url(#pdDataBloom)`
- Emissive edge tokens: `--pd-emissive-teal`, `--pd-emissive-gold`, `--pd-edge-teal`, `--pd-edge-gold`
- Glass wells limited to Z1 radar/inspector inset — hub command shell stays matte
- Z2 panel gradient softened for void ratio without shrinking panels

**Youth-safe Tron adjacency:** Cyan/teal data glow + gold action accents. Avoid Ares-aggression palette dominance (blood red, harsh orange wash).

**Optional future lane:** WebGL/shader pass for volumetric grid or foil parallax — documented but **not implemented** in 2.18. CSS/SVG bloom + emissive edges remain the canonical Player OS material stack until a future sprint explicitly scopes shader work.

---

## 6. Spatial canvas

| Element | Rule |
|---------|------|
| **Grid** | Persistent perspective plane — faint, not static flat grid only |
| **Vignette** | Shell vignette judiciously restored in dossier mode — not zeroed to flat black |
| **Route continuity** | Shared canvas layers persist across player nav — one world, not separate dashboards |
| **Scanlines / noise** | OK on **canvas/atmosphere** (HQ shell); **never** on readable mission text or body copy |

**Implemented (2.18):**

- Dossier ambient grid opacity restored (~0.40); teal radial on `ps-ambient__glow--a` replaces black wash
- Canvas scanlines via `ps-ambient::after` on shell atmosphere layer — persists all player routes
- Scanline policy: canvas/atmosphere OK; readable text and command panel interiors NO

**Implemented (2.19 — route continuity):** Persistent `PlayerShell` Z0 (`ps-ambient` grid/glow/scanlines) + subtle `pd-route-enter` on `.pd-page-root` (opacity 0.96→1, 180ms) — content inset only; shell rail and ambient do not remount on nav.

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

**Implemented motion tokens (2.19):**

| Token / keyframe | Use |
|------------------|-----|
| `pd-layer-enter-z4` | Strap / floating chrome — drops from above with slight scale |
| `pd-layer-enter-z2` | Hub panels + analytics deck — rise from below |
| `pd-route-enter` | Subtle page-root opacity on player nav (180ms) |
| `pd-conduit-shimmer` | Rank XP bar energy conduction (1.2s one-shot when XP > 0) |
| `pd-os-toggle-pulse` / `pd-os-tab-trail` | Selection trails on toggles + tab rail (200ms) |

**Out of scope for 2.19 impl:** Optional UI audio/haptics — document as future Epic 1.x sensory lane (see ROADMAP post-2.19 note).

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
| Debug / prototype chrome in player builds | `RDR_S6_generic`, `ALPHA` / Report Anomaly — hide in player-facing builds (Sprint 2.16) |
| Source-scan-only QA | Tests that enforce flatness (e.g. scanlines removed) false-green against cinematic bar |
| Suppressing **all** atmosphere | HQ zeroing shell ambient → flat black admin |
| Competing glass stacks on command shell | Box-in-box prototype feel |
| Mixed header grammars without rules | `pd-strap` vs `PlayerOsPageStrap` vs route-custom |
| Empty warehouse voids | Ceremonies tab, insufficient TC — use compact CTA states |
| Stats/HQ radar parity break | Different VPP frame/bloom between routes |

---

## Layout constitution (Sprint 2.16)

One shared content column before material work (2.17–2.18). Implement in `player-dossier.css`; guard in `playerHudSprint216.test.ts`.

### Max-width rule

| Token / class | Value | Apply |
|---------------|-------|-------|
| `--pd-content-max` | `min(100%, 90rem)` (1440px cap) | Under `.player-dossier-root` |
| `.pd-content-wrap` | `width: 100%; max-width: var(--pd-content-max); margin-inline: auto` | Page-level wrap on HQ (parent of `HUDContainer`); Stats, Workout, Tracker, Skill Tree, **Settings (`/player/settings`)**. **HQ:** `pd-content-wrap` is page-level; `HUDContainer` children use `bento-span-*` directly — never wrap grid children inside `pd-content-wrap`. |

**Armory exception:** Quartermaster workspace (`qa-root`) may remain **full-bleed** for catalog grid and workspace chrome. Inner tab panels (Studio, Ceremonies, Album) may use `.pd-content-wrap` where a readable column helps.

### Header grammar

| Header | Route | Mandatory when |
|--------|-------|----------------|
| `.pd-strap` / `.pd-strap--premium` | `/player/dashboard` (HQ only) | Player HQ — operative callsign + world context |
| `PlayerOsPageStrap` | Workout, Tracker, Skill Tree, **Settings (`/player/settings`)**, Stats (player) | All secondary player routes |
| Settings (player) | `/player/settings` — `PlayerOsPageStrap` + dossier panels; **not** legacy `st-header` VANGUARD SETTINGS TERMINAL on `/settings` | Player profile/account deck; avatar editing in Armory Studio only |
| Armory workspace header | `/player/armory` | Armory only — QM tabs + balance strip; not duplicated on secondary routes |

Do not mix HQ strap on secondary routes or custom one-off headers without updating this table.

---

## 12. Acceptance bar

Full premium track sign-off lives in [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md):

- Material & spatial checklist (Z-layers, emissive edges, holographic radar, void ratio)
- Cinematic reference states (manual QA)
- Tier parity check vs Skill Tree / VanguardCard
- Layer-enter motion criteria (2.19)

**Gate:** Epic 3.4+ and Epic 4.1+ implementation **unblocked after 2.19 Done** — visual acceptance fully signed before shipping features.

---

## 13. Sprint mapping

| Sprint | Focus | Delivers |
|--------|-------|----------|
| **2.16** | Layout & alignment constitution | Max-width, unified header grammar, HQ composition fixes, debug-chrome policy, Stats/HQ radar parity frame, diegetic Settings alignment |
| **2.17** | Z-depth & layering system | Z0–Z4 tokens, per-route layering map, inset stage regression fix |
| **2.18** | Material orchestration | Tier A → HQ/secondary routes; bloom, glass wells, spatial grid, emissive edges |
| **2.19** | Diegetic UI kit + energy motion (**Done**) | Conduit progress, hero identity scale, route spatial continuity; **gate lifted** for Epic 3.4 / 4.1 |
| **2.20** | Foundation spec + composition lock + scroll contract (**planned**) | [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md); Tier A lift on HQ/VPP/Workout; void contract tests; reference matrix sign-off |
| **2.21** | Atmosphere amplification (**conditional**) | Void/light bump **only if** 2.20 void-contract measurement fails — driven by 2.20 pixel samples, not guesswork |

**Retcon:** Sprint 2.15 Done = motion + checklist shipped; **does not** mean premium-complete or gate-lift alone.

---

## ROADMAP link

**Current build sprint:** [ROADMAP Sprint 2.20 — Premium foundation lock & composition hotfix](../../ROADMAP.md#sprint-220-scope--premium-foundation-lock--composition-hotfix--planned)
