# Avatar layer PNGs — sliced from reference sheets

**Sprint 3.6a-ref-organize** · **LAUNCH-defer-avatar** — **paused until post-launch**

> **No binaries at launch.** Owner exports transparent PNG layers from Photopea using [`docs/vision/references/character/AVATAR_REFERENCE_INDEX.md`](../../../docs/vision/references/character/AVATAR_REFERENCE_INDEX.md) **after** character builder unpause. See [`docs/vision/references/character/README.md`](../../../docs/vision/references/character/README.md).

## Expected layout (future)

```
static/avatar/layers/
  female/
    base-front.png
    kit-home.png
    hair/
    face/
    ear/
  male/
    ...
```

Log each shipped file in [`docs/vision/references/ASSET_LICENSES.md`](../../../docs/vision/references/ASSET_LICENSES.md) before Composer wires Avatar Studio.

Agent gate: [`.cursor/rules/avatar-builder-deferred.mdc`](../../../.cursor/rules/avatar-builder-deferred.mdc).
