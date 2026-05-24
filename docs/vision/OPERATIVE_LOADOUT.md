# Operative Loadout — Vision

**Delivery Epic 3** · Extends **Product Epic A** ([`PLAYER_OS.md`](./PLAYER_OS.md))

---

## North star

Players express identity through earned gear — not purchased randomness. The Operative Loadout is a **slot-based equip layer** on top of the vector portrait (`operativeAvatar`) and Season 1 sticker album: what you wear on your dossier card, what borders your HQ avatar ring, and what perks activate when you complete a set. Every unlock ties to logged training, coach goals, or album milestones — COPPA-safe for minors.

---

## Primary user

Youth and teen club players who already use `/player/armory` (Quartermaster + album) and want their HQ identity to reflect earned cosmetics.

---

## Loadout slots (schema v2)

Canonical Firestore field: `users/{email}.operativeLoadout` (versioned object, parallel to `operativeAvatar`).

| Slot | Layer | Source catalog | Visible on |
|------|-------|----------------|------------|
| **portrait** | Base | `operativeAvatar` seed (Bauhaus vector) | HQ ring, Armory dossier card, recruit card |
| **border** | Frame | Quartermaster digital SKUs + album holo variants | `ProPlayerCard`, HQ avatar ring |
| **badge** | Overlay | Album Legendary drops, rank milestones | Dossier strap, stats card |
| **banner** | Background | Set-completion rewards (3.4) | Armory studio, shared capsule previews |
| **title** | Text flair | XP rank titles, coach commendations | HQ `pd-strap` subtitle (optional) |
| **patch** | Physical fulfillment | Quartermaster physical SKUs | Fulfillment queue only — not rendered in HUD |

**Rules:**

- One equipped item per slot; empty slot falls back to dossier defaults (no border, no badge).
- Catalog references use stable ids (`QuartermasterItem.id`, `SeasonOneCard.id`) — not image URLs.
- Renderer is pure: given profile + catalog, produce SVG/CSS layers under `.player-dossier-root`.
- Schema validation rejects unknown slot keys and ids not in the player's **owned** set.

---

## Earn paths

| Path | Mechanism | Loadout impact |
|------|-----------|----------------|
| **Training & XP** | Rank thresholds, streak milestones | Unlocks border/badge catalog rows by `minLevel` |
| **Coach missions** | `ActiveBounties` completion → server grant | Targeted badge or title drops (no client-side self-grant) |
| **Quartermaster (TC)** | Tactical Credits redemption via Ledger | Digital borders, patches (physical → fulfillment doc) |
| **Album drops** | Season 1 sticker pulls after verified sessions | Card ownership → equippable border/badge variants |
| **Set bonuses (3.4)** | Complete album folder (e.g. Street Kings) | Banner slot perk + dossier chip on HQ world strip |

**Explicitly out:** loot boxes, paid random drops, gacha timers. Minors earn through activity and coach-assigned goals only.

---

## COPPA & minor safety

- **No randomized paid entitlements** for U13 operatives — album pulls (when shipped) are activity-gated and parent-visible.
- **Physical SKUs** (patches, armbands) create a fulfillment record; minors require household admin acknowledgment before ship (reuse VPC household linkage).
- **Parent read-only mirror:** Parent OS shows equipped loadout + recent unlocks without game chrome — flat co-op partner tone per [`PARENT_OS.md`](./PARENT_OS.md).
- **Recruit card:** Public `/recruit/[playerKey]` exposes only portrait + border + rank — no PII, no messaging handles.
- **Confetti / ceremony (3.3):** Animation fires only after Firestore commit confirms ownership; no optimistic unlock UI for minors.

See also: [`docs/COPPA_SIGNUP_MATRIX.md`](../COPPA_SIGNUP_MATRIX.md)

---

## Armory workspace map

Route: `/player/armory` (existing `qa-root player-dossier-root`)

| Tab | Sprint | Purpose |
|-----|--------|---------|
| **Quartermaster** | Shipped (Ledger) | TC catalog, physical/digital SKUs — redeem only |
| **Album** | Shipped (Season 1 UI) | Sticker folders, ownership grid, set progress |
| **Studio** | **3.1** ✓ · **3.1.1** ✓ | Portrait designer + slot picker, equip/unequip, live preview, SYNC LOADOUT → Firestore |
| **Ceremonies** | **3.3** ✓ | Post-unlock replay, share-to-capsule |

Loadout schema + renderer (**3.0**) land before Studio UX so Armory can adopt slots without another palette pass.

---

## Sprint map (Epic 3)

| Sprint | Deliverable | Status |
|--------|-------------|--------|
| **3.0** | `loadoutSchema.ts`, `renderOperativeLoadout.js`, validation tests, `OperativeLoadoutPreview.svelte` (read-only) | **Done** |
| **3.1** | Armory studio tab — equip flows, Firestore write, portrait sync, HQ ring + card wiring | **Done** |
| **3.1.1** | HQ gold harmonization; relocate portrait designer from Album → Studio (unified identity editor) | **Done** |
| **3.2** | Art pipeline — content-hashed cosmetics manifest, SVG assets, catalog ingestion | **Done** |
| **3.3** | Unlock ceremonies — server grants, confetti gate, minor-safe copy | **Done** |
| **3.4** | Album set bonuses — folder completion perks, HQ chip integration | Planned *(unblocked after Player OS premium track 2.19 Done + sign-off)* |

---

## Handoffs

| From | To | Flow |
|------|-----|------|
| Player HUD (Epic 1) | Loadout | HQ ring + dossier card consume equipped border/badge |
| Coach | Player | Mission completion → grant payload in unlock queue |
| Parent | Player | VPC + household gates physical fulfillment |
| Platform | Player | COPPA age band → suppress paid/random earn paths |

---

## Visual tone

Inherit **Player Dossier** tokens (`--pd-*`) — black canvas, gold action accent, teal data accent. Loadout chrome is **lifted panels and hairline borders**, not chamfered gold HUD slabs. Equip UI uses Armory tab language (teal active route, gold HQ hub accent) from Sprint 2.9 shell alignment.

---

## Out of scope (Epic 3)

- Renaming `IdentityBentoModule`, `OperativeHub`, or dashboard canonical components
- Coach OS gamification chrome
- Pay-to-win stat modifiers (cosmetic + flair only)
- Cross-game NFT or external marketplace

---

## ROADMAP link

**Current sprint:** [ROADMAP Sprint 3.4 — Album set bonuses](../../ROADMAP.md) *(unblocked after Epic 1 premium track **2.19 Done** + visual sign-off)*. Sprint 3.3 (unlock ceremonies + Ceremonies tab) is **Done**.

**Prerequisite complete:** Epic 1 Player HUD aesthetic (Sprints 1.1–2.10, Player Dossier + shell alignment + HQ world context).
