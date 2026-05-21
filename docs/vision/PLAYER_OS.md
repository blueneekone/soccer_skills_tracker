# Player OS — Vision

**Product Epic A** · Canonical components: `IdentityBentoModule`, `OperativeHub`, `HudMetricsPanel` — **do not rename.**

---

## North star

Deliver an addictive, fluid training/gaming HUD that works for all ages with age-appropriate tone and rewards. The home screen should feel like a mission control terminal: immediate status, clear next action, and satisfying progress — without exploitative mechanics for minors.

---

## Primary user

Youth athletes (and teen/adult players in club programs) who log training, complete coach assignments, and track long-term skill growth.

---

## Home screen zones

Layout is owned by **`OperativeHub`** inside **`HUDContainer`** on `/player/dashboard`:

| Zone | Layout | Component | Content |
|------|--------|-----------|---------|
| Command main | 8-col (`bento-span-12 md:bento-span-8`) | `IdentityBentoModule` + `HudMetricsPanel` | Operative identity, streak/XP stat cells, rank XP bar, last-trained line, PAC–AGI vector strip (no match data) |
| Mission rail | 4-col (`bento-span-12 md:bento-span-4`) | `ActiveBounties` embedded | Active missions / coach bounties — vertical stack in right column (dedup via `deduplicateById`) |
| Analytics deck | 12-col below hub | `VanguardProtocolPanel` + capsules strip | Radar always visible; inspector + memory capsules |

**Conditional avatar:** When `operativeAvatar` is not set (`profileIncomplete`), `IdentityBentoModule` shows an inline initials badge beside the name — no empty 72px avatar column. When profile is complete, `HudAvatarRing` column returns.

**Single flat surface:** Command shell and analytics deck share `#0f172a` under `.player-hud-root` — no nested glass stacks or competing card fills. Cells use borders only.

**Below the hub row:**

- `VanguardProtocolPanel` — radar (always shown) + vector inspector
- Memory capsules / archive modules (compact one-line ghost when empty)

Secondary destinations (`/player/workout`, `/player/tracker`, `/player/armory`, skill tree) live in the **shell rail / Command Center drawer** — not clutter on the main HUD.

---

## Core loops

1. **Daily mission** — open HUD → see top bounty → log workout or complete criterion → XP/streak update.
2. **Streak** — visible in `HudMetricsPanel`; loss-aversion tuned for engagement, not anxiety in U13 flows.
3. **XP & unlocks** — feed armory and skill-tree projections; confetti only after verified server commit.
4. **Armory** — gear/cosmetic unlocks tied to milestones (secondary route). **Operative loadout slots** (equip layer on portrait + album) → Epic 3 — [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md).
5. **Memory capsules** — celebratory replay of highlights; parent can co-view.

---

## Rewards philosophy

- Streaks, XP bars, and unlocks reinforce **habit and mastery**, not pay-to-win or dark patterns.
- Minors: no loot-box randomness; rewards tied to logged activity and coach-assigned goals.
- Parent visibility into progress without duplicating the game chrome.

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

## Visual tone — Player Dossier (Sprint 2.8)

- **Canvas:** black `#000000` (`--pd-bg`) — supersedes Sprint 2.4 flat slate `#0f172a` page surface on HQ.
- **Panels:** lifted `#05050a` (`--pd-panel`) with hairline `rgba(255,255,255,0.1)` borders (`--pd-line`).
- **Dual accent:** gold `#fbbf24` (`--pd-accent-action`) = missions, streak, rank bar, hero CTA, avatar ring; teal `#14b8a6` (`--pd-accent-data`) = radar polygon, telemetry tags, vector selection, inspector data chrome.
- **Typography:** Geist display for operative name; Geist Mono for labels, values, and status tags only.
- **Corners:** chamfer retained on hero CTA and avatar ring; outer hub/analytics shells use flat dossier panels (no decorative scanlines).
- **Grid:** `bento-grid--12col bento-grid--liquid` with fluid gap tokens.
- **Isolation:** No coach-style flat glass panels or gamification chrome on Coach OS (and vice versa).

Stylesheets: `src/lib/styles/player-dossier.css` (tokens), `src/lib/styles/player-dashboard-hud.css` (HQ layout)

---

## Player OS Design System

**Tokens (Sprint 2.8):** scoped under `.player-dossier-root` in `player-dossier.css` — `--pd-bg`, `--pd-panel`, `--pd-line`, `--pd-accent-action` (gold), `--pd-accent-data` (teal), `--pd-text-muted`, Geist display + mono stacks.

**Structural remap:** Inside `.player-hud-root.player-dossier-root`, `--color-structural` stays slate `#64748b` (not global blue `#3b82f6`). Inner dividers may use muted slate; outer shells use `--pd-line`.

**HQ strap (2.8):** `pd-strap` above `OperativeHub` — eyebrow `Command / HQ`, title = callsign, status tag = rank · level (teal-tinted mono).

**Two-band layout (Sprint 2.4–2.5, surfaces 2.8):**

1. **Command band** — `OperativeHub` command strip: main column (identity inset panel + vector strip, 8 col) + mission rail (4 col). Single `--pd-panel` surface — no glass stacks, no gold scanlines.
2. **Analytics band** — single `player-analytics-deck` bento card: `VanguardProtocolPanel` (radar always visible + inspector) + compact `player-capsules-strip` footer. No standalone third slab for capsules when empty (one-line ghost only).

**Radar:** teal data polygon and vertices (`--pd-accent-data`); slate grid spokes and tier rings (`rgba(148,163,184,…)`). Selected axis label teal; unselected `#94a3b8` / `#cbd5e1`.

**Do:**

- Dossier lifted panels on black canvas (Armory / Stats / HQ aligned)
- Chamfer on hero CTA and avatar ring only
- Avatar level ring only — one ring vocabulary under `.player-hud-root`
- Gold (`--pd-accent-action`) for missions, streak, rank fill, hero CTA
- Teal (`--pd-accent-data`) for radar, vector selection, telemetry eyebrows/tags
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

Page roots: HQ, Stats, and Armory keep `player-dossier-root` for in-page `--pd-*` tokens; shell class covers Workout and Settings without duplicating page wrappers.

Stylesheet: `src/lib/styles/player-shell.css`

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

## Epic 1 aesthetic — complete (Sprints 1.1–2.10.2)

Player HUD visual system is **shipped**: Player Dossier black canvas, dual gold/teal accent, shell rail alignment (2.9), HQ world context inline in `pd-strap` (2.10.1), schedule meta always visible in strap (2.10.2). No further palette or layout rearchitecture planned on `/player/dashboard` until loadout slots consume the identity column (Epic 3).

**Deferred to Epic 3:** operative loadout schema, Armory studio equip UX, unlock ceremonies, album set bonuses — see [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md).

---

## Out of scope (Player OS)

- Renaming `IdentityBentoModule`, `OperativeHub`, `HudMetricsPanel`, `ActiveBounties`, `VanguardProtocolPanel`
- Refactoring `teamsStore` for mission dedup (use `deduplicateById` in `ActiveBounties`)
- Coach tactical board, parent billing UI, director field ops
- New JWT roles

---

## ROADMAP link

**Current sprint:** [ROADMAP Sprint 3.0 — Operative Loadout v2](../../ROADMAP.md) (`docs/vision/OPERATIVE_LOADOUT.md`).

**Completed:** Epic 1 Player HUD aesthetic — Sprints 1.1–2.10.2 (bento, RBAC, Player Dossier, shell alignment, inline strap world context, schedule always visible).
