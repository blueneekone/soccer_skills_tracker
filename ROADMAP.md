# SSTracker — Delivery Roadmap

**Architecture:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)  
**Last updated:** 2026-06-15  
**Current sprint:** **LAUNCH-functional-os Done** · **Wave 3B Done** · **Wave 4 Done** · Owner QA [`OWNER_QA_CHECKLIST.md`](docs/vision/OWNER_QA_CHECKLIST.md) on `qa_launch_2026` · Surface tiers: [`PRODUCT_SURFACE_REGISTRY.md`](docs/vision/PRODUCT_SURFACE_REGISTRY.md)

**TABLED (post-acquisition)** — from registry Tier 3 + demoted surfaces:

- Platform visual system (Gemini research) · Flow asset generation · Avatar Studio **3.6b+**
- War Room HQ hero + sidebar nav (`/coach/tactical` — route retained, Tier 2 deep-link)
- Player `/player/skill-tree`, `/player/proving-grounds`, `/player/media`
- Coach Trial Builder (`/coach/trial-builder`)
- Director tournament ops (`/director/events`)
- Admin RL policy console (`/admin/rl-policy`) — waivable at launch
- Future personas: `/team-manager`, `/tutor`, expanded `/recruiter`
- Marketing home `/` and non-acquisition marketing depth  
**Post-QA (after owner sign-off):** Dark-surface text contrast + theme toggle coherence — see [`docs/vision/POST_QA_DARK_SURFACE_CONTRAST_PLAN.md`](docs/vision/POST_QA_DARK_SURFACE_CONTRAST_PLAN.md) · gap U-01  
**Note:** **3.5l-gate** closed in error — automated regression ≠ human VA; Phase 2 visual **rejected by product owner**  
*Phase 7 · G1–G10 Done · Sprint 2.20 Done — Player OS premium foundation locked*

This document is the **canonical delivery tracker** for test-driven sprints. Product vision and persona UX live in [`docs/PERSONA_ECOSYSTEM.md`](docs/PERSONA_ECOSYSTEM.md) and [`docs/vision/`](docs/vision/).

---

## How to work a sprint (Cursor)

1. **Design** → Ask mode → update or read vision docs under `docs/vision/`.
2. **Build** → Agent mode → one slice per session; use the explicit file list from the sprint section below.
3. **Player UX sprints** → follow [`docs/vision/AGENT_PLAYER_UX_SPRINT_TEMPLATE.md`](docs/vision/AGENT_PLAYER_UX_SPRINT_TEMPLATE.md) — instrument classification required before pixel work.
4. **Verify** before marking done:
   ```bash
   npm test -- <paths from sprint>
   npm run check
   npm run build
   ```

Agent workflow rules: [`.cursor/rules/sst-agent-workflow.mdc`](.cursor/rules/sst-agent-workflow.mdc)

---

## Player OS rubric redesign (active)

**Goal:** Full Player OS pass against [`PLATFORM_EXPERIENCE_RUBRIC.md`](docs/vision/PLATFORM_EXPERIENCE_RUBRIC.md) + [`PLATFORM_BUILD_MANDATES.md`](docs/vision/PLATFORM_BUILD_MANDATES.md). Skill tree = Tier A benchmark only (do not modify).

**Authority:** [`docs/vision/PLATFORM_BUILD_MANDATES.md`](docs/vision/PLATFORM_BUILD_MANDATES.md) §3

| Wave | Status | Scope | Proof |
|------|--------|-------|-------|
| A | **Done** | Foundation + shell | `playerHudSprint241.test.ts` |
| B | **Done** | HQ command deck | `playerHudSprint242.test.ts` |
| C | **Done** | Stats + Tracker | `playerHudSprint243.test.ts` (absorbs **6l**) |
| D | **Done** | Train + Settings | `playerHudSprint244.test.ts` (absorbs **6h** commit UX) |
| D′ | **Done** | Train layout + visual cohesion | `playerHudSprint245.test.ts` |
| B′ | **Done** | HQ cohesion follow-up | `playerHudSprint246.test.ts` (extends Wave B) |
| E | **Done** | Armory | absorbs **6f** strap/accent — `playerHudSprint252.test.ts` |
| F | **Done** | VA sign-off | absorbs **6i** — `playerHudSprint258.test.ts` |

*Historical sprint note: slice 6j-b Routes pd-os-deck depth (in progress) → **Done** (Wave B).*

**Do not start** Epic 3.4 / 4.1 feature work until Wave F sign-off unless ROADMAP explicitly excepts.

---

## Phase 7 — Instrument cohesion (**complete**)

**Goal:** One shared frame across HQ bands; differentiation via inner primitives only. Authority: [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](docs/vision/PLAYER_OS_INSTRUMENT_TAXONOMY.md) · Procedure: [`AGENT_PLAYER_UX_SPRINT_TEMPLATE.md`](docs/vision/AGENT_PLAYER_UX_SPRINT_TEMPLATE.md)

| Sprint | Status | Instrument(s) | Cohesion scope | Scope | Proof |
|--------|--------|---------------|----------------|-------|-------|
| **G1** | **Done** | Navigation, Identity, Directive, Progression, Telemetry (HQ stack) | Frame | HQ scroll order — shared `pd-os-deck` frame on all bands; strap + hub + Quick Ops + pathway + analytics void | `playerHudSprint247.test.ts` |
| **G2** | **Done** | Navigation, Progression | Inner | `OperativeQuickOps` vs `OperativePathwayPreview` — no pathway well chrome on nav tiles | `playerHudSprint248.test.ts` |
| **G3** | **Done** | Telemetry | Inner | VPP + Stats — calm telemetry; no Navigation tile lift on radar bands | `playerHudSprint249.test.ts` |
| **G4** | **Done** | Execute | Both | Train `pw-theater` — Execute instrument; bracket/scanline scoped; diegetic commit | `playerHudSprint250.test.ts` |
| **G5** | **Done** | All (frame) | Frame | Cross-route `pd-os-deck` token parity — HQ dedup + Stats/Settings/Tracker; outer telemetry void match | `playerHudSprint251.test.ts` |
| **G6** | **Done** | Identity, Directive, Telemetry (HQ bands 2 + 5) | Band rhythm | `pd-hq-section-head` on hub + analytics void; hub hero rim-light; VPP head dedup; identity trench soften | `playerHudSprint253.test.ts` |
| **G6′** | **Done** | Telemetry (HQ band 5) | Band structure | `pd-hq-section-head` inside recessed void (attached to radar); VPP head fully suppressed when `hideHeadTitle` | `playerHudSprint254.test.ts` |
| **G6″** | **Done** | Telemetry (HQ band 5) | Band spacing | Telemetry head/radar spacing fix — gap 0 on void flex; divider attach; capsules margin only below VPP | `playerHudSprint255.test.ts` |
| **G7** | **Done** | Telemetry (HQ band 5) | Band head typography + void integration | Restore VPP native head on HQ; teal/mono telemetry voice; Stats parity | `playerHudSprint256.test.ts` |
| **G8** | **Done** | Telemetry (HQ band 5) | Band banner parity | Revert G7 — `pd-hq-section-head` on HQ void matches Quick Ops / Pathway; `hideHeadTitle` on VPP | `playerHudSprint257.test.ts` |
| **G9** | **Done** | Cohesion (HQ + routes + Execute) | Frame + band heads | L2 caps-first titles; L3 eyebrow below; pathway LVL rail; telemetry void top fade; **NO pg-scanline** on Player OS routes | `playerOsCohesion.test.ts` · `playerHudSprint259.test.ts` |
| **G10** | **Done** | All Player OS routes | Formal sign-off | Reference matrix MCP VA + doc sync; absorbs **6i**; Epic 3.4 gate | `playerOsCohesion.test.ts` (G10 block) · [`g10-manifest.json`](docs/vision/va-screenshots/g10-manifest.json) · `playerHudSprint260.test.ts` |
| **Wave F** | **Done** | Cohesion / Navigation headers + Telemetry band rhythm | Header typography + void layout caps + capsules sub-head parity — *typography superseded by G9; `playerOsCohesion.test.ts` is canonical cross-route gate* | Wave F · Player OS header VA — screenshot-gated band head parity + capsules sub-head alignment | `playerHudSprint258.test.ts` |

**Phase 7 · G10 verify (Player OS formal sign-off — use for G1–G10 regression):**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerOsCohesion.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint260.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint259.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint220.test.ts
npm run check
npm run build
```

**G10 VA checklist** (`docs/vision/va-screenshots/` — mark ☑ only after PNGs + human confirm):

- ☑ `g10-manifest.json` valid (`playerOsCohesion.test.ts` G10 block)
- ☑ Reference matrix 1280 — all 7 routes captured
- ☑ Mobile 390 — HQ, Stats, Train, Armory, Settings
- ☑ `PLAYER_OS_VISUAL_ACCEPTANCE.md` updated (no Train scanline)
- ☑ `playerOsCohesion` G10 block green
- ☑ Delivery gate note: Epic 3.4+ unblocked for implementation after human sign-off on reference matrix

**Phase 7 · G9 verify (Player OS cohesion — use for all G1–G9 regression):**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerOsCohesion.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint259.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint258.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint257.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint250.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint237.test.ts
npm run check
npm run build
```

**G9 VA checklist** (`docs/vision/va-screenshots/` — mark ☑ only after screenshots saved):

- ☑ `g9-manifest.json` valid (`playerOsCohesion.test.ts` size gate)
- ☑ `g9-dashboard-1280.png` — 1280×800 HQ; telemetry void top fade vs Quick Ops
- ☑ `g9-stats-1280.png` — route strap title-first caps; status rail
- ☑ `g9-workout-1280.png` — zero scanline; shared hero frame
- ☑ `g9-armory-1280.png` — route strap hierarchy
- ☑ `g9-tracker-1280.png` — route strap hierarchy
- ☑ `g9-settings-1280.png` — route strap hierarchy
- ☑ `g9-dashboard-390.png` — 390×844 mobile band heads
- ☑ `g9-workout-390.png` — 390×844 Train cohesion
- ☑ Detail/density/cohesion pass — black canvas unchanged; pathway LVL / 50 right rail

**Wave F VA checklist** (`docs/vision/va-screenshots/` — mark ☑ only after screenshots saved):

- ☑ `wave-f-dashboard-1280-full.png` — 1280×800 dashboard head comparison
- ☑ `wave-f-dashboard-1280-heads.png` — strap + all band heads crop
- ☑ `wave-f-dashboard-390-full.png` — 390×844 dashboard mobile
- ☑ Tier A band heads match (Hub, Quick Ops, Pathway, Telemetry)
- ☑ Capsules sub-head no longer second banner voice (Tier A tokens, not teal mono)
- ☑ `wave-f-stats-1280.png` — Stats route strap
- ☑ `wave-f-workout-1280.png` — Train route strap
- ☑ `wave-f-armory-1280.png` — Armory route strap
- ☑ `wave-f-tracker-1280.png` — Tracker route strap
- ☑ `wave-f-settings-1280.png` — Settings route strap

**G1 cold-start files (≤5):** `player-dossier.css`, `OperativeHub.svelte`, `OperativeQuickOps.svelte`, `OperativePathwayPreview.svelte`, `player/dashboard/+page.svelte`

**Visual acceptance states (G1):** profile incomplete · no telemetry · full telemetry · mobile 390px

Runs parallel-safe with **Wave E (Armory)** when file lists do not overlap.

---

## Delivery gate (Player OS cinematic premium)

- **Unblocked after 2.20 Done + G10 sign-off:** Epic 3.4+ **implementation** (shipping still requires Tier A primitive parity sign-off in [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](docs/PLAYER_OS_VISUAL_ACCEPTANCE.md) per [`PLAYER_OS_FOUNDATION.md`](docs/vision/PLAYER_OS_FOUNDATION.md)); Epic **4.1+ unblocked** at launch — placeholder portrait OK; **3.5m-gate** portrait VA **deferred post-launch** (product owner)
- **Allowed parallel:** Epic 3.0–3.3 (Done), Epic 4.0 docs, unrelated bugfixes
- **North star:** Player OS must pass cinematic material/spatial acceptance (see [`docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md`](docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md) + [`docs/PLAYER_OS_VISUAL_ACCEPTANCE.md`](docs/PLAYER_OS_VISUAL_ACCEPTANCE.md)) before comms or album bonuses
- **Retcon:** Sprint 2.15 shipped motion + checklist; visual review found Tier A/Tier B split — gate re-closed for Epic 3.4 / 4.1

---

## Sprint status — Epic 1: Foundation & Player HUD *(premium ecosystem track 2.12.1–2.20 **Done**; Tier B foundation shipped 2.12–2.15)*

| Sprint | Status | Summary | Proof |
|--------|--------|---------|-------|
| 1.1 | Done | 12-col liquid bento, content-hash assets | `liquidBento.css.test.ts`, `tokenCompliance.test.ts`, layout tests |
| 1.2 | Done | UID avatars, COPPA backend hooks | `complianceOps.js`, `user.types.ts` |
| 1.3 | Done | JWT RBAC, tenant isolation | `firestoreRulesSprint13.test.ts`, `roleDerivations.test.ts` |
| 1.4 | Done | Gaming HUD baseline | `playerHudSprint14.test.ts`, `playerDashboard.hud.test.ts` |
| 1.5 | Done | Mission dedup, avatar precision | `playerHudSprint15.test.ts`, `deduplicateMissions.ts` |
| 1.6 | Done | IdentityBentoModule, OperativeHub, HUDContainer | `playerHudSprint16.test.ts` |
| 1.7 | Done | HUD density, mission ellipsis, streak UX | `playerHudSprint17.test.ts` — Engineering pass (padding, ellipsis, streak pulse) — visual remediation continues in 1.8. |
| 1.8 | Done | Unified tactical HUD shell, flush embedded panels, Vanguard vectors in metrics column | `playerHudSprint18.test.ts` — Unified hub shell + vector strip — mission deck continues in 1.9. |
| 1.9 | Done | Mission deck density — single-line embedded rows, compact CTAs, no bracket UI | `playerHudSprint19.test.ts` |
| 2.0 | Done | Telemetry deck — hub vector strip sync, radar + inspector, remove duplicate grid | `playerHudSprint20.test.ts` |
| 2.1 | Done | Identity metric chips, chamfer CTAs, palette + mono header pass | `playerHudSprint21.test.ts` |
| 2.1.1 | Done | CMD removed; shell nav only | `playerHudSprint14.test.ts` (no PlayerCommandCenter on page) |
| 2.2 | Done | Motion polish, gold avatar palette, mono typography lock | `playerHudSprint22.test.ts` |
| 2.3 | Done | Gold Command HUD unification — ringless stat cells, kill cyan scanlines, embedded mission chrome | `playerHudSprint23.test.ts` |
| 2.4 | Done | Gold Command palette, analytics deck, chamfer cards | `playerHudSprint24.test.ts` |
| 2.5 | Done | Command strip layout v2 — 8+4, mission rail, conditional avatar, flat surface, no hub match data | `playerHudSprint25.test.ts` |
| 2.6 | Done | HQ content loop — hero mission, rank progress, last session | `playerHudSprint26.test.ts` |
| 2.7 | Done | Presence & hierarchy — hero logic, compact telemetry, typography | `playerHudSprint27.test.ts` |
| 2.7.1 | Done | Operative avatar / armory portrait persistence | `armoryAvatar.test.ts` |
| 2.8 | Done | Player Dossier unification — black canvas, dual accent, shared tokens | `playerHudSprint28.test.ts` |
| 2.8.1 | Done | Dossier polish — hero/training sync, profile banner, strap dedupe, compact telemetry | `playerHudSprint281.test.ts` |
| 2.8.2 | Done | Compact radar sizing — hero-readable telemetry in compact deck | `playerHudSprint282.test.ts` |
| 2.9 | Done | Player shell dossier alignment — rail + ambient on all player routes | `playerHudSprint29.test.ts` |
| 2.10 | Done | HQ world context — next event, coach pulse, status chips | `playerHudSprint210.test.ts` |
| 2.10.1 | Done | Inline strap context + mission CTA colors | `playerHudSprint2101.test.ts` |
| 2.10.2 | Done | Inline strap schedule meta always visible (ghost + deduped chips) | `playerHudSprint2102.test.ts` |
| 2.11 | Done | Secondary route dossier parity — Workout, Tracker, Skill Tree, player Settings | `playerHudSprint211.test.ts` |
| 2.11.1 | Done | Shared component dossier pass — mission rail, Armory panels, HQ density | `playerHudSprint2111.test.ts` |
| 2.12 | Done | HQ Premium — gamified depth, hero composition, ambient feel | `playerHudSprint212.test.ts` |
| 2.12.1 | Done | HQ hotfix — incomplete profile hero, analytics premium, inset fix, stronger depth | `playerHudSprint2121.test.ts` |
| 2.13 | Done | Player OS Chrome — `pd-surface-premium` on all player routes via shared shell | `playerHudSprint213.test.ts` |
| 2.14 | Done | Component premium — VPP, capsules, Armory/Workout/Tracker/SkillTree panels | `playerHudSprint214.test.ts` |
| 2.15 | Done | Gamification motion layer + visual acceptance checklist | `playerHudSprint215.test.ts` |
| 2.16 | Done | Layout & alignment constitution — max-width, header grammar, HQ composition fixes, debug-chrome policy | `playerHudSprint216.test.ts` |
| 2.16a | Done | HQ bento grid hotfix — pd-content-wrap outside HUDContainer; width reconciliation | `playerHudSprint216a.test.ts` |
| 2.16.1 | Done | Player Settings cohesion — /player/settings route, PlayerSettingsPanel, Armory Studio avatar boundary | `playerHudSprint2161.test.ts` |
| 2.17 | Done | Z-depth & layering system — Z0–Z4 tokens, recessed/raised/floating surfaces | `playerHudSprint217.test.ts` |
| 2.18 | Done | Material orchestration — pdDataBloom radar, emissive edges, spatial grid restore, canvas scanlines | `playerHudSprint218.test.ts` |
| 2.19 | Done | Diegetic UI kit + energy motion — conduit progress, hero identity scale, route spatial continuity; lifts gate | `playerHudSprint219.test.ts` |
| 2.20 | Done | Premium foundation lock — scroll/VPP/composition hotfix + void contract pixel gate (2.20e) | `playerHudSprint220.test.ts` (2.20a–e) · `voidContract.ts` · [`g10-hq-void-1280x900.png`](docs/vision/va-screenshots/g10-hq-void-1280x900.png) |

**Epic 1 premium track 2.12.1–2.20 Done** — G10 reference matrix + 2.20e void sample = Player OS launch sign-off for Epic 3.4 implementation.

---

## Sprint 2.12 scope — HQ Premium — **Done**

**Goal:** Make `/player/dashboard` feel **worth the price tag** — gaming HUD with depth, motion, and clear hierarchy. Not another token swap.

**Delivered:**

- **Depth system:** `--pd-depth-*` tokens, `.pd-surface-premium`, `.pd-grain` overlay, elevation shadows — `player-dossier.css`
- **Hero composition:** `OperativeHub` identity stage + streak corner glow; `IdentityBentoModule` premium path (88px ring, rank bar glow, compact badge-only)
- **Mission rail:** `.quest-row--premium`, `.quest-hero--premium` card faces + hero CTA gold glow — `player-missions.css`, `ActiveBounties.svelte`
- **Single telemetry surface:** hide embedded `HudMetricsPanel` when `telemetryReady`; collapsed hub one-liner when `!telemetryReady`; `VanguardProtocolPanel` owns radar — `+page.svelte`
- **Strap + shell:** `.pd-strap--premium`, tighter `--bento-gap-liquid`, dossier vignette — `player-shell.css`, `player-dashboard-hud.css`
- **Tests:** `playerHudSprint212.test.ts`

**Files:** `player-dossier.css`, `player-dashboard-hud.css`, `player-missions.css`, `player-shell.css`, `OperativeHub.svelte`, `IdentityBentoModule.svelte`, `ActiveBounties.svelte`, `+page.svelte`, `PlayerShell.svelte` (unchanged — CSS only), `playerHudSprint212.test.ts`, `ROADMAP.md`, `docs/vision/PLAYER_OS.md`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint212.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint2111.test.ts
npm run check:file-budget
npm run check
npm run build
```

**Retcon:** Foundation tokens only; insufficient for premium-complete. Superseded by **2.12.1–2.15**.

---

## Sprint 2.12.1 scope — HQ hotfix (profile-incomplete premium) — **Done**

**Goal:** HQ must look premium when profile is incomplete and telemetry is empty (Cordell Waechtler state).

**Delivered:**

- **Identity inset fix:** `operative-hub__identity-stage` carries inset panel; `ibm-root--premium` layers on top (no transparent override)
- **Incomplete profile hero:** silhouette ring placeholder, rank XP bar + streak/XP cells visible, gold setup CTA card
- **Analytics deck:** `player-analytics-deck` uses `.pd-surface-premium`; VPP premium header + radar glow; compact empty-state block
- **Depth tokens:** stronger grain (~0.07), gradient stops, `--pd-shadow-elev-*` bump
- **Mission dedupe:** hero `daily-training-log` excluded from embedded compact feed
- **Tests:** `playerHudSprint2121.test.ts`

**Visual acceptance states:** profile incomplete · no telemetry · full telemetry · mobile 390px

**Files:** `player-dossier.css`, `player-dashboard-hud.css`, `IdentityBentoModule.svelte`, `VanguardProtocolPanel.svelte`, `ActiveBounties.svelte`, `activeBounties.ts`, `+page.svelte`, `playerHudSprint2121.test.ts`, docs

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint2121.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint212.test.ts
npm run check:file-budget && npm run check && npm run build
```

---

## Sprint 2.13 scope — Player OS Chrome — **Done**

**Goal:** One premium chrome layer on every player route — same depth, grain, vignette, panel vocabulary as HQ via shared shell.

**Delivered:**

- **PlayerShell:** `player-dossier-root pd-grain pd-chrome-root` on scroll canvas; single `player-dossier.css` import
- **Utilities:** `.pd-chrome-root`, `.pd-page-root`, `.pd-page-panel`, `.pd-route-strap` — `player-dossier.css`
- **PlayerOsPageStrap.svelte** — reusable compact route header (secondary routes)
- **Route pass:** HQ (dedupe grain), Armory, Train, Tracker, Skill Tree, Settings (player), Stats — `pd-page-root` + `pd-page-panel`
- **Shell polish:** stronger dossier rail glow, scroll-shell scrollbar accent, ambient bump — `player-shell.css`
- **Tests:** `playerHudSprint213.test.ts`

**Visual acceptance states:** profile incomplete · no telemetry · full telemetry · mobile 390px

**Files:** `PlayerShell.svelte`, `PlayerOsPageStrap.svelte`, `player-dossier.css`, `player-shell.css`, `player/dashboard/+page.svelte`, `player/armory/+page.svelte`, `player/workout/+page.svelte`, `player/tracker/+page.svelte`, `player/skill-tree/+page.svelte`, `settings/+page.svelte`, `stats/+page.svelte`, `playerHudSprint213.test.ts`, `playerHudSprint212.test.ts`, `ROADMAP.md`, `docs/vision/PLAYER_OS.md`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint213.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint2121.test.ts
npm run check:file-budget && npm run check && npm run build
```

---

## Sprint 2.14 scope — Component premium — **Done**

**Goal:** Premium **inside** the panels — HQ analytics, missions, capsules, and secondary routes feel gamified and depth-rich at 1280px + 390px, including empty states.

**Delivered:**

- **VPP:** `vpp-root--premium` complete — teal radar glow ring, inset chart well, brighter spokes, inspector gold/teal accent bar when axis selected, dossier hex empty state (max-height cap)
- **Analytics deck:** internal divider glow; `player-capsules-strip--premium` nested sub-panel; ghost capsule compact card with hex icon strip
- **Mission rail:** `quest-log-panel--premium` deck chrome, hero elevation vs compact card rows, left accent bars (teal=habit, gold=bounty)
- **Identity:** rank bar fill shimmer when XP > 0 (reduced-motion safe); stat cell inset + desktop hover lift
- **Shared utilities:** `.pd-panel-section`, `.pd-panel-eyebrow`, `.pd-empty-state` in `player-dossier.css`
- **Secondary routes:** Armory tabs/cards/studio preview, Workout threat+exec sections, Tracker ghost state, Skill Tree arena glow, Settings tabs, Stats dossier frames
- **Memory capsules:** `mc-arena--dossier-premium` frame on dashboard embed
- **Tests:** `playerHudSprint214.test.ts`

**Visual acceptance states:** profile incomplete · no telemetry · full telemetry · mobile 390px

**Files:** `player-dossier.css`, `player-dashboard-hud.css`, `player-missions.css`, `VanguardProtocolPanel.svelte`, `AttributeRadar.svelte`, `ActiveBounties.svelte`, `IdentityBentoModule.svelte`, `MemoryCapsuleArena.svelte`, `OperativeLoadoutStudio.svelte`, `SkillTreeArena.svelte`, `dashboard/+page.svelte`, secondary route pages, `playerHudSprint214.test.ts`, `ROADMAP.md`, `docs/vision/PLAYER_OS.md`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint214.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint213.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint2121.test.ts
npm run check:file-budget && npm run check && npm run build
```

---

## Sprint 2.15 scope — Gamification motion + acceptance — **Done**

**Goal:** Motion layer + written visual acceptance checklist. **2.15 Done ≠ premium-complete** — post-2.15 visual review re-closed Epic 3.4 / 4.1 gate until track **2.16–2.19** completes.

**Delivered:**

- **HQ staggered enter:** `pd-enter-rise` on strap (0ms), hub wrapper (80ms), analytics deck (160ms) — `player-dashboard-hud.css`
- **XP rank bar fill:** 600ms width ease-out on premium bar; 2.14 shimmer retained
- **Streak pulse:** consolidated reduced-motion + `data-dopamine='off'` gates for avatar ring, stat cell, shimmer
- **Mission rail:** `quest-hero-scale-in` one-shot on `.quest-hero--premium`; compact row accent bar brighten on hover
- **Secondary routes:** `pd-chrome-root .pd-page-root > *` stagger (strap + first panel) — `player-dossier.css`
- **Shell dopamine gate:** `data-dopamine` on `PlayerShell` canvas for all player routes
- **Visual acceptance:** [`docs/PLAYER_OS_VISUAL_ACCEPTANCE.md`](docs/PLAYER_OS_VISUAL_ACCEPTANCE.md)
- **Tests:** `playerHudSprint215.test.ts`

**Visual acceptance states:** profile incomplete · no telemetry · full telemetry · capsule ghost · mobile 390px · reduced motion · dopamine off

**Files:** `player-dashboard-hud.css`, `player-missions.css`, `player-dossier.css`, `PlayerShell.svelte`, `playerHudSprint215.test.ts`, `docs/PLAYER_OS_VISUAL_ACCEPTANCE.md`, `ROADMAP.md`, `docs/vision/PLAYER_OS.md`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint215.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint214.test.ts
npm run check:file-budget && npm run build
```

---

## Sprint 2.12–2.15 retrospective — Tier B foundation (Done, insufficient alone)

**What shipped (Done — do not reopen):**

- **Tokens & chrome:** `--pd-depth-*`, `.pd-surface-premium`, `.pd-grain`, route chrome via `PlayerShell` + `PlayerOsPageStrap` (2.12–2.13)
- **Component premium:** VPP radar glow, mission card faces, Armory/Workout/Tracker/SkillTree panels, empty-state utilities (2.14)
- **Motion:** staggered enter, XP bar fill, streak pulse, hero scale-in, dopamine gates (2.15)
- **Checklist:** [`docs/PLAYER_OS_VISUAL_ACCEPTANCE.md`](docs/PLAYER_OS_VISUAL_ACCEPTANCE.md) — timing/mobile states

**Why acceptance failed (post-2.15 visual review):**

- **Two quality tiers:** Tier A cinematic islands (`VanguardCard`, `SkillTreeArena`, `StickerVariantShell`) vs Tier B dossier admin (HQ, Stats, Settings)
- **Flat HQ orchestration:** single elevation tier; HQ suppresses shell ambient; OperativeHub scanlines removed; faint static grid only
- **Identity scale:** 72px HQ ring vs VanguardCard as real identity artifact (buried in Armory)
- **Motion grammar:** SaaS fade-in stagger, not energy conduction (conduits, rim pulses, layer enters)
- **Diegetic mix:** Workout ≈ diegetic; Settings/Stats ≈ form admin; mixed header patterns
- **QA gap:** source-scan tests enforced flatness; acceptance doc checked timing/mobile, not material tier or cinematic bar
- **Screenshot backlog:** duplicate daily habit row on HQ; debug metadata on Stats; prototype chrome; Armory dead corners; Ceremonies void; Settings bracket vs HQ chamfer; Stats/HQ radar parity break

**Score framing:** Cohesive dark sports app (~3.2–3.8/5) — yes. Cinematic operative OS (~2–2.5/5 against Tron/AAA bar) — no.

**Next:** Premium track **2.16–2.19** — constitution in [`docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md`](docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md).

---

## Sprint 2.16 scope — Layout & alignment constitution — **Done**

**Goal:** One layout grammar across all player routes before material work (2.17–2.18).

**Delivered:**

- **Layout constitution:** `--pd-content-max` (`min(100%, 90rem)`) + `.pd-content-wrap` — `player-dossier.css`; subsection in `PLAYER_OS_MATERIAL_SPATIAL.md`
- **Route pass:** HQ `pd-content-wrap` wraps `HUDContainer` (fixed in 2.16a — was incorrectly nested inside grid); Stats, Workout, Tracker, Skill Tree, Settings (player); Armory inner tabs (full-bleed QM workspace preserved)
- **Header grammar:** HQ `pd-strap`; secondary routes `PlayerOsPageStrap`; Stats player strap
- **HQ composition:** `excludeHeroFromRailQuests` wired for embedded rail; hub identity/metrics fill balance (1280px + 390px)
- **Stats/HQ radar frame parity:** player Stats uses `VanguardProtocolPanel` (`vpp-root--premium`); debug `RDR_S6` / `radarTag` / `SRC=PLAYER_STATS` gated off player path
- **Debug chrome policy:** `ReportAnomaly` hidden when `authStore.role === 'player'`
- **Settings diegetic CTAs:** chamfer `clip-path` on player settings buttons (2.16.1 — `/player/settings`); legacy `/settings` terminal unchanged for coach/parent/director
- **Empty states:** `OperativeCeremoniesPanel` compact + CTA; Armory insufficient TC → links to HQ / workout
- **Mobile 390px:** strap/context wrap, hub/analytics spacing, mission rail padding, route overflow guards
- **Tests:** `playerHudSprint216.test.ts`, `activeBounties.test.ts` hero dedupe guard

**Visual acceptance states:** profile incomplete · no telemetry · full telemetry · mobile 390px

**Manual QA nits (defer to 2.17 material):** void ratio, Z-layer reads, bloom parity. HQ desktop grid collapse — fixed 2.16a.

**Files:** `player-dossier.css`, `player-dashboard-hud.css`, `ActiveBounties.svelte`, `dashboard/+page.svelte`, `stats/+page.svelte`, `settings/+page.svelte`, `workout/+page.svelte`, `tracker/+page.svelte`, `skill-tree/+page.svelte`, `armory/+page.svelte`, `OperativeCeremoniesPanel.svelte`, `+layout.svelte`, `playerHudSprint216.test.ts`, `activeBounties.test.ts`, `PLAYER_OS_MATERIAL_SPATIAL.md`, `ROADMAP.md`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint216.test.ts src/lib/player/dashboard/__tests__/activeBounties.test.ts
npm run check:file-budget && npm run check && npm run build
```

**Out of scope:** Z0–Z4 tokens, bloom, glass wells, spatial grid restoration, energy conduit motion (2.17–2.19)

---

## Sprint 2.16a scope — HQ bento grid hotfix — **Done**

**Bug:** HQ (`/player/dashboard`) rendered as a narrow left column (~1/12 viewport) with a large black void on the right; strap rank text overlapped callsign.

**Root cause:** Sprint 2.16 placed `.pd-content-wrap` inside `HUDContainer`. `HUDContainer` is a `.bento-grid.bento-grid--12col` — only direct children with `bento-span-*` participate in the grid. The wrapper was the sole direct child without a span, so on desktop it occupied 1 column; nested `bento-span-12` on strap/hub/analytics was ignored.

**Fix (Option B):** Move `pd-content-wrap` outside `HUDContainer` so strap, hub wrapper, and analytics deck are direct grid children again. Single max-width source via `pd-content-wrap`; `HUDContainer` fills the wrap at 100% width (72rem cap neutralized when nested).

**Files touched:** `dashboard/+page.svelte`, `player-dossier.css`, `playerHudSprint216a.test.ts`, `playerHudSprint216.test.ts`, `ROADMAP.md`, `PLAYER_OS_MATERIAL_SPATIAL.md`

**Manual QA checklist:**

- Desktop ≥1280px: HQ strap, 8+4 OperativeHub, analytics deck span full content width — no 1-col left strip
- No rank/callsign text overlap on pd-strap at 1280px
- 390px: no horizontal scroll; hub stacks correctly
- Mission rail visible on desktop (4-col column present)

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint216a.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint216.test.ts
npm run check:file-budget && npm run check && npm run build
```

**Out of scope:** Settings cohesion (2.16.1 — Done), Z-depth tokens (2.17), material/bloom (2.18)

---

## Sprint 2.16.1 scope — Player Settings cohesion — **Done**

**Goal:** Player settings must feel like a Player OS route (same width, strap, panel grammar, tabs as Armory/Workout) — not the legacy 740px Vanguard Settings Terminal admin column.

**Delivered:**

- **Dedicated route:** `/player/settings` inside Player OS shell with `PlayerOsPageStrap` + `pd-content-wrap` (90rem max, no 740px cap)
- **PlayerSettingsPanel:** profile / notifications / danger tabs only; dossier `pd-panel-section` grammar; Armory Studio link for avatar (no inline `OperativeAvatarDesigner`)
- **Shared handlers:** `playerSettingsHandlers.ts` — `saveProfile`, notification prefs, password reset
- **Legacy redirect:** `/settings` → `/player/settings` for `role === 'player'`; coach/parent/director terminal unchanged
- **Nav updates:** `PlayerShell` rail + billing gate → `/player/settings`; `playerCommandCenterLinks.ts`
- **CSS:** `ps-settings-*` utilities in `player-dossier.css`
- **Tests:** `playerHudSprint2161.test.ts`

**Files:** `player/settings/+page.svelte`, `PlayerSettingsPanel.svelte`, `playerSettingsHandlers.ts`, `settings/+page.svelte`, `PlayerShell.svelte`, `playerCommandCenterLinks.ts`, `player-dossier.css`, `loginRouting.js`, `playerHudSprint2161.test.ts`, `ROADMAP.md`, `PLAYER_OS_MATERIAL_SPATIAL.md`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint2161.test.ts
npm run check:file-budget && npm run check && npm run build
```

**Out of scope:** Full diegetic control kit (2.19), Z-depth/bloom (2.17–2.18), coach/parent settings route split

---

## Sprint 2.17 scope — Z-depth & layering system — **Done**

**Goal:** Replace single-plane panels with explicit Z-stack.

**Delivered:**

- **Z-depth tokens:** `--pd-z0-canvas` through `--pd-z4-float-shadow`, `--pd-z-highlight-top`, `--pd-z-glow-br` — `player-dossier.css`
- **Utility classes:** `.pd-z1-recessed`, `.pd-z2-panel`, `.pd-z3-raised`, `.pd-z4-float` — scoped under `.player-dossier-root`
- **Z2 migration:** `pd-surface-premium`, `pd-page-panel` compose `--pd-z2-panel-shadow`
- **HQ layering:** strap Z4, hub Z2, identity stage Z1 well, mission hero Z3, analytics deck Z2 + radar Z1 — `player-dashboard-hud.css`, `player-missions.css`
- **IBM regression fix:** stage recessed well; `ibm-root--premium` transparent on top
- **Secondary routes:** `pd-route-strap` Z4, `pd-empty-state` Z1, settings inputs/info wells Z1, workout sections Z1
- **Shell:** `ps-ambient` = Z0 comment; dossier vignette opacity bump; rail active Z4 float — `player-shell.css`
- **Tests:** `playerHudSprint217.test.ts`; `playerHudSprint2121.test.ts` identity stage guard updated

**Manual QA:** ≥3 distinct Z-layers visible on HQ at rest (canvas Z0, identity well Z1, hub/deck Z2, hero Z3, strap Z4). Nits defer to 2.18 (bloom, spatial grid).

**Files:** `player-dossier.css`, `player-dashboard-hud.css`, `player-missions.css`, `player-shell.css`, `playerHudSprint217.test.ts`, `playerHudSprint2121.test.ts`, `ROADMAP.md`, `docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md`, `docs/PLAYER_OS_VISUAL_ACCEPTANCE.md`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint217.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint2121.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint216a.test.ts
npm run check:file-budget
npm run check
npm run build
```

**Out of scope:** Epic 3.4/4.1; bloom SVG, spatial grid, glass expansion (2.18)

---

## Sprint 2.18 scope — Material orchestration (Tier A → HQ) — **Done**

**Goal:** HQ and secondary routes inherit cinematic material from existing premium components — light-in-space, not shadow-only Z-layers.

**Delivered:**

- **Shared SVG bloom:** `pdDataBloom` filter in `VanguardVFX.svelte`; `AttributeRadar.svelte` applies `url(#pdDataBloom)` to polygon, vertices, zero-track — Stats/HQ parity via single component
- **Emissive edges:** `--pd-emissive-teal`, `--pd-emissive-gold`, `--pd-edge-teal/gold` tokens; quest hero gold rim, strap/route teal hairline, hub teal border, rank bar + avatar ring glow, mission row hover, rail active rim
- **Spatial canvas:** dossier ambient grid opacity 0.40, teal glow restored on `ps-ambient__glow--a`; Z0 persists all player routes
- **Canvas scanlines:** `ps-ambient::after` repeating-linear-gradient on atmosphere layer only — not on mission text
- **Glass wells (Z1):** `vpp-chart--premium` + selected inspector subtle backdrop-filter; hub shell stays matte
- **Void ratio:** Z2 panel gradient mid-stop darkened ~3% toward black; vignette exposes Z0 at viewport edges
- **Armory:** QM card hover emissive teal edge; active tab emissive underline (Settings tabs match)
- **Tests:** `playerHudSprint218.test.ts`

**Manual QA nits (log during review):** holographic radar at 1280/390, void ratio at edges, scanlines subtle on canvas not text, prefers-reduced-motion ambient float off

**Files:** `VanguardVFX.svelte`, `AttributeRadar.svelte`, `player-dashboard-hud.css`, `player-dossier.css`, `player-missions.css`, `player-shell.css`, `playerHudSprint218.test.ts`, `ROADMAP.md`, `docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md`, `docs/PLAYER_OS_VISUAL_ACCEPTANCE.md`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint218.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint217.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint216a.test.ts
npm run check:file-budget
npm run check
npm run build
```

**Out of scope:** Epic 3.4/4.1; diegetic kit (2.19); WebGL/shader pass

---

## Sprint 2.19 scope — Diegetic UI kit + energy motion + gate lift — **Done**

**Goal:** Close premium track; re-open Epic 3.4 / 4.1.

**Diegetic kit:** toggles, tabs, inputs matching Workout terminal / VanguardCard grammar (not generic forms)

**Energy motion:** progress as conduits; layer-enter motion (strap→hub→deck) replaces flat fade-only stagger

**Hero identity scale rules:** minimum HQ identity footprint; operative as projection not chip

**Route transition:** one-world continuity — shared canvas layers persist across player nav

**Update visual acceptance sign-off;** all checklist rows pass at 1280 + 390

**Sensory note:** optional UI audio/haptics documented as future Epic 1.x — out of scope for 2.19 impl

**Tests:** `playerHudSprint219.test.ts`

**Gate lift:** Epic 3.4+ **unblocked** after 2.19 Done + full [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](docs/PLAYER_OS_VISUAL_ACCEPTANCE.md) sign-off. Epic **4.1+ unblocked** at launch — launch accepts `defaultPortraitV2` SVG + profile initials on holo; **3.5m-gate** human portrait VA **deferred post-launch**. **Sign-off against [`PLAYER_OS_FOUNDATION.md`](docs/vision/PLAYER_OS_FOUNDATION.md) reference matrix required before launch** even though Player OS gate is open from 2.19.

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint219.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint218.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint217.test.ts
npm run check:file-budget
npm run check
npm run build
```

---

## Sprint 2.20 scope — Premium foundation lock & composition hotfix — **Done**

**Goal:** Lock canonical material vocabulary from Tier A reference components; eliminate nested-scroll anti-pattern; lift Tier B surfaces to Tier A primitives; fix the 14 composition bugs flagged in design review; automate FOUNDATION §3 void contract pixel sample.

**Proof:** `playerHudSprint220.test.ts` (2.20a–e) · `src/lib/player/visual/voidContract.ts` · [`g10-hq-void-1280x900.png`](docs/vision/va-screenshots/g10-hq-void-1280x900.png) · [`g10-manifest.json`](docs/vision/va-screenshots/g10-manifest.json) (`voidContract: true`)

**Note:** Phase 6 slice **6i** (void contract measurement) absorbed by G10 reference matrix + Sprint 2.20e automated pixel sample.

**Delivered slices:**

| Slice | Summary | Proof |
|-------|---------|-------|
| **2.20a** | One native document scroll — `ps-root` overflow visible | `playerHudSprint220.test.ts` |
| **2.20b** | VPP Z1 well — no `::before`/`::after` double-border around `pdDataBloom` | `playerHudSprint220.test.ts` |
| **2.20c** | HQ / Stats / Train composition hotfix | `playerHudSprint220.test.ts` |
| **2.20d** | Armory composition | `playerHudSprint220.test.ts` |
| **2.20e** | Void contract pixel sample on G10 HQ MCP capture at 1280×900 | `playerHudSprint220.test.ts` · `voidContract.ts` |

**Scope (≤ 5 implementation files + tests):**

- `src/lib/styles/player-shell.css`
- `src/lib/styles/player-dossier.css`
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/components/player/dashboard/OperativeHub.svelte`
- `src/lib/components/player/dashboard/VanguardProtocolPanel.svelte`
- Extend `src/lib/components/player/dashboard/__tests__/playerHudSprint220.test.ts` (2.20a–e)

**Docs:** [`docs/vision/PLAYER_OS_FOUNDATION.md`](docs/vision/PLAYER_OS_FOUNDATION.md), [`docs/PLAYER_OS_VISUAL_ACCEPTANCE.md`](docs/PLAYER_OS_VISUAL_ACCEPTANCE.md), [`docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md`](docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md), `ROADMAP.md`, `.cursor/rules/sst-agent-workflow.mdc`

**Acceptance:**

- Reference matrix passes at **1280px** + **390px** (all seven routes) per Foundation §10 — G10 MCP sign-off
- Void contract automated pixel-sample test green (`2.20e` on `g10-hq-void-1280x900.png`)
- No `overflow: auto` on `ps-root` / `ps-scroll-shell`
- VPP radar shows **single Z1 inset** only (no double-border / `::before` / `::after` stack around `pdDataBloom`)

**Out of scope:** Heavy atmosphere pass — deferred to **2.21** revisit only if future captures fail void sample after UI changes

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint220.test.ts
npm run check:file-budget
npm run check
npm run build
```

---

## Sprint 2.21 scope — Atmosphere amplification (conditional) — **Done (via 2.22 slice 5)**

**Goal:** Raise void/light ratios on Player OS shell and panels when Sprint 2.20 pixel samples fail void contract thresholds — atmosphere-only pass (ambient grid/glow/vignette/scanline opacity, panel fill reduction).

**Superseded:** Atmosphere bump shipped in **Sprint 2.22 slice 5** (`playerHudSprint226.test.ts`). Do **not** re-run atmosphere-only pass.

---

## Sprint 2.22 — HQ utility & consolidation — **Done**

**Goal:** Consolidate HQ layout, scroll, pathway, missions, stats, Armory deck, and atmosphere tokens into a cohesive command deck before Tier A material lift (Phase 6).

**Delivered slices:**

| Slice | Summary | Proof |
|-------|---------|-------|
| **3** | Quick Ops deck (`OperativeQuickOps`) | `playerHudSprint222.test.ts` |
| **4b–4c** | Pathway consolidation on HQ only; native document scroll | `playerHudSprint223.test.ts`, visual 4b/4c |
| **4d–4d-fix-b** | Dual hero missions, identity layout, typography | `playerHudSprint224.test.ts` |
| **4e** | Stats chart + workout focus | `playerHudSprint225.test.ts` |
| **4f** | Armory command deck | `armoryCommandDeck.test.ts` |
| **5** | Atmosphere / void tokens (Z0 canvas + Z2 fill) — supersedes conditional 2.21 atmosphere bump | `playerHudSprint226.test.ts` |

**Verify (regression bundle):**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint222.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint223.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint224.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint225.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint226.test.ts
npm run check
npm run build
```

---

## Sprint 2.22 Phase 6 — Material lift (Tier A orchestration)

**Goal:** Lift Tier B HQ surfaces to Tier A material primitives — holographic identity, mission chrome, analytics deck, and route parity — without nested matte frames or inner scroll regressions.

> Slice **6d** stat icon chips are **superseded by 6f-c** for embedded HQ identity (bezel telemetry on `HologramCardShell`).

**Remaining Tier B debt:** Quick Ops tiles, mission rail shell, Train/Armory/Stats/Settings `pd-page-panel` slabs, and VPP inspector chrome still read flat despite Tier A islands. **6f-b** fixes HQ typography + inspector density; **6j** addresses panel depth site-wide.

**Planned slices:**

| Slice | Scope | Status |
|-------|-------|--------|
| **6a** | HQ identity hologram artifact (`HologramCardShell` + operative portrait) | **Done** |
| **6b** | Mission theater — one gold hero + compact secondary + hub edge frame | **Superseded by 6b-revise** |
| **6b-revise** | HQ mission rail — scannable rail rows only (no hero cards) + coach gold accent | **Done** |
| **6c** | Analytics void island — VPP + capsules float in void (no matte deck slab) | **Done** |
| **6d** | Train mission hero + Quick Ops contrast + identity stat badges | **Done** |
| **6e** | Pathway timeline Tier A edge treatment | **Done** |
| **6f** | Armory Studio full dossier in `HologramCardShell` | **Done** |
| **6f-b** | HQ header ladder + VPP empty inspector whisper | **Done** |
| **6f-c** | HQ identity telemetry bezel — interactive streak/XP on hologram card (replaces stat chips) | **Done** |
| **6g** | Stats investigation workspace parity | **Done** |
| **6h** | Train / Tracker terminal chrome pass | **Done** |
| **6j** | Player OS Z2 depth + edge-lit interactivity pass | **Done** |
| **6j-a** | HQ panel depth — Quick Ops, OperativeHub, mission rail, capsules ghost | **Done** |
| **6j-b** | Routes pd-os-deck depth — Train, Tracker, Armory, Settings | **Done** |
| **6k** | Coach mission HQ → Train handoff hardening | **Done** |
| **6l** | Stats investigation workspace depth (plan → build) | **Done** (absorbed by Wave C) |
| **6i** | Reference matrix sign-off + void contract re-measure | Planned |

**Current:** **Wave C Done** — Stats investigation workspace + Tracker archive hierarchy (`playerHudSprint243.test.ts`). **6i** sign-off after Wave F.

---

## Sprint 2.22 slice 6f scope — Armory Studio dossier hologram — **Done**

**Goal:** Wrap the **Dossier Card Preview** in Armory Studio with `HologramCardShell` so the operative card reads as a **Tier A Z3 collectible** — same material language as HQ identity (6a), at full Studio scale.

**Delivered:**

- **`HologramCardShell`** wraps `OperativeIdCardFrame` in `OperativeLoadoutStudio` (full Studio scale; teal `--pd-accent-data` holo accent)
- **Void-friendly dossier row** — demote matte `ols-dossier-panel` slab; holo shell carries visual weight
- **Portrait + workshop panels** unchanged
- **Tests:** `playerHudSprint232.test.ts`
- **Visual acceptance:** `docs/visual-acceptance/sprint-2.22-slice-6f/`

**Pass criteria (1280px + 390px):**

- Dossier preview in **`HologramCardShell`** with tilt/foil/edge-glow on hover
- Outer panel **not** a competing grey matte box around holo shell
- Mobile — card centered, no overflow
- HQ regression unchanged

**Files (≤ 8):**

- `ROADMAP.md`
- `src/lib/components/player/OperativeLoadoutStudio.svelte`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint232.test.ts` *(new)*
- `e2e/player-armory-slice-6f.visual.spec.ts` *(new)*
- `docs/visual-acceptance/sprint-2.22-slice-6f/README.md` *(new)*

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint232.test.ts src/routes/(app)/player/armory/__tests__/armoryLoadoutStudio.test.ts
npm run check
npm run build
npx playwright test e2e/player-armory-slice-6f.visual.spec.ts
```

**Out of scope:** HQ identity telemetry bezel → slice **6f-c**; HQ header typography + VPP inspector whisper → slice **6f-b**; global panel depth → slice **6j** (planned). Stats route parity (6g), Quartermaster card edge treatment.

---

## Sprint 2.22 slice 6f-c scope — HQ identity telemetry bezel — **Done**

**Goal:** Move streak + XP off `HudStatCell` chips onto the **6a hologram card** as emissive, **interactive** bezel telemetry. Player taps streak/XP to act (workout / pathway / stats).

**Pass criteria (1280px + 390px):**

- No separate flame/zap stat chip row under holo card in embedded HQ mode
- Streak visible on card bezel (amber emissive; at-risk state when streak active + not trained)
- XP visible as conduit/meter on card (ties to rank/XP progress)
- Tap/click targets ≥44px; keyboard focus-visible
- Hover/tap feedback on card bezel (not whole dashboard)
- Train page `HudStatCell` unchanged (non-embedded)

**Files (≤ 8, implementation session):**

- `HologramCardShell.svelte` and/or new `IdentityTelemetryBezel.svelte`
- `IdentityBentoModule.svelte`
- `player-dashboard-hud.css`
- `playerHudSprint235.test.ts` *(new)*
- `e2e/player-hq-slice-6f-c.visual.spec.ts`
- `docs/visual-acceptance/sprint-2.22-slice-6f-c/README.md`

**Verify (implementation session):**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint235.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint227.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint230.test.ts
npm run check
npm run build
npx playwright test e2e/player-hq-slice-6f-c.visual.spec.ts
```

**Out of scope:** Bauhaus/character art (Epic 3.5), VPP/header (6f-b), Armory Studio sliders (3.5c).

**Run after:** 6f Done. **Run before:** 6f-b.

---

## Sprint 2.22 slice 6f-b scope — HQ header ladder + VPP inspector whisper — **Done**

**Goal:** Fix HQ hierarchy and analytics sidebar density without changing void architecture from 6c.

**Problems addressed:**
- Section titles compete with route strap (`TELEMETRY` too large vs Quick ops / Pathway)
- Duplicate/conflicting `.oqo-deck__title` rules in `player-dashboard-hud.css`
- "Awaiting coach telemetry" inspector box too tall/wide beside radar — reads as second panel

**Pass criteria (1280px + 390px):**

| Check | Pass |
|-------|------|
| **L1** | Only `.pd-strap__title` reads as route hero (~1.15–1.25rem display) |
| **L2** | Section titles unified (~0.82–0.92rem): Quick ops, Pathway, TELEMETRY, capsules, mission rail |
| **L3** | Eyebrows whisper (~0.55–0.62rem muted mono) |
| **VPP empty** | Inspector whisper ≤ ~64px tall; radar remains hero; vector-select still expands inspector |

**Header ladder tokens (add to CSS in implementation slice):**
- `--pd-hud-title-l1`, `--pd-hud-title-l2`, `--pd-hud-eyebrow-l3` on `.player-hud-root`

**Files (≤ 8, implementation session):**
- `ROADMAP.md` (Step 0 — this session)
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/components/player/dashboard/VanguardProtocolPanel.svelte` *(minimal — only if CSS insufficient)*
- `src/lib/components/player/dashboard/__tests__/playerHudSprint233.test.ts` *(new)*
- `e2e/player-hq-slice-6f-b.visual.spec.ts` *(new)*
- `docs/visual-acceptance/sprint-2.22-slice-6f-b/README.md` *(new)*

**Verify (implementation session):**
```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint233.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint229.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint224.test.ts
npm run check
npm run build
npx playwright test e2e/player-hq-slice-6f-b.visual.spec.ts
```

**Out of scope:** HQ identity telemetry bezel → slice **6f-c**; Armory Studio (6f), Stats (6g), global panel depth (6j), pathway/missions/analytics void structure, atmosphere-only opacity tweaks.

**Run after:** 6f-c Done. **Run before:** 6g (Stats).

---

## Sprint 2.22 slice 6g scope — Stats investigation workspace parity — **Done**

**Goal:** Lift `/stats` (player role) to match HQ analytics void + Foundation investigation workspace — VPP radar/inspector floats in void (no matte box-in-box), workout chart as full-width timeline band below, shared VPP material tokens with HQ.

**Root cause:** Stats player route uses `player-dossier-root` only — NOT `player-hud-root`. HQ VPP premium CSS is gated under `.player-hud-root` and does not apply on Stats. VPP sits inside `dossier-panel pd-page-panel` — matte Z2 slab around Tier A radar.

**Pass criteria (1280px + 390px):**

| Check | Pass |
|-------|------|
| VPP void | No grey slab around VPP; inspector whisper when empty (6f-b parity) |
| Workout band | Full-width Z1 well chart band below VPP |
| Coach path | Unchanged (no `player-hud-root`, Chart.js radar) |
| HQ regression | Analytics void unchanged |

**Files (≤ 8):**

- `ROADMAP.md`
- `src/routes/(app)/stats/+page.svelte`
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint236.test.ts` *(new)*
- `e2e/player-stats-slice-6g.visual.spec.ts` *(new)*
- `docs/visual-acceptance/sprint-2.22-slice-6g/README.md` *(new)*

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint236.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint225.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint220.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint216.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint233.test.ts
npm run check
npm run build
npx playwright test e2e/player-stats-slice-6g.visual.spec.ts
```

**Out of scope:** HQ changes, Chart.js → SVG migration, achievement matrix redesign, 6j global panel depth (6j-a HQ batch separate), Epic 3.5 character studio.

**Note:** **6j-c Stats** panel depth deferred/merged into **6g** where overlap — do not duplicate in **6j**.

**Run after:** 6f-b Done, 6f-c Done. **Run before:** 6h.

---

## Sprint 2.22 slice 6h scope — Train / Tracker terminal chrome — **Done**

**Goal:** Bring `/player/workout` and `/player/tracker` to Foundation **diegetic terminal** bar — execution column gets ProvingGrounds-style corner brackets + scanline + state copy; threat column reads as tail-log playbook; Tracker gets Tier A capsule + stat-row parity. **Material/chrome only** — no logic, no Chart.js, no 6j global depth batch.

**Root cause:** Train exec terminal is matte `pd-page-panel` slab with no corner brackets, scanline, or terminal state copy; local `.pw-title` ~1.125rem fights strap L1 hierarchy. Tracker stat row + ghost state are flat matte slabs; capsule lacks `dossierMode`.

**Pass criteria (1280px + 390px):**

| Check | Pass |
|-------|------|
| Train exec | Corner brackets + scanline + state copy; **no grey matte box** around terminal |
| Train threat | Tail-log column with left teal rail; no inner scroll trap |
| Tracker capsule | `dossierMode` premium capsule arena (Tier A frame) |
| Tracker ghost | Compact whisper empty state (not large matte panel) |
| Stats regression | 6g void unchanged |

**Files (≤ 8):**

- `ROADMAP.md`
- `src/lib/styles/player-terminal.css` *(new)*
- `src/lib/styles/player-dashboard-hud.css`
- `src/routes/(app)/player/workout/+page.svelte`
- `src/routes/(app)/player/tracker/+page.svelte`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint237.test.ts` *(new)*
- `e2e/player-train-tracker-slice-6h.visual.spec.ts` *(new)*
- `docs/visual-acceptance/sprint-2.22-slice-6h/README.md` *(new)*

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint237.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint230.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint220.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint225.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint235.test.ts src/routes/(app)/player/workout/__tests__/workout.layout.test.ts
npm run check
npm run build
npx playwright test e2e/player-train-tracker-slice-6h.visual.spec.ts
```

**Out of scope:** HQ dashboard, Stats (6g), Armory, Settings, Skill Tree, Epic 3.5, Coach OS routes, `ProvingGrounds.svelte` drill catalogue/logic, global 6j edge-lit panel pass.

**Run after:** 6g Done. **Run before:** 6j-a.

---

## Sprint 2.22 slice 6j-a scope — HQ Z2 depth + edge-lit interactivity — **Done**

**Goal:** Reduce flat matte-panel dominance on HQ command deck surfaces — Quick Ops deck, OperativeHub shell, mission rail panel, capsules ghost strip. Promote **pd-os-deck** raised plates (fill + cast shadow; emissive glow hover-only). **HQ only** — batch 1 of 6j.

**Root cause:**

| Surface | Problem |
|---------|---------|
| Quick Ops | Deck wrapper still `pd-page-panel` — grey Z2 slab around 6d gold tiles = box-in-box |
| OperativeHub | Shell radial fill still reads ~35% matte |
| Mission rail | `.quest-log-panel--premium` solid fill + idle rows lack edge-lit default |
| Capsules strip | `lobby-capsule-ghost-card` empty state is flat compact panel |

**Pass criteria (1280px + 390px):**

| Check | Pass |
|-------|------|
| Quick Ops | No outer grey slab; tiles edge-lit; icon badges visible |
| OperativeHub | Void-forward shell; mission column separator preserved |
| Mission rail | Edge-lit panel; idle rows visible without hover; promoted gold focal |
| Capsules ghost | Edge-lit whisper under analytics void |
| Regressions | 6c analytics void, 6e pathway, 6a/6f-c hologram unchanged |

**Files (≤ 8):**

- `ROADMAP.md`
- `src/lib/components/player/dashboard/OperativeQuickOps.svelte`
- `src/lib/components/player/dashboard/OperativeHub.svelte`
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/styles/player-missions.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint234.test.ts` *(new)*
- `e2e/player-hq-slice-6j-a.visual.spec.ts` *(new)*
- `docs/visual-acceptance/sprint-2.22-slice-6j-a/README.md` *(new)*

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint234.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint230.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint228.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint229.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint231.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint233.test.ts
npm run check
npm run build
npx playwright test e2e/player-hq-slice-6j-a.visual.spec.ts
```

**Out of scope:** Train/Tracker/Armory/Settings routes → **6j-b**; analytics void (6c), pathway (6e), hologram bezel (6a/6f-c), VPP internals, atmosphere-only opacity bumps.

**Run after:** 6h Done. **Run before:** 6j-b.

---

## Sprint 2.22 slice 6j-b scope — Routes pd-os-deck depth (6j-a parity) — **Done**

**Goal:** Apply the **same page-level Z-stack** established in **6j-a** to secondary Player OS routes: Train, Armory (player tabs — not Studio holo), Tracker, Settings (player). Each route reads as **stacked deck plates** (Z2 raise → Z1 recess → Z3 focal), not flat matte slabs or teal hairlines on black.

**Follow-on (not 6j-b):** Coach mission HQ → Train handoff shipped in **6k** (armed banner, drill preview on HQ, session handoff). Train no longer duplicates coach intent sidebar.

**Reuse (not original hairline 6j spec):** `pd-os-deck` kit in `player-dossier.css` — translatable, no pseudo glow stacks on deck root; mission-rail flush children; Quick Ops row physics for quest/QM cards; terminal chrome (`pg-bracket` / `pg-scanline`) **Train exec terminal only**.

**Pass criteria (1280px + 390px):**

| Route | Pass |
|-------|------|
| Train | Single `pw-theater pd-os-deck--hero`; exec keeps `pg-terminal-chrome`; full-width logger (coach intents on HQ only) |
| Tracker | Stat band + capsule hero deck + ghost in `pd-os-deck__well` |
| Armory | QM cards `qa-card pd-os-deck`; tab panels `pd-os-deck` (not Studio holo) |
| Settings | Player panels `ps-settings-panel pd-os-deck`; `pd-route-stack` rhythm |
| HQ regression | 6j-a depth unchanged |

**Files:**

- `ROADMAP.md`
- `src/lib/styles/player-dossier.css` — route stack + train theater + QM card deck rules
- `src/lib/styles/player-dashboard-hud.css` — Tracker ghost well + theater terminal hook
- `src/routes/(app)/player/workout/+page.svelte`
- `src/routes/(app)/player/tracker/+page.svelte`
- `src/routes/(app)/player/armory/+page.svelte`
- `src/lib/components/player/PlayerSettingsPanel.svelte`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint238.test.ts`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint239.test.ts` *(handoff)*

**Visual acceptance:** `docs/visual-acceptance/sprint-2.22-slice-6j-b/` + `e2e/player-routes-slice-6j-b.visual.spec.ts`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint238.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint239.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint234.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint237.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint230.test.ts
npm run build
```

**Out of scope:** HQ (6j-a locked), Stats (**6l**), Studio `HologramCardShell`, Skill Tree, Coach OS, 6i sign-off.

**Run after:** 6j-a Done. **Run before:** 6k (handoff), then 6l.

---

## Sprint 2.22 slice 6k scope — Coach mission HQ → Train handoff hardening — **Done**

**Goal:** Close the coach assignment loop without re-cluttering Train. HQ owns discovery + drill preview; Train owns execution; lifecycle completes **after** log, not on navigation.

**Shipped:**

| Layer | Behavior |
|-------|----------|
| HQ `ActiveBounties` | Drill preview line on coach intents; **Start session →** stashes `player_mission_handoff_v1` |
| Train | Reads handoff; armed mission banner; pre-filled focus/drill/duration/RPE; HQ link when unarmed |
| Lifecycle | `shouldDeferQuestCompletionUntilWorkoutLog` — no premature Claim before log |
| Homework | `logTrainingSession({ assignmentId })` closes `assignments/{id}` server-side |
| Intents | Epic 8 fulfillment via `xpByAttribute` trigger (no bogus `assigned_missions` write) |
| Stale guard | 24h handoff TTL; drop armed state if intent cancelled |

**Files:**

- `src/lib/player/workout/coachMissionFlow.ts` *(new)*
- `src/lib/player/dashboard/activeBounties.ts`
- `src/lib/components/hud/ActiveBounties.svelte`
- `src/lib/player/workoutLog.ts`
- `src/routes/(app)/player/workout/+page.svelte`
- `src/lib/styles/player-dashboard-hud.css`, `player-missions.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint239.test.ts`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint240.test.ts` *(new)*

**Verify:**

```bash
npm test -- src/lib/player/workout/__tests__/coachMissionFlow.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint239.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint240.test.ts
npm run build
```

**Train logger — remaining optional polish (not blocking):**

- ~~Replace hardcoded `drillsByFocus` chips with `global_drills` catalog picker~~ → shipped **LAUNCH-drill-library** (team + club picker on Intent Engine; platform basics copy-to-team on `/coach/drills`)
- Coach-directed session lock on Train shipped **LAUNCH-train-lock** (notes-only edit; prescription read-only)
- Single-click **Accept + Start session** on HQ if playtest shows two taps is friction
- Mount tactical SVG preview from `AdaptiveHomework` logic on HQ cards only (no third surface)
- **LAUNCH-club-drill-promote** — director promote team drill → club shared library (coach recommendation inbox)

**Run after:** 6j-b Done. **Run before:** 6l.

---

## Sprint 2.22 slice 6l scope — Stats investigation workspace (plan of attack) — **Done (Wave C)**

*Superseded for execution order by Player OS rubric redesign Wave C (6l). Scope retained as reference; build proof: `playerHudSprint243.test.ts`.*

**Problem statement:** Player Stats still reads **flat / admin-form** vs HQ and Train after 6g functional parity. User deferred Stats depth during Train cleanup; **6g merged panel CSS** but did not achieve cinematic **investigation workspace** feel.

**North star:** Stats = **telemetry investigation deck** in the Player OS void — same material language as HQ analytics void (6c) + Train terminal readability, not a separate admin dashboard.

**Do not duplicate:** 6g chart resize guards, `VanguardProtocolPanel` wiring, player role gating, debug chrome removal.

### Phase A — Audit (1 session, read-only)

1. Capture 1280 + 390 PNGs: HQ analytics void vs Stats route side-by-side
2. List every `pd-page-panel` / matte slab still on Stats player path
3. Confirm `player-dossier-root` vs `player-hud-root` gating (6g root cause doc)
4. Map scroll model — native document scroll only (Foundation §4)

### Phase B — Composition (build slice 6l-a)

| Zone | Target treatment |
|------|------------------|
| Strap | `PlayerOsPageStrap` + inline context (match HQ grammar) |
| VPP radar deck | Recessed `pd-os-deck--recessed` void; bloom polygon unchanged |
| Workout telemetry band | Hero `pd-os-deck--hero`; chart in `pd-os-deck__well` (6g height guards kept) |
| Achievement / matrix rows | Edge-lit Z2 rows, not grey config boxes |
| Capsules strip | Match HQ `player-capsules-strip--void` recession |

**Files (estimate ≤ 8):** `stats/+page.svelte`, `player-dossier.css`, `player-dashboard-hud.css`, `playerHudSprint236.test.ts` extend, visual README + e2e clip.

### Phase C — Material parity (build slice 6l-b)

- Apply 6j idle/hover physics to Stats interactive chips (not stat-cell scale gimmicks)
- Inspector / whisper copy density match 6f-b VPP inspector
- Remove remaining debug metadata from player path if any regressed

### Phase D — Sign-off

- Extend `docs/PLAYER_OS_VISUAL_ACCEPTANCE.md` Stats row
- Run 6i reference matrix row for Stats after 6l-b

**Explicitly out of scope for 6l:** Chart.js → SVG migration, new gamification features, Coach OS Stats, Skill Tree.

**Run after:** 6k Done. **Run before:** 6i premium sign-off.

---

## Sprint 2.22 slice 6i scope — Reference matrix sign-off + void contract re-measure — **Planned**

*Superseded for execution order by Player OS rubric redesign Wave F (6i). Scope retained as reference.*

**Goal:** Screenshot sign-off at 1280px / 390px per [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](docs/PLAYER_OS_VISUAL_ACCEPTANCE.md); void contract re-measure (≥40% black canvas, ≤35% matte, ≥15% emissive per [`PLAYER_OS_FOUNDATION.md`](docs/vision/PLAYER_OS_FOUNDATION.md) §3).

**Run after:** Wave C (6l) build. **Absorbed by:** Player OS rubric redesign Wave F.

---

## Sprint 2.22 slice 6j scope — Player OS Z2 depth + edge-lit interactivity — **Done**

**Goal:** Reduce flat matte-panel dominance across Player OS routes. Promote **edge-lit Z2** surfaces (top highlight + teal/gold hairline + reduced fill opacity) and **light interactivity** (hover border brighten, focus-visible, subtle translate — gated by `prefers-reduced-motion` and `data-dopamine="off"`). Align with `PLAYER_OS_FOUNDATION.md` §2 — void > emissive edges > glass > matte fill.

**Not in scope for 6j:** New features, Coach OS routes, atmosphere opacity-only passes, nested box-in-box around bloom filters.

**Target surfaces (batch order — one implementation session per batch max):**

| Batch | Surfaces | Primary files |
|-------|----------|---------------|
| **6j-a HQ** | Quick Ops tiles, OperativeHub frame polish, mission rail panel, capsules strip | `player-dashboard-hud.css`, `player-missions.css`, `OperativeQuickOps.svelte` | **Done** |
| **6j-b Routes** | Train `pw-theater`, Armory `qa-card` / tab panels (not Studio holo), Tracker, Settings | `player-dossier.css`, route pages, proving grounds CSS | **Done** |
| **6j-c Stats** | Stats investigation panels (**merged into 6g** — do not duplicate) | `stats/+page.svelte`, dossier CSS |

**Material rules (lock):**
- Replace solid `#05050a` panel fills with `--pd-depth-panel-gradient` at **lower opacity** or transparent center + edge-only frame where void allows
- One emissive edge treatment per panel (`--pd-edge-teal` or gold for action surfaces)
- Interactive tiles: hover `border-color` + `box-shadow` lift; **no** scale-110 on stat cells
- Max **two** decorative layers per surface (Foundation §2 lock)
- Preserve 6c void / 6e pathway / 6a hologram — do not re-matte those regions

**Pass criteria (visual, per batch):**
- Side-by-side vs pre-6j: panels read **edge-lit in void**, not grey config boxes
- At 1280px: matte fill ratio trend down (Foundation ≤35% target — qualitative OK for slice sign-off)
- Hover/focus visible on Quick Ops, mission rows, route panels
- 390px: no overflow; touch targets ≥44px

**Tests:** `playerHudSprint234.test.ts` (6j-a), extend per batch; visual PNGs under `docs/visual-acceptance/sprint-2.22-slice-6j-a/` etc.

**Run after:** 6f-b Done, 6g Done (or 6j-c merged into 6g if agent finds overlap). **Before:** 6i reference matrix sign-off.

**Explicit anti-pattern:** Do not ship another global opacity bump expecting premium feel (Slice 5 lesson).

---

## Sprint 2.22 slice 6e scope — HQ pathway timeline Tier A edge — **Done**

*(Shipped 2026-05-23 — see `docs/visual-acceptance/sprint-2.22-slice-6e/`.)*

**Goal:** Lift the **Mission rewards pathway** from a matte `pd-page-panel` slab to a **Tier A horizontal timeline** — emissive edge-lit nodes, gap connectors between tiers, Z1 reward icon wells, milestone gold accents. Pathway floats in void between Quick Ops and analytics void (6c).

**Delivered:**

- **`opp-preview--void`** — transparent shell; no matte Z2 slab
- **Gap-only tier connectors** — teal segments between nodes only (never through reward wells)
- **Chamfer edge-lit nodes** + Z1 reward wells + milestone gold ring accents
- **`hqTealCurrent`** ACTIVE glow preserved; scroll-to-current on load preserved
- **Header hierarchy** — title matches Quick Ops scale; `LV xx / 50` on compact mono meta line
- **Tests:** `playerHudSprint231.test.ts`; guards extended in `playerHudSprint223.test.ts`
- **Visual acceptance:** five PNGs in `docs/visual-acceptance/sprint-2.22-slice-6e/`

**Pass criteria (1280px + 390px):**

- Outer wrapper **not** a matte Z2 slab — `opp-preview--void` (transparent / edge-lit frame only)
- Horizontal **gap connectors** between cleared tiers — teal emissive segments (not a through-well rail)
- **Nodes:** chamfer/clip-path edge-lit treatment (not `rounded-xl` admin cards)
- **Reward icon:** Z1 inset well (`--pd-z1-well-bg`) inside each node
- **Current node (`ACTIVE`):** strongest teal emissive edge + glow (`hqTealCurrent`)
- **Milestone tiers** (5, 10, 25, 50 + trophy tiers): subtle **gold edge accent** on node ring
- Unlocked / locked states preserved; scroll-to-current on load preserved
- Compact mode (`opp-root--compact`) CSS preserved — HQ preview stays `compact={false}`

**Files (≤ 8):**

- `ROADMAP.md`
- `src/lib/components/player/dashboard/OperativePathwayPreview.svelte`
- `src/lib/components/player/OperativePathway.svelte`
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint231.test.ts` *(new)*
- `src/lib/components/player/dashboard/__tests__/playerHudSprint223.test.ts` *(update)*
- `e2e/player-hq-slice-6e.visual.spec.ts` *(new)*
- `docs/visual-acceptance/sprint-2.22-slice-6e/README.md` *(new)*

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint231.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint223.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint220.test.ts
npm run check
npm run build
npx playwright test e2e/player-hq-slice-6e.visual.spec.ts
```

**Out of scope:** ActiveBounties, HologramCardShell, IdentityBentoModule, OperativeHub, OperativeQuickOps, analytics void CSS, Train page, Armory routes, atmosphere/shell tokens, pathway expand/collapse UX, `scrollToCurrent` behavior changes, slice 6f Armory Studio hologram.

---

## Sprint 2.22 slice 6d scope — Train hero + HQ chrome — **Done**

*(Shipped 2026-05-23 — see `docs/visual-acceptance/sprint-2.22-slice-6d/`.)*

**Goal:** Three polish passes — medium mission briefing hero on Train execution theater, per-tile Quick Ops icon accent contrast on HQ, filled identity stat badges + ultrawide identity density fix.

**Pass criteria:**

- **Train:** `TrainMissionBrief` above execution terminal head — teal/gold briefing, no Accept CTA on hero
- **Quick Ops:** three distinct icon accent colors (`action` / `data` / `neutral`) — icon-led contrast, soft tile border
- **Identity:** streak + XP `HudStatCell` filled icon badges (`game.flame` / `game.zap`)
- **Ultrawide (1920px+):** identity stage metrics inline row; capped stage min-height — no warehouse dead space
- **Regression:** 6b mission rail + 6c analytics void unchanged

**Files (≤ 10):**

- `ROADMAP.md`
- `src/lib/components/player/workout/TrainMissionBrief.svelte` *(new)*
- `src/routes/(app)/player/workout/+page.svelte`
- `src/lib/styles/player-missions.css`
- `src/lib/components/player/dashboard/HudStatCell.svelte`
- `src/lib/components/player/dashboard/OperativeQuickOps.svelte`
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint230.test.ts` *(new)*
- `e2e/player-train-slice-6d.visual.spec.ts` *(new)*
- `e2e/player-hq-slice-6d-chrome.visual.spec.ts` *(new)*
- `docs/visual-acceptance/sprint-2.22-slice-6d/README.md` *(new)*

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint230.test.ts src/routes/(app)/player/workout/__tests__/workout.layout.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint229.test.ts
npm run check
npm run build
npx playwright test e2e/player-train-slice-6d.visual.spec.ts e2e/player-hq-slice-6d-chrome.visual.spec.ts
```

**Out of scope:** ActiveBounties embedded rail layout, HologramCardShell, analytics void CSS, OperativePathwayPreview, atmosphere/shell tokens, AttributeRadar SVG internals, ingest queue removal, execution terminal submit logic, slice 6e pathway.

---

## Sprint 2.22 slice 6a scope — HQ identity hologram artifact — **Done**

*(Shipped 2026-05-23 — see `docs/visual-acceptance/sprint-2.22-slice-6a/`.)*

---

## Sprint 2.22 slice 6c scope — HQ analytics void island — **Done**

*(Shipped 2026-05-23 — see `docs/visual-acceptance/sprint-2.22-slice-6c/`.)*

**Goal:** Remove the grey **analytics deck slab** on HQ. VPP radar + inspector float as **Z1 islands in void**; capsules strip is a **separate lightweight footer** — not one matte `bento-card` wrapper.

**Pass criteria (1280px + 390px):**

- **No** outer matte `bento-card pd-surface-premium` on the analytics region
- Wrapper: `player-analytics-void bento-span-12` — transparent, void shows through
- VPP = standalone region; `vpp-chart--premium` stays **Z1 inset well** (`--pd-z1-well-bg`)
- `vpp-head--premium` demoted in void context — transparent bg, no matte box
- Capsules ghost/arena = separate strip below — transparent + teal hairline divider only
- Compact mode (`!telemetryReady`) preserved — smaller radar, compact inspector ghost
- Void visible between pathway preview and telemetry band

**Files (≤ 8):**

- `ROADMAP.md` (Step 0)
- `src/routes/(app)/player/dashboard/+page.svelte`
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint229.test.ts` *(new)*
- `src/lib/components/player/dashboard/__tests__/playerHudSprint2121.test.ts` *(update)*
- `e2e/player-hq-slice-6c.visual.spec.ts` + `docs/visual-acceptance/sprint-2.22-slice-6c/README.md`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint229.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint220.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint2121.test.ts
npm run check
npm run build
npx playwright test e2e/player-hq-slice-6c.visual.spec.ts
```

**Out of scope:** ActiveBounties, HologramCardShell, IdentityBentoModule, OperativeHub, OperativeQuickOps, OperativePathwayPreview, Train page, atmosphere/shell tokens, AttributeRadar SVG internals, `handleQuestAction` logic, slice 6d Train hero briefing.

---

## Sprint 2.22 slice 6b-revise scope — HQ mission rail (overview, no hero cards) — **Done**

*(Shipped 2026-05-23 — see `docs/visual-acceptance/sprint-2.22-slice-6b-revise/`.)*

**Product decision:** HQ is **command overview** — scannable mission queue with brief context. **No hero cards** on the dashboard. Full/medium hero treatment moves to Train (slice 6d). Coach/parent bounties get **gold accent on the rail row**, not an oversized card.

**Goal:** Mission rail = **rail rows only** (up to 3 visible) — sender · title · reward line · CTA. Teal CTAs for daily habits; gold left border + gold CTA for bounties / coach / parent sources.

**Pass criteria (1280px):**

| Visible missions | Layout |
|------------------|--------|
| **1–3** | Rail rows only — no `quest-hero--premium` in embedded HQ mode |
| **Coach bounty** | Gold 3px left border + gold CTA on promoted row |

- Hub shell: transparent missions column + operative-hub edge-lit frame (6b hub CSS retained)
- Identity hologram (6a) unchanged

**Files (≤ 8):**

- `ROADMAP.md` (Step 0)
- `src/lib/components/hud/ActiveBounties.svelte`
- `src/lib/player/dashboard/activeBounties.ts`
- `src/lib/styles/player-missions.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint228.test.ts` *(update)*
- `src/lib/components/player/dashboard/__tests__/playerHudSprint224.test.ts` *(update)*
- `src/lib/components/player/dashboard/__tests__/playerHudSprint19.test.ts` *(update)*
- `e2e/player-hq-slice-6b-revise.visual.spec.ts` + `docs/visual-acceptance/sprint-2.22-slice-6b-revise/README.md`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint228.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint224.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint19.test.ts
npm run check
npm run build
npx playwright test e2e/player-hq-slice-6b-revise.visual.spec.ts
```

**Out of scope:** `HologramCardShell` (6a), analytics deck (6c), Train page (6d), Quick Ops, pathway, atmosphere, `handleQuestAction` logic, slice 6b hub edge frame CSS deletion.

---

## Sprint 2.22 slice 6b scope — HQ mission theater — **Superseded by 6b-revise**

**Goal:** Mission rail reads as **game mission select** — one dominant **gold** primary hero (Z3 focal) + secondary missions as **compact teal** cards or rail rows. `OperativeHub` reads as an **edge-lit frame in void**, not a grey box.

**Pass criteria (1280px):**

| Visible missions | Layout |
|------------------|--------|
| **1** | Single **gold** hero card (full `quest-hero--premium`) |
| **2** | **Gold** primary hero + **one compact teal** secondary (NOT second full hero) |
| **3** | **Gold** primary hero + **compact teal** secondary + **1 rail row** for third |

- Exactly **one** gold-accent mission CTA above the fold in the rail
- Hub shell: transparent center + teal edge border + subtle emissive hairline
- Identity hologram (6a) unchanged

**Files (≤ 8):**

- `ROADMAP.md` (Step 0)
- `src/lib/components/hud/ActiveBounties.svelte`
- `src/lib/player/dashboard/activeBounties.ts`
- `src/lib/styles/player-missions.css`
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint228.test.ts` *(new)*
- `src/lib/components/player/dashboard/__tests__/playerHudSprint224.test.ts` *(update)*
- `e2e/player-hq-slice-6b.visual.spec.ts` + `docs/visual-acceptance/sprint-2.22-slice-6b/README.md`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint228.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint224.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint227.test.ts
npm run check
npm run build
npx playwright test e2e/player-hq-slice-6b.visual.spec.ts
```

**Out of scope:** Identity / `HologramCardShell` (6a), analytics deck (6c), atmosphere tokens, pathway, Quick Ops, Armory, Train, Stats, `PlayerShell`, `handleQuestAction` logic.

---

## Sprint 2.22 slice 6a scope — HQ identity hologram artifact — **Done** *(archive)*

**Goal:** HQ identity reads as a Z3 holographic operative artifact — pointer tilt + foil + edge-glow + scanlines — not a widget in a grey inset well.

**Pass criteria:**

- Hologram card (~clamp 200–280px) left with operative portrait, display callsign on card face, rank whisper
- Rank progress bar + last trained + streak/XP stat cells preserved beside/below card
- Identity stage background **transparent** — void shows through
- Profile incomplete: silhouette/initials inside same hologram shell
- No raw `VanguardCard` / Scout's Six on HQ
- Visual acceptance PNGs at 1280 + 390

**Files (≤ 8):**

- `ROADMAP.md` (Step 0)
- `docs/vision/PLAYER_OS_FOUNDATION.md` (Step 0)
- `docs/PLAYER_OS_VISUAL_ACCEPTANCE.md` (Step 0)
- `src/lib/components/player/HologramCardShell.svelte` *(new)*
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte`
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint227.test.ts` *(new)*
- `e2e/player-hq-slice-6a.visual.spec.ts` + `docs/visual-acceptance/sprint-2.22-slice-6a/README.md`

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint227.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint224.test.ts src/lib/components/player/dashboard/__tests__/playerHudSprint226.test.ts
npm run check
npm run build
npx playwright test e2e/player-hq-slice-6a.visual.spec.ts
```

**Out of scope:** Missions (6b), analytics deck (6c), atmosphere tokens, pathway, Quick Ops, Armory, Train, Stats, PlayerShell scroll.

---

## Post-2.19 troubleshooting backlog

Log visual/UX issues observed during 2.16–2.18 QA here for a follow-up sprint. Do **not** expand gate-lift scope ad-hoc — triage after manual sign-off.

**Future Epic 1.x sensory lane (document only):** Optional UI audio cues (tab relay click, rank conduit fill) and haptic feedback on mobile — gated by `prefers-reduced-motion`, COPPA/minor-safe defaults, and `data-dopamine='off'`. Out of scope for 2.19; scope in a dedicated sprint if product prioritizes.

| Issue | Route | Severity | Sprint target |
|-------|-------|----------|---------------|
| | | | |

---

## Sprint status — Epic 3: Operative Loadout v2

> **Epic 3.4+ unblocked after Sprint 2.20 Done + G10 sign-off** — Phase 1 pipeline shipped (**3.5j Done**, **3.5h Done**, **3.5k Done** on cloud). **3.5m-docs-gemini Done** — owner Gemini art brief + Composer ingest playbook. **3.5m-art Superseded** (agent SVG redraw — human VA failed). **3.5l-gate** shipped — visual **rejected by product owner** (automated tests ≠ human VA). Card authority: [`docs/vision/OPERATIVE_ID_CARD.md`](docs/vision/OPERATIVE_ID_CARD.md). Portrait board: [`docs/vision/references/PORTRAIT_REFERENCE_BOARD.md`](docs/vision/references/PORTRAIT_REFERENCE_BOARD.md) · Gemini brief: [`docs/vision/GEMINI_ART_BRIEF.md`](docs/vision/GEMINI_ART_BRIEF.md) · images: [`REFERENCE_SOURCES.md`](docs/vision/references/REFERENCE_SOURCES.md).

| Sprint | Status | Summary | Proof |
|--------|--------|---------|-------|
| 3.0 | Done | Schema + renderer — loadout slots, Firestore shape, dossier-safe preview | `loadoutSchema.test.ts`, `playerLoadoutSprint30.test.ts` |
| 3.1 | Done | Armory studio — equip UX, ownedCosmetics grant, HQ ring + card wiring | `playerLoadoutSprint31.test.ts`, `playerHudSprint31.test.ts` |
| 3.1.1 | Done | HQ gold harmonization + portrait studio relocation to Armory Studio | `playerHudSprint311.test.ts`, `playerLoadoutSprint311.test.ts` |
| 3.1.2 | Done | Player OS hotfix — bento mobile spans, Studio/Album layout, mission CTA gold, init modal contrast, Armory nav gate | `playerHudSprint312.test.ts`, `armoryLoadoutStudio.test.ts` |
| 3.1.3 | Done | Recovery hotfix — `bento-span-5`, self-contained hero CTA, global init modal, Studio normalize, file-budget CI | `playerHudSprint313.test.ts`, `check-file-budget.test.ts` |
| 3.1.4 | Done | Armory 500 fix — break `armory.js` ↔ `loadoutSchema` circular import; lazy Studio; TrajectoryEngine guards | `armoryRouteGuards.test.ts`, `armoryLoadoutStudio.test.ts` |
| 3.2 | Done | Art pipeline — content-hashed cosmetics manifest, SVG assets, catalog ingestion | `playerLoadoutSprint32.test.ts`, `loadoutSchema.test.ts` |
| 3.3 | Done | Unlock ceremonies — server-verified drops, confetti gate, minor-safe copy | `playerLoadoutSprint33.test.ts`, `loadoutOps.test.js`, `dopamine.test.ts` |
| 3.4 | **Done** | Album set bonuses — `ownedSeasonOneCards`, `grantAlbumSetBonus`, Armory SET COMPLETE, HQ dossier chip, banner render | `playerLoadoutSprint34.test.ts`, `loadoutOps.test.js`, [`s34-manifest.json`](docs/vision/va-screenshots/s34-manifest.json) |
| 3.5a | **Done** | Portrait v2 schema + layered character SVG renderer | `playerLoadoutSprint35a.test.ts` |
| 3.5b | **Done** | Portrait part catalog (manifest) — starter editable character set | `playerLoadoutSprint35b.test.ts` |
| 3.5c | **Done** | Armory Studio v2 — ultra-premium part picker in `HologramCardShell`; remove Bauhaus slider UX | `playerLoadoutSprint35c.test.ts`, [`s35c-manifest.json`](docs/vision/va-screenshots/s35c-manifest.json) |
| 3.5d | **Done** | HQ + recruit card wiring; avatar v2 lazy read-repair | `playerLoadoutSprint35d.test.ts`, [`s35d-manifest.json`](docs/vision/va-screenshots/s35d-manifest.json) |
| 3.5e | **Done** | Portrait art direction vision (Bitmoji-era 2D + age spectrum + coach/staff) | [`PORTRAIT_ART_DIRECTION.md`](docs/vision/PORTRAIT_ART_DIRECTION.md), `playerLoadoutSprint35e.test.ts` |
| 3.5f | **Done** | Starter catalog Phoenix cartoon SVG art swap (9 parts · face/hair/kit) — **visual superseded by 3.5l-b** | `playerLoadoutSprint35f.test.ts`, [`s35f-manifest.json`](docs/vision/va-screenshots/s35f-manifest.json) |
| 3.5g-vision | **Done** | Operative ID card authority — TCG zones, club vs team, phased roadmap | [`OPERATIVE_ID_CARD.md`](docs/vision/OPERATIVE_ID_CARD.md), `playerLoadoutSprint35gVision.test.ts` |

Vision: [`docs/vision/OPERATIVE_LOADOUT.md`](docs/vision/OPERATIVE_LOADOUT.md) · Art direction: [`docs/vision/PORTRAIT_ART_DIRECTION.md`](docs/vision/PORTRAIT_ART_DIRECTION.md) · **Reference board:** [`docs/vision/references/PORTRAIT_REFERENCE_BOARD.md`](docs/vision/references/PORTRAIT_REFERENCE_BOARD.md) · **Card layout:** [`docs/vision/OPERATIVE_ID_CARD.md`](docs/vision/OPERATIVE_ID_CARD.md)

Loadout art (3.2+) consumed by 2.12 hero identity column.

---

## Epic 3.5 — Operative portrait v2, ID card frame & Studio

**Goal:** Replace Bauhaus geometric default with a **modular character SVG** portrait system and a **single TCG card frame** (`OperativeIdCardFrame`) shared across HQ holo, Armory dossier, `ProPlayerCard`, and recruit — COPPA-safe, catalog IDs only.

**Authority chain:** [`PORTRAIT_REFERENCE_BOARD.md`](docs/vision/references/PORTRAIT_REFERENCE_BOARD.md) → [`PORTRAIT_ART_DIRECTION.md`](docs/vision/PORTRAIT_ART_DIRECTION.md) → [`OPERATIVE_ID_CARD.md`](docs/vision/OPERATIVE_ID_CARD.md) → [`OPERATIVE_LOADOUT.md`](docs/vision/OPERATIVE_LOADOUT.md)

**Scope (phased — see [`OPERATIVE_ID_CARD.md`](docs/vision/OPERATIVE_ID_CARD.md) §11):**

| Sprint | Status | Deliverable |
|--------|--------|-------------|
| **3.5a** | ✓ | Portrait v2 schema + layered SVG renderer |
| **3.5b** | ✓ | Portrait part catalog (manifest) |
| **3.5c** | ✓ | Armory Studio v2 — visual part picker in `HologramCardShell` |
| **3.5d** | ✓ | HQ + recruit v2 wiring; lazy read-repair |
| **3.5e** | ✓ | Portrait art direction vision |
| **3.5f** | ✓ | Starter catalog Phoenix SVG art swap — **visual superseded by 3.5l-b** |
| **3.5g-vision** | ✓ | [`OPERATIVE_ID_CARD.md`](docs/vision/OPERATIVE_ID_CARD.md) — TCG zones, club vs team, roadmap |
| **3.5g-c** | Done/planned | Emblem parity — rank formatter, club stub, dedupe `ibm-meta` |
| **3.5g-d/e** | Superseded | Arc/level stamp experiments → folded into **3.5g-f** |
| **3.5g-f** | **Done** | `OperativeIdCardFrame` — Z1–Z4; level Z1 chip; HQ holo + Studio dossier + `ProPlayerCard` front | [`s35gf-manifest.json`](docs/vision/va-screenshots/s35gf-manifest.json), `playerLoadoutSprint35g.test.ts` |
| **3.5g-g** | **Done** | Art well SIR scale, banner watermark, arc flourish off (upper ring when enabled) | [`s35gg-manifest.json`](docs/vision/va-screenshots/s35gg-manifest.json), `playerLoadoutSprint35g.test.ts` |
| **3.5g-b** | **Done** | `resolveClubDisplayName` + `fetchClubDisplayName` team→club; recruit `clubName`; no Phoenixes stub | [`s35gb-manifest.json`](docs/vision/va-screenshots/s35gb-manifest.json), `resolveClubDisplayName.test.ts`, `playerLoadoutSprint35g.test.ts` |
| **3.5j-a** | **Done** | Studio SYNC IDENTITY + unified picker + `?tab=studio` deep links | `playerLoadoutSprint35j.test.ts`, [`s35j-manifest.json`](docs/vision/va-screenshots/s35j-manifest.json) |
| **3.5j-b** | **Done** | Armory read-repair hydrate parity with HQ; sync merges `ownedPortraitParts` when changed | `playerLoadoutSprint35j.test.ts` |
| **3.5j** | **Done** | Identity Studio cohesion umbrella (3.5j-a + 3.5j-b) | `playerLoadoutSprint35j.test.ts` |
| **3.5h** | **Done** | Bauhaus v1 generator retirement; v2-only render path | `playerLoadoutSprint35h.test.ts` |
| **3.5k** | **Done** | Collectible metadata — set #, rarity chip, card back, flavor text | `playerLoadoutSprint35k.test.ts`, [`s35k-manifest.json`](docs/vision/va-screenshots/s35k-manifest.json) |
| **3.5i** | **Superseded** | Split into **3.5l-a–e** (portrait quality phase) | — |
| **3.5l-a** | **Done** | Compose/clip fix — hair visibility, face-default ear ellipses, layer alignment | `playerLoadoutSprint35lA.test.ts` |
| **3.5l-b** → **3.5l-e** | **Superseded** | Phase 2 art/schema/pose track — superseded by **Phase 3 (3.5m-*)** | — |
| **3.5l-gate** | **Shipped — visual rejected by product owner** | Automated `playerLoadoutSprint35*` regression passed; human VA failed — **automated tests ≠ human VA** | [`s35l-gate-manifest.json`](docs/vision/va-screenshots/s35l-gate-manifest.json) |
| **3.5m-docs** | **Done** | Reopen avatar track + Pip-Boy reference board (`PORTRAIT_REFERENCE_BOARD.md`) | [`PORTRAIT_REFERENCE_BOARD.md`](docs/vision/references/PORTRAIT_REFERENCE_BOARD.md) |
| **3.5m-ref** | **Done** | Reference image kit — `REFERENCE_SOURCES.md` + `references/character/` (legacy mood boards trimmed in **3.6a**) | [`REFERENCE_SOURCES.md`](docs/vision/references/REFERENCE_SOURCES.md), `playerLoadoutSprint35mRef.test.ts` |
| **3.6a-ref-organize** | **Done** | Avatar reference rename + dedupe + `character/AVATAR_REFERENCE_INDEX.md` | `playerLoadoutSprint35mRef.test.ts` |
| **LAUNCH-defer-avatar** | **Done** | Reference hierarchy + avatar builder pause | `playerLaunchDeferAvatar.test.ts` |
| **LAUNCH-functional-os** | **Done** | Three-persona functional MVP — all functional gaps closed (Epic 4/5/2.2 done; match-day `MOCK_OPERATIVES` removed → `player_lookup`-only roster + empty state; scouting + parent-lounge gaps resolved). Remaining open items are post-launch visual/avatar tracks only. | `personaFunctionalMvp.test.ts` · `coachModule.test.ts` |
| **LAUNCH-drill-library** | **Done** | Three-tier drill library — team `teams/{id}/drills`, club `clubs/{id}/shared_drills`, platform basics (`drills` by `sportId`); Intent Engine team/club picker; spatial designer saves team drills | `personaFunctionalMvp.test.ts`, `teamDrillLibrary.ts`, `platformDrillLibrary.ts` |
| **LAUNCH-train-lock** | **Done** | Coach-directed Train session — locked focus/drill/duration/RPE; session notes only; free log capped at 120 min | `personaFunctionalMvp.test.ts`, `coachMissionFlow.test.ts` |
| **LAUNCH-club-drill-promote** | **Done** | Optional team drill → club workflow — director inbox on Playbook tab; `publishDrillToClub` / `dismissDrillRecommendation` | `coachModule.test.ts` |
| **LAUNCH-loop-integrity** | **Done** | Tier-0/Tier-1/Tier-2 fragility fixes + Track B — see Functional-loop audit | `loopIntegrityGuards.test.ts`, sprint regression guards |
| **LAUNCH-test-integrity** | **Done** | Emulator round-trip guards G1–G10 in CI (`test:firestore-rules` + `loopIntegrityGuards.test.ts`); G6 CI job shipped | `loopIntegrityGuards.test.ts`, `firestoreRulesSprint412.test.ts` |
| **LAUNCH-scouting** | **Done** | `/coach/scouting` live squad from `player_lookup`; assessments → `teams/{teamId}/scouting_assessments` | `coachScouting.test.ts` |
| **LAUNCH-forge-nameonly** | **Done** | Intent Engine shows name-only roster rows disabled with “add email to assign” hint; not intent-targetable | `intentModule.test.ts` |
| **LAUNCH-epic53** | **Done** | Director Field Ops deployment calendar — create practice/match/tournament; announce toggle → Epic 4.5 comms | `epic53DeploymentCalendar.test.ts` |
| **LAUNCH-epic54** | **Done** | Weather lock — scheduled `evaluateFieldWeatherLock`, director `refreshClubWeatherLock`, `field_weather_status`, Field Ops banner + deployment block; live on dev (`WEATHER_LOCK_ENABLED=true`) | `epic54WeatherLock.test.ts` · deploy **`npm run deploy:integrations`** |
| **LAUNCH-epic52** | **Done** | Registrar → Director compliance matrix; `/registrar` redirect; team-scoped `loadComplianceTable` | `epic52RegistrarConsolidation.test.ts` |
| **LAUNCH-epic51** | **Done** | COPPA / household / VPC gate inventory + regression guards | `epic51CoppaSignup.test.ts` |
| **LAUNCH-epic55** | **Done** | FCM / messaging infra audit guards | `epic55MessagingAudit.test.ts` |
| **LAUNCH-epic22** | **Done** | Passport PII vault seal/unseal + director compliance matrix hydrate | `epic22VaultWiring.test.ts` |
| **LAUNCH-cohesion-lb** | **Done** | 3 cohesion launch-blockers resolved: CLB-1 SweetAlert2 → `PlayerDiegeticOverlay` on `/tracker`; CLB-2 raw Chart.js radar → `VanguardProtocolPanel` (all roles) on `/stats`; CLB-3 coach XP/Level chrome removed from `SquadTelemetryView` + `CoachSquadReadinessCard`. Polish-tier cohesion deferred to tracked polish epic | `src/lib/__tests__/launchCohesionLb.test.ts` (14 guards) |
| **LAUNCH-household-graph** | **Done** | Guardian denorm on `player_lookup`; admin roster + coach grid + global users household columns; director `HouseholdLinkerPanel` | `householdGraphLaunch.test.ts` · `rosterMergeGuardians.test.ts` · deploy **`npm run deploy:compliance`** |
| **LAUNCH-rsvp** | **Done** | Pre-event RSVP (going/out/maybe) on `team_workouts` scheduled events; parent dashboard + coach schedule headcounts | `scheduleRsvp.test.ts` · deploy **`npm run deploy:core`** + rules |
| **LAUNCH-marketing-revamp** | **Done** | Landing page SSTracker copy + `CompetitivePositionPanel` (canonical win message) + integrations bar; remove Nexus Command marketing chrome | `marketingLanding.test.ts` |
| **LAUNCH-registration-lite** | **Done** | Director registration link + `/register/[clubId]` + parent checkout (`playerEmail` on `createRegistrationIntent`) | `registrationLaunch.test.ts` · deploy **`npm run deploy:core`** + **`npm run deploy:commerce`** |
| **LAUNCH-roster-invite** | **Done** | Name-only roster → guardian magic uplink → `claimRosterSpot` household link | `rosterInviteLaunch.test.ts` · deploy **`npm run deploy:core`** |
| **LAUNCH-tryouts-os** | **Done** | End-to-end tryout cycle — Phases **A–E** (reg → session → eval → callback/offer → roster + guardian email comms) | `tryoutsLaunch.test.ts` · deploy **`npm run deploy:core`** + rules |
| **LAUNCH-eligibility-matrix** | **Done** | Director-configurable player eligibility gates on compliance matrix (waiver, passport, VPC, guardian, SafeSport) | `eligibilityLaunch.test.ts` · deploy **`npm run deploy:core`** |
| **LAUNCH-parent-ical** | **Done** | Parent household `.ics` export — import team schedule into Apple/Google/Outlook from dashboard RSVP panel | `parentCalendarExport.test.ts` · deploy **hosting** |
| **LAUNCH-parent-push** | **Done** | Parent dashboard push enable + notification preference matrix (game, messages, announcements, payments) | `parentPushLaunch.test.ts` · deploy **hosting** |
| **LAUNCH-parent-week** | **Done** | Parent dashboard “This week” schedule strip with quick RSVP for primary household athlete | `parentWeekSchedule.test.ts` · deploy **hosting** |
| **LAUNCH-parent-pwa** | **Done** | PWA install prompt (SSTracker branding) + parent nav Settings/Messages for mobile adoption path | `parentPwaLaunch.test.ts` · deploy **hosting** |
| **LAUNCH-wave2-complete** | **Done** | Wave 2 parent adoption parity — ical + push + week strip + PWA; competitive matrix synced | `launchWave2Complete.test.ts` |
| **LAUNCH-qa-ready** | **Partial** | Wave 2 test gate only — **not** full launch closure; see remaining backlog below | `launchWave2Complete.test.ts` |
| **LAUNCH-qa-reset-operatives** | **Done** | QA tenant reset — `purge-operatives` on provision + `QA-PP26` in DEMO_SCRIPT / OWNER_QA | `launchP0Fixes.test.ts` · **hosting** |
| **LAUNCH-parent-link-team** | **Done** | `parentLinkOperativeToTeam` callable + household link UI | `launchP0Fixes.test.ts` · deploy **`npm run deploy:compliance`** |
| **LAUNCH-player-teamless-train** | **Done** | Setup gate + `logTrainingSession` without `teamId` after VPC | `loginWorkflow.test.ts` · `workoutLog.test.ts` · deploy **`npm run deploy:core`** + **hosting** |
| **LAUNCH-staff-roster-transfer** | **Done** | Staff `registrarTransferPlayer` UI; tryouts promote links existing operative | `tryoutsLaunch.test.ts` · `epic52RegistrarConsolidation.test.ts` · deploy **`npm run deploy:compliance`** + **`npm run deploy:core`** + **hosting** |
| **LAUNCH-vpc-ux** | **Done** | Household minors skip email ConsentOverlay; in-app VPC path only | `roleDerivations.test.ts` · merged PR #13 |
| **LAUNCH-deploy-dev** | **Done** | Full `deploy:*` + Firestore rules to `sports-skill-tracker-dev` (2026-06-13) | operator deploy log |
| **ACQ-overnight-wave** | **Done** | Phase 1 + 2 merged to dev; doc sync complete; remaining = [`GAP_CLOSURE_PLAN.md`](docs/acquisition/GAP_CLOSURE_PLAN.md) | [`PARALLEL_SUMMARY.md`](docs/acquisition/PARALLEL_SUMMARY.md) · [`DOC_SYNC_REPORT.md`](docs/acquisition/DOC_SYNC_REPORT.md) |
| **XP-verify** | **Done** | XP algorithm tests + client/server parity (`level.js` ↔ `gamificationWorkoutXp.js`) | `levelXp.test.ts`, `gamificationWorkoutXp.test.js`, `trainingOpsXp.test.js` |
| **3.5m-frame** | **Done** | Art-well recess + holo inset — unified portrait clip, xMidYMid bust centering | `playerLoadoutSprint35mFrame.test.ts` |
| **3.5m-art** | **Superseded** | Agent modular SVG bust redraw — human VA failed; owner Gemini + ingest replaces | `playerLoadoutSprint35mArt.test.ts` (historical) |
| **3.5m-docs-gemini** | **Done** | Owner Gemini art brief + Composer ingest playbook (docs/rules only) | [`GEMINI_ART_BRIEF.md`](docs/vision/GEMINI_ART_BRIEF.md), [`COMPOSER_PLAYBOOK.md`](docs/vision/COMPOSER_PLAYBOOK.md), `playerLoadoutSprint35mDocsGemini.test.ts` |
| **3.5m-gemini-ingest** | **Deferred (post-launch — owner art)** | Wire one owner-approved bust PNG at a time — precomposed holo default | [`ASSET_INGESTION.md`](docs/vision/ASSET_INGESTION.md), [`.cursor/rules/portrait-gemini-ingest.mdc`](.cursor/rules/portrait-gemini-ingest.mdc) |
| **3.5m-hair** | **Superseded** | Folded into Gemini bust + ingest | — |
| **3.5m-gate** | **Deferred (post-launch — owner art)** | Portrait stability gate — full regression + **product owner** human VA | [`s35m-gate-manifest.json`](docs/vision/va-screenshots/s35m-gate-manifest.json) |
| **3.6b+** | **Deferred (post-launch — owner art)** | Avatar Studio PNG layer stack — Photopea slice from `references/character/` | [`character/AVATAR_REFERENCE_INDEX.md`](docs/vision/references/character/AVATAR_REFERENCE_INDEX.md), [`.cursor/rules/avatar-builder-deferred.mdc`](.cursor/rules/avatar-builder-deferred.mdc) |

---

## Sprint LAUNCH-tryouts-os scope — **Done**

**Goal:** Give clubs a **tryout lifecycle OS** — not a signup form and a prayer. Owner pain: prior-season tryouts were chaotic (no single source of truth for registration, field times, check-in, callbacks, or parent updates). Competitors offer fragments (TeamSnap registration + schedule, SE eval forms, GotSport roster rules); **none own the full tryout → callback → offer → roster pipeline** tied to development data.

**Positioning:** Club moat — extends Field Ops, registration-lite, scouting assessments, and SafeSport comms. Coach OS stays flat/analytical on eval surfaces; Player OS optional post-offer (no gamification chrome on staff eval grids).

**Problem today (SSTracker):** Marketing UTM copy mentions tryouts; no `tryout_programs` model, no session check-in, no callback round scheduling, no eval plan templates, no automated tryout comms loop.

### Phased delivery (build in order)

| Phase | Sprint slice | Scope | Reuse |
|-------|--------------|-------|-------|
| **A** | **LAUNCH-tryouts-a** | **Done** | Director **tryout program** + public **`/tryouts/[programId]`** registration + waitlist when full | `tryoutsLaunch.test.ts` |
| **B** | **LAUNCH-tryouts-b** | **Done** | Field **session blocks**, age-band assignment, guardian **session RSVP**, staff **gate check-in** | `tryoutsLaunch.test.ts` |
| **C** | **LAUNCH-tryouts-c** | **Done** | **Tryout plan** station template + coach **eval sheet** → `evaluations` subcollection | `tryoutsLaunch.test.ts` |
| **D** | **LAUNCH-tryouts-d** | **Done** | **Callbacks** + **offers** + guardian accept/decline + **roster promotion** + magic-link invite | `tryoutsLaunch.test.ts` |
| **E** | **LAUNCH-tryouts-e** | **Done** | **Automated guardian emails** — registration confirm, session assigned, offer sent, waitlist; manual resend via `dispatchTryoutComms` | `tryoutsLaunch.test.ts` |

### Acceptance (club director VA)

1. Director publishes Spring Tryouts program and copies a single registration link.
2. Parent registers two athletes, receives session assignments and reminders.
3. Registrar/coach checks in athletes on field tablet; no-show visible in real time.
4. Coaches run station plan and submit eval scores; director sees ranked callback list.
5. Callback round scheduled; parents notified automatically; accepted players land on team roster (or name-only → guardian invite).

### Data model (sketch — implement in Phase A)

- `tryout_programs/{programId}` — clubId, name, ageBands[], registrationWindow, fee?, status
- `tryout_programs/{programId}/registrations/{id}` — player/guardian, assignedSessionId, pipelineStatus
- `tryout_programs/{programId}/sessions/{sessionId}` — facilityId, start/end, capacity, field label
- `tryout_programs/{programId}/evaluations/{playerKey}` — rubric scores, evaluator, callback flag

### Verify (when slices land)

```bash
npm test -- src/lib/director/__tests__/tryoutsLaunch.test.ts
npm run check
```

### Competitive note

See [`docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md`](docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md) — **Tryout lifecycle OS** row (🏆 target moat).

---

## Sprint LAUNCH-epic53 scope — **Done**

**Goal:** Close Epic **5.3** — tactical deployment calendar in Director Field Ops with create flow and optional family announce (Epic 4.5 trigger).

**Delivered:**

| Layer | Behavior |
|-------|----------|
| Field Ops | `DeploymentCalendar.svelte` embedded in `FieldOpsModule.svelte` (replaces read-only `DeploymentCalendarPanel`) |
| Create | Practice / match / tournament + team + facility + start/end |
| Comms | **Announce to team families** checkbox → `visibility: club` (broadcast) vs `staff_only` (suppress) |
| Rules + index | `deployment_calendar_entries` director/registrar create; `clubId` + `startsAt` composite |

**Verify:**

```bash
npm test -- src/lib/components/director/os/__tests__/epic53DeploymentCalendar.test.ts
npm run check
```

---

## Sprint LAUNCH-club-drill-promote scope — **Done**

**Goal:** Close the optional team drill → club workflow. Coaches keep team-scoped drills by default; directors can promote approved drills to the club repo for all teams in the org.

**Delivered:**

| Layer | Behavior |
|-------|----------|
| Coach `/coach/drills` | **Share with director** → `recommendDrillToDirector` → `drill_recommendations/{id}` |
| Director OS | `DirectorDrillRecommendationsPanel` on `/director?tab=playbook` — preview metadata; **Publish to club** / Dismiss |
| Intent Engine | Reads club shared drills via `loadTeamDrillsForIntent` (unchanged) |
| Firestore rules | `drill_recommendations` + `clubs/{clubId}/shared_drills` (shipped) |

**Verify:**

```bash
npm test -- src/lib/coach/__tests__/coachModule.test.ts
npm run check
```

---

## Functional-loop audit backlog (LAUNCH-loop-integrity + LAUNCH-test-integrity) — **Done (2026-06-10)**

**Status (2026-06-10):** All Tier-0 launch blockers (T0-1..T0-10; T0-4 verified false positive), all Tier-1 majors (T1-1..T1-13), Track B (B1–B4), Tier-2 fragility fixes, **LAUNCH-test-integrity** emulator guards (G1–G10 in `loopIntegrityGuards.test.ts` + CI `test:firestore-rules`), and follow-on **LAUNCH-scouting** / **LAUNCH-forge-nameonly** / **LAUNCH-epic53** are **shipped**. Remaining launch work: **Epic 5.4+**, **Epic 2.2**, **DEPLOY-O-bundle** — **no owner QA until all epics complete** (per product owner).

**Origin:** 8-domain read-only functional + design audit (2026-06-09). Root cause across the platform: writer/reader **key + field mismatches** (collection A vs B, camelCase vs snake_case, email-key vs uid-key) that never error and were not caught because ~160/200 tests are static source-scans. Full evidence + file:line in the agent plan `coach_assignment_flow_phases`.

**Build rule:** integrity first; each fix slice ships with the one emulator round-trip guard (G1–G10) that would have caught it. Do not delete prior regression tests. Track B assignment-richness features (drill cues/video, multi-drill bundles, per-assignment cadence/streaks, proof) run **after** Tier-0 closes (esp. T0-1, which they depend on).

### Tier 0 — launch blockers

| ID | Break | Writer → Reader mismatch |
|----|-------|--------------------------|
| T0-1 | Coach intent fulfillment + RL adherence + mastery bounties + under-13 cap all dead | `xpByAttribute`/`ageBand` have readers, no writer; `ageBand` written `users/{email}` but read `player_stats/{uid}` |
| T0-2 | Coach schedule never reaches player HQ | writes `team_workouts`/`startTimestamp`; player reads `schedules`/`startAt` |
| T0-3 | Google sign-in claimless + mis-routed | writes `users/{uid}`; platform keyed by `users/{email}`; `syncUserClaims` never fires |
| T0-4 | ~~Invite + magic-uplink redemption dead~~ **FALSE POSITIVE (resolved)** — both callables are implemented (`functions/invites.js`, `functions/magicUplinks.js`), exported from the deployed `default` codebase, region-aligned `us-east1` with client call sites. Audit only searched `functions/src/`. Guarded by `functionsDeploy.guard.test.js` (4 guards) |
| T0-5 | Coach role self-assignment | `/setup` writes `role:'coach'` client-direct, bypasses `claimCoachInvite` + seat reservation |
| T0-6 | Billing gate never lifts | `subscriptionStatus`→`organizations` vs gate reads `subscription_status`←`license_entitlements`; +region mismatch |
| T0-7 | Cross-tenant leak | `team_assignments` list rule bare `isPlayer()`, no tenant/team guard |
| T0-8 | Comms 4.1 dead | announcements→`team_broadcasts`, parents read `in_app_messages` (rules block); coach inbox query missing `teamId`; coach→player DM no send UI. **Owner decision:** announcements get a dedicated higher-priority surface, separate from DM inbox |
| T0-9 | Player push silently dropped | players register `users.fcmTokens`; dispatchers read `device_tokens`; no onCreate push trigger |
| T0-10 | Parent dashboard empty | reads `profile.playerEmails` (never written); link lives in `households.playerEmails` |

### Tier 1 — major (feature exists, data does not round-trip) — **Done (2026-06-09)**

All 13 fixed via batched subagents, each with a regression guard (orchestrator-verified):

- **T1-1** tactical board no persistence → persists to `teams/{teamId}/tactics/wr_{uid}` (debounced save + load on team change). *8 guards.*
- **T1-2** match-day telemetry local-only → persists to `teams/{teamId}/telemetry_events` (reused existing rule + index); hydrates on reload. *5 guards.*
- **T1-3** club drill promote clipboard-only → `recommendDrillToDirector` writes `drill_recommendations`, `publishDrillToClub` → `clubs/{clubId}/shared_drills` (shape matches `loadTeamDrillsForIntent`). **Latent gap closed:** `drill_recommendations` had no Firestore rule — added tenant-scoped rule (coach/director create in-club, director-only triage). *7 + 4 guards.*
- **T1-4** VpcApprovalQueue rules deny director → tenant-scoped director read on `consent_records`. *5 guards.*
- **T1-5** parent privacy `audit_logs` rules deny parent → household-scoped parent read via `parentHouseholdAllowsChildEmail` (read-only, no write opened). *5 guards.*
- **T1-6** reps_count/volume bounties on weekly-reset counters → switched to cumulative `total_reps`/`totalMins` (both training + RL paths). *9 guards.* **Caveat:** `total_reps` is new, so pre-existing players accrue from now — historical reps not back-credited (backfill optional).
- **T1-7** Proving Grounds `armory.stats` uid vs email key → `ArmoryEngine` writes to email-keyed `users` doc. *8 guards.*
- **T1-8** collectibles `ownedSeasonOneCards` no writer → granted on level-up in `logTrainingSession` via `arrayUnion`. *7 guards.* **Follow-up:** align the rep-based grant path with the level-up path.
- **T1-9** `completedAssignments30d` query/count contradiction → query realigned to `status=='completed'` + `completedAt` 30-day window + `orderBy('completedAt','desc')`; composite index added. *5 guards.* Also fixed a stale `functions-rl` require-path guard (bundling refactor).
- **T1-10** player_stats org query "exceeds 10-get rule limit" → **audit premise did not reproduce (worst-case was 2 gets, not >10)**; still hardened the director branch to zero-get via `tokenClubMatchesDoc` + denormalized `clubId` on write paths. *5 guards.* Severity downgraded — not a live 10-get failure.
- **T1-11** retention report region mismatch → client `DirectorRetentionReport.svelte` aligned `us-central1` → `us-east1` (server already `us-east1`). *3 guards.*
- **T1-12** Stripe Connect status + audit_logs director view no UI reader → new `DirectorBillingAuditPanel` on director compliance page (reads `organizations` Stripe fields + tenant `audit_logs`); index added. *12 guards.*
- **T1-13** RL-flow log never triggers bounty evaluation → `onWorkoutLogCreated` now calls `evaluateActiveBountiesForPlayer` (mirrors training path); confirmed wired in deployed `functions-rl` bundle. *8 guards.*

### Tier 2 — fragility — **Fixes Done (2026-06-10); scouting + attendance deferred (feature work)**

All four real fragilities fixed, each with a runnable guard (`npm run check` held at 382 throughout):
- **Item 1** Roster name-only players invisible → admin roster page now merges `rosters/{teamId}.players[]` with `player_lookup` (deduped case-insensitively; name-only rows marked "No account") via new `src/lib/admin/rosterMerge.ts`. *35 vitest.* **Forge (Done):** Intent Engine shows name-only rows disabled with “add email to assign” — not intent-targetable (`LAUNCH-forge-nameonly`).
- **Item 2** trials name-string identity → `/challenges` `trials` write now adds stable `playerId`(uid)+`playerEmail` backlinks (retains `player` name for back-compat); `profileSyncer` joins uid→email→name cascade; additive uid/email read branch on the `trials` rule. *60 vitest + 4 node.* `legacy/**` confirmed unwired dead code (left alone).
- **Item 3** claim-refresh gap → `syncUserClaims` trigger now emits `householdId`/`vpcVerified`/`minor`/`ageBand`/`divisionId` (parity with `buildBaseCustomClaims`) + idempotency coverage; `parentSignCoppaWaiver` sets the parent `householdId` claim fast-path. **Critical:** this was silently nulling `tokenHousehold()` for all parents, defeating the B4 parent-verification loop, T1-5, and household threads. *25 node.*
- **Item 4** operative-without-team `/setup` loop → `isProfileComplete` recognizes `role:'player' + teamId`; `/setup` renders a stable "not linked to a team yet" + sign-out state for player-role users instead of trapping them in the parent/coach choice. *32 vitest.*

**Deferred as net-new feature work (NOT fragilities):** coach **scouting** page — **Done (2026-06-10):** `/coach/scouting` loads live squad from `player_lookup`, persists evaluation matrix to `teams/{teamId}/scouting_assessments` (`CoachScoutingView.svelte`). **Attendance** covered by Epic 4.7 Team Ops tab.

### Test guards (LAUNCH-test-integrity) — **Done**

G1–G10 authored in `src/lib/security/__tests__/loopIntegrityGuards.test.ts` (emulator `describe.skipIf` — runs in CI `firestore-rules` job). G6 CI visibility shipped 2026-06-09. Epic 4.12 comms rules guards in `firestoreRulesSprint412.test.ts`.

**Verify (per slice):**

```bash
npm test -- <slice test path>
npm run check
```

**Run before:** Track B assignment-richness features and any further feature/polish work.

---

## Track B — assignment richness (LAUNCH-track-b) — **Done (2026-06-09)**

**Status (2026-06-09):** All slices **B1–B4 shipped and verified** (each with runnable guards; `npm run check` held at the 382 baseline throughout — zero net new type errors). B4 was delivered in three sub-slices (B4a foundation, B4b parent review, B4c COPPA media), each independently verified by the orchestrator (writer/reader field alignment on `completion_verifications`; both proof callables confirmed exported from `functions/index.js`; Storage `proof_media` read-scoping confirmed to use the same `token.householdId` claim that `customClaims.js` sets and `tokenHousehold()` reads — no silent deny). Verification proof remains advisory: it never gates XP / `workout_logs` / intent fulfillment. Emulator round-trip coverage still deferred to the test-integrity CI blocker.

**Goal:** give players the *full picture* of a coach assignment while keeping coach effort low. **Canonical `team_assignments` / `prescription` path only** (owner decision — do NOT invest in legacy `assignments` homework path or unify paths in this track). Depends on T0-1 (Done).

**Owner decisions (2026-06-09):**
- **Path:** canonical `team_assignments` / `prescription` only.
- **Proof (B4):** **parent verification is primary**, and it must surface **in the Parent OS space** (parent verifies from their own device, not the child's). **Optional** photo / short-video evidence — never a hard requirement to complete.
- **Order:** build slices in order B1 → B4.

**Key existing-state facts (from assignment-flow map):** drill-library docs already carry `videoUrl` + `description` (coaching cues), but `buildDeployPrescription()` copies only title/IDs/duration, and `mapTeamDrillDoc` ignores `videoUrl`/`description` — so players never see cues/video. `prescription` (`src/lib/types/intent.ts`) is the extension point; handoff flows coach→Train via `coachMissionFlow.ts` sessionStorage.

| Slice | Scope | Files (explicit) | Guard |
|---|---|---|---|
| **B1 — Done** Cues + video to players | Carry the selected drill's `videoUrl` + coaching `cues` into `prescription` at deploy; display on `/player/workout` (and mission detail). Inherit from drill (no new coach UI). | `src/lib/coach/teamDrillLibrary.ts` (picker row + `mapTeamDrillDoc` read `videoUrl`/`description`), `src/lib/coach/intent/IntentEngine.svelte.ts` (`buildDeployPrescription`), `src/lib/types/intent.ts` (`IntentPrescription`+`DeployIntentInput`), `functions/src/domains/trainingOps.js` (`normalizePrescription` sanitize), `src/lib/player/workout/coachMissionFlow.ts` (handoff carry), `src/routes/(app)/player/workout/+page.svelte` (render) | `prescriptionSchema.test.ts` + `coachMissionFlow.test.ts` + `trainingOpsXp.test.js`/`intentOps.test.js` |
| **B2 — Done** Per-assignment cadence/streak | `prescription.cadence { sessionsPerWindow, windowDays }`; per-assignment completion count (do NOT conflate with global `currentStreak`). | trainingOps `normalizePrescription`, `intent.ts`, `activeBounties.ts`, workout page | activeBounties + intentOps |
| **B3 — Done** Multi-drill bundles | `prescription.drills[]` (canonical only; ignore legacy `assignments.drills[]`); Train runs the sequence via a sequential stepper that logs each step through the existing primitive. Server validates array length 1–8 + per-entry. | trainingOps, `intent.ts`, workout page, coachMissionFlow | coachMissionFlow + prescriptionSchema + trackB3Bundle.guard |
| **B4 — Done** Completion proof | Parent-verification surfaced in **Parent OS**. **Owner decisions (2026-06-09):** (1) **coach opt-in** per intent (`prescription.requiresParentVerification`) for verification; (2) **media uploads are ALWAYS parent-gated** — a child's photo/short-video proof is COPPA-sensitive and must be parent-reviewed/approved before it is visible to ANYONE (coach/director included); media is optional, never required; (3) verification is **ADVISORY** — the player's log still awards XP / fulfills immediately; verification only adds a `parent-verified` mark (never gates XP or fulfillment). **COPPA-first:** child media lands in a private Storage path, unreadable by coach/director until a parent approves. Split: **B4a** data model + coach toggle + player proof submission (note + optional private media) + verification-request doc + Firestore/Storage rules (child create-own, parent read/moderate household-scoped, coach read approved-only); **B4b** Parent OS review surface (list pending → view → approve/reject) + advisory `parent-verified` badge on player/coach views. **Delivered (B4a/B4b/B4c):** `completion_verifications` collection (CF-only writes via `submitCompletionProof` + `parentReviewCompletionProof`, both us-east1 and exported from `functions/index.js`); Firestore rule scopes reads to player-own / parent-household / staff-tenant; `ProofReviewQueue.svelte` mounted on `/parent/dashboard`; B4c added optional photo/video to a private `households/{hid}/proof_media/{playerUid}/…` Storage path readable ONLY by the uploading player, same-household parent, and super-admin (no coach/director read branch), with server-side path-ownership validation on submit and `mediaApproved` flipped only on parent approval. | trainingOps (`submitCompletionProof`, `parentReviewCompletionProof`), `completion_verifications` collection + Firestore rule + index, `storage.rules` proof_media, `ProofReviewQueue.svelte` + parent dashboard, coach `requiresParentVerification` toggle (IntentHUD), player completion UI | `trackB4Proof.guard.test.js` + `storageRulesB4c.test.ts` + `firestoreRulesSprint22.test.ts` + parent dashboard / activeBounties vitest |

**Verify (per slice):** `npm test -- <slice test paths>` · `npm run check`. (Emulator round-trip guards deferred — see test-integrity blocker above.)

### Post-close training cadence & curriculum (doc + shipped slices)

| Slice | Status | Notes |
|-------|--------|-------|
| **FORGE-CADENCE-DEFAULT** | **Done** | Client default 5×/week when Forge `requiredXp ≥ 300` and Sessions/week = 0 |
| **BOUNTY-CADENCE-SERVER** | **Done** | Server injects cadence on deploy + daily log gate for high-XP intents without cadence |
| **BOUNTY-DAILY-ACK** | **Done** | HQ XP progress, today-complete ack, explicit Train arm, mission strip Continue |
| **TRAIN-MISSION-ARM-EXPLICIT** | **Done** | Accept ≠ arm; Start session / Continue only |
| **ACQ-DOCS-CURRICULUM** | **Done** | Prospectus + demo + FUNCTIONAL_MVP cadence/curriculum honesty |
| **CURRICULUM-AI-V0** | **Planned (post-acquisition)** | Licensed PD ingest, unified search, club-scoped RL candidates on server |

---

## Sprint XP-verify scope — **Done**

**Goal:** Prove XP math is correct and client preview matches server. No UI/visual changes.

**Authority:** `src/lib/gamification/level.js` · `functions/gamificationWorkoutXp.js` · `trainingOps.logTrainingSession`

**Delivered:**

- `src/lib/gamification/__tests__/levelXp.test.ts` — `calculateTrainingSessionEarnedXp`, `xpToAdvanceFromLevel`, `getLevelProgressFromTotalXp`, `getCurrentRank`
- `functions/__tests__/gamificationWorkoutXp.test.js` — same training-session fixtures (must stay aligned with `level.js`)
- `functions/src/domains/__tests__/trainingOpsXp.test.js` — `logTrainingSession` earned ≥ 1 guard

**Verify:**

```bash
npm test -- src/lib/gamification/__tests__/levelXp.test.ts
node --test functions/__tests__/gamificationWorkoutXp.test.js functions/src/domains/__tests__/trainingOpsXp.test.js
npm run check
```

---

## Infrastructure — Firebase Functions deploy (LAUNCH-functional-os parallel)

**Goal:** Split monolithic `functions/` into deployable codebases (`functions-shared`, `functions-core`, `functions-rl`) with cost guards and targeted deploy scripts. Mark a DEPLOY sprint **Done** only after its slice ships **and** the verify block below is green.

| Sprint | Status | Goal |
|--------|--------|------|
| **DEPLOY-0-roadmap** | **Done** | Functions deploy tracker in ROADMAP (this section) |
| **DEPLOY-A-hotfix** | **Done** | Bridge: memory + lazy index loads + `deploy:core` script |
| **DEPLOY-B-shared** | **Done** | `functions-shared/` local package |
| **DEPLOY-C-core-scaffold** | **Done** | `functions-core/` package scaffold (empty exports) |
| **DEPLOY-D-core-index** | **Done** | Wire launch training + intent callables in `functions-core/index.js` |
| **DEPLOY-C/D** | **Done** | Scaffold + thin index (domain files still under `functions/`) |
| **DEPLOY-E-rl-scaffold** | **Done** | `functions-rl/` package scaffold (empty exports) |
| **DEPLOY-F-rl-index** | **Done** | Wire RL callables + triggers in `functions-rl/index.js` |
| **DEPLOY-E/F** | **Done** | Scaffold + thin index (domain files still under `functions/`) |
| **DEPLOY-G-firebase-json** | **Done** | `firebase.json` multi-codebase (`default`, `core`, `rl`) |
| **DEPLOY-H-deploy-scripts** | **Done** | `deploy:core` / `deploy:rl` / `deploy:launch-backend` + playbook |
| **DEPLOY-I-core-tests** | **Done** | `functionsDeploy.guard.test.js` wiring guards |
| **DEPLOY-J-commerce** | **Done** | `functions-commerce/` codebase (Stripe + ticketing) |
| **DEPLOY-K-compliance** | **Done** | `functions-compliance/` codebase (vault, COPPA, WebAuthn, clearance) |
| **DEPLOY-L-integrations** | **Done** | `functions-integrations/` codebase (media, feeds, weather webhook) |
| **DEPLOY-M-platform** | **Done** | `functions-platform/` codebase (apiGateway, cells, admin subset, analytics) |
| **DEPLOY-N-monolith-retire** | **Done** | Slim `functions/index.js`; CI sequential codebase deploy; Node 20 engines |
| **DEPLOY-O-bundle** | **Done** | Self-contained bundle closures for all split codebases (Session 1: core/shared; Session 2: rl) — local-only requires; predeploy hooks; 58 guard tests green |

**Verify** (functions deploy track):

```bash
node --test functions/__tests__/functionsDeploy.guard.test.js functions/src/__tests__/cloudRunCostGuard.test.js
npm run check
npm run build
```

### Sprint DEPLOY-A-hotfix scope — **Done**

**Goal:** Reduce Cloud Functions cold-start pressure without multi-codebase split; unblock launch QA for training + intent + RL callables/triggers.

**Delivered:**

- `trainingOps.js` — `512MiB` on `logTrainingSession`, `secureDeployIntent`, `secureCancelIntent`, `secureExtendIntent`
- `rlOps.js` — `512MiB` on `submitPhysioSelfReport` (`initRlPolicy` 1GiB; `getAdaptiveWorkoutPolicy` 512MiB unchanged)
- `functions/index.js` — lazy `require` for `processMedia` (sharp), `ingestRoster` (pdf-parse), `webauthn`, `trainRlPolicyNightly`; launch paths (`trainingOps`, `rlOps`, `transitionRecorder`) stay eager
- Root `package.json` — `deploy:core` script (nine launch-critical functions only)

**Verify:**

```bash
cd functions
npx jest src/domains/__tests__/intentOps.test.js
node --test src/domains/__tests__/trainingOpsXp.test.js __tests__/transitionRecorder.guard.test.js
node -e "process.env.FUNCTION_TARGET='logTrainingSession'; console.time('load'); require('./index.js'); console.timeEnd('load')"
cd ..
npm run check
```

*(intentOps is Jest-based — `node --test` will fail with `jest is not defined`.)*

**Manual deploy** (run when owner requests — set discovery timeout on Windows):

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
npm run deploy:core
```

### Sprint DEPLOY-B-shared scope — **Done**

**Goal:** Shared server utilities package for future `functions-core` / `functions-rl` without duplicating business logic.

**Delivered:**

- `functions-shared/package.json` — `name: functions-shared`, `main: index.js`
- `functions-shared/index.js` — re-exports `gamificationWorkoutXp`, `authBouncers`, `formatters`, `alphaRunOptions` from monolith `functions/` paths (flat + namespaced)
- `functions-shared/README.md` — canonical path table + usage
- `functions/package.json` — `"functions-shared": "file:../functions-shared"`

**Out of scope (unchanged):** domain file moves, `functions/index.js` edits.

**Verify:**

```bash
node -e "require('./functions-shared'); console.log('shared OK')"
npm run check
```

### Sprint DEPLOY-C-core-scaffold scope — **Done**

**Goal:** `functions-core/` package scaffold for training + intent codebases (depends on **DEPLOY-B-shared**).

**Delivered:**

- `functions-core/package.json` — Node **20**, `firebase-admin`, `firebase-functions`, `functions-shared`, `@google/genai`; no tfjs/sharp/pdf-parse/webauthn
- `functions-core/index.js` — `module.exports = {}` stub
- `functions-core/.gitignore`, `README.md`

**Out of scope:** domain module moves, `firebase.json` multi-codebase, monolith `functions/index.js` edits.

**Verify:**

```bash
cd functions-core
npm install
node -e "require('./index.js'); console.log('core scaffold OK')"
```

### Sprint DEPLOY-D-core-index scope — **Done**

**Goal:** `functions-core/index.js` exports only launch-critical training + intent callables (thin re-export; no file moves).

**Delivered:**

- `functions-core/index.js` — `logTrainingSession`, `secureDeployIntent`, `secureCancelIntent`, `secureExtendIntent` from `../functions/src/domains/trainingOps`
- `trainingOps.js` — `512MiB` on four callables (already set in **DEPLOY-A**)
- `functions-core/README.md` — export list + verify

**Out of scope:** monolith `functions/index.js` export removal (**DEPLOY-N**), RL codebase, intent lifecycle triggers (optional; not exported).

**Verify:**

```bash
cd functions-core
npm install
node -e "const i=require('./index.js'); ['logTrainingSession','secureDeployIntent','secureCancelIntent','secureExtendIntent'].forEach(n=>{if(!i[n]) throw new Error('missing '+n)}); console.log('OK')"
cd ..
cd functions
npx jest src/domains/__tests__/intentOps.test.js
node --test src/domains/__tests__/trainingOpsXp.test.js
cd ..
npm run check
```

### Sprint DEPLOY-E-rl-scaffold scope — **Done**

**Goal:** `functions-rl/` package scaffold for RL adaptive workout codebases (depends on **DEPLOY-B-shared**).

**Delivered:**

- `functions-rl/package.json` — Node **20**, `firebase-admin`, `firebase-functions`, `functions-shared`, `@tensorflow/tfjs-node`; no sharp/pdf-parse/stripe/webauthn
- `functions-rl/index.js` — `module.exports = {}` stub
- `functions-rl/.gitignore`, `README.md`

**Out of scope:** `rlOps` / `transitionRecorder` wiring (**DEPLOY-F**), `firebase.json` multi-codebase, monolith exports.

**Verify:**

```bash
cd functions-rl
npm install
node -e "require('./index.js'); console.log('rl scaffold OK')"
```

### Sprint DEPLOY-F-rl-index scope — **Done**

**Goal:** Isolate RL + physio in `functions-rl/index.js` so tfjs never loads in core containers (thin re-export; no file moves).

**Delivered:**

- `functions-rl/index.js` — `rlOps` callables, `transitionRecorder` triggers, `trainRlPolicyNightly`
- `rlOps.js` — `512MiB` on `submitPhysioSelfReport`; `1GiB` / `512MiB` on init/policy (unchanged from **DEPLOY-A**)
- `trainer.js` — `trainRlPolicyNightly` `2GiB` scheduler memory (unchanged)
- `functions-rl/README.md` — export + memory table

**Out of scope:** monolith `functions/index.js` export removal (**DEPLOY-N**).

**Verify:**

```bash
cd functions-rl
npm install
node -e "const i=require('./index.js'); ['getAdaptiveWorkoutPolicy','initRlPolicy','rlOnWorkoutLogCreated','rlOnPhysioReportCreated','submitPhysioSelfReport'].forEach(n=>{if(!i[n]) throw new Error(n)}); console.log('OK')"
cd ..
node --test functions/__tests__/transitionRecorder.guard.test.js functions/__tests__/transitionRecorderReward.test.js
npm run check
```

### Sprint DEPLOY-G-firebase-json scope — **Done**

**Goal:** Register `functions-core` and `functions-rl` alongside legacy monolith in `firebase.json`.

**Delivered:**

- `firebase.json` — three entries: `default` (`functions/`), `core` (`functions-core/`), `rl` (`functions-rl/`)
- [`docs/FUNCTIONS_DEPLOY.md`](docs/FUNCTIONS_DEPLOY.md) — codebase-qualified deploy syntax, dev project note, discovery timeout

**Out of scope:** removing monolith exports (**DEPLOY-N**), `deploy:core` script update (**DEPLOY-H**), `.firebaserc` default project change.

**Verify:**

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
Copy-Item functions\.env.sports-skill-tracker-dev functions-core\.env
Copy-Item functions\.env.sports-skill-tracker-dev functions-rl\.env
firebase deploy --only functions:core:logTrainingSession --dry-run
firebase deploy --only functions:rl:getAdaptiveWorkoutPolicy --dry-run
npm run check
```

*(See [`docs/FUNCTIONS_DEPLOY.md`](docs/FUNCTIONS_DEPLOY.md) — `core`/`rl` need `.env` until monolith transitive requires are removed.)*

### Sprint DEPLOY-H-deploy-scripts scope — **Done**

**Goal:** Codebase-qualified deploy scripts + operator playbook (**DEPLOY-G**).

**Delivered:**

- Root `package.json` — `deploy:core` (four `functions:core:*`), `deploy:rl` (five `functions:rl:*`), `deploy:launch-backend`
- [`docs/FUNCTIONS_DEPLOY.md`](docs/FUNCTIONS_DEPLOY.md) — discovery timeout (PS/Bash), batching, `--force`, rollback, Node 20 table, codebase table
- `functions/package.json` — `lint` no-op stub (fixes `deploy:functions` pre-step)
- [`.cursor/rules/sst-agent-workflow.mdc`](.cursor/rules/sst-agent-workflow.mdc) — use `deploy:core` / `deploy:rl` for large deploys

**Verify:**

```bash
npm run check
```

**Manual (owner):**

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
Copy-Item functions\.env.sports-skill-tracker-dev functions-core\.env
Copy-Item functions\.env.sports-skill-tracker-dev functions-rl\.env
npm run deploy:core
# wait 2–3 min
npm run deploy:rl
```

### Sprint DEPLOY-I-core-tests scope — **Done**

**Goal:** Regression guards for multi-codebase export wiring, `firebase.json` codebases, tfjs isolation, and launch callable memory.

**Delivered:**

- `functions/__tests__/functionsDeploy.guard.test.js` — `node:test` + `fs.readFileSync` guards for `functions-core` / `functions-rl` exports, `firebase.json` `core`/`rl`, package.json tfjs split, `trainingOps` `512MiB` launch opts

**Verify:**

```bash
node --test functions/__tests__/functionsDeploy.guard.test.js functions/src/__tests__/cloudRunCostGuard.test.js
npm run check
```

### Sprint DEPLOY-K-compliance scope — **Done**

**Goal:** `functions-compliance/` post-launch codebase for vault, COPPA, WebAuthn, clearance, retention (thin re-export; monolith unchanged until **DEPLOY-N**).

**Delivered:**

- `functions-compliance/package.json` — Node **20**, `@simplewebauthn/server`, `firebase-admin`, `firebase-functions`, `functions-shared`
- `functions-compliance/index.js` — 28 exports from `vaultOps`, `shredOps`, `coppa`, `webauthn`, `compliance`, `verifyDocument`, `complianceOps` (retention subset)
- `firebase.json` — `codebase: compliance`
- [`docs/FUNCTIONS_DEPLOY.md`](docs/FUNCTIONS_DEPLOY.md) — compliance section + `PII_VAULT_MASTER_KEY` note

**Secrets:** `PII_VAULT_MASTER_KEY` should be bound only when deploying **compliance** vault callables.

**Verify:**

```bash
cd functions-compliance
npm install
cd ..
npm run check
```

### Sprint DEPLOY-N-monolith-retire scope — **Done**

**Goal:** Stop default codebase from loading migrated exports; CI deploys split codebases in order; align all `engines.node` to **20**.

**Delivered:**

- `functions/index.js` — removed training launch callables, RL block, commerce/compliance/integrations/platform exports; `logger.warn` deprecation notice; removed unused lazy loaders
- `.github/workflows/deploy.yml` — `functions:core` → `rl` → `commerce` → `compliance` → `integrations` → `platform` → `default`, then hosting
- `functions/package.json`, `functions-shared/package.json` — `engines.node: "20"`
- `functions/__tests__/functionsDeploy.guard.test.js` — monolith slim + engines guards
- `functions/__tests__/transitionRecorder.guard.test.js` — RL wiring asserted on `functions-rl/index.js`

**Depends on:** **DEPLOY-J/K/L/M** deployed and verified in production before removing duplicate exports from live default revisions (operator runbook).

**Verify:**

```bash
node --test functions/__tests__/functionsDeploy.guard.test.js
npm run check
npm run build
```

### Sprint DEPLOY-O-bundle scope — **Done**

**Goal:** Cloud Run `/workspace` resolves every `require()` in `functions-core` and `functions-shared` without `../functions/` (Classification B: thin re-exports missing at runtime). **DEPLOY-N** production deploy depends on **O** for `logTrainingSession` / intent callables.

**Session 1 (this slice):**

- `scripts/bundle-functions-core.cjs` — copy `trainingOps` closure into `functions-core/`; copy shared utils into `functions-shared/`
- `functions-core/index.js` — `require('./src/domains/trainingOps')`
- `functions-shared/index.js` — local requires only
- `firebase.json` — `predeploy` on `core` codebase only
- `functions/__tests__/functionsDeploy.guard.test.js` — no `../functions/` in core/shared indexes; bundle script produces `functions-core/src/domains/trainingOps.js`
- `docs/FUNCTIONS_DEPLOY.md` — bundle + predeploy runbook

**Session 2 (Done):** **DEPLOY-O-bundle-rl** — `functions-rl` closure (`rlOps`, `src/ml/transitionRecorder.js`, `src/ml/trainer.js`) bundled by the shared `bundle-functions.cjs rl` target (18 files); `node -e require('./functions-rl/index.js')` resolves with no `Cannot find module`; `rl` predeploy hook present in `firebase.json`; covered by `functionsDeploy.guard.test.js` (rl wiring + tfjs-node dep + bundle closure).

**Verify (Session 1):**

```bash
node scripts/bundle-functions-core.cjs
node -e "process.env.FUNCTION_TARGET='logTrainingSession'; require('./functions-core/index.js'); console.log('core OK')"
node --test functions/__tests__/functionsDeploy.guard.test.js
npm run check
```

**Deploy verify (operator):** `npm run deploy:core` — no `Cannot find module` in `logtrainingsession` logs; package size well above thin re-export KB.

---

**Gate:** **3.5g-f Done** — card surfaces use `OperativeIdCardFrame`; `OperativeIdEmblem` retained for `HudAvatarRing` token path only. **Epic 4.1+ unblocked** at launch — placeholder portrait OK (`defaultPortraitV2` SVG + initials). **3.5m-gate** human VA resumes post-launch when owner reopens character art.

**Design principles:**

- Reuse Epic 3.2 cosmetics manifest + loadout equip UX for **face / hair / kit** (and future **pose**)
- One card zone grammar on every surface — variant `card` \| `holo` is CSS scale only
- **Club org on Z2** — team roster name never on collectible front
- Z5 streak/XP = `IdentityTelemetryBezel` on HQ holo only
- Studio = game-like **visual picker** + holo dossier hero; **3.5j** requires **3.5g-f** frame prerequisite

### Epic 3.5 Phase 2 — Portrait quality (3.5l-*) — **closed**

**Trigger:** Phase 1 pipeline shipped (3.5j, 3.5h, 3.5k) but starter art reads as disconnected / non-human modular layers. Authority refresh: PORTRAIT_ART_DIRECTION.md §1 rewrite (2026-05-22).

**Outcome:** **3.5l-gate** marked shipped with automated regression green; **product owner rejected visual** — automated tests ≠ human VA. Phase 2 art/schema/pose items (**3.5l-b** through **3.5l-e**) **superseded** by Phase 3 (**3.5m-***). **3.5l-a** compose/clip fix retained.

---

### Epic 3.5 Phase 3 — Avatar track reopen (3.5m-*)

**Trigger:** Phase 2 gate closed in error without human VA sign-off. Reopen with mandatory agent reference board — [`PORTRAIT_REFERENCE_BOARD.md`](docs/vision/references/PORTRAIT_REFERENCE_BOARD.md) (Vault-tone cartoon bust + holo recess; no Bethesda IP).

**Deploy order (strict):**

1. **3.5m-docs** ✓ — reference board + ROADMAP reopen (docs only)
2. **3.5m-ref** ✓ — reference provenance table (legacy wiki mood JPEGs removed; **3.6a** Meg/Tom sheets in `references/character/female-meg/` + `male-tom/`)
3. **3.5m-frame** ✓ — art-well recess; unified clip + holo inset shadow; portrait inside Z3 well
4. **3.5m-art** — ~~cohesive bust SVG redraw~~ — **Superseded** (human VA failed)
5. **3.5m-docs-gemini** ✓ — owner Gemini art brief + Composer ingest playbook (docs/rules only)
6. **Owner** — create bust PNGs in Gemini Pro Art → `static/portrait/approved/` → log `ASSET_LICENSES.md`
7. **3.5m-gemini-ingest** — **deferred post-launch** — wire one approved bust at a time + `npm run generate:portraits` + deploy — **Done only after owner holo approve ☑**
8. **3.5m-gate** — **deferred post-launch** — full `playerLoadoutSprint35*` regression + **product owner** human VA

**Human acceptance bar (3.5m-gate):** Reference board §4 — *Would a parent show this to a 13yo?* · *Would a player want the next unlock?* · one cohesive cartoon person at 88px and 128px; portrait recessed in art well; no floating head / mascot flame default hair.

**Runs after:** 3.5m-docs. **Coordinates with:** Phase 6 **6f-c** (bezel telemetry) and **6f** (Studio holo shell).

---

## Sprint status — Epic 4: Comms & Team Operations Hub

> **Portrait at launch:** `defaultPortraitV2` SVG + profile initials on holo — **3.5m-gate** human VA **deferred post-launch** (product owner).

> **Epic 4.1+ unblocked** after Sprint 2.19 Done + **LAUNCH-defer-avatar** — comms wiring may proceed after Player OS visual acceptance sign-off; launch placeholder portrait OK. **3.5l-gate** automated pass does **not** satisfy post-launch portrait bar. **Sign-off against [`PLAYER_OS_FOUNDATION.md`](docs/vision/PLAYER_OS_FOUNDATION.md) reference matrix required before launch** even though Player OS gate is open from 2.19. UI refs: [`docs/vision/references/ui/`](docs/vision/references/ui/).

> **Naming note:** ROADMAP **Epic 4 = Comms Hub**. Unrelated legacy comments (e.g. Firestore "Epic 4.3 LeagueManager") are a different numbering scheme — do not renumber.

| Sprint | Status | Summary | Proof |
|--------|--------|---------|-------|
| 4.0 | Done | Messaging policy charter — household-only adult↔minor | [`docs/vision/COMMS_HUB.md`](docs/vision/COMMS_HUB.md), [`docs/SAFESPORT_COMMS_MATRIX.md`](docs/SAFESPORT_COMMS_MATRIX.md) |
| 4.1 | **Done** | Wire send surfaces — `/coach/logistics`, mount MessagesTab, parent-targeted compose | `commsSprint41.test.ts` |
| 4.2 | **Done** | SafeSport compliance — block coach→minor, `consentComms`, unify monitored channel path | `commsSprint42.test.ts` |
| 4.3 | **Done** | Notification bus — single FCM store (T0-9) + `onTeamBroadcastCreated` push on announcements (consent-filtered parents + team players) + DM push in `sendCoachPlayerMessage`; `push_announcements` default-on. *Refinement noted:* `sendFcmToUids` doesn't pref-gate per-user yet — fine until announcement opt-out UI exists. | `comms43Push.guard.test.ts` (14) |
| 4.4 | **Done** | Parent comms hub — per-team **Parent Lounge** (`clubs/{clubId}/channels/parent-lounge-{teamId}`): provisioning helper + coach callable (W1), auto-provision on household link + parent `clubId` set (W2), `ParentLoungePanel.svelte` live read/send via `sendChannelMessage` (W3), mounted in `/messages` parent view derived from children's teams so it shows pre-first-message (W4/W4b). Parents initiate + reply; SafeSport-monitored. | `comms44ParentLounge*.guard.test.ts` (17+20+13/16) |
| 4.5 | **Done** | Schedule → announce → push. Director: `onDeploymentCalendarEntryCreated` trigger auto-writes `team_broadcasts` per `teamId` (reuses safeSportBroadcast parent-CC + commsPolicy consent). Coach: opt-in "Announce to team" toggle on scheduled-event forms (FieldOps + CoachDrillsView) → `safeSportBroadcast`. Both ride the 4.3 push bus (auto player+consented-parent FCM). Create-only v1 (no reschedule re-announce). | `commsSprint45.test.ts` (44) |
| 4.6 | **Done** | Game reminders: `sendScheduledEventReminders` (15m) on `team_workouts.reminderOffsets` + `remindersSent` dedup + `push_gameReminders`; `sendGameRemindersToday` for fixtures. Payment/registration: `sendRegistrationPaymentReminders` (daily 9am MT) for pending/failed `season_registrations` + deadline offsets 7/3/1/0 from `organizations.activeSeason.registrationDeadline`; `push_paymentReminders` (parents). Director config: `DirectorActiveSeasonPanel` on Licenses tab. | `commsSprint46.test.ts` (13) |
| 4.7 | **Done** | Team ops (coach-delegated v1 — no `team_manager` JWT): `/coach/logistics` tabbed hub (Comms · Schedule · Roster · Attendance). Schedule reuses `saveTeamScheduledEvent` + reminders + SafeSport announce. Roster live from `player_lookup`. Attendance writes `teams/{teamId}/attendance_sessions` with present/absent map. Nav relabeled Team Ops. | `commsSprint47.test.ts` |
| 4.8 | **Done** | Director club broadcast composer: `clubSportBroadcast` callable fans out to all/selected teams via shared `commitTeamBroadcast` → `team_broadcasts` + Epic 4.3 push. `/director?tab=comms` mounts `DirectorClubBroadcastComposer.svelte`. | `commsSprint48.test.ts` |
| 4.9 | **Done** | Compliance console + audit export: `DirectorCommsCompliancePanel` on `/director?tab=comms` reads `team_broadcasts`, `messaging_audit`, `audit_logs` (MESSAGE/BROADCAST) + JSON export. | `commsSprint49.test.ts` |
| 4.10 | **Done** | Report message / incident flow: `reportMessageIncident` callable → `message_incidents`; `ReportMessageIncident.svelte` on `/messages`; director queue in compliance console. | `commsSprint410.test.ts` |
| 4.11 | **Done** | Household parent↔child threads | `commsSprint411.test.ts` |
| 4.12 | **Done** | Firestore rules + callable integration tests: `firestoreRulesSprint412.test.ts` (source-scan + emulator) for team_broadcasts, message_incidents, attendance_sessions, messaging_audit; Epic 4 callable export guards; CI via `test:firestore-rules`. `npm run deploy:comms` for default-codebase comms batch. | `firestoreRulesSprint412.test.ts` |

**Epic 4 runs parallel to Epic 3** after **3.2** ships. **Epic 4.1–4.12 Done (2026-06-10).** Comms functions deployed to `sports-skill-tracker-dev` via `npm run deploy:comms`.

Vision: [`docs/vision/COMMS_HUB.md`](docs/vision/COMMS_HUB.md) · Compliance map: [`docs/SAFESPORT_COMMS_MATRIX.md`](docs/SAFESPORT_COMMS_MATRIX.md)

---

## Sprint 4.0 scope — Messaging policy charter — **Done**

**Goal:** Establish canonical household-only messaging policy and SafeSport control map. No implementation in this sprint.

**Deliverables:**

- [`docs/vision/COMMS_HUB.md`](docs/vision/COMMS_HUB.md) — north star, channel types, notification categories, handoffs
- [`docs/SAFESPORT_COMMS_MATRIX.md`](docs/SAFESPORT_COMMS_MATRIX.md) — platform controls → policy, known gaps
- Cross-reference updates in `PERSONA_ECOSYSTEM.md`, `EPIC5_STATUS.md`, persona vision docs, `FCM_AND_MESSAGING_MATRIX.md`
- This ROADMAP section (Epic 4 table + Sprint 4.0 scope)

**Out of scope:**

- Messaging UI, callables, Firestore rule changes
- Privacy/terms page updates (Epic 4.2)
- Mounting `MessagesTab` or creating `/coach/logistics` (Epic 4.1)

**Verify commands:**

```bash
npm run check
```

---

## Sprint 4.1 scope — Coach logistics compose — **Done**

**Goal:** Wire coach send surfaces — `/coach/logistics`, mount `MessagesTab`, parent-targeted announcement compose via `safeSportBroadcast`.

**Delivered:**

- `src/routes/(app)/coach/logistics/+page.svelte` — team context, `ParentAnnouncementCompose`, `MessagesTab`
- `src/lib/components/coach/ParentAnnouncementCompose.svelte` — `CommsEngine` team broadcast (parent-targeted per [`COMMS_HUB.md`](docs/vision/COMMS_HUB.md))
- `src/lib/services/comms.svelte.ts` — `safeSportBroadcast` region fix (`us-east1`)
- `src/lib/services/__tests__/commsSprint41.test.ts`

**Out of scope:** Coach→minor DM block (4.2), Parent Lounge (4.4), notification bus (4.3), Player OS visual changes.

**Verify commands:**

```bash
npm test -- src/lib/services/__tests__/commsSprint41.test.ts
npm run check
npm run build
```

---

## Sprint 4.2 scope — SafeSport compliance — **Done**

**Goal:** Block staff→minor interactive paths; enforce VPC `consentComms` on parent delivery; unify monitored channel sends on `sendChannelMessage`.

**Delivered:**

- `functions/src/domains/commsPolicy.js` — minor/adult guard + `consentComms` filter
- `sendCoachPlayerMessage` — adult athlete (18+) only; minors rejected server-side
- `sendChannelMessage` — staff blocked in channels containing minor players; consent-filtered CC repair
- `safeSportBroadcast` — parent CC filtered by `consent_records.consentItems.comms`
- `CommsEngine.sendChannelMessage` + `NewMessageModal` minor selection block
- `commsSprint42.test.ts`

**Verify:**

```bash
npm test -- src/lib/services/__tests__/commsSprint42.test.ts
```

---

## Sprint 4.11 scope — Household threads — **Done**

**Goal:** Parent ↔ linked operative messaging gated by shared `householdId` — no staff participation.

**Delivered:**

- `sendHouseholdMessage` callable → `households/{householdId}/thread_messages`
- Firestore rules — household members read-only; server writes only
- `HouseholdThreadPanel.svelte` on `/messages` (parent + player)
- `CommsEngine.sendHouseholdMessage`
- `commsSprint411.test.ts`

**Verify:**

```bash
npm test -- src/lib/services/__tests__/commsSprint411.test.ts
```

---

## Sprint 3.0 scope — Operative Loadout v2 (schema + renderer) — **Done**

**Goal:** Define the canonical `operativeLoadout` schema, pure render helpers, and a read-only preview component that composes vector portrait + equipped digital slots. No Armory studio UX yet (3.1).

**Delivered:**

- `src/lib/gamification/loadoutSchema.ts` — slot keys, catalog bridge, validation
- `src/lib/gamification/renderOperativeLoadout.js` — SSR-safe SVG/CSS layers
- `src/lib/gamification/__tests__/loadoutSchema.test.ts`
- `src/lib/gamification/__tests__/playerLoadoutSprint30.test.ts`
- `src/lib/components/player/OperativeLoadoutPreview.svelte`
- `src/lib/types/user.types.ts` + `tenant.ts` — optional `operativeLoadout`, `ownedCosmetics`

**Verify commands:**

```bash
npm test -- src/lib/gamification/__tests__/loadoutSchema.test.ts src/lib/gamification/__tests__/playerLoadoutSprint30.test.ts
npm run check
npm run build
```

---

## Sprint 3.1 scope — Armory studio equip UX — **Done**

**Goal:** Slot picker + equip/unequip on `/player/armory`, Firestore writes to `operativeLoadout` / `ownedCosmetics`, live preview via `OperativeLoadoutPreview`, HQ ring + dossier card wiring.

**Delivered:**

- Part A — Dashboard dossier token sweep (`hud-stat-cell`, `ibm-cta`, init modal pd-* remap)
- `OperativeLoadoutStudio.svelte` — slot picker, equip/unequip, SYNC LOADOUT
- Armory **Studio** workspace tab; TC redeem → `ownedCosmetics` via `processDeploymentRequest`
- `HudAvatarRing` + `IdentityBentoModule` + `ProPlayerCard` loadout border wiring
- `getOwnedCatalogForSlot()` helper in `loadoutSchema.ts`

**Verify commands:**

```bash
npm test -- src/lib/gamification/__tests__/loadoutSchema.test.ts \
  src/lib/gamification/__tests__/playerLoadoutSprint31.test.ts \
  src/lib/gamification/__tests__/playerLoadoutSprint30.test.ts \
  src/lib/components/player/dashboard/__tests__/playerHudSprint31.test.ts \
  src/routes/(app)/player/armory/__tests__/armoryAvatar.test.ts \
  src/routes/(app)/player/armory/__tests__/armoryLoadoutStudio.test.ts
npm run check
npm run build
```

---

## Sprint 3.1.3 scope — Recovery hotfix + file budget guardrails — **Done**

**Goal:** Fix 3.1.2 UI regressions (`bento-span-5`, hero CTA, init modal), normalize `OperativeLoadoutStudio.svelte`, add `check-file-budget.mjs` CI guard.

**Delivered:**

- `src/app.css` — `.bento-span-5` + mobile collapse
- `src/lib/styles/player-dashboard-hud.css` — self-contained `.quest-hero__cta`; global `.init-modal__*` selectors
- `src/lib/components/player/OperativeLoadoutStudio.svelte` — formatting normalize (≤700 lines)
- `scripts/check-file-budget.mjs` + `package.json` `check:file-budget` / `prebuild` wire-up
- `playerHudSprint313.test.ts`, `scripts/__tests__/check-file-budget.test.ts`

**Next:** **2.11.1** shared component dossier pass. **3.2** art pipeline after 2.11.1.

**Verify commands:**

```bash
npm run check:file-budget
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint313.test.ts \
  src/lib/components/player/dashboard/__tests__/playerHudSprint312.test.ts \
  src/routes/(app)/player/armory/__tests__/armoryLoadoutStudio.test.ts \
  scripts/__tests__/check-file-budget.test.ts
npm run check
npm run build
```

**Manual acceptance (before 2.11.1):** Studio 5+4+3 @ ≥1280px; hero Accept gold chamfer; init modal gold fill; Armory no 500; Studio ≤650 lines.

---

## Sprint 3.1.4 scope — Armory 500 root-cause fix — **Done**

**Goal:** Reproduce and fix `/player/armory` Internal Error (500). Minimal scope — do **not** start **2.11.1** until side-nav Armory loads Quartermaster, Album, and Studio without `+error.svelte`.

**Root cause:** Circular module init — `armory.js` imported `loadoutSchema.js` at top level while `loadoutSchema.ts` reads `QUARTERMASTER_INVENTORY` from `armory.js` during `LOADOUT_CATALOG` bootstrap → `ReferenceError: Cannot access 'QUARTERMASTER_INVENTORY' before initialization`.

**Delivered:**

- `src/lib/gamification/armory.js` — lazy `import('./loadoutSchema.js')` inside `processDeploymentRequest` only
- `src/routes/(app)/player/armory/+page.svelte` — dynamic Studio import; TrajectoryEngine `$effect` try/catch; capsule/GVI sections gated on `!trajectoryEngine.error`
- `src/routes/(app)/player/armory/__tests__/armoryRouteGuards.test.ts`

**Manual QA (2026-05-22):** Side nav → Armory → Quartermaster, Album, Studio — all load without 500 or console throw.

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/armory/__tests__/armoryRouteGuards.test.ts \
  src/routes/(app)/player/armory/__tests__/armoryLoadoutStudio.test.ts \
  src/lib/gamification/__tests__/loadoutSchema.test.ts
npm run check
npm run build
```

---

## Sprint 3.2 scope — Art pipeline — **Done**

**Goal:** Replace placeholder loadout catalog rows with a content-hashed cosmetics manifest + SVG assets; wire catalog ingestion and renderer so Armory Studio and HQ ring show manifest-driven borders/badges/banners.

**Delivered:**

- `static/cosmetics/` — border-neon, border-holo, badge-street-kings, banner-vanguard-stripe, title-operative-flair SVGs + `catalog.config.json`
- `scripts/generate-cosmetics-manifest.mjs` — SHA-256 walk + manifest emit; npm script `generate:cosmetics`
- `src/lib/gamification/cosmetics.manifest.json` — `{ id, slot, label, renderKey, assetPath, contentHash }`
- `src/lib/gamification/loadoutSchema.ts` — manifest-driven catalog (QM digital SKUs merged; stable ids preserved)
- `src/lib/gamification/renderOperativeLoadout.js` — manifest asset `<img>` layers + holo frame class; inline SVG fallbacks
- `src/lib/components/player/OperativeLoadoutPreview.svelte` — holo frame + img overlay styles
- `src/lib/components/player/HudAvatarRing.svelte` — img support on loadout border layer
- `src/lib/gamification/__tests__/playerLoadoutSprint32.test.ts`

**Out of scope:**

- Unlock ceremonies (3.3)
- Album set bonuses (3.4)

**Verify commands:**

```bash
npm run generate:cosmetics
npm test -- src/lib/gamification/__tests__/loadoutSchema.test.ts \
  src/lib/gamification/__tests__/playerLoadoutSprint30.test.ts \
  src/lib/gamification/__tests__/playerLoadoutSprint31.test.ts \
  src/lib/gamification/__tests__/playerLoadoutSprint32.test.ts \
  src/routes/(app)/player/armory/__tests__/armoryLoadoutStudio.test.ts \
  src/routes/(app)/player/armory/__tests__/armoryRouteGuards.test.ts
npm run check:file-budget
npm run check
npm run build
```

---

## Sprint 3.3 scope — Unlock ceremonies — **Done**

**Goal:** Server-verified cosmetic grants + post-commit ceremony UI (confetti/modal only after Firestore confirms `ownedCosmetics`). Minor-safe copy; idempotent grants; Replay without re-grant.

**Delivered:**

- `functions/src/domains/loadoutOps.js` — `grantLoadoutCosmetic`, `redeemQuartermasterDigital` (us-east1)
- `firestore.rules` — `ownedCosmetics` server-only; `users/{email}/cosmetic_unlocks` read rules
- `src/lib/services/loadoutUnlocks.svelte.ts` — snapshot diff vs sessionStorage ack queue
- `src/lib/services/dopamine.svelte.ts` — `loadoutUnlock` kind + `ceremonyOnCosmeticUnlock`
- `LoadoutUnlockCeremony.svelte`, `OperativeCeremoniesPanel.svelte`, Armory **Ceremonies** tab
- `(app)/+layout.svelte` — global player ceremony modal mount
- `armory.js` — TC digital loadout redeem via callable (no client `ownedCosmetics` writes)

**Verify commands:**

```bash
node --test functions/src/__tests__/loadoutOps.test.js
npm test -- src/lib/gamification/__tests__/playerLoadoutSprint33.test.ts \
  src/lib/services/__tests__/dopamine.test.ts \
  src/routes/(app)/player/armory/__tests__/armoryLoadoutStudio.test.ts
npm run check:file-budget && npm run check && npm run build
```

---

## Sprint 2.9 scope — Player shell dossier alignment

**Goal:** Left/bottom nav rail and ambient feel match Player Dossier on all player shell routes (HQ, Stats, Armory, Workout). Extend 2.8 dashboard-only ambient soften to full player shell.

**In scope:**

- `ROADMAP.md` (this update)
- `docs/vision/PLAYER_OS.md` (Shell alignment section)
- `src/lib/styles/player-shell.css` (dossier rail tokens, ambient via `.ps-root--dossier`, scrollbar gold/teal)
- `src/lib/components/shell/PlayerShell.svelte` (`ps-root--dossier`, `ps-canvas-bg`)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint29.test.ts` (create)

**Out of scope:**

- World context strip, hero logic (2.8.1)
- Loadout, coach/director shells
- OperativeHub layout changes

**Verify commands:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint29.test.ts
npm run build
```

---

## Sprint 2.8 scope — Player Dossier unification

**Goal:** Unify `/player/dashboard` aesthetics with Armory (`qa-*`) and Stats (`dossier-*`): black canvas, lifted panels, gold action + teal data accents. No layout rearchitecture, no renames, no Coach/Parent/Director changes.

**In scope:**

- `ROADMAP.md` (this update)
- `docs/vision/PLAYER_OS.md` (Player Dossier visual tone + dual accent)
- `.cursor/rules/sst-player-dashboard.mdc` (sprint pointer 2.8 + `player-dossier.css`)
- `src/lib/styles/player-dossier.css` (create — canonical `--pd-*` tokens)
- `src/lib/styles/player-dashboard-hud.css` (remap surfaces, dual accent, remove scanlines rule)
- `src/lib/styles/player-shell.css` (dashboard-only ambient soften via `:has(.player-dossier-root)`)
- `src/routes/(app)/player/dashboard/+page.svelte` (import tokens, `player-dossier-root`, `pd-strap`, black bg)
- `src/lib/components/player/dashboard/OperativeHub.svelte` (dossier panel/border; remove scanlines)
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte` (inset `ibm-root--inset` panel)
- `src/lib/components/player/dashboard/VanguardProtocolPanel.svelte` (teal radar/inspector data)
- `src/lib/components/player/dashboard/AttributeRadar.svelte` (teal polygon)
- `src/lib/components/hud/ActiveBounties.svelte` (embedded rail inherits dossier via hud css — optional)
- `src/routes/(app)/player/armory/+page.svelte` (optional: import + `--pd-*` alias on `.qa-root`)
- `src/routes/(app)/stats/+page.svelte` (optional: `player-dossier-root` + `--d-*` aliases)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint28.test.ts` (create)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint24.test.ts` (update conflicting color assertions)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint25.test.ts` (update conflicting surface assertions)

**Out of scope:**

- OperativeHub 8+4 layout changes
- Hero quest logic / new Firestore listeners
- Coach / parent / director pages
- Renaming canonical components
- `teamsStore` refactor

**Verify commands:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint28.test.ts \
  src/lib/components/player/dashboard/__tests__/playerHudSprint27.test.ts \
  src/routes/(app)/player/armory/__tests__/armoryAvatar.test.ts
npm run build
```

---

## Sprint 2.7 scope — Presence & hierarchy (feel pass)

**Goal:** Make HQ feel intentional in ~3 seconds — correct hero when not trained today, typography hierarchy, compact empty telemetry, collapsed hub vectors, slim profile banner, one gold focal (hero CTA only).

**In scope:**

- `ROADMAP.md` (this update)
- `docs/vision/PLAYER_OS.md` (Presence & hierarchy section)
- `.cursor/rules/sst-player-dashboard.mdc` (sprint pointer 2.7)
- `src/lib/player/dashboard/playerHudMetrics.ts` (`isTrainingToday` helper + tests)
- `src/lib/player/dashboard/activeBounties.ts` (`resolveHeroQuest` + tests in `activeBounties.test.ts`)
- `src/lib/components/hud/ActiveBounties.svelte` (use `resolveHeroQuest`; pass `lastTrainingUtc`)
- `src/routes/(app)/player/dashboard/+page.svelte` (pass `lastTrainingUtc`; compact analytics class when !telemetry)
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte` (profile banner; remove full-width setup button)
- `src/lib/components/player/dashboard/HudMetricsPanel.svelte` (collapsed vectors when !telemetryReady && embedded)
- `src/lib/components/player/dashboard/VanguardProtocolPanel.svelte` (compact mode when !telemetryReady)
- `src/lib/styles/player-dashboard-hud.css` (typography hierarchy, compact deck, banner, hero gold-only CTA, slate meta)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint27.test.ts` (create)

**Out of scope:**

- OperativeHub 8+4 grid changes
- Next event / coach pulse / status badges (2.8)
- PlayerShell gradient (2.9)
- Hiding radar entirely
- New Firestore listeners
- Renaming canonical components
- `teamsStore` refactor

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard src/lib/player/dashboard
node scripts/check-no-phosphor.mjs
npm run build
```

---

## Sprint 2.6 scope — HQ content loop (hero mission + rank progress + last session)

**Goal:** Make `/player/dashboard` actionable in ~3 seconds: (1) what to do now, (2) how close to next rank, (3) what happened last training. Three content blocks only — no layout rearchitecture.

**In scope:**

- `ROADMAP.md` (this update)
- `docs/vision/PLAYER_OS.md` (HQ content loop section)
- `.cursor/rules/sst-player-dashboard.mdc` (sprint pointer 2.6)
- `src/lib/player/dashboard/playerHudMetrics.ts` (`formatLastTrainingLabel`)
- `src/lib/player/dashboard/__tests__/playerHudMetrics.test.ts`
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte` (rank bar + last session)
- `src/lib/components/hud/ActiveBounties.svelte` (embedded hero card + deduped list)
- `src/routes/(app)/player/dashboard/+page.svelte` (rank + `last_training_utc` props)
- `src/lib/styles/player-dashboard-hud.css` (hero card, rank bar, last-session)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint26.test.ts` (create)

**Out of scope:**

- OperativeHub 8+4 layout changes (2.5 frozen)
- Next event / schedule chip (2.7)
- Coach pulse / status badges / messages (2.7)
- PlayerShell gradient pass (2.9)
- Match data / assists in hub
- New Firestore queries (use existing `statsRaw` on +page only)
- Renaming canonical components
- `teamsStore` refactor

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard src/lib/player/dashboard
node scripts/check-no-phosphor.mjs
npm run build
```

---

## Sprint 2.5 scope — Command strip layout v2 (mission rail + conditional avatar)

**Goal:** Replace the broken 4/8/12 OperativeHub composition with a tactical command strip: identity + vectors on the left (8 col), missions in a right rail (4 col), one flat surface (no clashing glass/card layers). Avatar column only when armory profile is complete; else inline initials badge. Remove orphan match-data (assists) from hub. Always show radar in analytics deck. Collapse dead space.

**Layout decisions (locked):**

- Missions: **right side column** (4 col desktop), not full-width 12-col rows
- Avatar: **HudAvatarRing column only when profile complete** (`operativeAvatar` set); else **inline badge** (initials) beside name — no empty 72px slot
- Telemetry: **always show radar** in analytics deck (never hide VPP/radar band when data empty)

**In scope:**

- `ROADMAP.md` (this update)
- `docs/vision/PLAYER_OS.md` (replace home screen zones with command strip + mission rail + analytics deck)
- `.cursor/rules/sst-player-dashboard.mdc` (sprint pointer 2.5, layout table update)
- `src/lib/components/player/dashboard/OperativeHub.svelte` (refactor grid: 8+4 command + missions rail; single flat surface)
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte` (conditional avatar column vs inline badge; remove over-desaturate when badge mode)
- `src/lib/components/player/dashboard/HudMetricsPanel.svelte` (embedded: vectors only — remove Match Data / extractPowerMetrics from hub)
- `src/lib/components/hud/ActiveBounties.svelte` (embedded rail mode: vertical stack, narrow column styling)
- `src/lib/components/player/dashboard/AttributeRadar.svelte` (zero-data: faint gold hex outline at min radius so chart never looks “broken”)
- `src/lib/components/player/dashboard/VanguardProtocolPanel.svelte` (compact inspector ghost — no large empty slab)
- `src/routes/(app)/player/dashboard/+page.svelte` (wire profileComplete to identity; stop passing statsRaw to embedded HudMetricsPanel if unused)
- `src/lib/styles/player-dashboard-hud.css` (single-surface tokens, command shell, mission rail, badge styles; kill nested cell fill clash)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint25.test.ts` (create)
- `src/routes/(app)/player/dashboard/__tests__/playerDashboard.hud.test.ts` (update layout assertions)

**Out of scope:**

- Renaming IdentityBentoModule, OperativeHub, HudMetricsPanel, ActiveBounties, VanguardProtocolPanel, HUDContainer
- selectedVanguardAxis wiring behavior
- teamsStore / deduplicateById
- Coach/parent routes, vault/compliance
- svelte-check errors
- New JWT roles

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard src/lib/player/dashboard
node scripts/check-no-phosphor.mjs
npm run build
```

---

## Sprint 2.0 scope — Telemetry deck (no duplicate vectors)

**Goal:** Eliminate duplicate PAC–AGI telemetry on the page. Hub strip = read-only summary (clickable). Lower panel = radar + detail inspector only — no second 6-card grid. Shared selected-axis state links hub, radar, and inspector.

**In scope:**

- `ROADMAP.md` (this update)
- `src/routes/(app)/player/dashboard/+page.svelte` (shared selectedAxis state, wire bindings, compress capsule ghost)
- `src/lib/components/player/dashboard/HudMetricsPanel.svelte` (clickable vector strip)
- `src/lib/components/player/dashboard/VanguardProtocolPanel.svelte` (radar + inspector; remove vpp-grid)
- `src/lib/components/player/dashboard/AttributeRadar.svelte` (optional axis selection + highlight)
- `src/lib/styles/player-dashboard-hud.css` (strip selection highlight, telemetry deck layout)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint20.test.ts` (create)

**Out of scope (Sprint 2.1+):**

- IdentityBentoModule ring/chip typography refactor
- ActiveBounties further changes
- Full page bento re-layout (moving telemetry into OperativeHub row)
- Coach/parent routes
- svelte-check / phosphor prebuild fixes

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard
npm run check
npm run build
```

---

## Sprint 2.1 scope — Identity metric chips + palette pass

**Goal:** Fix tacky ring/center-text overlap in identity column. Rings show progress only; labels and values live in adjacent chips. Premium chamfer CTAs for profile setup and command center. Gold-forward palette under `.player-hud-root`. Mono typography lock for dashboard section headers.

**In scope:**

- `ROADMAP.md` (this update)
- `src/lib/components/player/dashboard/HudMetricChip.svelte` (new)
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte`
- `src/lib/components/hud/HudSeededRingCanvas.svelte` (small-ring center text guard)
- `src/lib/styles/player-dashboard-hud.css`
- `src/routes/(app)/player/dashboard/+page.svelte` (capsule section header mono pass only)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint21.test.ts` (create)

**Note:** Test file is `playerHudSprint21.test.ts` under `player/dashboard/__tests__/` — NOT `firestoreRulesSprint21.test.ts` (compliance epic).

**Follow-up (Sprint 2.1.1):** Command center trigger removed from identity; shell nav only.

**Out of scope:**

- HudMetricsPanel / VanguardProtocolPanel / ActiveBounties layout changes
- Telemetry selectedAxis behavior
- Coach/parent routes
- svelte-check / phosphor prebuild fixes
- Full PLAYER_OS.md rewrite

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard
npm run check
npm run build
```

---

## Sprint 2.3 scope — Player OS visual system unification

**Goal:** One cohesive Gold Command HUD on `/player/dashboard`. Fix XP/streak text overlap by removing mini-rings from identity stats. Kill cyan/teal decorative language inside the player HUD shell. Document the design system in PLAYER_OS.md. No layout rearchitecture.

**In scope:**

- `ROADMAP.md` (this update)
- `docs/vision/PLAYER_OS.md` (add Player OS Design System section; fix ROADMAP link footer)
- `src/lib/components/player/dashboard/HudStatCell.svelte` (new — ringless stat cell)
- `src/lib/components/player/dashboard/HudMetricChip.svelte` (refactor to thin wrapper delegating to HudStatCell; remove HudSeededRingCanvas)
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte` (use HudStatCell; grid layout for stats)
- `src/lib/components/player/dashboard/OperativeHub.svelte` (replace cyan scanlines with gold-tint or remove)
- `src/lib/components/hud/ActiveBounties.svelte` (embedded path only: no hud-telemetry-root, single mission header, no #22d3ee)
- `src/lib/styles/player-dashboard-hud.css` (hud-stat-cell styles, optional avatar desaturate, preserve 2.2 hovers + reduced-motion)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint23.test.ts` (create)
- `src/routes/(app)/player/dashboard/__tests__/playerDashboard.hud.test.ts` (extend identity assertion)

**Out of scope:**

- `+page.svelte` layout / slab count changes
- HudMetricsPanel vector strip or selectedAxis behavior
- VanguardProtocolPanel / radar / inspector structure (2.0 done)
- Non-embedded ActiveBounties standalone panel (other routes)
- Re-adding PlayerCommandCenter
- teamsStore refactor (keep deduplicateById)
- svelte-check 362 errors
- Compliance Epic 2.2 / vault / shred
- Renaming IdentityBentoModule, OperativeHub, HudMetricsPanel, ActiveBounties, VanguardProtocolPanel

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard src/lib/player/dashboard
node scripts/check-no-phosphor.mjs
npm run build
```

---

## Sprint 2.4 scope — Gold Command palette + analytics deck layout

**Goal:** Make the player dashboard *look* unified and premium. Remap structural blue to slate/gold under `.player-hud-root`, retint radar/telemetry, fix avatar ring readability, collapse telemetry + capsules into one analytics band, chamfer bottom cards to match OperativeHub.

**In scope:**

- `ROADMAP.md` (this update)
- `docs/vision/PLAYER_OS.md` (extend Design System: structural token remap, two-band layout)
- `src/lib/styles/player-dashboard-hud.css` (player-hud-root token overrides, bento-card chamfer, radar/telemetry scoped colors)
- `src/lib/components/player/HudAvatarRing.svelte` (stronger track contrast if needed)
- `src/lib/components/player/dashboard/AttributeRadar.svelte` (gold data polygon; slate grid; selected axis gold)
- `src/lib/components/player/dashboard/VanguardProtocolPanel.svelte` (eyebrow/inspector bar → gold/slate, not #3b82f6)
- `src/lib/components/player/dashboard/HudMetricsPanel.svelte` (hide AWAITING TELEMETRY when embedded)
- `src/routes/(app)/player/dashboard/+page.svelte` (two-band layout: merge telemetry + capsules into player-analytics-deck)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint24.test.ts` (create)
- `src/routes/(app)/player/dashboard/__tests__/playerDashboard.hud.test.ts` (update layout assertions if capsule section moves)

**Out of scope:**

- OperativeHub grid structure (4/8/12) — keep as-is
- selectedVanguardAxis wiring behavior (keep bind/sync)
- ActiveBounties mission row changes (2.3 done)
- IdentityBentoModule / HudStatCell refactor
- Coach/parent routes
- svelte-check 361 errors
- Renaming canonical components

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard src/lib/player/dashboard
node scripts/check-no-phosphor.mjs
npm run build
```

---

## Sprint 2.2 scope — Motion polish + mono/palette finish

**Goal:** Final craft pass on player dashboard — gold-forward avatar ring, subtle motion, Geist Mono lock on remaining sans blocks. No layout rearchitecture.

**Note:** Prebuild phosphor fix is a separate commit — do not re-touch unless `npm run build` still fails.

**In scope:**

- `ROADMAP.md` (this update)
- `src/lib/components/player/HudAvatarRing.svelte`
- `src/lib/components/player/UidAvatar.svelte` (if avatar inner glow is off-palette green)
- `src/lib/components/player/dashboard/VanguardProtocolPanel.svelte` (typography only)
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte` (minor motion only if needed)
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint22.test.ts` (create)

**Out of scope:**

- Telemetry layout / selectedAxis / radar inspector structure (2.0 done)
- ActiveBounties mission rows (1.9 done)
- Re-adding Command Center
- Coach/parent routes
- svelte-check 362 errors

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard
node scripts/check-no-phosphor.mjs
npm run build
```

---

## Sprint 1.9 scope — Mission deck density

**Goal:** Make the mission region inside OperativeHub feel like a premium gaming HUD deck — dense single-line rows, one header, no bracket terminal CTAs, no oversized per-row rings.

**In scope:**

- `ROADMAP.md` (this update)
- `src/lib/components/hud/ActiveBounties.svelte`
- `src/lib/styles/hud-telemetry.css`
- `src/lib/styles/player-dashboard-hud.css` (embedded quest overrides only)
- `src/lib/player/dashboard/activeBounties.ts` (compact CTA labels if needed)
- `src/lib/components/player/dashboard/__tests__/playerHudSprint19.test.ts` (create)

**Out of scope (Sprint 2.0+):**

- VanguardProtocolPanel / telemetry dedup / radar layout
- HudMetricsPanel / IdentityBentoModule ring chip refactor
- `+page.svelte` layout changes beyond existing `<ActiveBounties embedded />`
- Coach/parent routes
- Fixing repo-wide svelte-check or phosphor prebuild errors

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard src/lib/player/dashboard
npm run check
npm run build
```

---

## Sprint 1.8 scope — Premium HUD shell remediation

**Goal:** One unified tactical HUD shell — eliminate box-in-box prototype feel, remove duplicate identity/metrics data, repurpose 8-col metrics to Vanguard vectors only.

**In scope:**

- `ROADMAP.md` (this update)
- `src/lib/components/player/dashboard/OperativeHub.svelte`
- `src/lib/components/player/dashboard/IdentityBentoModule.svelte`
- `src/lib/components/player/dashboard/HudMetricsPanel.svelte`
- `src/lib/styles/player-dashboard-hud.css`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint18.test.ts` (create)

**Out of scope (defer to Sprint 1.9):**

- ActiveBounties mission row / bracket button redesign
- VanguardProtocolPanel + page layout bento restructure
- Memory capsule empty states
- Coach/parent routes

**Planned follow-ups (document only — do not implement):**

- Sprint 1.9 — Mission log density (ActiveBounties row redesign)
- Sprint 2.0 — Telemetry bento integration + empty state compression

**Verify commands:**

```bash
npm test -- src/routes/(app)/player/dashboard src/lib/components/player/dashboard
npm run check
npm run build
```

---

## Sprint status — Epic 2: Compliance & Data Vault

| Sprint | Status | Summary | Proof |
|--------|--------|---------|-------|
| 2.1 | Done | COPPA consent gates, PII route blocking | `firestoreRulesSprint21.test.ts`, `route-policies.js` |
| 2.2 | **Done** | PII vault client wiring, shredder, retention rules | `vault.svelte.ts`, `epic22VaultWiring.test.ts`, `firestoreRulesSprint22.test.ts`, `vaultOps.js`, `shredOps.js` |
| 2.3 | Absorbed | SafeSport messaging → **Epic 4** (household-only policy supersedes CC-on-minor-DM model) | [`docs/vision/COMMS_HUB.md`](docs/vision/COMMS_HUB.md) |

**Parallel track:** Epic 2 runs alongside Epic 3 — finish **2.2** (vault/shredder). SafeSport messaging absorbed into **Epic 4** (Sprint 2.3 → 4.0–4.2). Player HUD delivery (Epic 1) does not block compliance work.

---

## Product epics (vision — NOT sprint numbers)

Lettered epics avoid collision with **Epic 5** in [`docs/EPIC5_STATUS.md`](docs/EPIC5_STATUS.md) (enterprise logistics / Director OS) and the old ROADMAP "Epic 5" (state association APIs).

| Epic | Theme | Doc |
|------|-------|-----|
| A | Player training/gaming HUD · Premium ecosystem track 2.12.1–2.19 | [`docs/vision/PLAYER_OS.md`](docs/vision/PLAYER_OS.md) |
| B | Parent co-op | [`docs/vision/PARENT_OS.md`](docs/vision/PARENT_OS.md) |
| C | Coach sideline OS | [`docs/vision/COACH_OS.md`](docs/vision/COACH_OS.md) |
| D | Team Manager ops OS | [`docs/vision/TEAM_MANAGER_OS.md`](docs/vision/TEAM_MANAGER_OS.md) |
| E | Director club ops (+ Registrar) | [`docs/vision/DIRECTOR_OS.md`](docs/vision/DIRECTOR_OS.md) |
| F | Platform admin | [`docs/vision/ADMIN_OS.md`](docs/vision/ADMIN_OS.md) |
| G | Recruiter (future) | [`docs/vision/RECRUITER_OS.md`](docs/vision/RECRUITER_OS.md) |
| H | Tutor (future) | [`docs/vision/TUTOR_OS.md`](docs/vision/TUTOR_OS.md) |
| — | Comms & team ops hub | [`docs/vision/COMMS_HUB.md`](docs/vision/COMMS_HUB.md) |
| — | Director logistics build status | [`docs/EPIC5_STATUS.md`](docs/EPIC5_STATUS.md) |

---

## Repo map (quick reference)

| Persona | Route | Key components |
|---------|-------|----------------|
| Player | `/player/dashboard` | OperativeHub, IdentityBentoModule, HudMetricsPanel, ActiveBounties, VanguardProtocolPanel |
| Player | `/player/workout`, `/player/tracker`, `/player/armory` | Command Center drawer links |
| Parent | `/parent/dashboard` | CoOpArena, CarRideArena, BountyTerminal |
| Parent | `/messages` | CC inbox + 4.11 household threads + **Parent Lounge** *(Epic 4.4 Done — initiate/reply)* |
| Coach | `/coach` | SquadTelemetryView, assignments, drills, match-day |
| Coach | `/coach/logistics` | MessagesTab, parent-targeted announcement compose |
| Director | `/director` | Compliance, Field Ops, teams, registrars tab |
| Admin | `/admin` | Organizations, users, system settings |

---

## Deprecated / archived

- [`docs/archive/VANGUARD_ROADMAP.md`](docs/archive/VANGUARD_ROADMAP.md) — superseded by this file
- Do **not** create or reference `MASTER_BUILD_ROADMAP.md` (removed; use this file)

---

## Planned roles (document only — not in code yet)

- **`team_manager`** — separate JWT role for audit; background clearance required; team-scoped like coach; narrower ops permissions. See [`docs/vision/TEAM_MANAGER_OS.md`](docs/vision/TEAM_MANAGER_OS.md).
- **`recruiter`**, **`tutor`** — future separate roles. See vision stubs.
