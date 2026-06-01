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

```
ref-{persona}-{feature}-{variant}.{png|jpg|webp}
```

Examples:

- `ref-player-holo-hq-v1.png`
- `ref-coach-logistics-inbox-v2.webp`

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
