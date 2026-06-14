# Player OS — Rubric Gap Matrix

**Read-only audit** · **Date:** 2026-05-24  
**Sources:** [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) (§1, §2 Player row, §4, §5, §6), [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](./PLAYER_OS_INSTRUMENT_TAXONOMY.md), [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md), [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md)  
**Scope:** PlayerShell + seven Player routes. **No code changes in this session.**

**Legend:** **Pass** · **Partial** · **Fail**  
Principles **P1–P8** map to rubric §1 (3-second judgment → Trust). **Persona** = §2 Player row. **Foundation** = void / Z-depth / Tier A–B / §9 anti-patterns. **VA** = matching `PLAYER_OS_VISUAL_ACCEPTANCE.md` reference-matrix row + core acceptance states.

---

## Summary table (route × principle)

| Route | P1 3-sec | P2 Value | P3 Visual | P4 Interaction | P5 Copy | P6 Perf | P7 Personal | P8 Trust | Persona | Foundation | VA row |
|-------|:--------:|:--------:|:---------:|:--------------:|:-------:|:-------:|:-----------:|:--------:|:-------:|:----------:|:------:|
| **PlayerShell** (rail, ambient, scroll) | Partial | Partial | Partial | Pass | Pass | Pass | Partial | Pass | Pass | Pass | — |
| **HQ** `/player/dashboard` | Partial | Partial | Partial | Partial | Pass | Partial | Pass | Pass | Partial | Partial | Fail |
| **Stats** `/stats` | Fail | Partial | Fail | Partial | Partial | Partial | Pass | Pass | Partial | Fail | Fail |
| **Train** `/player/workout` | Partial | Partial | Partial | Partial | Partial | Pass | Pass | Partial | Partial | Partial | Fail |
| **Armory** `/player/armory` | Partial | Partial | Fail | Partial | Pass | Pass | Pass | Pass | Partial | Partial | Fail |
| **Settings** `/player/settings` | Partial | Partial | Partial | Pass | Pass | Pass | Pass | Partial | Partial | Partial | Fail |
| **Tracker** `/player/tracker` | Partial | Partial | Partial | Pass | Pass | Pass | Partial | Pass | Partial | Partial | Fail |
| **Skill tree** `/player/skill-tree` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Partial |

**Cross-route notes**

- **VA column = Fail** on every shippable route because reference-matrix 1280px / 390px boxes and void-contract sign-off remain unchecked in `PLAYER_OS_VISUAL_ACCEPTANCE.md` (blocked on **6i** after **6l**).
- **Skill tree** is the Tier A benchmark; treat **VA = Partial** only because formal screenshot sign-off is still open — material canon is met in code.
- **Tracker** is not in `PlayerShell` `NAV_LINKS` (HQ, Stats, Train, Armory, Settings only); reachable via deep links / Quick Ops context, not primary nav.

---

## Principle detail (by route)

### PlayerShell — `PlayerShell.svelte`, `player-shell.css`

| Check | Score | Evidence |
|-------|:-----:|----------|
| Native document scroll (§4) | Pass | `ps-root` `min-height: 100dvh`, `overflow-y: visible`; no `overflow-y: auto` on `ps-scroll-shell` / `ps-canvas` (Sprint 2.20a). |
| Fixed ambient + rail | Pass | `ps-ambient` / `ps-rail` `position: fixed`; rail links `min-height: 44px`. |
| Z0 canvas | Pass | `#000` dossier tokens; grid/glow/scanlines on ambient only. |
| Route continuity | Partial | Shared `player-dossier-root pd-grain pd-chrome-root`; `data-dopamine` on canvas. Motion sign-off (layer enter, route continuity) still ☐ in VA. |
| Visual discipline | Pass | 6j closure (J-10): generic `:global(.bento-card/.card/.ec-panel)` scoped off `ps-root--dossier` + `player-dossier-root`; route CSS owns void-first material. |
| P1 3-second | Partial | Atmosphere reads cinematic; bottom dock / left rail competes with first content on mobile. |

### HQ — `/player/dashboard`

| Check | Score | Evidence |
|-------|:-----:|----------|
| Identity Z3 hero | Partial | `HologramCardShell` + operative portrait (6a/6f-c). Embedded `ibm-root--inset` / identity stage still adds a Z1 well frame around the holo shell. |
| Void ≥40% / matte ≤35% | Partial | Analytics void island (6c) + void-friendly OperativeHub `--pd-os-hero-fill` (6j closure); tokens documented — formal pixel sample remains **6i**. |
| One gold focal | Partial | Coach mission gold accent + streak-at-risk gold on identity stage — risk of dual gold focal per viewport. |
| Tier A / anti-patterns | Partial | VPP uses `AttributeRadar` + `pdDataBloom` (good). **OperativeHub** scoped `overflow: hidden` conflicts with Sprint 2.20c guard intent (clip risk). Init modal uses flat `pd-panel`. |
| Must-feel (VA) | Fail | Identity Z3 + void + mission rail + document scroll directionally correct; 1280/390 ☐. |

**Key files:** `+page.svelte`, `IdentityBentoModule.svelte`, `OperativeHub.svelte`, `ActiveBounties.svelte`, `OperativeQuickOps.svelte`, `OperativePathwayPreview.svelte`, `VanguardProtocolPanel.svelte`, `HUDContainer.svelte`, `player-dashboard-hud.css`, `player-missions.css`, `player-dossier.css`

### Stats — `/stats` (player role)

| Check | Score | Evidence |
|-------|:-----:|----------|
| Investigation workspace | Partial | Radar band uses `stats-analytics-void` + VPP (6g); achievement matrix + seg toggles use edge-lit `pd-os-deck` rows and `stats-chip` rail (Wave C / 6j closure). |
| Radar full-width, no nested borders | Partial | VPP chart well is clean (2.20b removed extra `::before`/`::after`). Workout band uses Chart.js canvas in Z1 well — functional, not cinematic. |
| Diegetic kit | Partial | Period toggles use `stats-chip` rail; badge grid uses edge-lit Z2 `stats-achievement-row` decks (6j closure). |
| Typography | Partial | `PlayerOsPageStrap` present; body hints still mono-heavy admin copy. |
| Must-feel (VA) | Fail | ROADMAP **6l** explicitly defers cinematic investigation workspace; all VA boxes ☐. |

**Key files:** `stats/+page.svelte`, `VanguardProtocolPanel.svelte`, `AttributeRadar.svelte`, `PlayerOsPageStrap.svelte`, `player-dashboard-hud.css`, `player-dossier.css`, `director-os.css` (imported — verify no Coach chrome leakage)

### Train — `/player/workout`

| Check | Score | Evidence |
|-------|:-----:|----------|
| Diegetic terminal | Partial | `pw-theater` + corner brackets (6h/6j-b); **does not mount `ProvingGrounds.svelte`**; no scoped `pg-scanline`; sliders are styled native `<input type="range">`, not `pw-loadbar` conduit (§7). |
| Equal-height / no inner scroll | Pass | Single hero deck; no `pw-panel--threat` inner scroll trap. |
| Interaction trust | Partial | **SweetAlert2** modals (`Swal.fire`, `customClass: { popup: 'card' }`) break diegetic terminal grammar on success/error. |
| Must-feel (VA) | Fail | Terminal direction correct; formal screenshots ☐. |

**Key files:** `workout/+page.svelte`, `player-terminal.css`, `player-dossier.css`, `player-dashboard-hud.css`, `ProvingGrounds.svelte` (reference — not wired on route)

### Armory — `/player/armory`

| Check | Score | Evidence |
|-------|:-----:|----------|
| Header grammar | Fail | Custom **`qa-strap`** — third header pattern; Foundation §7 requires `pd-strap` (HQ) or `PlayerOsPageStrap` (all other routes). |
| Studio dossier Z3 | Partial | `HologramCardShell` in Studio (6f) — benchmark met in tab; QM grid still Tier B cards. |
| Tabs | Partial | `qa-workspace` buttons — not `pd-os-tab-trail` / `PlayerOsTabRail`. |
| Visual discipline | Fail | Extra accent `#00d4ff` (“cyber”) competes with gold/teal canon (~3-color rule). |
| Must-feel (VA) | Fail | Pathway timeline / album aspect / command deck partially shipped; matrix ☐. |

**Key files:** `armory/+page.svelte`, `ArmoryCommandDeck.svelte`, `ArmoryAlbumWorkspace.svelte`, `OperativeLoadoutStudio.svelte`, `OperativeCeremoniesPanel.svelte`, `GrowthVelocityHUD.svelte`, `MemoryCapsuleArena.svelte`, `player-dossier.css`, `HologramCardShell.svelte`, `VanguardCard.svelte`

### Settings — `/player/settings`

| Check | Score | Evidence |
|-------|:-----:|----------|
| Diegetic controls | Partial | `PlayerOsToggle`, `PlayerOsInput`, `PlayerOsTabRail`, `PlayerOsButton`; panels `ps-settings-panel pd-os-deck` (6j-b). |
| Browser-default | Partial | Native `confirm()` for phone unlink; otherwise no raw `<input type="checkbox">`. |
| Must-feel (VA) | Fail | Pause-menu calibration feel close; sign-off ☐. |

**Key files:** `settings/+page.svelte`, `PlayerSettingsPanel.svelte`, `PlayerOsPageStrap.svelte`, `player-dossier.css`, `playerSettingsHandlers.ts`, `os/PlayerOs*.svelte`

### Tracker — `/player/tracker`

| Check | Score | Evidence |
|-------|:-----:|----------|
| Not a log list | Partial | Stat row + optional `MemoryCapsuleArena`; no trend timeline / replay log primitive. |
| Capsule Tier A | Partial | Arena uses dossier mode; ghost uses `pd-os-deck__well` (6j-b). |
| Discovery | Partial | Route exists but **absent from shell rail** — personalization / journey continuity gap. |
| Must-feel (VA) | Fail | Matrix ☐. |

**Key files:** `tracker/+page.svelte`, `HudStatCell.svelte`, `MemoryCapsuleArena.svelte`, `player-dashboard-hud.css`, `player-dossier.css`

### Skill tree — `/player/skill-tree` *(reference benchmark — do not modify)*

| Check | Score | Evidence |
|-------|:-----:|----------|
| Tier A primitive | Pass | `SkillTreeArena.svelte` SVG bloom + state gradients; shared VFX defs. |
| Must-feel | Partial | Code meets benchmark; VA screenshots still ☐. |

**Use only as visual/material reference** when lifting HQ, Stats, Train, Armory, Settings. **Do not refactor Skill Tree** in Foundation → Armory build waves unless a regression fix is unavoidable.

---

## Top 5 blockers (ranked by user impact — 3-second test first)

| Rank | Blocker | Instrument | Routes | Mandate | Why it fails the 3-second test |
|:----:|---------|------------|--------|---------|--------------------------------|
| **1** | **Stats reads flat admin dashboard**, not investigation workspace | Telemetry | `/stats` | BUILD §1 Diegetic Player UX · Wave C | Wave C + 6j closure shipped diegetic chips + edge-lit rows; VA sign-off still ☐. |
| **2** | **Void contract unsigned; HQ hub still matte-heavy** | Identity + Frame | HQ, Shell | BUILD §1 12-col liquid bento + clamp() · BUILD §2 reject “Eradicate dead space” | Void-friendly hero fill + void-first bento tokens shipped (6j closure); pixel sample remains **6i**. |
| **3** | **Armory header + accent sprawl breaks persona skin** | Navigation | `/player/armory` | BUILD §2 neon cyan reject · Wave E | Custom strap + cyan `#00d4ff` reads separate product; breaks “one command deck” continuity from HQ. |
| **4** | **Train breaks diegetic trust at commit time** | Execute | `/player/workout` | BUILD §2 SweetAlert2 reject · BUILD §1 Verified-commit ceremony | SweetAlert popups + unstylized range inputs snap user out of terminal fantasy on the primary action. |
| **5** | **No formal VA / void sign-off gate** | All types | All routes | BUILD §3 Wave F · BUILD §1 Performance = premium | Epic 3.4 / 4.1 launch blocked; teams cannot prove ≥40% void / ≤35% matte / emissive ≥15% without **6i** measurement. |

---

## Recommended fix order

Aligns with build sessions **A → E** below. **Skill tree excluded from implementation** (reference only).

```
Foundation (Shell + tokens + scroll + VFX)
    → HQ (identity void, hub deck demotion, gold focal audit)
        → Telemetry / Stats (6l investigation workspace)
            → Train + Settings (terminal parity, diegetic commit path)
                → Armory (strap unification, tab kit, accent discipline)
                    → 6i sign-off (screenshots + void pixel sample)
```

| Wave | Sprint hook | Outcome |
|------|-------------|---------|
| **A — Foundation** | 6i prep, shell regression | Scroll contract locked; ambient/Z0 measured; global card chrome scoped. |
| **B — HQ** | 6j-a follow-up / hub polish | OperativeHub void-friendly; single gold focal; overflow clip removed; VA HQ states captured. |
| **C — Telemetry** | **6l-a / 6l-b** | Stats matches HQ analytics void + edge-lit achievement rows. |
| **D — Train + Settings** | 6h follow-up | Wire or mirror `ProvingGrounds` grammar; replace Swal with diegetic modal; settings trust copy. |
| **E — Armory** | Strap + tabs + QM depth | `PlayerOsPageStrap`; `pd-os-tab-trail`; retire cyber accent; Studio regression only. |

---

## Build sessions A–E — per-route file lists

Touch **≤5 files per session** unless sprint doc expands scope.

### Session A — Foundation (Shell, scroll, tokens, VFX)

**Wave A status (2026-05-24):** Partial → addressed in code
- Void contract measurable via `src/lib/player/visual/voidContract.ts` + `playerHudSprint241.test.ts`
- Player accent canon: `--pd-accent-data-bright` teal-derived; `#00d4ff` retired from `player-dossier.css`
- Shell rail `:active` instant press feedback; generic `pp-card` chrome scoped off dossier routes
- `PlayerDiegeticOverlay.svelte` stub for Wave D Swal replacement
- `qa-strap` guard on Armory (fix deferred Wave E)

| File | Role |
|------|------|
| `src/lib/components/shell/PlayerShell.svelte` | Scroll shell, `data-dopamine`, billing banner placement |
| `src/lib/styles/player-shell.css` | Z0 ambient, rail, `ps-root` scroll physics |
| `src/lib/styles/player-dossier.css` | `--pd-*` tokens, `pd-os-deck` kit, void-first gradients |
| `src/components/VanguardVFX.svelte` | Shared `#pdDataBloom` / bloom defs |
| `src/lib/components/player/dashboard/__tests__/playerHudSprint220.test.ts` | Scroll + anti-pattern guards (extend, never delete) |

### Session B — HQ

**Wave B status (2026-05-24):** Partial → addressed in code
- OperativeHub `pd-os-deck--hero` void-friendly slab + `overflow: visible`
- Single gold focal: `quest-row--hero` mission CTA; rank bar demoted via `:has(.quest-row--hero)`
- Identity trench lightened; `ibm-root--inset` removed on embedded path
- Mission rail flush inside hero deck (no nested Z2 panel)
- Proof: `playerHudSprint242.test.ts`

| File | Role |
|------|------|
| `src/routes/(app)/player/dashboard/+page.svelte` | Composition, analytics void, strap |
| `src/lib/components/player/dashboard/OperativeHub.svelte` | Hub deck / overflow / identity stage |
| `src/lib/components/player/dashboard/IdentityBentoModule.svelte` | Z3 holo identity, onboarding CTA |
| `src/lib/components/player/dashboard/ActiveBounties.svelte` | Mission rail, gold focal discipline |
| `src/lib/styles/player-dashboard-hud.css` | HQ void, VPP, Quick Ops, capsules strip |
| `src/lib/styles/player-missions.css` | Mission row chrome |

*Also monitor:* `OperativeQuickOps.svelte`, `OperativePathwayPreview.svelte`, `VanguardProtocolPanel.svelte`, `HUDContainer.svelte`

### Session C — Telemetry (Stats)

| File | Role |
|------|------|
| `src/routes/(app)/stats/+page.svelte` | Player layout, badge matrix, seg controls |
| `src/lib/components/player/dashboard/VanguardProtocolPanel.svelte` | Shared radar + inspector |
| `src/lib/components/player/dashboard/AttributeRadar.svelte` | Tier A radar primitive |
| `src/lib/styles/player-dashboard-hud.css` | `stats-analytics-void`, `stats-workout-band` |
| `src/lib/styles/player-dossier.css` | Edge-lit rows, deck/well classes for Stats |
| `src/lib/components/player/dashboard/__tests__/playerHudSprint236.test.ts` | Extend Stats guards |

*Visual acceptance target:* `docs/visual-acceptance/sprint-2.22-slice-6l/` (planned per ROADMAP)

### Session D — Train + Settings

| File | Role |
|------|------|
| `src/routes/(app)/player/workout/+page.svelte` | Terminal layout, commit UX |
| `src/lib/components/player/ProvingGrounds.svelte` | Diegetic reference / extract patterns |
| `src/lib/styles/player-terminal.css` | Brackets, scanline, conduit sliders |
| `src/routes/(app)/player/settings/+page.svelte` | Route shell |
| `src/lib/components/player/PlayerSettingsPanel.svelte` | Diegetic form deck |
| `src/lib/components/player/os/PlayerOsToggle.svelte` | Toggle kit |
| `src/lib/components/player/os/PlayerOsInput.svelte` | Input kit |
| `src/lib/components/player/os/PlayerOsTabRail.svelte` | Tab kit |

### Session E — Armory

| File | Role |
|------|------|
| `src/routes/(app)/player/armory/+page.svelte` | Strap → `PlayerOsPageStrap`, workspace tabs |
| `src/lib/components/player/ArmoryCommandDeck.svelte` | Command deck summary |
| `src/lib/components/player/OperativeLoadoutStudio.svelte` | Studio holo dossier (regression only) |
| `src/lib/components/player/ArmoryAlbumWorkspace.svelte` | Album / pathway scroll affordance |
| `src/lib/styles/player-dossier.css` | QM card deck, tab trail |
| `src/lib/components/player/HologramCardShell.svelte` | Z3 shell (reference — minimal touch) |

---

## Skill tree — explicit handling

> **Do not touch Skill Tree except as a reference benchmark.**

- `/player/skill-tree` is the **Tier A reference** for SVG bloom, state gradients, and void-forward layout (`SkillTreeArena.svelte`, `SkillTreeHUD.svelte`).
- When lifting HQ / Stats / Train / Armory / Settings, **diff against Skill Tree screenshots** at 1280px and 390px — do not copy layout IA wholesale.
- Allowed Skill Tree changes: **none** in sessions A–E unless a shared primitive bug (e.g. `VanguardVFX.svelte`) forces a cross-route fix — then fix the primitive, not the tree layout.
- Skill Tree is **not in the shell rail**; no nav work required for benchmark parity.

---

## §5 checklist snapshot (Player OS)

| # | Check | Status |
|---|-------|--------|
| 1 | 3-second type hierarchy + first action | Partial — Stats/Armory weakest |
| 2 | Restrained palette, no decorative stacks | Partial — Armory cyan; HQ hub matte |
| 3 | Tap feedback on controls | Partial — Train commit modal |
| 4 | Motion + reduced-motion / dopamine-off | Partial — coded; VA ☐ |
| 5 | Persona copy | Pass — operative voice on Player routes |
| 6 | Loading / error graceful | Partial — HQ spinner; Train Swal |
| 7 | Trust / permissions | Partial — Settings `confirm()` |
| 8 | Fewer things, executed perfectly | Fail — Stats + Armory feature density vs polish |
| 9 | Player cinematic deck (§2) | Partial |
| 15–16 | FOUNDATION + VISUAL_ACCEPTANCE | Fail sign-off — implementation in progress |

---

## Related links

| Doc | Role |
|-----|------|
| [`ROADMAP.md`](../../ROADMAP.md) | **6l** Stats workspace (planned), **6i** sign-off |
| [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) | Sign-off gate |
| [`docs/visual-acceptance/sprint-2.22-slice-6j-b/README.md`](../visual-acceptance/sprint-2.22-slice-6j-b/README.md) | Route depth pass criteria |
| [`docs/visual-acceptance/sprint-2.22-slice-6k/README.md`](../visual-acceptance/sprint-2.22-slice-6k/README.md) | Coach handoff smoke |
