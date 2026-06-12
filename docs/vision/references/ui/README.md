# UI reference mockups

**Sprint LAUNCH-defer-avatar** · Owner drops layout references here **before** UI sprints.

## Subfolders

| Subfolder | Persona |
|-----------|---------|
| [`coach/`](./coach/) | Coach OS |
| [`player/`](./player/) | Player OS — holo chrome, HQ bands, route shells |
| [`parent/`](./parent/) | Parent Lounge |
| [`director/`](./director/) | Director / club ops |
| [`shared/`](./shared/) | Cross-persona chrome, tokens, marketing-adjacent UI |

## Naming

**Canonical (Gemini research §G):**

```
ref-{persona}-{category}-{name}-option-{a-d}.png
```

Examples:

- `ref-player-z2panel-edgeglass-option-a.png`
- `ref-coach-bento-datagrid-option-b.png`
- `ref-parent-vpc-trust-shield-option-a.png`

Legacy short form (`ref-{persona}-{feature}-{variant}`) is OK until refs are regenerated.

## Do I need images before building?

**No for Phase 1.** Engineering can implement tokens, Z-depth, chamfer grammar, and bento layout from [`research/TOKEN_GAP_ANALYSIS.md`](./research/TOKEN_GAP_ANALYSIS.md) using CSS alone.

**Yes for Phase 2 polish** if you want pixel-matched chrome (Z0 atmosphere plates, edge-lit panel slices from §C manifest). Generate those in a separate Flow session (research §D), then drop PNGs/JPGs in the persona folders above — they guide slicing/compositing, not runtime `<img>` tags until a sprint wires them.

**Character / avatar art** is a **different folder**: [`../character/`](../character/README.md). Your existing Meg/Tom sheets stay there as owner reference; they are **not** wired into the app until Avatar Studio unpauses post-launch.

## Rules

- UI refs guide **layout and tokens** — spacing, hierarchy, deck grammar, holo well chrome.
- **Not** operative portrait art — busts stay on `defaultPortraitV2` SVG until character track unpauses.
- Do not trace third-party UI screenshots into shipping components without license row in [`ASSET_LICENSES.md`](../ASSET_LICENSES.md).

## Sprint citation (agents)

```markdown
**UI reference:** `docs/vision/references/ui/player/ref-player-{feature}-{variant}.png`
**Authority:** `docs/vision/references/ui/README.md` · `PLATFORM_BUILD_MANDATES.md`
**Out of scope:** Avatar Studio PNG layers · `character/` sheets (post-launch)
```

## Cross-links

- Master index: [`../README.md`](../README.md)
- Player holo recess (frame): [`../PORTRAIT_REFERENCE_BOARD.md`](../PORTRAIT_REFERENCE_BOARD.md) §2
- Character sheets (paused): [`../character/README.md`](../character/README.md)
