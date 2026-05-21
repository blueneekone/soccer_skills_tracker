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
4. **Armory** — gear/cosmetic unlocks tied to milestones (secondary route).
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

## Visual tone

- **Palette:** dominant `#0f172a`, structural border `#334155`, accent gold `#fbbf24` (see `.cursorrules`).
- **Corners:** chamfered military corners via `clip-path` — **no** `border-radius` on Player OS modules.
- **Typography:** Geist Mono for telemetry labels (uppercase, tight tracking); readable sans for body.
- **Grid:** `bento-grid--12col bento-grid--liquid` with fluid gap tokens.
- **Isolation:** No coach-style flat glass panels or gamification chrome on Coach OS (and vice versa).

Stylesheet: `src/lib/styles/player-dashboard-hud.css`

---

## Player OS Design System

**Tokens:** dominant `#0f172a`, structural border `#334155`, accent gold `#fbbf24`, muted slate `#64748b` / `#94a3b8`, Geist Mono labels, tabular nums for values.

**Structural remap (Sprint 2.4):** Inside `.player-hud-root`, `--color-structural` is slate `#64748b` (not global blue `#3b82f6`). Borders use `#334155`. Gold `#fbbf24` is reserved for **live accent** only — radar data polygon, inspector bar fill, selected axis labels, vector strip selection.

**Two-band layout (Sprint 2.4–2.5):**

1. **Command band** — `OperativeHub` command strip: main column (identity + vector strip, 8 col) + mission rail (4 col). Single flat `#0f172a` surface — no glass stacks.
2. **Analytics band** — single `player-analytics-deck` bento card: `VanguardProtocolPanel` (radar always visible + inspector) + compact `player-capsules-strip` footer. No standalone third slab for capsules when empty (one-line ghost only).

**Radar:** gold data polygon and vertices (`--color-accent`); slate grid spokes and tier rings (`rgba(148,163,184,…)`). Selected axis label `#fbbf24`; unselected `#94a3b8` / `#cbd5e1`.

**Do:**

- Chamfer clip-path on modules (no `border-radius` on Player OS shells)
- Avatar level ring only — one ring vocabulary under `.player-hud-root`
- Gold accents and slate structural borders for all player HUD chrome
- Identity streak/XP as ringless stat cells (`HudStatCell`), not mini canvas rings
- Embedded `HudMetricsPanel`: vector strip with `00` when empty; no Match Data / assists tile in hub; no `AWAITING TELEMETRY` (empty copy in VPP inspector ghost)
- Conditional avatar: inline initials badge until `operativeAvatar` set; then `HudAvatarRing` column
- Missions never full-width 12-col on desktop — right rail only (4 col)

**Don't:**

- Cyan/teal (`#22d3ee`, `rgba(0,255,255,…)`) on the player dashboard
- Structural blue `#3b82f6` on player dashboard chrome (eyebrows, radar fill, bento borders)
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

## Out of scope (Player OS)

- Renaming `IdentityBentoModule`, `OperativeHub`, `HudMetricsPanel`, `ActiveBounties`, `VanguardProtocolPanel`
- Refactoring `teamsStore` for mission dedup (use `deduplicateById` in `ActiveBounties`)
- Coach tactical board, parent billing UI, director field ops
- New JWT roles

---

## ROADMAP link

**Current sprint:** [ROADMAP Sprint 2.6](../ROADMAP.md) — HQ content loop (`playerHudSprint26.test.ts`).

**Completed foundation:** Sprints 1.1–2.2 (bento, RBAC, HUD baseline, IdentityBentoModule / OperativeHub, Gold Command palette).
