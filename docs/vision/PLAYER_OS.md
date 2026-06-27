# Player OS — Vision

**Product Epic A** · Canonical components: `IdentityBentoModule`, `OperativeHub`, `HudMetricsPanel` — **do not rename.**

---

## North star

Deliver an addictive, fluid training/gaming HUD that works for all ages with age-appropriate tone and rewards. HQ must feel like **mission control in the Grid** — sparse void, emissive geometry, glass holographic data, layered depth, hero operative identity — **justifying subscription price**. Material and spatial constitution: [`PLAYER_OS_MATERIAL_SPATIAL.md`](./PLAYER_OS_MATERIAL_SPATIAL.md). Flat audit-ui is insufficient for Player OS; Coach OS stays flat. The home screen should feel like a cinematic operative command deck: clear next action and satisfying progress — without exploitative mechanics for minors.

---

## Primary user

Youth athletes (and teen/adult players in club programs) who log training, complete coach assignments, and track long-term skill growth.

---

## Home screen zones

HQ is an **instrument stack** — shared `pd-os-deck` frame, differentiated inner primitives. Full taxonomy: [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](./PLAYER_OS_INSTRUMENT_TAXONOMY.md).

Layout is owned by **`OperativeHub`** inside **`HUDContainer`** on `/player/dashboard`:

| Zone | Layout | Component | Instrument | Content |
|------|--------|-----------|------------|---------|
| Route header | 12-col | `pd-strap` | Navigation | Callsign, rank · level, world context strip |
| Command main | 8-col (`bento-span-12 md:bento-span-8`) | `IdentityBentoModule` + metrics snippet | Identity + Telemetry (compact) | Operative identity holo card (Z1–Z5 per [`OPERATIVE_ID_CARD.md`](./OPERATIVE_ID_CARD.md)), streak/XP in `IdentityTelemetryBezel`, rank XP bar, last-trained line; collapsed vectors when `!telemetryReady` |
| Mission rail | 4-col (`bento-span-12 md:bento-span-4`) | `ActiveBounties` embedded | Directive | Active missions — **one gold focal** hero CTA; dedup via `deduplicateById` |
| Quick transit | 12-col below hub | `OperativeQuickOps` | Navigation | Route jump tiles on shared deck |
| Pathway preview | 12-col | `OperativePathwayPreview` | Progression | Season track in `pd-os-deck__well` |
| Analytics deck | 12-col below | `VanguardProtocolPanel` + capsules strip | Telemetry | Radar always visible; inspector + memory capsules in recessed void |

**Conditional avatar:** When `operativeAvatar` is not set (`profileIncomplete`), `IdentityBentoModule` shows an inline initials badge beside the name — no empty 72px avatar column. When profile is complete, `HudAvatarRing` column returns.

**Single cohesive command surface:** Command shell and analytics deck share `--pd-panel` under `.player-hud-root` — one depth stack (canvas → hub → inset identity), not multiple competing card fills. Internal depth via gradients, hairlines, and controlled glow — not one flat grey box.

**Below the hub row:**

- `VanguardProtocolPanel` — radar (always shown) + vector inspector
- Memory capsules / archive modules (compact one-line ghost when empty)

Secondary destinations (`/player/workout`, `/player/tracker`, `/player/armory`, skill tree) live in the **shell rail / Command Center drawer** — not clutter on the main HUD.

**Billing read-only gate (Sprint 3.1.2):** When tenant billing blocks athlete mode, **Train** (`/player/workout`) redirects to `/player/settings` from the shell rail. **Armory** stays always reachable so operatives can finish portrait/profile setup in Studio.

---

## Core loops

1. **Daily mission** — open HUD → see top bounty → log workout or complete criterion → XP/streak update.
2. **Streak** — visible in `HudMetricsPanel`; loss-aversion tuned for engagement, not anxiety in U13 flows.
3. **XP & unlocks** — feed armory and skill-tree projections; confetti only after verified server commit.
4. **Armory** — gear/cosmetic unlocks tied to milestones (secondary route). **Operative loadout** preview (`OperativeLoadoutPreview`) + **Studio** equip tab ship in Epic 3.0–3.1; HQ avatar ring reflects equipped **border** when set — [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md).
5. **Memory capsules** — celebratory replay of highlights; parent can co-view.

---

## Rewards philosophy

- Streaks, XP bars, and unlocks reinforce **habit and mastery**, not pay-to-win or dark patterns.
- Minors: no loot-box randomness; rewards tied to logged activity and coach-assigned goals.
- Parent visibility into progress without duplicating the game chrome.

---

## Engagement engine

Player engagement is **youth-safe SDT**, not dark-pattern hooks — see [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) §1 + §4.

- **Autonomy:** pathway preview, loadout equip, mission choice where product allows — player picks the next meaningful action.
- **Competence:** rank XP bar, streak stat cells, skill-tree projections — progress is legible without anxiety copy.
- **Relatedness:** coach bounties and club missions surface in `ActiveBounties`; parent co-view on capsules, not duplicate game chrome.
- **Verified-commit ceremony:** confetti and celebration fire only after successful Firestore batch — async, non-blocking diegetic overlay ([§1 Verified-commit ceremony](./PLATFORM_BUILD_MANDATES.md#§1--accepted-mandates-build-these)).
- **Diegetic trust:** Train/Settings commit paths use in-world terminal grammar — no SweetAlert2 on Player routes (Wave D).
- **Streak visibility:** `HudMetricsPanel` streak + rank-at-risk gold — tuned for engagement, not minor-targeted FOMO.
- **Motion gates:** `prefers-reduced-motion` and `data-dopamine='off'` honored on all celebration and idle motion.
- **Reject:** Hook-model scarcity loops, random loot-box timing, and “do X for Y” controlling copy for minors ([§4 Psychology](./PLATFORM_BUILD_MANDATES.md#§4--psychology-youth-safe-subset)).

---

## Handoffs

| From | To | Flow |
|------|-----|------|
| Coach | Player | Assignments → `ActiveBounties` |
| Parent | Player | VPC unlock → training routes; co-op logs; celebrate streaks |
| Team Manager (future) | Player | Schedule/practice notifications (logistics only) |
| Player | Parent | Progress snapshots, capsule sharing |
| Platform | Player | COPPA/VPC gate before PII/training routes |

---

## Visual tone — Premium Player Dossier (Sprint 2.12 supersedes flat-only 2.8 rules for HQ feel)

**Retained from Sprint 2.8:**

- **Canvas:** black `#000000` (`--pd-bg`) — supersedes Sprint 2.4 flat slate `#0f172a` page surface on HQ.
- **Panels:** lifted `#05050a` (`--pd-panel`) with hairline `rgba(255,255,255,0.1)` borders (`--pd-line`).
- **Dual accent:** gold `#fbbf24` (`--pd-accent-action`) = hero mission CTA, rank XP bar fill, avatar level ring, streak-at-risk pulse, init modal primary only; teal `#14b8a6` (`--pd-accent-data`) = radar polygon, telemetry tags, vector selection, inspector data chrome, primary interactive borders on non-hero controls.
- **Typography:** Geist display for operative name; Geist Mono for labels, values, and status tags only.
- **Corners:** chamfer retained on hero CTA and avatar ring.
- **Grid:** `bento-grid--12col bento-grid--liquid` with fluid gap tokens.
- **Isolation:** No coach-style flat glass panels or gamification chrome on Coach OS (and vice versa). No pay-to-win / minor exploitation.

**Sprint 2.12 direction (shipped):**

- **Depth layers:** panel gradient fills, hairline + inner highlight, optional subtle film grain on `.player-dossier-root` (CSS only, no heavy assets)
- **Gamified hierarchy:** one gold focal (hero mission); rank XP as “level energy”; streak as live status — not equal-weight flat boxes
- **Identity as hero:** `HudAvatarRing` + equipped loadout border/badge always prominent when profile complete; incomplete state still compact
- **Motion:** staggered panel enter, XP bar fill, streak pulse — gated by `prefers-reduced-motion` and remote config
- **Ambient:** controlled glow on active mission card + rank bar; no arcade clutter on Coach/Parent surfaces

Stylesheets: `src/lib/styles/player-dossier.css` (tokens), `src/lib/styles/player-dashboard-hud.css` (HQ layout)

---

## Player OS Design System

**Tokens (Sprint 2.8):** scoped under `.player-dossier-root` in `player-dossier.css` — `--pd-bg`, `--pd-panel`, `--pd-line`, `--pd-accent-action` (gold), `--pd-accent-data` (teal), `--pd-text-muted`, Geist display + mono stacks.

**Structural remap:** Inside `.player-hud-root.player-dossier-root`, `--color-structural` stays slate `#64748b` (not global blue `#3b82f6`). Inner dividers may use muted slate; outer shells use `--pd-line`.

**HQ strap (2.8):** `pd-strap` above `OperativeHub` — eyebrow `Command / HQ`, title = callsign, status tag = rank · level (teal-tinted mono).

**Two-band layout (Sprint 2.4–2.5, surfaces 2.8):**

1. **Command band** — `OperativeHub` command strip: main column (identity inset panel + vector strip, 8 col) + mission rail (4 col). Single `--pd-panel` surface with internal depth — not glass stacks or competing card fills.
2. **Analytics band** — single `player-analytics-deck` bento card: `VanguardProtocolPanel` (radar always visible + inspector) + compact `player-capsules-strip` footer. No standalone third slab for capsules when empty (one-line ghost only).

**Radar:** teal data polygon and vertices (`--pd-accent-data`); slate grid spokes and tier rings (`rgba(148,163,184,…)`). Selected axis label teal; unselected `#94a3b8` / `#cbd5e1`.

**Do:**

- Dossier lifted panels on black canvas (Armory / Stats / HQ aligned)
- Chamfer on hero CTA and avatar ring only
- Avatar level ring only — one ring vocabulary under `.player-hud-root`
- Gold (`--pd-accent-action`) for hero mission CTA, rank XP bar fill, avatar level ring, streak-at-risk pulse, init modal primary only
- Teal (`--pd-accent-data`) for strap eyebrows, radar, inspector, world-context chips, primary interactive borders on non-hero controls
- Stat cell labels + values neutral (`--pd-text` / `--pd-text-muted`); panel borders `--pd-line`
- Armory **Studio** = unified identity editor (portrait designer + loadout equip + dossier card preview); portrait art: [`PORTRAIT_ART_DIRECTION.md`](./PORTRAIT_ART_DIRECTION.md); HQ holo card zones: [`OPERATIVE_ID_CARD.md`](./OPERATIVE_ID_CARD.md)
- Identity streak/XP as ringless stat cells (`HudStatCell`), not mini canvas rings
- Embedded `HudMetricsPanel`: collapsed line when empty; no Match Data in hub
- Conditional avatar: inline initials badge until `operativeAvatar` set; then `HudAvatarRing` column
- Missions never full-width 12-col on desktop — right rail only (4 col)

**Don't:**

- Structural blue `#3b82f6` on player dashboard chrome (eyebrows, bento borders)
- `hud-telemetry-root` on embedded missions inside OperativeHub
- Mini rings on streak/XP metrics (avatar level ring is the sole progress ring)
- Double mission eyebrows (`// MISSION DECK` + `ACTIVE MISSIONS`)
- `border-radius` on Player OS modules (avatar interior exception OK)
- Separate top-level bento cards for telemetry and capsules (one analytics deck only)
- Coach gamification bleed — no arcade HUD chrome on Coach/Parent surfaces

**Superseded by Sprint 2.12 (HQ only):**

- ~~“outer hub shells use flat dossier panels (no decorative scanlines)”~~ → **no scanlines on readable text**; canvas/atmosphere scanlines and noise OK on HQ shell
- ~~“no nested glass stacks”~~ → allow **one** depth stack (canvas → hub → inset identity), not multiple competing cards
- ~~“Single flat surface”~~ → **single cohesive command surface** with **internal depth**, not one flat grey box

**Sprint 2.18 (Done):** Controlled bloom (`pdDataBloom`), glass inset wells (Z1 radar/inspector), emissive edges, persistent spatial grid + canvas scanlines — see [`PLAYER_OS_MATERIAL_SPATIAL.md`](./PLAYER_OS_MATERIAL_SPATIAL.md). **Sprint 2.19 (Done):** diegetic UI kit + energy motion; gate lifted for Epic 3.4 / 4.1.

**Home screen zones (updated):** Identity streak/XP = stat cells in `IdentityBentoModule` (not `HudMetricsPanel`). Command Center = shell nav only (Sprint 2.1.1 — no in-panel CMD trigger).

---

## HQ content loop (Sprint 2.6)

Three blocks answer the 3-second clarity test on `/player/dashboard`:

| Block | Location | Source |
|-------|----------|--------|
| **Hero mission** | Top of mission rail (`ActiveBounties` embedded) | `selectPrimaryBounty` on deduped quests — one gold chamfer CTA; hero excluded from compact list below |
| **Rank progress** | `IdentityBentoModule` under team/rank meta | `getCurrentRank(totalXp)` — thin gold XP bar + `{n} XP TO {nextRank}` (or max-tier copy) |
| **Last session** | `IdentityBentoModule` one line | `player_stats.last_training_utc` via existing `statsRaw` on +page — `formatLastTrainingLabel` (Today / Yesterday / compact date) |

**North star:** Do now (hero CTA) · progress (rank bar) · last activity (last trained).

---

## Presence & hierarchy (Sprint 2.7)

Feel pass — no layout rearchitecture. HQ should read intentional in ~3 seconds.

| Rule | Implementation |
|------|----------------|
| **Correct hero** | `resolveHeroQuest(items, { lastTrainingUtc })` — if not trained today → `daily-training-log`; if trained today + streak active → `daily-streak-check`; else `selectPrimaryBounty` |
| **One gold focal** | Only `.quest-hero__cta` is full gold chamfer in the command viewport; title white, reward muted |
| **Hub vectors empty** | Embedded `HudMetricsPanel`: one `.hmp-vectors-collapsed` line instead of six `00` cells when `!telemetryReady` |
| **Radar always on** | `VanguardProtocolPanel` never hidden; `.player-analytics-deck--compact` + `compact` prop when `!hasVanguardTelemetry` (~40% shorter band) |
| **Profile incomplete** | Slim `.ibm-profile-banner` at top of identity — not full-width gold setup CTA |
| **Typography** | Name dominant (`.ibm-name`); team · rank slate (`.ibm-meta` `#64748b`); labels whisper (9px slate) |

**Locked:** OperativeHub 8+4 frozen. Schedule/coach pulse deferred post–2.8.

---

## Player Dossier unification (Sprint 2.8)

| Accent | Use |
|--------|-----|
| Gold `--pd-accent-action` | Hero CTA, rank bar fill, avatar ring, streak highlight |
| Teal `--pd-accent-data` | Radar polygon, VPP inspector bar, hub vector selection, telemetry eyebrows |

Shared token file: `src/lib/styles/player-dossier.css`. Dashboard route adds `player-dossier-root` + `pd-strap` header. Supersedes 2.4 “Gold Command” flat slate page background.

---

## Dossier polish (Sprint 2.8.1)

Small feel pass on 2.8 — no layout rearchitecture.

| Fix | Implementation |
|-----|----------------|
| **Hero / training mismatch** | `resolveHeroQuest` synthesizes `daily-training-log` when `!isTrainingToday(lastTrainingUtc)` even if the daily was filtered from the quest list via `claimedIds` |
| **Profile banner** | `.ibm-profile-banner` uses `--pd-panel`, teal eyebrow, gold hover border (not blue-grey button chrome) |
| **Strap dedupe** | `pd-strap` keeps callsign as page title; `IdentityBentoModule` accepts `hideDisplayName` so team · rank is the only identity line in the hub |
| **Empty telemetry** | `.player-analytics-deck--compact` further tightens deck height, radar width, and inspector ghost spacing when `!telemetryReady` |

---

## Compact telemetry radar (Sprint 2.8.2)

When `!telemetryReady`, compact deck shrinks inspector padding and ghost copy — **not** the radar; chart targets `min(100%, 220px)` mobile / `min(100%, 260px)` desktop so the attribute polygon stays legible.

---

## Shell alignment (Sprint 2.9)

Player shell (`PlayerShell`) applies `ps-root--dossier` on all player-role routes so nav rail and ambient match the Player Dossier canvas — not only pages that declare `player-dossier-root`.

| Surface | Treatment |
|---------|-----------|
| **Ambient** | Grid/glow opacity reduced; black canvas `--pp-bg: #000000` |
| **Mobile dock / desktop rail** | Dark panel `#05050a`, hairline `--pd-line` borders; HQ hub = subtle gold gradient border (action accent); other active routes = teal gradient (data accent) — Armory tab language, not rounded gold glass pill |
| **Scrollbar** | Gold-to-teal thumb gradient on `.ps-canvas` |
| **Canvas gradient** | `.ps-canvas-bg` softened under dossier shell |

Page roots: HQ, Stats, Armory, Workout, Tracker, Skill Tree, and `/player/settings` declare in-page `--pd-*` tokens; shell class covers nav alignment on all player routes.

Stylesheet: `src/lib/styles/player-shell.css`

---

## Route parity (Sprint 2.11)

Secondary and in-nav player routes now match HQ / Armory / Stats dossier vocabulary:

| Route | Root | Strap / header |
|-------|------|----------------|
| `/player/dashboard` | `player-dossier-root` | `Command / HQ` |
| `/stats` | `player-dossier-root` | Operative Analytics |
| `/player/armory` | `player-dossier-root` | Armory workspace |
| `/player/workout` | `player-dossier-root` | `Train / Log session` |

**Benchmark combine drills (SURFACE-MERGE-BENCHMARKS):** No standalone `/player/proving-grounds` terminal. Coach assigns `missionKind: benchmark` from Forge; player accepts on HQ mission rail and logs numeric results in **Train** (`TrainBenchmarkPanel`). XP flows via `logTrainingSession`; Scouts Six display stats dual-write to `users.armory.stats` until server benchmark fields land on `player_stats`.

| `/player/tracker` | `player-dossier-root` | `Progress / Training tracker` |
| `/player/skill-tree` | `player-dossier-root` | `Progress / Skill tree` |
| `/player/settings` | `player-dossier-root ps-settings-root` | `Profile / Settings` |

Shared patterns: black `--pd-bg` canvas, lifted `--pd-panel` cells, `--pd-line` borders, teal primary CTAs (`qa-btn--ready`), gold only on XP/progress fills. Coach/Parent/Director use legacy `/settings` terminal shell (players redirect to `/player/settings` — Sprint 2.16.1).

**Epic 1 route parity complete** through Sprint 2.11. **2.11.1** remaps shared components (ActiveBounties rail, Armory trajectory/album, IntelModal, ProPlayerCard) onto dossier tokens and tightens HQ density.

---

## Shared components (2.11.1)

Components embedded on player routes but authored outside page roots were leaking legacy SIEM / hud-telemetry / slate-glass chrome. Sprint 2.11.1 consolidates overrides under `.player-dossier-root` and `player-missions.css`.

| Accent | Use on dossier surfaces |
|--------|-------------------------|
| **Gold** (`--pd-accent-action`) | HQ hero mission CTA, rank XP fill, current pathway level ring |
| **Teal** (`--pd-accent-data`) | Primary buttons, data labels, radar polygon, Armory active tab, progress fills |

**Avoid on player dossier surfaces:** `#22d3ee`, `#3b82f6`, `tw-bg-slate-900/*` glass stacks, `backdrop-blur` on panel shells.

Stylesheets: `player-dossier.css` (`.pd-glass-panel`), `player-missions.css` (embedded mission rail under `.player-hud-root`).

HQ density (2.11.1): when `!telemetryReady`, hide embedded `HudMetricsPanel` vectors — single `VanguardProtocolPanel` radar in analytics deck; missions column `align-self: start`; tighter `--bento-gap-liquid` in `.player-hud-root`.

---

## World context (Sprint 2.10 / 2.10.1 / 2.10.2)

HQ presence meta row **inline inside `pd-strap`** (2.10.1 supersedes the full-width bordered strip between strap and hub). **2.10.2** restores schedule usefulness: the inline strap **always** shows a schedule slot — next-event tag or muted ghost `No sessions scheduled` — with deduped status chips on the same flex-wrap row (no extra alert panel).

| Signal | Source | Fallback |
|--------|--------|----------|
| **Next team event** | Firestore `schedules` — `teamId` + `startAt >= now` (one `onSnapshot` on +page); legacy `date`/`time` docs resolved client-side when indexed query is empty or denied | Inline: ghost `No sessions scheduled` (`.hq-world-context__ghost`, no border); non-inline panel still hides when `showScheduleMeta` is false and no chips |
| **Coach missions pulse** | `ActiveBounties` embedded — `onCoachBountyCount` callback counts coach intent + homework bounties (no duplicate listener) | Chip omitted when count is 0 |
| **Status chips** | `resolveHqStatusBadges` in `hqWorldContext.ts` — streak live, coach missions; train-today omitted when hero is `daily-training-log`; profile-incomplete omitted when hub profile banner is visible | Only relevant chips render; dossier chip styling |

Pure helpers: `src/lib/player/dashboard/hqWorldContext.ts` (`resolveNextEventLabel`, `resolveHqStatusBadges`, defensive schedule parsing).

Component: `HqWorldContextStrip.svelte` with `inline` prop + `.hq-world-context--inline`. Strap slot: `.pd-strap__context`. Styles: `player-dashboard-hud.css` + `player-dossier.css`.

---

## HQ Premium composition (Sprint 2.12)

Target layout for the premium HQ pass — depth, gamification, and hierarchy without renaming canonical components.

| Layer | Treatment |
|-------|-----------|
| **Strap** | Command eyebrow + world context + callsign — tighter, integrated with hero |
| **Command hub** | 8+4 with **inset identity stage** (portrait ring + loadout + rank bar glow) |
| **Mission rail** | Card-like rows, progress shimmer, gold hero CTA |
| **Analytics** | One deck — radar + inspector unified; aggressive compact empty state |
| **Capsules** | Footer strip only; no third empty slab |

**3-second clarity test (retained from 2.6/2.7):** Can the player answer (1) what to do now, (2) how close to next rank, (3) when they last trained — within ~3 seconds of landing on HQ?

---

## Premium vs flat (explicit)

| Phase | Scope |
|-------|-------|
| **Sprints 1.1–2.11.1** | Parity / tokens — Player Dossier canvas, dual accent, shell alignment, route parity, shared component pass |
| **Sprints 2.12–2.15** | Tier B foundation (Done, insufficient alone) — matte dossier panels, token parity, component premium, motion + checklist |
| **Sprints 2.16–2.19** | Cinematic orchestration (**Done**) — layout constitution, Z-depth, material orchestration, diegetic UI + energy motion |
| **Epic 3** | Identity cosmetics — loadout borders/badges, unlock ceremonies, album set bonuses *(3.4 unblocked after 2.19 Done + sign-off)* |
| **Epic 4** | Comms — messaging, notifications, parent inbox *(4.1+ unblocked after 2.19 Done + sign-off)* |

Token parity alone does not make HQ premium. Epic 3 loadout art feeds the identity column but does not replace 2.16–2.19 cinematic orchestration.

---

## Premium track retcon (post-2.15 review)

Sprints 2.12–2.15 shipped a cohesive **Tier B** Player Dossier — not the cinematic operative OS north star.

| Tier | Surfaces | Bar |
|------|----------|-----|
| **Tier A (cinematic)** | `VanguardCard`, `SkillTreeArena`, `StickerVariantShell`, Proving Grounds | Parallax, holographic foil, SVG bloom, glass — ~4–5/5 cinematic |
| **Tier B (dossier admin)** | HQ hub, Stats, Settings | `#05050a` fills, hairlines, grain; HQ suppresses ambient — ~2–2.5/5 cinematic |

**2.15 Done** = motion + checklist shipped; **does not** lift Epic 3.4 / 4.1 gate. Full constitution: [`PLAYER_OS_MATERIAL_SPATIAL.md`](./PLAYER_OS_MATERIAL_SPATIAL.md).

---

## Epic 1 — Premium Ecosystem Track 2.12.1–2.19

**Why 2.12 failed acceptance:** subtle CSS deltas only; HQ-only scope; profile-incomplete left an empty 8-col void; analytics deck stayed flat `bento-card`; tests were source-scan only (no visual acceptance states).

**Why 2.12–2.15 still insufficient:** Tier A/Tier B split; flat HQ orchestration; source-scan QA false-green; acceptance doc lacked material/spatial bar.

| Sprint | Focus | Acceptance states |
|--------|-------|-------------------|
| **2.12.1** | HQ hotfix — incomplete profile hero, analytics premium, inset fix, stronger depth | profile incomplete · no telemetry · full telemetry · mobile 390px |
| **2.13** | Player OS Chrome — `pd-surface-premium` on all player routes via shared shell (**shipped**) | same four states |
| **2.14** | Component premium — VPP, capsules, Armory/Workout/Tracker/SkillTree panels (**shipped**) | same four states |
| **2.15** | Gamification motion layer + visual acceptance checklist (**shipped** — gate **not** lifted alone) | same four states + motion · see [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) |
| **2.16** | Layout & alignment constitution — max-width, header grammar, HQ fixes, debug-chrome policy (**planned**) | layout/composition guards |
| **2.17** | Z-depth & layering — Z0–Z4 tokens, per-route map (**planned**) | ≥3 Z-layers visible on HQ |
| **2.18** | Material orchestration — Tier A techniques on HQ/secondary routes (**planned**) | bloom, glass wells, spatial grid |
| **2.19** | Diegetic UI kit + energy motion; **lifts gate** for Epic 3.4 / 4.1 (**Done**) | full acceptance sign-off |

**Epic 1 premium track 2.12.1–2.19 Done.** Tier B foundation 2.12–2.15 + cinematic orchestration 2.16–2.19 complete.

**Shipped through 2.12 (foundation only):** depth tokens (`--pd-depth-*`), premium hub shell, mission card faces, single telemetry surface, strap vignette. Insufficient alone — superseded by 2.12.1–2.19 track.

**Epic 3 handoff:** Album set bonuses (3.4) **open** after **2.19 Done** — pending full visual acceptance sign-off. Loadout schema + Armory studio **shipped** (3.0–3.3) — [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md).

**Epic 4 handoff:** Comms wiring (4.1+) **open** after **2.19 Done** — pending full visual acceptance sign-off — [`COMMS_HUB.md`](./COMMS_HUB.md).

---

## Epic 1 — premium HQ foundation (Sprint 2.12 — superseded by 2.12.1–2.19)

**Epic 1 premium track Done through 2.19.** Token parity (2.11.1) plus Tier B depth tokens on `/player/dashboard` — cinematic orchestration **2.16–2.19 complete**.

Shipped through 2.12: Player Dossier depth tokens (`--pd-depth-*`), premium hub shell, inset identity stage, mission card faces, single telemetry surface (VPP owns radar when ready), strap/shell vignette, and compact profile-incomplete band.

**Epic 3 (in progress):** operative loadout schema + Armory studio equip UX **shipped** (3.0–3.3). HQ ring shows equipped border via `HudAvatarRing` + `renderLoadoutBorderLayer`. Remaining: album set bonuses (3.4) — see [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md).

---

## Out of scope (Player OS)

- Renaming `IdentityBentoModule`, `OperativeHub`, `HudMetricsPanel`, `ActiveBounties`, `VanguardProtocolPanel`
- Refactoring `teamsStore` for mission dedup (use `deduplicateById` in `ActiveBounties`)
- Coach tactical board, parent billing UI, director field ops
- New JWT roles

---

## ROADMAP link

**Shipped premium pass:** [ROADMAP Sprint 2.12 — HQ Premium](../../ROADMAP.md#sprint-212-scope--hq-premium--done)

**Current build sprint:** [ROADMAP Sprint 2.16 — Layout & alignment constitution](../../ROADMAP.md#sprint-216-scope--layout--alignment-constitution--planned) · Material constitution: [`PLAYER_OS_MATERIAL_SPATIAL.md`](./PLAYER_OS_MATERIAL_SPATIAL.md) · Visual acceptance: [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) · [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md)

**Completed token parity:** Epic 1 Sprints 1.1–2.11.1 (bento, RBAC, Player Dossier, shell alignment, inline strap world context, schedule always visible, secondary route parity, shared component dossier pass).
