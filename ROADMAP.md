# SSTracker — Delivery Roadmap

**Architecture:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)  
**Last updated:** 2026-05-21  
**Current sprint:** **3.0** — Operative Loadout v2 schema + renderer

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

## Sprint status — Epic 1: Foundation & Player HUD *(aesthetic complete)*

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

**Epic 1 aesthetic complete through 2.10.2.** Operative loadout (gear slots, album bonuses, unlock ceremonies) continues in **Epic 3** — see [`docs/vision/OPERATIVE_LOADOUT.md`](docs/vision/OPERATIVE_LOADOUT.md).

---

## Sprint status — Epic 3: Operative Loadout v2

| Sprint | Status | Summary | Proof |
|--------|--------|---------|-------|
| 3.0 | **Current** | Schema + renderer — loadout slots, Firestore shape, dossier-safe preview | `playerLoadoutSprint30.test.ts` (planned) |
| 3.1 | Planned | Armory studio — equip UX on `/player/armory`, slot picker, portrait sync | — |
| 3.2 | Planned | Art pipeline — sticker variants, asset hashing, catalog ingestion | — |
| 3.3 | Planned | Unlock ceremonies — server-verified drops, confetti gate, minor-safe copy | — |
| 3.4 | Planned | Album set bonuses — set completion perks, dossier chip rewards | — |

Vision: [`docs/vision/OPERATIVE_LOADOUT.md`](docs/vision/OPERATIVE_LOADOUT.md)

---

## Sprint 3.0 scope — Operative Loadout v2 (schema + renderer)

**Goal:** Define the canonical `operativeLoadout` schema, pure render helpers, and a read-only preview component that composes vector portrait + equipped digital slots. No Armory studio UX yet (3.1).

**In scope:**

- `ROADMAP.md` (this update)
- `docs/vision/OPERATIVE_LOADOUT.md` (create — slots, earn paths, COPPA)
- `docs/vision/PLAYER_OS.md` (defer loadout to Epic 3; mark Epic 1 aesthetic complete)
- `src/lib/gamification/loadoutSchema.ts` (create — slot keys, catalog refs, validation)
- `src/lib/gamification/__tests__/loadoutSchema.test.ts` (create)
- `src/lib/components/player/OperativeLoadoutPreview.svelte` (create — dossier-safe renderer)
- `src/lib/types/user.types.ts` (optional `operativeLoadout` field on profile)

**Out of scope:**

- Armory studio equip flows (3.1)
- Sticker art ingestion pipeline (3.2)
- Unlock ceremony UI (3.3)
- Album set bonus logic (3.4)
- Coach / parent / director shells
- Renaming canonical dashboard components

**Verify commands:**

```bash
npm test -- src/lib/gamification/__tests__/loadoutSchema.test.ts
npm run check
npm run build
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
| 2.3 | Planned | SafeSport messaging CC | `docs/FCM_AND_MESSAGING_MATRIX.md` |

**Parallel track:** Epic 2 runs alongside Epic 3 — finish **2.2** (vault/shredder) while **2.3** (SafeSport parent CC) stays planned. Player HUD delivery (Epic 1) does not block compliance work.

---

## Product epics (vision — NOT sprint numbers)

Lettered epics avoid collision with **Epic 5** in [`docs/EPIC5_STATUS.md`](docs/EPIC5_STATUS.md) (enterprise logistics / Director OS) and the old ROADMAP "Epic 5" (state association APIs).

| Epic | Theme | Doc |
|------|-------|-----|
| A | Player training/gaming HUD | [`docs/vision/PLAYER_OS.md`](docs/vision/PLAYER_OS.md) |
| B | Parent co-op | [`docs/vision/PARENT_OS.md`](docs/vision/PARENT_OS.md) |
| C | Coach sideline OS | [`docs/vision/COACH_OS.md`](docs/vision/COACH_OS.md) |
| D | Team Manager ops OS | [`docs/vision/TEAM_MANAGER_OS.md`](docs/vision/TEAM_MANAGER_OS.md) |
| E | Director club ops (+ Registrar) | [`docs/vision/DIRECTOR_OS.md`](docs/vision/DIRECTOR_OS.md) |
| F | Platform admin | [`docs/vision/ADMIN_OS.md`](docs/vision/ADMIN_OS.md) |
| G | Recruiter (future) | [`docs/vision/RECRUITER_OS.md`](docs/vision/RECRUITER_OS.md) |
| H | Tutor (future) | [`docs/vision/TUTOR_OS.md`](docs/vision/TUTOR_OS.md) |
| — | Director logistics build status | [`docs/EPIC5_STATUS.md`](docs/EPIC5_STATUS.md) |

---

## Repo map (quick reference)

| Persona | Route | Key components |
|---------|-------|----------------|
| Player | `/player/dashboard` | OperativeHub, IdentityBentoModule, HudMetricsPanel, ActiveBounties, VanguardProtocolPanel |
| Player | `/player/workout`, `/player/tracker`, `/player/armory` | Command Center drawer links |
| Parent | `/parent/dashboard` | CoOpArena, CarRideArena, BountyTerminal |
| Coach | `/coach` | SquadTelemetryView, assignments, drills, match-day |
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
