# Portrait Representation — Catalog Tags (Sprint 3.5i-a)

**Authority:** [`PORTRAIT_ART_DIRECTION.md`](./PORTRAIT_ART_DIRECTION.md) §4 age bands · §5 naming · [`OPERATIVE_LOADOUT.md`](./OPERATIVE_LOADOUT.md) portrait catalog

> COPPA-safe **catalog ids only** — no photo upload, no profile gender field, no clinical labels in UI.

---

## Skin tone rows (teen starter)

Display names are inclusive words — **not** numbered swatches.

| Catalog tag | Studio chip label | Encoded in |
|-------------|-------------------|----------|
| `light` | Light | `portrait_face_teen_light_default` |
| `medium` | Medium | `portrait_face_teen_medium_default` |
| `tan` | Tan | `portrait_face_teen_tan_default` |
| `deep` | Deep | `portrait_face_teen_deep_default` |

**Schema:** Tone lives in the **face part id** (`portrait_face_teen_{tone}_default`). No separate `operativeAvatar.parts.skinTone` field in 3.5i-a — face id is source of truth.

---

## Presentation tags (Studio filter only)

Filter chips in Armory Studio — **not** stored on the user profile.

| Tag | Studio chip | Use |
|-----|-------------|-----|
| `feminine-presenting` | Feminine | Teen hair starter set (long, ponytail, crop) |
| `neutral-presenting` | Neutral | Legacy 3.5b starters + teen face shapes |
| `masculine-presenting` | Masculine | Reserved for future catalog rows |

Firestore writes **`operativeAvatar.parts.{face,hair,kit}`** catalog ids only. Presentation is catalog metadata for picker filtering.

---

## Naming convention (locked)

Per `PORTRAIT_ART_DIRECTION.md` §5:

| Kind | Pattern | Example |
|------|---------|---------|
| Face + tone | `portrait_face_teen_{tone}_{shape}` | `portrait_face_teen_medium_default` |
| Hair style | `portrait_hair_teen_{style}` | `portrait_hair_teen_ponytail` |

**3.5b starters unchanged** — `portrait_face_default`, `portrait_hair_long`, etc.

---

## 3.5i-a starter set

| Slot | Count | Ids |
|------|-------|-----|
| Face | 4 tones × default shape | `portrait_face_teen_{light,medium,tan,deep}_default` |
| Hair | 3 teen styles | `portrait_hair_teen_{long,ponytail,crop}` |

SVG art: Phoenix family flat ink — variants of existing stubs until 3.5i-b bodyScale pass.

---

## Out of scope (3.5i-a)

- `bodyScale` auto from DOB (**3.5i-b**)
- `portrait_pose_*` (**3.5i-pose**)
- Coach staff kit layer
- Collectible metadata (**3.5k**)
