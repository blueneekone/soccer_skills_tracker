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
| **portrait** | Base | `operativeAvatar` — v2 layered parts (face / hair / kit catalog ids); legacy v1 seed upgraded at read/render | HQ ring, Armory dossier card, recruit card — see [**Operative ID card zones**](./OPERATIVE_ID_CARD.md) |
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
- **Portrait parts live in `operativeAvatar`**, not loadout slots — do not add face/hair/kit to `LOADOUT_SLOTS`.

### Portrait v2 (`operativeAvatar` v2)

Sprint **3.5a** introduces a versioned portrait schema parallel to loadout cosmetics:

| Field | Shape | Notes |
|-------|-------|-------|
| `v` | `2` | Distinguishes from v1 Bauhaus `{ v: 1, seed }` |
| `parts.face` | catalog id \| `null` | COPPA-safe catalog reference — no photo upload |
| `parts.hair` | catalog id \| `null` | Starter catalog in **3.5b** — see portrait part table below |
| `parts.kit` | catalog id \| `null` | Jersey / kit silhouette layer |

Sprint **3.5b** expands the 3.5a stub into a content-hashed catalog pipeline (mirrors Epic 3.2 cosmetics).

**Portrait part catalog (3.5b):** Content-hashed manifest pipeline mirrors Epic 3.2 cosmetics. Run `npm run generate:portraits` after editing `static/portrait/catalog.config.json` or SVG assets — emits `src/lib/avatars/portraitParts.manifest.json`.

| Slot | Starter catalog ids |
|------|---------------------|
| face | `portrait_face_default`, `portrait_face_round`, `portrait_face_angular` |
| hair | `portrait_hair_default`, `portrait_hair_crop`, `portrait_hair_long` |
| kit | `portrait_kit_default`, `portrait_kit_home`, `portrait_kit_away` |

**Ownership (prep for 3.5c):** `users/{email}.ownedPortraitParts: string[]` — optional Firestore field listing catalog ids the player may equip. When absent, treat as `defaultOwnedPortraitParts()` (3.5b: entire starter catalog). Do **not** add portrait parts to `ownedCosmetics` or `LOADOUT_SLOTS`.

**Rendering:** `renderLayeredPortraitSvg` stacks kit → face → hair inside a square viewBox. Missing or unknown part ids fall back to slot defaults or skip. Pass `ownedIds` to strip unowned ids before compose.

**Backward compatibility (3.5h Done):** Legacy Firestore `{ v: 1, seed }` rows upgrade via `upgradeV1SeedToPortraitV2` at render and read-repair time — Bauhaus geometric SVG generator deleted. `renderOperativeAvatarSvg` always emits v2 layered catalog SVG. Armory Studio (**3.5c**) writes v2 layered parts via visual part picker.

**Lazy read-repair (3.5d):** On HQ dashboard hydrate (browser), `readRepairOperativeAvatar` normalizes Firestore `operativeAvatar` + `ownedPortraitParts` in memory: valid v2 → strip to catalog/owned ids; v1 seed → deterministic `upgradeV1SeedToPortraitV2(seed)` (hash picks catalog part per slot); missing → `defaultPortraitV2()`. When `didMigrate`, `queuePortraitReadRepairWrite` merges `{ operativeAvatar, ownedPortraitParts }` to `users/{email}` once per session sig (non-blocking, best-effort — same pattern as sportId read-repair in `ARCHITECTURE.md`). **HQ wiring:** `HudAvatarRing` + embedded holo (`OperativeLoadoutPreview` / `IdentityBentoModule`) render v2 via `composeOperativePortrait` / `portraitSvg`. **Recruit:** `getPublicRecruitProfile` returns v2 `{ v: 2, parts }` only — v1 seeds upgraded server-side (**3.5h**); `ProPlayerCard` front face uses `portraitLayers.portraitSvg`.

**Art direction (3.5e):** Canonical illustration authority — pre-3D Bitmoji **structure** (layer swaps, flat ink), Phoenix / club mascot anchor, and **age spectrum ~5 → adult coach** in one cartoon family. Coach avatars use the same catalog system but **flat staff presentation** on Coach OS (no Player HQ gamification chrome). See [`PORTRAIT_ART_DIRECTION.md`](./PORTRAIT_ART_DIRECTION.md). Sprint **3.5f** swaps SVG art under existing catalog ids per that doc.

**Operative ID card (3.5g-vision):** Collectible front/back anatomy — TCG zones Z1–Z5, surface matrix, phased sprints — [`OPERATIVE_ID_CARD.md`](./OPERATIVE_ID_CARD.md). **Authority chain:** `PORTRAIT_ART_DIRECTION.md` → `OPERATIVE_ID_CARD.md` → this doc → `ROADMAP.md`.

### Club vs team on card front

| Field | Source | ID card front |
|-------|--------|---------------|
| `clubName` / `clubDisplayName` | `clubs/{clubId}.name` or profile fallback | **Z2 type line** — org identity |
| `teamName` / `teamAssignmentLabel` | `teams/{teamId}.teamName` | **Never** on collectible front — HQ strap / `ibm-meta` / schedule only |
| `displayName` | `playerName` | **Z1** callsign |
| `operativeLevel` | XP progress | **Z1** chip only |
| `rankName` | career tier | **Z4** rank strip only |

`getPublicRecruitProfile` (**3.5g-b**) must return **club org** for Z2, not roster team name.

### Dossier & recruit surfaces

| Surface | Frame | Front | Back / context |
|---------|-------|-------|----------------|
| **HQ holo** | `HologramCardShell` | Z1–Z4 + Z5 (`IdentityTelemetryBezel`) | n/a |
| **Armory Studio dossier preview** | Same frame as HQ holo | Z1–Z4 (Z5 optional mini) | Equip tabs — not a second card grammar |
| **Recruit** `/recruit/[playerKey]` | `ProPlayerCard` | portrait + border + Z1–Z4; **club on Z2**; **no Z5** | verified stats / season workspace on flip |
| **Stats `ProPlayerCard`** | Flip | Z1–Z4; no Z5 unless holo shell | telemetry / radar |

**Identity Studio (3.5j Done):** One SYNC IDENTITY commit, unified Face–Title picker, dossier holo hero matches HQ; Armory read-repair parity with dashboard.

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
- **Recruit card:** Public `/recruit/[playerKey]` — same front zones as [`OPERATIVE_ID_CARD.md`](./OPERATIVE_ID_CARD.md): portrait + border + Z1–Z4; **club org on Z2** (not team roster); stats on flip/back. No PII, messaging handles, or address.
- **Confetti / ceremony (3.3):** Animation fires only after Firestore commit confirms ownership; no optimistic unlock UI for minors.

See also: [`docs/COPPA_SIGNUP_MATRIX.md`](../COPPA_SIGNUP_MATRIX.md)

---

## Armory workspace map

Route: `/player/armory` (existing `qa-root player-dossier-root`)

| Tab | Sprint | Purpose |
|-----|--------|---------|
| **Quartermaster** | Shipped (Ledger) | TC catalog, physical/digital SKUs — redeem only |
| **Album** | Shipped (Season 1 UI) | Sticker folders, ownership grid, set progress |
| **Studio** | **3.1** ✓ · **3.1.1** ✓ · **3.5c** ✓ | v2 visual part picker (face / hair / kit thumbnails) + slot equip, live holo dossier preview, SYNC LOADOUT → Firestore — Bauhaus sliders removed from Studio |
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
| **3.4** | Album set bonuses — folder completion perks, HQ chip integration | **Done** |
| **3.5c** | Armory Studio v2 — visual part picker; Bauhaus sliders removed from Studio | **Done** |
| **3.5d** | HQ + recruit v2 wiring; lazy read-repair (`portraitReadRepair.ts`) | **Done** |

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

**Current sprint:** [ROADMAP — 3.5g-vision Done · next 3.5g-f OperativeIdCardFrame](../../ROADMAP.md). Card authority: [`OPERATIVE_ID_CARD.md`](./OPERATIVE_ID_CARD.md).

**Prerequisite complete:** Epic 1 Player HUD aesthetic (Sprints 1.1–2.10, Player Dossier + shell alignment + HQ world context).
