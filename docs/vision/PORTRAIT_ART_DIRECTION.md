# Portrait Art Direction — Canonical Authority

**Epic 3 · Sprint 3.5e** · Extends [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md) portrait v2

> **Authority clause:** Every future portrait art sprint (3.5f+) must cite: **Authority: PORTRAIT_ART_DIRECTION.md**

---

## 1. North star & references

Operative portraits are **collectible 2D identity** inside the Player OS void — modular flat cartoon layers that read clearly at HQ ring scale (64–128px), earn trust through mastery tone (not random loot aesthetics), and stay COPPA-safe via catalog IDs only. The portrait is the operative's face in mission control: expressive, athletic, and unmistakably part of the Scintillation / Phoenix club family.

### Primary reference — Phoenix club mascot

**Asset:** [`static/Images/Phoenixes_Logo_2026.png`](../../static/Images/Phoenixes_Logo_2026.png)

The Phoenix mascot ("Sparky") anchors all portrait art:

| Trait | Mascot read | Portrait application |
|-------|-------------|----------------------|
| **Outline** | Bold, consistent dark brown/black stroke on every shape | Single outline family across face, hair, kit — same px weight at export |
| **Attitude** | Confident operative athlete — wide smile, forward motion, mastery energy | Faces default to encouraging confidence; no dystopian glare, no baby-chibi for teens |
| **Palette** | Warm fire (yellow/orange), navy kit blocks, white accents, gold spark trail | Kit and skin fills stay in Phoenix-adjacent warm/neutral range; gold sparingly (rank/milestone accents only) |
| **Proportions** | Rubber-hose limbs, spherical flame head, athletic jersey `#15` | Teen band matches mascot balance; youth scales head up; adult/coach scales shoulders up |
| **Line art era** | Old-school cartoon — flat fills, one shadow tone, pre-3D | All catalog SVGs must look like one illustrator drew them for the mascot |

### Structural reference — pre-3D Bitmoji (structure only)

**Label:** Structure inspiration only — not brand copy, not Meta IP.

Pre-3D Bitmoji (circa 2014–2017 flat era) informs **layer architecture**:

- Modular swaps: face shape, hair graphic, kit silhouette
- Flat ink + bold outline readable at avatar size
- Expressive eyes (pie-cut / oval cartoon, not realistic iris)
- Outfit layer behind face; hair on top

We do **not** copy Meta Bitmoji proportions, UI chrome, or 3D shading language.

### Anti-references (reject on sight)

| Lane | Why rejected |
|------|--------------|
| Post-3D Bitmoji / Meta 3D avatars | Plastic gradients, uncanny semi-real skin, wrong brand |
| Bauhaus v1 geometric generator | Abstract shapes — not operative identity; retired in **3.5h** |
| Emoji blobs / generic avatars | No club soul, no age spectrum |
| 3D renders / photo upload | COPPA violation, biometric likeness risk |
| Neon rainbow unrelated to brand | Breaks Player OS void palette discipline |

---

## 2. Style locks (non-negotiable)

These rules apply to **every** catalog SVG at every age band. Deviations fail 3.5f visual acceptance.

### Outline

- **One stroke family** — dark brown `#3d2314` to near-black `#1a0f0a` (sample from Phoenix logo; finalize in 3.5f export pass)
- **Consistent weight** at 256×256 master viewBox: ~3–4px equivalent; scales proportionally — stacked layers must not show weight mismatch
- **Closed paths** — no open hair strands crossing outline rules

### Fill

- **Flat base + max one shadow tone** per shape — no plastic multi-stop gradients
- Fire/hair highlights may use **two flat fills** (base + highlight) — not Gaussian blur or mesh gradients
- Skin tones: flat fills with optional single shadow on jaw/neck — see §5 naming for `portrait_face_*` skin rows (3.5i+)

### Head & eyes

- **Cartoon expressive** — large readable eyes at 88px; white sclera + dark pupil + single highlight dot
- **Default ratios per age band** — see §4 (head-to-shoulder, eye scale, feature simplicity)
- No realistic pores, eyelashes, or photographic irises

### Kit layer

- **Flat jersey blocks** — navy home (`#1e3a5f` sample), away variant with contrasting flat panel
- **Room for club mark** — chest zone left clear or with simplified Phoenix mark slot (future catalog row)
- Home/away variants: `portrait_kit_home`, `portrait_kit_away` — same outline family, different flat fills only

### Hair

- **Graphic shapes** — flame points, crop silhouettes, long tail shapes
- **Not** realistic strand clumps, individual hair lines, or photo-reference curls
- Hair sits **above** face in stack; must not obscure both eyes below 128px

### Player OS integration

- Character art stays **inside** the ring/holo interior — HUD owns void, emissive frame, chamfer ring, level arc
- Portrait SVG is **content only** — no baked-in gold ring, no `pd-os-deck` chrome, no mission CTA
- Transparent or void-compatible background; ring bezel applied by `HudAvatarRing` / `HologramCardShell`
- **Card zones (Z1–Z5)** — layout, club vs team, and surface matrix: [`OPERATIVE_ID_CARD.md`](./OPERATIVE_ID_CARD.md) (do not duplicate full card spec here)

---

## Card presentation safe zones

Authority for **where** art sits on surfaces: [`OPERATIVE_ID_CARD.md`](./OPERATIVE_ID_CARD.md) §3–§4. Portrait art obeys:

| Rule | Detail |
|------|--------|
| **Art well (Z3)** | **55–65%** of card height; **96px** minimum circle; portrait stack centered in well |
| **Face readability** | Inner **70%** of well — eyes + kit block legible at **88px** ring and **128px** studio holo |
| **SIR bleed** | Hair / kit may break circle edge slightly; **eyes never** under Z1/Z2/Z4 text |
| **Arc inscription** | Optional flourish on portrait ring only — **not** canonical name (Z1 title bar owns callsign) |
| **Banner slot** | Watermark or **thin top strip** — **not** ~28% height band covering art window (fix in **3.5g-g**) |

---

## Pose catalog (planned 3.5i-pose)

Illustration variants (Pokémon SIR / MTG showcase / Gundam MS art) — **no MVP assets** in vision sprint.

| Convention | Value |
|------------|--------|
| Catalog id prefix | `portrait_pose_{id}` — e.g. `portrait_pose_neutral`, `portrait_pose_confident`, `portrait_pose_celebration`, `portrait_pose_action_lean` |
| Starter set | 3–5 poses after age-band catalog (**3.5i**) |
| Compose stack order | **kit → pose → face → hair** (pose affects body lean / arms; face/hair on top) |
| Schema | `parts.pose` in `operativeAvatar` v2 **or** separate `illustrationRare` on card cosmetic layer — see [`OPERATIVE_ID_CARD.md`](./OPERATIVE_ID_CARD.md) §8 |
| Unlock | `ownedPortraitParts` + album set bonuses |
| Studio | Pose tab after face / hair / kit (**3.5i-pose**) |

---

## 3. Palette

### Phoenix anchor (sample from logo — finalize hex in 3.5f)

| Slot | Role | Sample hex | Notes |
|------|------|------------|-------|
| `--portrait-fire-yellow` | Face highlight, warm skin light | `#f5d547` | Mascot face core |
| `--portrait-fire-orange` | Limbs accent, hair warm | `#f07830` | Mid-tone energy |
| `--portrait-kit-navy` | Jersey, shorts, shoe base | `#1a2744` | Primary kit block |
| `--portrait-kit-white` | Number, shoe toe, glove | `#f8fafc` | High-contrast accents |
| `--portrait-outline` | All strokes | `#2d1810` | Matches mascot ink |
| `--portrait-shadow` | Single shadow tone | `#0f172a` at 40% on shape | One step only |
| `--portrait-spark-gold` | Rank/milestone accent only | `#d4a017` | Mascot spark trail — **not** full kit fill |

Exact values may be sampled from `Phoenixes_Logo_2026.png` during 3.5f export; document final hex in manifest README when locked.

### Player OS companions

| Token | Hex | Portrait use |
|-------|-----|--------------|
| `--pd-accent-data` | `#14b8a6` | Studio picker active border, holo well — **not** inside portrait SVG fills |
| `--pd-accent-action` | `#fbbf24` | Rank ring, milestone badge — gold **sparingly** on portrait (collar trim, captain armband), not rainbow kit |

### Forbidden palette

- Bauhaus primary rainbow (generator v1 colors)
- Unrelated neon (#ff00ff, electric cyan unrelated to teal system)
- Full-kit gold fill (reserved for HUD chrome and rank signifiers)
- Desaturated enterprise grey skin defaults

---

## 4. Age spectrum

One cartoon language across **~age 5 through adult coach** — differentiation via **proportions and kit layer**, not different art styles.

### Summary table

| Visual band | Approx ages | Proportion read | Platform mapping (doc) |
|-------------|-------------|-----------------|-------------------------|
| **Youth** | 5–8 | Soft cartoon, larger head, simpler features, friendly | `under13` (subset) |
| **Junior** | 9–12 | Athletic kid cartoon, still rounded, confident | `under13` (subset) |
| **Teen** | 13–17 | Taller proportion, sharper jaw, teen athlete (not adult, not toddler) | `teen13to16` + older minors |
| **Adult player** | 18+ | Mature cartoon proportions, same line art | `adult` |
| **Coach / staff** | Adult staff | Same ink rules; staff kit layer (polo/track jacket vs player jersey); neutral professional read | `adult` + `role=coach` (future) |

### Per-band guidelines

#### Youth (5–8)

| Dimension | Guideline |
|-----------|-----------|
| Head-to-shoulder ratio | **~1 : 1.2** — head dominates; shoulders soft and narrow |
| Eye size | **Large** (≈18–22% of head height); simple pie-cut; minimal eyelid detail |
| Feature simplicity | Rounder cheeks, smaller nose hint, friendly open smile default |
| Body width | Narrow kit silhouette; jersey reads as tunic block |
| Tone | Encouraging mastery — "you can do this" energy; warm, never intimidating |

#### Junior (9–12)

| Dimension | Guideline |
|-----------|-----------|
| Head-to-shoulder ratio | **~1 : 1.5** — athletic kid; head still slightly oversized vs teen |
| Eye size | **Medium-large** (≈15–18% of head height); confident expression |
| Feature simplicity | Defined jaw hint but rounded; brows optional simple arcs |
| Body width | Standard youth kit width; visible number block |
| Tone | Confident club player — matches Phoenix mascot athletic read |

#### Teen (13–17)

| Dimension | Guideline |
|-----------|-----------|
| Head-to-shoulder ratio | **~1 : 1.8** — teen athlete; mascot-default proportions |
| Eye size | **Medium** (≈12–15% of head height); sharper brow angle allowed |
| Feature simplicity | Sharper jaw, teen nose line; **not** adult rugged, **not** chibi |
| Body width | Standard teen kit; shoulders visible in bust crop |
| Tone | Operative athlete — mission-ready, COPPA-safe (no aggressive/dystopian) |

#### Adult player (18+)

| Dimension | Guideline |
|-----------|-----------|
| Head-to-shoulder ratio | **~1 : 2.0** — mature cartoon; wider shoulders |
| Eye size | **Medium** (≈11–13% of head height); same eye style family |
| Feature simplicity | Mature jaw, optional subtle stubble **shape** (flat graphic, not stubble texture) |
| Body width | Full kit shoulder width |
| Tone | Veteran operative — same ink, grown proportions |

#### Coach / staff (adult)

| Dimension | Guideline |
|-----------|-----------|
| Head-to-shoulder ratio | **~1 : 2.0** — same as adult player |
| Eye size | Same family as adult player |
| Feature simplicity | Same face catalog ink; differentiation via **kit layer** |
| Body width | Staff kit: polo or track jacket flat blocks — **no** player `#15` jersey default |
| Tone | Sideline professional — approachable authority; **not** Player HQ gamification chrome when shown on Coach routes |

### Schema handoff (document only — implement 3.5i+)

**Proposed v2 extension** (do not ship in 3.5e):

```typescript
// Future field on operativeAvatar v2 or parallel catalog dimension
bodyScale?: 'youth' | 'junior' | 'teen' | 'adult';
// Coach kit: role-aware default kit id, not a separate portrait system
```

**Alternative:** Separate catalog rows per band — e.g. `portrait_face_teen_default`, `portrait_face_youth_round` — selected by `bodyScale` at compose time.

**Read-repair mapping (future):**

| `users.ageBand` | `role` | Default `bodyScale` |
|-----------------|--------|---------------------|
| `under13` | player | `youth` or `junior` (split by DOB year band server-side) |
| `teen13to16` | player | `teen` |
| `adult` | player | `adult` |
| `adult` | coach / staff | `adult` + staff kit default |

**Coach portrait picker:** Lives on Coach profile or shared Armory-like studio in a **future sprint** — same catalog pipeline, flat presentation on Coach OS routes per §6.

---

## 5. Layer & catalog rules

### Layer order

Matches `renderLayeredPortrait.js`:

```
kit → face → hair
```

(back to front in z-order; kit paints first)

### Stable catalog IDs

**Do not rename** 3.5b starter ids. Sprint **3.5f replaces art under existing ids first**; age/role rows arrive in **3.5i+**.

| Slot | Starter ids (3.5b — art swap in 3.5f) |
|------|---------------------------------------|
| face | `portrait_face_default`, `portrait_face_round`, `portrait_face_angular` |
| hair | `portrait_hair_default`, `portrait_hair_crop`, `portrait_hair_long` |
| kit | `portrait_kit_default`, `portrait_kit_home`, `portrait_kit_away` |

**Minimum starter set (3.5f):** 9 parts — all art must match this document before VA sign-off.

### Future expansion naming convention

| Dimension | Pattern | Example |
|-----------|---------|---------|
| Age face variant | `portrait_face_{band}_{shape}` | `portrait_face_youth_round` |
| Skin tone row | `portrait_face_{band}_{tone}_{shape}` | `portrait_face_teen_medium_default` |
| Coach kit | `portrait_kit_staff_{variant}` | `portrait_kit_staff_polo`, `portrait_kit_staff_track` |
| Hair age tweak | `portrait_hair_{band}_{style}` | `portrait_hair_youth_crop` |

Run `npm run generate:portraits` after SVG edits per [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md).

---

## 6. Persona placement rules

Per [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) — same portrait **system**, different **presentation chrome** by persona.

### Player

Full operative loadout stack OK:

| Surface | Treatment |
|---------|-----------|
| HQ ring | `HudAvatarRing` — portrait inside level ring + equipped border |
| `HologramCardShell` | Armory Studio holo dossier hero |
| Armory Studio | Visual part picker (face / hair / kit) |
| Recruit card (16+) | `ProPlayerCard` front face — portrait + border + rank only |
| ProPlayerCard / dossier | Full loadout preview stack |

### Coach

When coach avatar ships:

- **Same** face/hair/kit catalog and compose pipeline
- **Flat presentation** on Coach OS routes — no `OperativeHub`, no gold mission CTA, no Player `pd-os-deck` frame around portrait
- Staff kit layer defaults (polo/track jacket) — reads sideline pro on first glance
- High-density flat analytics context (`COACH_OS.md`) — portrait is identity thumbnail, not gamification hero

### Parent

- Read-only mirror of child loadout — flat, no game chrome
- See [`PARENT_OS.md`](./PARENT_OS.md) — co-op partner tone

### COPPA (all personas)

- Catalog IDs only — **no photo upload**, no biometric likeness
- Age-appropriate tone per §4 — no dystopian/aggressive faces for minors; no infantilizing baby-chibi for teens
- `ownedPortraitParts` gates equip — see [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md)

---

## 7. Acceptance checklist (3.5f MCP VA)

Use this gate when swapping SVG art in **3.5f**:

- [ ] Readable at **88px** HQ ring and **128px** Studio holo — eyes and kit block identifiable
- [ ] All layers **same outline weight** when stacked (kit + face + hair)
- [ ] Youth vs teen vs adult side-by-side still reads **one illustrator family**
- [ ] Coach/staff kit variant reads **staff**, not player operative, on first glance
- [ ] No Bauhaus geometric stub aesthetic; no placeholder grey boxes
- [ ] No baked-in HUD ring, deck frame, or gold mission chrome inside SVG
- [ ] Phoenix palette anchor visible (navy kit, warm skin/fire tones, bold outline)
- [ ] Transparent/void-safe background

---

## 8. Sprint handoff

| Sprint | Deliverable |
|--------|-------------|
| **3.5e** ✓ | This document — art authority lock |
| **3.5f** ✓ | Starter catalog **SVG art swap** under existing 9 ids |
| **3.5g-vision** ✓ | [`OPERATIVE_ID_CARD.md`](./OPERATIVE_ID_CARD.md) — TCG zone authority (card layout; portrait safe zones in this doc § Card presentation) |
| **3.5g-d / 3.5g-e** | **Superseded** by **3.5g-f** frame (arc/level stamp experiments folded in) |
| **3.5g-f** | `OperativeIdCardFrame` — Z1–Z4; level top-right; same grammar on holo + `ProPlayerCard` |
| **3.5g-g** | Art well SIR proportions, banner watermark, optional arc flourish |
| **3.5g-b** | Club resolver + recruit `clubName` (after frame) |
| **3.5h** | Bauhaus v1 generator retirement |
| **3.5i** | Age-band catalog rows, coach kit, skin tones, `bodyScale` schema |
| **3.5i-pose** | `portrait_pose_*` catalog + Studio pose tab |
| **3.5j** | Identity Studio cohesion — SYNC IDENTITY + unified picker |
| **3.5k** | Collectible metadata — set #, rarity, card back, flavor text |

**3.5f Agent prompt template:**

> Implement SVG portrait parts strictly per **Authority: PORTRAIT_ART_DIRECTION.md**. Replace art under existing 3.5b catalog ids only. Attach Phoenix mascot reference. Pass §7 acceptance checklist.

---

## Cross-links

- **Operative ID card (layout & zones):** [`OPERATIVE_ID_CARD.md`](./OPERATIVE_ID_CARD.md)
- Portrait schema & pipeline: [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md) — Portrait v2
- Player void & identity column: [`PLAYER_OS.md`](./PLAYER_OS.md)
- Material primitives: [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md)
- Persona boundaries: [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md)
- COPPA age bands: [`docs/COPPA_SIGNUP_MATRIX.md`](../COPPA_SIGNUP_MATRIX.md) · `src/lib/types/coppa.ts`
