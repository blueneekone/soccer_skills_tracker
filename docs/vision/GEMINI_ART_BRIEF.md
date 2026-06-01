# Gemini Art Brief — Owner bust PNG creation

**Epic 3.5 · Sprint 3.5m-docs-gemini** · Owner-facing · Google Gemini Pro Art mode

> **LAUNCH-defer-avatar:** Bust creation and **3.5m-gemini-ingest** are **deferred post-launch**. Launch ships `defaultPortraitV2` SVG + profile initials on holo. This brief applies when owner reopens the character track.

> **Composer agents do not use this brief to generate art.** Agents ingest owner-approved PNGs from `static/portrait/approved/` only. See [`COMPOSER_PLAYBOOK.md`](./COMPOSER_PLAYBOOK.md).

**Visual authority:** [`references/PORTRAIT_REFERENCE_BOARD.md`](./references/PORTRAIT_REFERENCE_BOARD.md) · [`PORTRAIT_ART_DIRECTION.md`](./PORTRAIT_ART_DIRECTION.md)

---

## Reference attachments (open in Gemini)

Legacy wiki mood JPEGs were **removed (3.6a)**. Use text tone from [`references/PORTRAIT_REFERENCE_BOARD.md`](./references/PORTRAIT_REFERENCE_BOARD.md) §1 plus character sheets:

| File | Path |
|------|------|
| Mighty Meg concept | [`references/character/female-meg/ref-female-meg-concept-jumpsuit.jpeg`](./references/character/female-meg/ref-female-meg-concept-jumpsuit.jpeg) *(deferred — read-only)* |
| Slice / layer map | [`references/character/AVATAR_REFERENCE_INDEX.md`](./references/character/AVATAR_REFERENCE_INDEX.md) *(paused post-launch)* |
| Phoenix club palette | [`static/Images/Phoenixes_Logo_2026.png`](../static/Images/Phoenixes_Logo_2026.png) |

**Do not** attach Sparky (`mood/ref-mood-sparky-mascot.png`) as the operative teen face — mascot anti-ref only.

Provenance: [`references/REFERENCE_SOURCES.md`](./references/REFERENCE_SOURCES.md)

> **Identity for Avatar Studio:** export layers from catalog grids via Photopea per `AVATAR_REFERENCE_INDEX.md` — do not regenerate new Gemini faces for each hair slot when sheets already exist.

---

## Master prompt block (copy-paste)

Use as the base prompt in Gemini Pro Art mode. Attach Meg concept sheet + Phoenix logo; cite board §1 tone text.

```
1950s flat cel propaganda cartoon bust portrait.

Subject: teen feminine soccer operative — confident, athletic, parent-safe for age 13.

Style: one cohesive illustrator — bold closed outlines, flat fills, max one shadow tone per shape. Mid-century instructional cartoon readability (Bert Turtle / UPA flat graphic), NOT semi-real, NOT 3D, NOT Bitmoji sticker stack.

Kit: navy soccer jersey with sparse gold collar trim only — Phoenix club palette from reference. Shoulders-up bust crop; head + neck + shoulders as ONE person.

Hair: human graphic hair (ponytail OR bob) — solid cel shapes that read as HAIR at small size. NOT helmet, NOT flame, NOT mascot element, NOT fur clumps.

Crop: head, neck, and shoulders only — single person, forward or slight 3/4. Centered composition for circular card crop.

Output: transparent background PNG, 1024×1024 pixels, subject centered with safe margin for circular holo well.

Safety: COPPA-safe teen default — encouraging mastery energy, no dystopian glare, no baby-chibi.

Hard reject / do NOT copy: Fallout Vault Boy pose, Vault suit costume, Pip-Boy device, Bethesda franchise silhouettes, Monopoly mascot trace, Phoenix flame-as-head mascot proportions.
```

---

## Variation lines (append one per generation)

Swap `{hair}`, `{tone}`, and `{kit}` for each approved asset:

| Dimension | Options | Example suffix |
|-----------|---------|----------------|
| **Skin tone** | `light` · `medium` · `tan` · `deep` | `_medium` |
| **Hair** | `ponytail` · `bob` · `crop` | `_ponytail` |
| **Kit** | `home` (navy) · `away` (contrasting flat panel) | `_home` |

**Example appended line:**

```
Variation: warm medium skin tone; graphic ponytail hair; navy home kit with gold collar trim only.
```

---

## Owner checklist (before ingest)

Complete **every** item before moving PNG to `static/portrait/approved/`:

- [ ] **One person** — face, neck, shoulders, and kit read as a single bust (not pasted layers)
- [ ] **Hair reads as hair** — squint at thumbnail; not flame, helmet, or mascot element
- [ ] **Recessed well OK** — subject centered; eyes and collar legible when mentally cropped to a circle (~88px holo ring scale)
- [ ] **Upgrade-worthy** — you'd equip this over grey placeholder or Bauhaus stub
- [ ] **Parent-safe 13yo** — encouraging teen athlete; no aggressive/dystopian face
- [ ] **IP clean** — no obvious Vault Boy thumbs-up, vault suit, Pip-Boy, or Monopoly trace
- [ ] **Transparent PNG** — 1024×1024, no baked card frame or gold ring in the image

---

## Save as (filename convention)

```
static/portrait/approved/bust_teen_{hair}_{tone}_{kit}.png
```

Examples:

- `bust_teen_ponytail_medium_home.png`
- `bust_teen_bob_light_away.png`

---

## License log

Log **every** approved file in [`references/ASSET_LICENSES.md`](./references/ASSET_LICENSES.md) before requesting Composer ingest.

| Field | Value |
|-------|-------|
| **Source** | Google Gemini Pro Art (owner-generated) |
| **License** | Verify [Google Gemini Pro commercial terms](https://ai.google.dev/gemini-api/terms) at time of creation — owner confirms commercial use ☑ |
| **Owner ☑** | Owner confirms asset meets checklist above |

Composer will not ingest files missing an `ASSET_LICENSES.md` row with **Owner ☑**.

---

## What happens next

1. Owner drops PNG in `static/portrait/approved/`
2. Owner notifies Composer to run sprint **3.5m-gemini-ingest** (one bust at a time)
3. See [`ASSET_INGESTION.md`](./ASSET_INGESTION.md) for Composer steps

**Supersedes:** Agent-drawn modular SVG sprint **3.5m-art** — human VA failed; precomposed Gemini busts + ingest is the shipping path.
