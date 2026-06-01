# Avatar reference index — Photopea slice source map

**Sprint 3.6a-ref-organize** · **LAUNCH-defer-avatar** — **paused post-launch** · Authority: [`PORTRAIT_REFERENCE_BOARD.md`](../PORTRAIT_REFERENCE_BOARD.md)

> **DEFERRED:** Do not slice or wire `static/avatar/layers/` until owner reopens character builder. Catalog grid JPEGs are **slice sources only** — not shipping layers until exported as transparent PNGs after unpause.

## Legacy mood boards (removed 3.6a)

Wiki mood JPEGs (Vault Boy/Girl, Bert Turtle, UPA, Monopoly, teen comic, phoenix-palette) were **removed** by product owner. Tone discipline remains in [`PORTRAIT_REFERENCE_BOARD.md`](../PORTRAIT_REFERENCE_BOARD.md) §1 text — do not restore traced third-party art.

## `../mood/` — anti-ref + experiments

| Path | Character | Type | Future slice target |
|------|-----------|------|---------------------|
| `../mood/ref-mood-sparky-mascot.png` | Phoenix mascot | mood / anti-ref | *(none — do not use as operative face)* |
| `../mood/ref-gemini-exp-01.png` … `ref-gemini-exp-NN.png` | — | Gemini experiment | *(optional tone experiments only)* |

### Missing (restore under `references/mood/`, then update this table)

| Expected source | Target |
|-----------------|--------|
| `images/Sparky.png` (legacy) | `../mood/ref-mood-sparky-mascot.png` |
| `Gemini_Generated_Image_*.png` (sorted) | `../mood/ref-gemini-exp-01.png` … `ref-gemini-exp-NN.png` |

## `female-meg/` — Mighty Meg (CATALOG_002)

| Path | Type | Future slice target (example) |
|------|------|-------------------------------|
| `ref-female-meg-concept-jumpsuit.jpeg` | concept | `static/avatar/layers/female/kit-home.png` |
| `ref-female-meg-catalog-corporate-tunic.jpeg` | catalog kit | `static/avatar/layers/female/kit-corporate.png` |
| `ref-female-meg-base-underwear-front.jpeg` | base turnaround | `static/avatar/layers/female/base-front.png` |
| `ref-female-meg-base-underwear-v2.jpeg` | base turnaround | `static/avatar/layers/female/base-side.png` |
| `ref-female-meg-base-underwear-v3.jpeg` | base turnaround | `static/avatar/layers/female/base-back.png` |
| `ref-female-meg-kit-away-7.jpeg` | kit sheet | `static/avatar/layers/female/kit-away.png` |
| `ref-female-meg-kit-uniform.jpeg` | kit sheet | `static/avatar/layers/female/kit-uniform.png` |
| `ref-catalog-female-meg-hair-18grid.jpeg` | catalog grid | `static/avatar/layers/female/hair/*.png` |
| `ref-catalog-female-meg-face-15grid.jpeg` | catalog grid | `static/avatar/layers/female/face/*.png` |
| `ref-catalog-female-meg-ear-11grid.jpeg` | catalog grid | `static/avatar/layers/female/ear/*.png` |

## `male-tom/` — Atomic Tom (CATALOG_003)

| Path | Type | Future slice target (example) |
|------|------|-------------------------------|
| `ref-male-tom-concept-home-kit-9.jpeg` | concept | `static/avatar/layers/male/kit-home.png` |
| `ref-male-tom-base-underwear-v1.jpeg` | base turnaround | `static/avatar/layers/male/base-front.png` |
| `ref-male-tom-base-underwear-turnaround.jpeg` | base turnaround | `static/avatar/layers/male/base-side.png` |
| `ref-male-tom-base-underwear-v3.jpeg` | base turnaround | `static/avatar/layers/male/base-back.png` |
| `ref-catalog-male-tom-hair-18grid.jpeg` | catalog grid | `static/avatar/layers/male/hair/*.png` |
| `ref-catalog-male-tom-face-15grid.jpeg` | catalog grid | `static/avatar/layers/male/face/*.png` |
| `ref-catalog-male-tom-ear-grid.jpeg` | catalog grid | `static/avatar/layers/male/ear/*.png` |

## Notes

- **Two face sheets:** deduped from pre-3.6a `SSTracker Avatar Assets/` dump (archived under [`../archive/`](../archive/) if retained).
- **Parallel track (also paused at launch):** precomposed bust ingest → `static/portrait/approved/` per [`GEMINI_ART_BRIEF.md`](../../GEMINI_ART_BRIEF.md).
- Slice output folder (paused): [`static/avatar/layers/README.md`](../../../../static/avatar/layers/README.md)

## Cross-links

- Folder README: [`README.md`](./README.md)
- Provenance: [`../REFERENCE_SOURCES.md`](../REFERENCE_SOURCES.md)
- Licenses (on slice ship): [`../ASSET_LICENSES.md`](../ASSET_LICENSES.md)
- Master index: [`../README.md`](../README.md)
