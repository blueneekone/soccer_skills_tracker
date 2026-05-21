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

| Zone | Grid | Component | Content |
|------|------|-----------|---------|
| Identity | 4-col (`bento-span-4`) | `IdentityBentoModule` | UID-derived avatar, operative name, rank/tier, streak/XP stat cells |
| Metrics | 8-col (`bento-span-8`) | `HudMetricsPanel` | Streak, XP, session telemetry, readiness |
| Missions | 12-col (`bento-span-12`) | `ActiveBounties` | Active missions / coach bounties (dedup via `deduplicateById`) |

**Below the hub row:**

- `VanguardProtocolPanel` — protocol status, compliance capsule
- Memory capsules / archive modules (when enabled)

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

**Do:**

- Chamfer clip-path on modules (no `border-radius` on Player OS shells)
- Avatar level ring only — one ring vocabulary under `.player-hud-root`
- Gold accents and structural borders for all player HUD chrome
- Identity streak/XP as ringless stat cells (`HudStatCell`), not mini canvas rings

**Don't:**

- Cyan/teal (`#22d3ee`, `rgba(0,255,255,…)`) on the player dashboard
- `hud-telemetry-root` on embedded missions inside OperativeHub
- Mini rings on streak/XP metrics (avatar level ring is the sole progress ring)
- Double mission eyebrows (`// MISSION DECK` + `ACTIVE MISSIONS`)
- `border-radius` on Player OS modules (avatar interior exception OK)

**Home screen zones (updated):** Identity streak/XP = stat cells, not rings. Command Center = shell nav only (Sprint 2.1.1 — no in-panel CMD trigger).

---

## Out of scope (Player OS)

- Renaming `IdentityBentoModule`, `OperativeHub`, `HudMetricsPanel`, `ActiveBounties`, `VanguardProtocolPanel`
- Refactoring `teamsStore` for mission dedup (use `deduplicateById` in `ActiveBounties`)
- Coach tactical board, parent billing UI, director field ops
- New JWT roles

---

## ROADMAP link

**Current sprint:** [ROADMAP Sprint 2.3](../ROADMAP.md) — Player OS visual system unification (`playerHudSprint23.test.ts`).

**Completed foundation:** Sprints 1.1–2.2 (bento, RBAC, HUD baseline, IdentityBentoModule / OperativeHub, Gold Command palette).
