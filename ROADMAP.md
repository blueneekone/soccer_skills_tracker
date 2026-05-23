# SSTracker — Delivery Roadmap

**Architecture:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)  
**Last updated:** 2026-05-22  
**Current sprint:** **2.16** — Layout & alignment constitution (planned)

This document is the **canonical delivery tracker** for test-driven sprints. Product vision and persona UX live in [`docs/PERSONA_ECOSYSTEM.md`](docs/PERSONA_ECOSYSTEM.md) and [`docs/vision/`](docs/vision/).

---

## How to work a sprint (Cursor)

1. **Design** → Ask mode → update or read vision docs under `docs/vision/`.
2. **Build** → Agent mode → one slice per session; use the explicit file list from the sprint section below.
3. **Verify** before marking done:
   ```bash
   npm test -- <paths from sprint>
   npm run check
   npm run build
   ```

Agent workflow rules: [`.cursor/rules/sst-agent-workflow.mdc`](.cursor/rules/sst-agent-workflow.mdc)

---

## Delivery gate (Player OS cinematic premium)

- **Blocked until 2.19 Done:** Epic 3.4+, Epic 4.1+ implementation
- **Allowed parallel:** Epic 3.0–3.3 (Done), Epic 4.0 docs, unrelated bugfixes
- **North star:** Player OS must pass cinematic material/spatial acceptance (see [`docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md`](docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md) + [`docs/PLAYER_OS_VISUAL_ACCEPTANCE.md`](docs/PLAYER_OS_VISUAL_ACCEPTANCE.md)) before comms or album bonuses
- **Retcon:** Sprint 2.15 shipped motion + checklist; visual review found Tier A/Tier B split — gate re-closed for Epic 3.4 / 4.1

---

## Sprint status — Epic 1: Foundation & Player HUD *(premium ecosystem IN PROGRESS — track 2.16–2.19; Tier B foundation shipped 2.12–2.15; cinematic orchestration pending)*

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
| 2.16 | Planned | Layout & alignment constitution — max-width, header grammar, HQ composition fixes, debug-chrome policy | `playerHudSprint216.test.ts` |
| 2.17 | Planned | Z-depth & layering system — Z0–Z4 tokens, recessed/raised/floating surfaces | `playerHudSprint217.test.ts` |
| 2.18 | Planned | Material orchestration — promote Tier A techniques to HQ (bloom, glass wells, spatial grid, emissive edges) | `playerHudSprint218.test.ts` |
| 2.19 | Planned | Diegetic UI kit + energy motion — conduit progress, hero identity scale, route spatial continuity; lifts gate | `playerHudSprint219.test.ts` |

**Epic 1 premium ecosystem track 2.12.1–2.19** supersedes “HQ complete at 2.12” and “premium-complete at 2.15.” Operative loadout (gear slots, album bonuses, unlock ceremonies) continues in **Epic 3** after **2.19 Done** — see [`docs/vision/OPERATIVE_LOADOUT.md`](docs/vision/OPERATIVE_LOADOUT.md).

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

## Sprint 2.16 scope — Layout & alignment constitution — **Planned**

**Goal:** One layout grammar across all player routes before material work (2.17–2.18).

**Deliverables (document now; implement in build sprint):**

- **Content max-width constitution** — e.g. 1280–1440px; Armory full-bleed exceptions documented
- **Unified header pattern** — when `pd-strap` vs `PlayerOsPageStrap` vs route-specific (Armory workspace)
- **HQ fixes:** remove duplicate daily habit row; left hub fill balance; dead bands
- **Stats/HQ radar component parity** — same VPP frame and inspector chrome
- **Hide debug/prototype chrome** in player builds — metadata strings (`RDR_S6_generic`), `ALPHA` policy
- **Settings → diegetic button language** — target HQ chamfer/energy CTAs (not bracket buttons)
- **Empty states:** compact + CTA, not warehouse voids (Ceremonies, insufficient TC)
- **Tests:** layout/composition guards, not only source scans — `playerHudSprint216.test.ts`

**Visual acceptance states:** profile incomplete · no telemetry · full telemetry · mobile 390px

**Out of scope:** new features, Epic 3.4/4.1 implementation (gate blocked until 2.19 Done)

**Verify:**

```bash
npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint216.test.ts
npm run check:file-budget && npm run check && npm run build
```

---

## Sprint 2.17 scope — Z-depth & layering system — **Planned**

**Goal:** Replace single-plane panels with explicit Z-stack.

**Token spec (document in [`PLAYER_OS_MATERIAL_SPATIAL.md`](docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md); implement in `player-dossier.css` in build sprint):**

- **Z0 Canvas** — black, grain, vignette
- **Z1 Recessed** — inset wells (radar, inputs, ghost states)
- **Z2 Base panel** — `pd-surface-premium` evolution
- **Z3 Raised** — mission hero, QM cards, dossier card
- **Z4 Floating** — strap, rail active, modals

**Per-route layering map:** HQ — strap Z4, identity stage Z1 inside hub Z2, mission hero Z3, analytics deck Z2 with radar Z1 well.

**Light source:** top-left highlight, bottom-right glow (document in MATERIAL_SPATIAL).

**Fix:** `ibm-root--premium` transparent regression vs inset identity stage.

**Tests:** `playerHudSprint217.test.ts`

**Out of scope:** Epic 3.4/4.1

---

## Sprint 2.18 scope — Material orchestration (Tier A → HQ) — **Planned**

**Goal:** HQ and secondary routes inherit cinematic material from existing premium components.

**Reference implementations:** `VanguardCard.svelte`, `SkillTreeArena.svelte` (SVG bloom filters), `StickerVariantShell.svelte`

**Material ratios target:** void > emissive edges > glass > matte fill (guidance percentages in MATERIAL_SPATIAL)

**Spatial canvas:** persistent perspective grid; shell ambient restored judiciously in dossier mode — not zeroed to flat black

**Shared SVG filter defs** for radar/VPP bloom — Stats/HQ parity with skill tree

**Subtle canvas scanlines/noise on HQ only** — reconcile with PLAYER_OS.md: not on mission text

**Youth-safe Tron adjacency:** cyan/teal data glow + gold action; avoid Ares aggression palette dominance

**Do NOT require WebGL in 2.18** — document optional shader lane for future

**Tests:** `playerHudSprint218.test.ts`

**Out of scope:** Epic 3.4/4.1

---

## Sprint 2.19 scope — Diegetic UI kit + energy motion + gate lift — **Planned**

**Goal:** Close premium track; re-open Epic 3.4 / 4.1.

**Diegetic kit:** toggles, tabs, inputs matching Workout terminal / VanguardCard grammar (not generic forms)

**Energy motion:** progress as conduits; layer-enter motion (strap→hub→deck) replaces flat fade-only stagger

**Hero identity scale rules:** minimum HQ identity footprint; operative as projection not chip

**Route transition:** one-world continuity — shared canvas layers persist across player nav

**Update visual acceptance sign-off;** all checklist rows pass at 1280 + 390

**Sensory note:** optional UI audio/haptics documented as future Epic 1.x — out of scope for 2.19 impl

**Tests:** `playerHudSprint219.test.ts`

**Gate lift:** Epic 3.4+ and Epic 4.1+ unblocked after 2.19 Done + full [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](docs/PLAYER_OS_VISUAL_ACCEPTANCE.md) sign-off

---

## Sprint status — Epic 3: Operative Loadout v2

> **Epic 3.4+ blocked until Sprint 2.19 Done** — Player OS cinematic premium track (2.16–2.19) must complete before album set bonuses.

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
| 3.4 | Planned | Album set bonuses — set completion perks, dossier chip rewards | — |

Vision: [`docs/vision/OPERATIVE_LOADOUT.md`](docs/vision/OPERATIVE_LOADOUT.md)

Loadout art (3.2+) consumed by 2.12 hero identity column.

---

## Sprint status — Epic 4: Comms & Team Operations Hub

> **Epic 4.1+ blocked until Sprint 2.19 Done** — Player OS cinematic premium track (2.16–2.19) must complete before comms wiring.

> **Naming note:** ROADMAP **Epic 4 = Comms Hub**. Unrelated legacy comments (e.g. Firestore "Epic 4.3 LeagueManager") are a different numbering scheme — do not renumber.

| Sprint | Status | Summary | Proof |
|--------|--------|---------|-------|
| 4.0 | Done | Messaging policy charter — household-only adult↔minor | [`docs/vision/COMMS_HUB.md`](docs/vision/COMMS_HUB.md), [`docs/SAFESPORT_COMMS_MATRIX.md`](docs/SAFESPORT_COMMS_MATRIX.md) |
| 4.1 | Planned | Wire send surfaces — `/coach/logistics`, mount MessagesTab, parent-targeted compose | — |
| 4.2 | Planned | SafeSport compliance — block coach→minor, `consentComms`, unify monitored channel path | — |
| 4.3 | Planned | Notification bus — single FCM store, push on announcements/messages | — |
| 4.4 | Planned | Parent comms hub — Parent Lounge, unified inbox, reply UX | — |
| 4.5 | Planned | Schedule → announce → push (deployment calendar integration) | — |
| 4.6 | Planned | Game + payment + registration reminders | — |
| 4.7 | Planned | Team ops mode (TM MVP or coach-delegated logistics) | — |
| 4.8 | Planned | Director club broadcast composer | — |
| 4.9 | Planned | Compliance console + audit export | — |
| 4.10 | Planned | Report message / incident flow | — |
| 4.11 | Planned | Household parent↔child threads | — |
| 4.12 | Planned | Firestore rules + callable integration tests | — |

**Epic 4 runs parallel to Epic 3** after **3.2** ships. **Summer MVP:** 4.1–4.4 + 4.11. **Fall season:** 4.5–4.10 + 4.12.

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
| 2.2 | Partial | PII vault, shredder, retention rules | `vaultOps.js`, `shredOps.test.js`, `firestoreRulesSprint22.test.ts` |
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
| Parent | `/messages` | CC inbox (today); Parent Lounge *(planned — Epic 4.4)* |
| Coach | `/coach` | SquadTelemetryView, assignments, drills, match-day |
| Coach | `/coach/logistics` *(planned — Epic 4.1)* | MessagesTab, announcement compose |
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
