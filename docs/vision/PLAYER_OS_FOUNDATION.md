# Player OS — Premium Foundation

**Canonical material vocabulary for every future epic** · Vision: [`PLAYER_OS.md`](./PLAYER_OS.md) · Spatial history: [`PLAYER_OS_MATERIAL_SPATIAL.md`](./PLAYER_OS_MATERIAL_SPATIAL.md) · Sign-off: [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) · Delivery: [`ROADMAP.md`](../../ROADMAP.md#sprint-220-scope--premium-foundation-lock--composition-hotfix--planned)

---

## 0. Purpose

This document is the **single source of truth** for what “ultra-premium” means across every future Player OS epic. The bar fuses **enterprise SIEM/SOAR** observability (severity lanes, investigation workspaces, configuration decks), **Tron Legacy / Tron: Ares** cinematic sci-fi (void, emissive geometry, holographic data in space), and **AAA game command HUDs** (one gold focal, hero identity, diegetic terminals). Every sprint that changes Player OS pixels must check against this doc first; no parallel material vocabulary may ship without amending this file. **Supersedes** [`PLAYER_OS_MATERIAL_SPATIAL.md`](./PLAYER_OS_MATERIAL_SPATIAL.md) **sections 9–11** (Energy motion, Hero identity scale, Anti-patterns) — those sections remain in place for history only.

---

## 1. Tier A material primitive table

Canon is **what already ships** in the six reference components — not new invention.

| Primitive | File path | Technique | When required | Forbidden substitutes |
|-----------|-----------|-----------|---------------|------------------------|
| **Hologram card** | `src/lib/components/player/VanguardCard.svelte` | Perspective tilt + radial foil (`mix-blend-overlay`) + accent-tinted edge-glow inset (1px ring + bleed + halo) + 0.06 opacity diagonal scanlines + drop-shadow bloom on hero numeral | Dossier preview in Armory Studio; opponent/friendly scout cards; any single-operative spotlight with Scout's Six data | Plain `pd-panel` with avatar + text only |
| **Hologram card shell** | `src/lib/components/player/HologramCardShell.svelte` | Perspective tilt + radial foil (`mix-blend-overlay`) + accent edge-glow inset + 0.06 diagonal scanlines — **content slot only** | HQ operative identity; compact dossier focal; any Z3 wrapper | Mounting raw `VanguardCard` for operative HQ (Scout's Six / ArmoryEngine — wrong data model) |
| **SVG bloom + state gradients** | `src/lib/components/player/skill-tree/SkillTreeArena.svelte` | Per-instance `feGaussianBlur` + `feMerge` filter; per-state `radialGradient`s; center glow disc; keyframed pulse / decay / reveal / fog | Skill tree arena nodes; any stateful emissive node graph | CSS-only glow stacks without SVG filter |
| **Variant chrome** | `src/lib/components/gamification/StickerVariantShell.svelte` | `mix-blend-mode: color-dodge / overlay / screen / soft-light` for holo / radiant / alt-art | Unlocked stickers, rare unlock celebrations, season-pass tier markers | Border + flat `box-shadow` color only |
| **Diegetic terminal** | `src/lib/components/player/ProvingGrounds.svelte` | Corner brackets (`.pg-bracket--tl/tr/bl/br`), scoped scanline overlay, `--drill-accent` cascade, state-aware label copy | Workout logger; sliders/inputs; any active “execute” panel | Bootstrap-style input rows; browser-default controls |
| **Global VFX defs** | `src/components/VanguardVFX.svelte` | `#neonBloom` / `#aresBloom` / `#pdDataBloom` — mounted once, referenced by `url(#…)` | All Player OS bloom on charts, radar, hero numerals | Duplicate per-route filter defs |
| **Holographic radar** | `src/lib/components/player/dashboard/AttributeRadar.svelte` | References `url(#pdDataBloom)` on data geometry; bloom is intrinsic to SVG | All telemetry radars site-wide (HQ, Stats) | Chart.js radar; extra `::before` / `::after` decorative frames around the chart |

**HQ identity footnote:**

- HQ operative identity uses **HologramCardShell + operative portrait** (`OperativeLoadoutPreview` or compact card face), **not** full `VanguardCard.svelte`.
- Armory Studio full dossier may use `ProPlayerCard` inside the same shell at larger scale (slice 6f — out of scope for 6a).

---

## 2. Z-depth × material orchestration matrix

| Layer | Material | Allowed decorations | Tier B example | Tier A example |
|-------|----------|---------------------|----------------|----------------|
| **Z0 Canvas** | Pure `#000` + shell ambient grid / glow / vignette / canvas scanlines | Grain ≤ 0.07; scanlines ≤ 0.10 — atmosphere only | `PlayerShell` (`ps-ambient`, `ps-root--dossier`) | Same |
| **Z1 Recessed well** | `--pd-z1-well-bg` + `--pd-z1-inset-shadow` | **One** inner emissive ring; bloom **inside** via SVG filter (`pdDataBloom`) | Radar well, inspector inset, input fields | Skill tree center disc area |
| **Z2 Base panel** | `--pd-depth-panel-gradient` + Z2 shadow | Top highlight gradient; **no** `::before` / `::after` stacks | HQ hub shell (`OperativeHub`), analytics deck | `VanguardCard` outer face |
| **Z3 Raised hero** | Edge-glow inset (VanguardCard pattern) + accent bleed | Drop-shadow bloom on hero numeral; **one** Z3 focal per viewport region | HQ identity hero, mission hero card, Studio dossier preview | `VanguardCard` itself |
| **Z4 Floating chrome** | Z4 shadow + emissive bottom hairline | Rim glow on active state; never inside readable content | `pd-strap`, rail active tab, modals | — |

**Lock rule:** No surface stacks more than **two** decorative layers (well + bloom **or** edge-glow + scanline). Three or more layers (e.g. matte border + glass inset + `::before` glow + `::after` ring around `pdDataBloom`) is an anti-pattern.

---

## 3. Void contract (measurable thresholds)

Automated screenshot + pixel-sample tests land in **Sprint 2.20** (`playerHudSprint220.test.ts` + Playwright). Until then, manual DevTools sampling applies.

| Metric | Threshold | Measurement method |
|--------|-----------|-------------------|
| Black canvas pixels at viewport rest | ≥ 40% | DevTools screenshot color sample, HQ at 1280×900 |
| Visible matte panel fill ratio (`#05050a` / panel gradient) | ≤ 35% | Same |
| Emissive edges + bloom + light | ≥ 15% | Same |
| Largest Z2 panel | ≤ 60% viewport width (desktop) | Layout measurement |
| Hero identity (Z3) min footprint | ≥ 280px ring + 1.5× rank bar height | Computed from identity stage DOM |

---

## 4. Scroll & physics contract

- **One document scroll.** `ps-root` uses `min-height: 100dvh` and `overflow: visible`. No `ps-scroll-shell` inner scroll region on Player OS routes.
- **`ps-rail` fixed; `ps-ambient` fixed** — chrome does not scroll with content.
- **Inner scroll allowed only for:** horizontal pathway (Armory), sticker rows, badge matrix (must show visible scroll affordance), and modal content.
- **Custom `html` scrollbar styling** scoped to non–Player OS routes only (or removed in favor of native scroll on player shell).

---

## 5. Typography ratio

| Layer | Family | Cap per viewport | Use cases |
|-------|--------|------------------|-----------|
| **Display** | Geist (`--pd-font-display`) | 1 dominant + 2 supporting max | Operative name, route title, hero mission headline, hero numerals |
| **Mono** | Geist Mono (`--pd-font-mono`) | Unlimited for labels/values/tags | Labels, values, status tags, telemetry eyebrows — **never** paragraph body |
| **Body** | Mono at whisper size **or** sans 11–13px | One choice per route, not both | Description / lede copy on secondary routes |

Replicate `VanguardCard`: display for identity headline; mono for Scout’s Six grid only.

---

## 6. Color / light contract

| Token | Use | Misuse |
|-------|-----|--------|
| `--pd-accent-action` (gold `#fbbf24`) | **One** primary CTA per viewport, rank bar fill, streak-at-risk, hub-active rail | More than one gold focal in a viewport |
| `--pd-accent-data` (teal `#14b8a6`) | Telemetry, radar polygon, inspector, secondary interactive borders, route-active rail | Large surface fills |
| `--vc-accent` (VanguardCard tier cascade) | Hero card chrome — flips entire card accent | Applied directly to supporting Z2 panels |
| **Ares red** | Opponent `VanguardCard` / `#aresBloom` only | Any youth-facing Player OS surface |

**Holographic surfaces:** Use mix-blend modes from `StickerVariantShell` instead of opacity stacks — `color-dodge` (holo shimmer), `overlay` (foil), `screen` (radiant), `soft-light` (gold vein).

---

## 7. Diegetic kit cue catalogue

| Element | Diegetic treatment |
|---------|-------------------|
| **Buttons** | Chamfer clip-path (HQ hero CTA); corner-bracket terminal CTA (Workout); rail icon emission (nav active) |
| **Inputs / sliders** | Workout `pw-loadbar` conduit fill — not plain `<input type="range">` |
| **Toggles** | `pd-os-toggle-pulse` (settings, dopamine-off path) |
| **Tabs** | `pd-os-tab-trail` — Armory tabs, Workout focus areas |
| **Empty states** | Corner brackets + scoped scanline + copy such as “AWAITING TELEMETRY” — not generic “No data” |
| **Headers** | `pd-strap` (HQ only) / `PlayerOsPageStrap` (all other player routes) — no third pattern |
| **Errors** | ProvingGrounds grammar: `⚠ INVALID INPUT — CHECK RANGE` — not “Please enter a valid value” |

---

## 8. Interaction grammar

- **Pointer-aware lift** on every Z3 surface: `translateY(-1px)` or `VanguardCard`-style perspective tilt — not border-only hover.
- **State color cascade** via CSS custom properties (`--drill-accent`, `--vc-accent`) instead of class proliferation.
- **One-shot mount motion only** (`pd-conduit-shimmer`, `quest-hero-scale-in`); zeroed by `prefers-reduced-motion: reduce` and `data-dopamine='off'`.
- **Touch targets ≥ 44px** including shell rail links.

---

## 9. Anti-patterns (lock list)

- **Tier A primitive wrapped in Tier B matte frame** — e.g. `vpp-chart--premium` + `::before` + `::after` around `AttributeRadar` + `pdDataBloom`. *Rationale:* bloom is self-lit; extra frames read as admin box-in-box.
- **More than one decorative frame layer around a bloom filter** — *Rationale:* violates two-layer lock; kills void ratio.
- **Mono-everywhere typography** with no display anchor — *Rationale:* reads log viewer, not command deck.
- **Inner scroll viewport on shell** (`ps-scroll-shell` `overflow: auto`) — *Rationale:* traps scroll; breaks Coach-style native document flow.
- **Gold accent more than once per viewport** — *Rationale:* destroys single focal hierarchy.
- **Browser-default form controls** on any Player OS surface — *Rationale:* breaks diegetic terminal trust.

---

## 10. Reference matrix (replaces subjective acceptance)

Sign-off = screenshot at **1280px** and **390px** plus “must-feel rule” ticked per route (see [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md)).

| Route | SIEM/SOAR anchor | Tron/Ares anchor | Game HUD anchor | Must-feel rule | 1280px | 390px |
|-------|------------------|------------------|-----------------|----------------|:------:|:-----:|
| **HQ** (`/player/dashboard`) | Incident overview (severity-lane mission feed) | Grid ops floor (operative spotlight in void) | Mission select screen (one gold “do this now”) | Identity Z3 hero; ≥40% void; one gold focal; mission rail flows with document | ☐ | ☐ |
| **Stats** (`/stats`) | Investigation workspace (artifact left, inspector right, timeline below) | Vector analysis terminal | Character sheet | Radar full-width band; workout chart full-width band; no nested borders on radar well | ☐ | ☐ |
| **Train** (`/player/workout`) | Playbook editor + tail logs | Program upload terminal | Helldivers stratagem input | Diegetic terminal (corner brackets + scanline + state copy); equal-height columns; no inner panel scroll | ☐ | ☐ |
| **Armory** (`/player/armory`) | Asset registry + threat-intel feed | Loadout bay / identity disc | Destiny vault | Pathway timeline (horizontal scroll OK with affordance); dossier card preview Z3 standalone; album covers match sticker aspect | ☐ | ☐ |
| **Settings** (`/player/settings`) | Configuration deck | Identity calibration terminal | Pause menu config | All controls use diegetic kit; no browser-default toggles | ☐ | ☐ |
| **Tracker** (`/player/tracker`) | Trend dashboard | Memory archive | Co-op replay log | Matching stat row primitive; capsule arena Tier A; not a “log list” | ☐ | ☐ |
| **Skill tree** (`/player/skill-tree`) | Capability matrix | The Grid root | Talent tree | Already Tier A — defends as reference benchmark | ☐ | ☐ |

*Phase 6 slice 6j targets remaining Tier B panel debt site-wide.*

---

## 11. Future-epic gate

- **Epic 3.4+ / 4.1+** implementation may proceed after ROADMAP marks **2.19 Done**, but **shipping** requires the reference matrix fully ticked at **1280px** and **390px** plus void contract pass.
- Future epics check this doc before pixel work; **no parallel material vocabulary** without amending §1 first.

---

## 12. Cross-links

| Doc | Role |
|-----|------|
| [`PLAYER_OS.md`](./PLAYER_OS.md) | Product north star, zones, loops |
| [`PLAYER_OS_MATERIAL_SPATIAL.md`](./PLAYER_OS_MATERIAL_SPATIAL.md) | Z0–Z4 history, layout constitution; §§9–11 superseded by this file |
| [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) | Sign-off checklist + reference matrix mirror |
| [`ROADMAP.md`](../../ROADMAP.md#sprint-220-scope--premium-foundation-lock--composition-hotfix--planned) | Sprint **2.20** implementation scope |
