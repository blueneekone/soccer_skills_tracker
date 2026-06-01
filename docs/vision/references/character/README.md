# Character reference sheets — DEFERRED post-launch

> **DEFERRED (post-launch — owner art)**  
> Avatar Studio, Photopea PNG layer stack, and `static/avatar/layers/` wiring are **paused** until the product owner reopens the character builder.  
> **Launch ships:** `defaultPortraitV2` SVG + `profileIncomplete` initials on holo surfaces.

**Sprint LAUNCH-defer-avatar** · Agents: **read-only** — do not wire these JPEGs or slice outputs into the app without explicit owner unpause.

## Contents

| Path | Role |
|------|------|
| [`female-meg/`](./female-meg/) | Mighty Meg — concept, turnarounds, kits, catalog grids |
| [`male-tom/`](./male-tom/) | Atomic Tom — concept, turnarounds, catalog grids |
| [`AVATAR_REFERENCE_INDEX.md`](./AVATAR_REFERENCE_INDEX.md) | Slice source map → future `static/avatar/layers/` |

## Rules

- **Do NOT** paste rasters into Firestore or production bundles until post-launch slice sprint.
- **Do NOT** use Sparky / mascot proportions as the operative teen face — see [`../mood/README.md`](../mood/README.md).
- Catalog grid JPEGs are **slice sources only** — export transparent PNGs in Photopea before any future Avatar Studio sprint.

## When unpaused

1. Read [`AVATAR_REFERENCE_INDEX.md`](./AVATAR_REFERENCE_INDEX.md) + [`../PORTRAIT_REFERENCE_BOARD.md`](../PORTRAIT_REFERENCE_BOARD.md).
2. Log shipped layers in [`../ASSET_LICENSES.md`](../ASSET_LICENSES.md).
3. Follow [`../../GEMINI_ART_BRIEF.md`](../../GEMINI_ART_BRIEF.md) for precomposed bust ingest (parallel track).

## Cross-links

- Master index: [`../README.md`](../README.md)
- Provenance: [`../REFERENCE_SOURCES.md`](../REFERENCE_SOURCES.md)
- Layer output stub (paused): [`../../../static/avatar/layers/README.md`](../../../static/avatar/layers/README.md)
- Agent gate: [`../../../.cursor/rules/avatar-builder-deferred.mdc`](../../../.cursor/rules/avatar-builder-deferred.mdc)
