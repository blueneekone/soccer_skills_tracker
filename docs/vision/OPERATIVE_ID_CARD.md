# Operative ID Card — Canonical Authority

**Epic 3 · Sprint 3.5g-vision** · Card layout & data model (character art: [`PORTRAIT_ART_DIRECTION.md`](./PORTRAIT_ART_DIRECTION.md) · wiring: [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md))

> **Authority clause:** Every future card layout sprint (3.5g-f+, 3.5j, 3.5i+, 3.5k) must cite: **Authority: OPERATIVE_ID_CARD.md**

**Authority chain:** `PORTRAIT_ART_DIRECTION.md` (character art) → **this document** (card layout & data) → `OPERATIVE_LOADOUT.md` (wiring) → `ROADMAP.md` (sprints)

**Prerequisites:** Sprints **3.5e** + **3.5f** Done · `PORTRAIT_ART_DIRECTION.md` exists

**Gate:** No further **OperativeIdEmblem-only** pixel sprints until **3.5g-f** (`OperativeIdCardFrame`) lands. Emblem experiments (3.5g-d/e arc/level stamp) are superseded by the frame sprint.

---

## 1. North star

The **collectible operative ID** is the Player OS **printed card** — not a generic HUD widget, not a route-specific emblem tweak. It is the same TCG anatomy at every **print size**: HQ holo inside `HologramCardShell`, Armory dossier preview, `ProPlayerCard` flip front, and public recruit (`/recruit/[playerKey]`).

- **Front face** = identity + illustration (name, club org, portrait, rank) — Pokémon / MTG / Gundam M.S. War front grammar.
- **Back face** = verified telemetry / rules text (MTG text box) — existing `ProPlayerCard` back (radar, season workspace).
- **Sticker album** = binder / set culture — cross-link [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md) Season 1 album; card frame is separate from holo sticker shell variants.

Surfaces must not drift: emblem-only layouts, flip-card-only zones, and holo-shell mismatches are **rejected**. One frame component target: **`OperativeIdCardFrame`** (3.5g-f).

---

## 2. TCG references (what we borrow)

We borrow **zone grammar**, not IP. Three reference families anchor layout decisions:

### Pokémon (standard + Special Illustration Rare)

- **Name** top-left; **HP / stat** top-right.
- **Art window** dominates card height.
- **Metadata** (stage, type, attacks) in bottom band.
- **SIR (full-art):** illustration may bleed edge-to-edge; **reserved text safe zones** — never cover face or mandatory text ([Pokémon card anatomy](https://tcgprotectors.com/blogs/pokemon-blog/pokemon-card-anatomy-rarity-guide)).

### Magic: The Gathering

- **Title bar:** name left, mana cost / stat right.
- **Type line** under title (creature type, supertype).
- **Art window** between type line and text box.
- **Back:** rules text box; borderless / showcase frames still preserve readable text zones ([MTG anatomy](https://magic.wizards.com/en/news/feature/anatomy-magic-card-2006-10-21)).

### Gundam M.S. War

- **Unit art** as hero; **faction** as identity strip.
- Separate card types (MS vs Pilot) — we map **club org** vs **team roster** the same way (org on card, roster in context).
- **Gold-stamp premium** = pose / faction as **illustration identity**, not stat inflation ([Gundam M.S. War wiki](https://gundammswar.fandom.com/wiki/Introduction_and_Rule_Book)).

### Explicit anti-pattern

**Floating UI zones that change per route** — e.g. level under portrait on recruit but arc-only name on HQ, rank combined with level on front, team name on Z2 type line, or streak/XP duplicated inside the emblem body. All card surfaces share Z1–Z4; Z5 is holo-only per §4.

---

## 3. Canonical front-face zones (`OperativeIdCardFrame` target)

Target component: **`OperativeIdCardFrame`** (future, sprint **3.5g-f**). Today `OperativeIdEmblem.svelte` approximates zones but mixes arc name (non-canonical for Z1) and ring level anchor — frame sprint moves **callsign to Z1 title bar** and keeps arc as optional premium flourish on the portrait ring only.

```
┌─────────────────────────────────┐
│ CALLSIGN ··············· LVL 06 │  Z1 Title bar — name left, level right
│ PHOENIXES SC · OPERATIVE        │  Z2 Type line — club org + role (NOT team roster)
│                                 │
│         [ portrait art ]        │  Z3 Art well — 55–65% card height; 96px min circle
│    (optional arc inscription    │     Arc around ring = premium flourish ONLY
│     on portrait ring)           │     Title bar is canonical name (Z1)
│ RECRUIT                         │  Z4 Rank strip — small caps, one line
├─────────────────────────────────┤
│  🔥 1d STRK      3.5k CAREER    │  Z5 Stats footer — IdentityTelemetryBezel (HQ holo ONLY)
└─────────────────────────────────┘
```

### Zone rules

| Zone | Content | Rules |
|------|---------|-------|
| **Z1** | Callsign left · `LVL NN` chip right | Level **only** here — never hero text under portrait. Pokémon HP / MTG mana corner analogue. |
| **Z2** | `{clubDisplayName} · OPERATIVE` (role label) | **Club org** on type line. **Never** `teams/{teamId}.teamName`. Magic type-line analogue. |
| **Z3** | Layered portrait SVG + optional border/banner | **55–65%** of card height; **96px** minimum circle diameter. SIR bleed optional (3.5g-g). Banner = thin watermark strip — not 28% height band over art ([§7](#7-portrait-art-safe-zones)). |
| **Z4** | `rankName` uppercase, one line | Rank **only** here — never `RECRUIT · LVL N` combined string on front. |
| **Z5** | Streak + career XP (`IdentityTelemetryBezel`) | **HQ holo** + optional mini on Armory preview. **Absent** on recruit/public flip front and `ProPlayerCard` front when not inside holo shell. |

**Flip back** = verified metrics / radar (existing `ProPlayerCard` back) = MTG **rules text box**. No Z1–Z4 on back.

**`HudAvatarRing`** = mini token (portrait + level ring) — **not** a full card; no Z2/Z4 requirement at ring scale.

### Typography & naming (intent — 3.5g-f)

| Today (`OperativeIdEmblem`) | Target (`OperativeIdCardFrame`) |
|-----------------------------|----------------------------------|
| Curved `textPath` name on ring | Z1 flat title bar; arc optional flourish |
| `levelAnchor` ring \| card | Z1 chip only |
| `oie-club` above square | Z2 type line |
| `oie-rank` below portrait | Z4 rank strip |
| Combined rank+level strings | **Deprecated** — split title chip + rank strip |

- **`variant`:** `card` \| `holo` — CSS scale only; **same zone content**.
- **`OperativeIdEmblem`** may become inner art-well renderer or merge into frame — document only; no refactor in vision sprint.

---

## 4. Surface matrix

| Surface | Z1 Title | Z2 Club type line | Z3 Art | Z4 Rank | Z5 STRK/CAREER | Back face |
|---------|----------|-------------------|--------|---------|----------------|-----------|
| HQ holo (`HologramCardShell` + `IdentityBentoModule`) | ✓ | ✓ | ✓ | ✓ | ✓ (`IdentityTelemetryBezel`) | n/a |
| Armory dossier preview (`OperativeLoadoutStudio`) | ✓ | ✓ | ✓ | ✓ | optional mini | n/a |
| `ProPlayerCard` front (stats / recruit) | ✓ | ✓ | ✓ | ✓ | ✗ | flip |
| `ProPlayerCard` back | — | — | — | — | — | telemetry / radar |
| `HudAvatarRing` | mini token only — not full card | | | | | |
| Public `/recruit/[playerKey]` front | ✓ | ✓ | ✓ | ✓ | ✗ | stats on back / season workspace |

**Visual acceptance (3.5g-f+):** MCP captures must show Z1–Z5 per row; side-by-side HQ holo vs Armory vs recruit front must share **identical zone grammar** (scale may differ).

---

## 5. Data model — club vs team (critical)

| Field | Source | Shows on ID front? | Zone |
|-------|--------|-------------------|------|
| `displayName` | `playerName` / profile | ✓ | Z1 (+ optional arc flourish, not canonical) |
| `operativeLevel` | XP / level progress | ✓ | Z1 chip **only** |
| `rankName` | career rank tier | ✓ | Z4 **only** |
| `clubName` / `clubDisplayName` | `clubs/{clubId}.name` or `user.clubDisplayName` via `resolveClubDisplayName` | ✓ | Z2 type line |
| `teamName` / `teamAssignmentLabel` | `teams/{teamId}.teamName` | ✗ on collectible front | HQ `ibm-meta` / `pd-strap` / schedule context only |

### Recruit / public profile

Callable **`getPublicRecruitProfile`** must return **`clubName`** (organization), **not** team roster name. **3.5g-b Done** — client `resolveClubDisplayName` / `fetchClubDisplayName` + callable aligned (`clubs/{clubId}.name` → `clubDisplayName`; teamId → clubId via teams doc). PII-safe public card:

- **Include:** portrait layers, border, rank (Z4), club on type line (Z2), operative level chip (Z1), display name (Z1).
- **Exclude:** messaging handles, address, household email, parent contact, internal team assignment as Z2 substitute.

### Current implementation notes (accuracy — do not refactor in vision sprint)

- `OperativeIdEmblem.svelte`: `clubName`, `rankName`, `operativeLevel`, `variant`, `levelAnchor`; 200×200 logical canvas; 96px portrait; banner band ~28% (to become watermark in 3.5g-g).
- `IdentityBentoModule`: holo embeds emblem + `IdentityTelemetryBezel` (Z5).
- `ProPlayerCard`: front uses emblem `variant="card"`; back = telemetry; no Z5 on front.
- Recruit route uses `payload.clubName` directly (3.5g-b).

---

## 6. Typography & component naming

| Component | Role |
|-----------|------|
| **`OperativeIdCardFrame`** (3.5g-f) | Owns Z1–Z4 layout for all card surfaces |
| **`OperativeIdEmblem`** (interim) | Portrait square + club strip + arc name + rank — to be folded into frame or reduced to Z3 art well |
| **`IdentityTelemetryBezel`** | Z5 only on HQ holo |
| **`HologramCardShell`** | Material shell — does not redefine zones |
| **`ProPlayerCard`** | Flip container; front = frame, back = rules box |

**Deprecate on front face:**

- Combined `rankLabel` like `RECRUIT · LVL 12`
- `formatEmblemRankLabel` combined formatter (split → Z1 chip + Z4 strip)
- Duplicate flat `<h2>` name under portrait on `ProPlayerCard`
- Level as hero text below portrait

---

## 7. Portrait art safe zones

Full illustration rules: [`PORTRAIT_ART_DIRECTION.md`](./PORTRAIT_ART_DIRECTION.md).

Card-specific:

- **Inner 70%** of art well: face / eyes readable at **88px** ring and **128px** studio holo.
- **SIR-style bleed:** hair / kit may break circle slightly; **eyes never obscured** by Z1/Z2/Z4 text overlays.
- **Loadout banner:** watermark or thin top strip — **not** 28% height covering art window (3.5g-g).
- **Arc inscription:** **default off** on all card surfaces (Z1 callsign is canonical). When enabled (3.5k premium), upper ring through 12 o'clock only — never bottom or sides of the face.

Compose order for layered SVG (pose catalog): **kit → pose → face → hair** — see `PORTRAIT_ART_DIRECTION.md` § Pose catalog.

---

## 8. Pose & alt-art catalog (planned — 3.5i-pose, not MVP code)

Players expect illustration variants (Pokémon SIR / MTG showcase / Gundam MS art). Planned after frame + age-band catalog:

| Item | Plan |
|------|------|
| Catalog ids | `portrait_pose_*` — neutral, confident, celebration, action lean (3–5 starters) |
| Schema **A** | `parts.pose` id in `operativeAvatar` v2 extension |
| Schema **B** | Separate `illustrationRare` id on card cosmetic layer |
| Unlock | `ownedPortraitParts` + album set bonuses |
| Studio | Pose picker tab after face / hair / kit |
| Coach / staff | Same catalog; flat presentation on Coach OS (`PORTRAIT_ART_DIRECTION.md` §6) |

No pose SVG or Studio tab in vision sprint — document only.

---

## 9. Collectible metadata (Sprint 3.5k — **implemented**)

Season 1 TCG chrome on `OperativeIdCardFrame` + `ProPlayerCard` back — resolver: `cardCollectibleMetadata.ts`.

| Metadata | Placement | Notes |
|----------|-----------|-------|
| Set symbol + collector number (e.g. `S1 · 047/198`) | Frame footer `.oicf-set-line` | Deterministic hash from emailKey; cap **198** |
| Rarity mark (common / rare / epic / legendary / illustration rare) | `.oicf-rarity-chip` | Album ownership + loadout border/badge floors |
| Card back design (club-agnostic S1 deck back) | `ProPlayerCardBack` watermark | No new binary assets |
| Flavor text | Back rules box | COPPA-safe rank tier; recruit uses generic line |
| Artist credit | `Illus. SSTracker` on back | Hidden on public recruit |
| Arc flourish | Portrait ring | **Only** when `rarity === illustration_rare` |
| Foil / texture tier | `StickerVariantShell` `variant` | Driven by rarity — not arbitrary holo shell |

---

## 10. HQ adjacency rules

When **`OperativeIdCardFrame`** owns identity (Z1–Z4):

| Adjacent UI | Allowed content | Forbidden duplicate |
|-------------|-----------------|---------------------|
| `IdentityBentoModule` **`ibm-meta`** | XP progress bar + last trained | rank, level, callsign, team on meta when emblem owns identity |
| **`pd-strap`** (page header) | Callsign + rank for command deck | Triple name with card Z1 + ibm-meta |
| **`IdentityTelemetryBezel`** | Z5 streak + career only | Duplicated inside emblem body |
| Team context | `teamAssignmentLabel` on strap / schedule | Z2 type line |

**Acceptance checklist:** HQ holo capture shows card as hero; at most **two** visible callsign instances (strap + Z1) during transition; post–3.5g-f prefer strap rank only + card Z1 name.

---

## 11. Phased implementation roadmap

Document-only ordering — code sprints reference these IDs in [`ROADMAP.md`](../../ROADMAP.md).

| Sprint | Status | Deliverable |
|--------|--------|-------------|
| **3.5g-vision** | **Done** | This document + ROADMAP phased plan |
| **3.5g-c** | Done / planned | Emblem parity — shared rank formatter, club stub, dedupe `ibm-meta` |
| **3.5g-d / 3.5g-e** | **Superseded** | Arc / level stamp experiments — lessons folded into **3.5g-f** |
| **3.5g-f** | **Next code** | `OperativeIdCardFrame` — TCG zones Z1–Z4; level top-right; `ProPlayerCard` + holo |
| **3.5g-b** | After 3.5g-f | `resolveClubDisplayName` wiring; recruit `clubName` callable |
| **3.5g-g** | After 3.5g-f | Art well scale — SIR proportions, banner watermark, optional arc flourish |
| **3.5j-a/b** | After 3.5g | Studio SYNC IDENTITY + unified picker ([`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md)) |
| **3.5h** | Parallel OK | Bauhaus retirement |
| **3.5i** | Planned | Age-band catalog + `bodyScale` |
| **3.5i-pose** | Planned | `portrait_pose_*` catalog + Studio pose tab |
| **3.5k** | **Done** | Collectible metadata — set #, rarity chip, card back, flavor text |

---

## 12. Visual acceptance (MCP)

When implementing **3.5g-f+**:

1. Capture HQ holo, Armory dossier preview, `ProPlayerCard` front, recruit front at **1280×900** (or sprint manifest spec).
2. Assert Z1–Z5 visibility per §4 matrix (Z5 absent where marked ✗).
3. Side-by-side: same zone order; no team name on Z2; no combined rank+level on front.
4. Flip back shows telemetry only — no front zones duplicated.

Manifest paths: `docs/vision/va-screenshots/s35*-manifest.json` — extend for frame sprint.

---

## Cross-links

| Doc | Relationship |
|-----|----------------|
| [`PORTRAIT_ART_DIRECTION.md`](./PORTRAIT_ART_DIRECTION.md) | Character art, safe zones, pose catalog |
| [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md) | Slots, Studio, recruit wiring |
| [`PLAYER_OS.md`](./PLAYER_OS.md) | HQ identity column, holo grammar |
| [`RECRUITER_OS.md`](./RECRUITER_OS.md) | Tokenized public card — same front zones |
| [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) | Player vs recruiter presentation |
| [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](./PLAYER_OS_INSTRUMENT_TAXONOMY.md) | Identity instrument band |
| [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) | `HologramCardShell` material language |
