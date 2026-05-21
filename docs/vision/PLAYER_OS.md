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
| Identity | 4-col (`bento-span-4`) | `IdentityBentoModule` | UID-derived avatar, operative name, rank/tier |
| Metrics | 8-col (`bento-span-8`) | `HudMetricsPanel` | Streak, XP, session telemetry, readiness |
| Missions | 12-col (`bento-span-12`) | `ActiveBounties` | Active missions / coach bounties (dedup via `deduplicateById`) |

**Below the hub row:**

- `VanguardProtocolPanel` — protocol status, compliance capsule
- Memory capsules / archive modules (when enabled)

Secondary destinations (`/player/workout`, `/player/tracker`, `/player/armory`, skill tree) live in the **Command Center drawer** — not clutter on the main HUD.

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

## Out of scope (Player OS)

- Renaming `IdentityBentoModule`, `OperativeHub`, `HudMetricsPanel`, `ActiveBounties`, `VanguardProtocolPanel`
- Refactoring `teamsStore` for mission dedup (use `deduplicateById` in `ActiveBounties`)
- Coach tactical board, parent billing UI, director field ops
- New JWT roles

---

## ROADMAP link

**Current sprint:** [ROADMAP Sprint 1.7](../ROADMAP.md) — HUD density, mission ellipsis, streak UX (`playerHudSprint17.test.ts` — future code sprint).

**Completed foundation:** Sprints 1.1–1.6 (bento, RBAC, HUD baseline, IdentityBentoModule / OperativeHub).
