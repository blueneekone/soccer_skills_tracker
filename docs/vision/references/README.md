# Vision references — master index

**Sprint LAUNCH-defer-avatar** · Authority: [`ROADMAP.md`](../../../ROADMAP.md)

> **Launch bar:** Player holo uses `defaultPortraitV2` SVG + `profileIncomplete` initials. Avatar/character builder and PNG layer stack are **paused until post-launch** — see [`character/README.md`](./character/README.md).

## Folder map

| Folder | Purpose | Agent may wire to app? |
|--------|---------|------------------------|
| [`ui/`](./ui/) | Persona UI mockups — layout, tokens, chrome | **Yes** — layout/tokens only; not operative portrait art |
| [`character/`](./character/) | Owner Gemini character sheets + slice index | **No** — deferred post-launch; read-only reference |
| [`mood/`](./mood/) | Tone experiments; Sparky = anti-ref only | **No** |
| [`archive/`](./archive/) | Superseded refs | **No** — do not cite in new sprints |
| [`va-screenshots/`](../va-screenshots/) | Shipped sprint proof manifests only | **No** — VA evidence, not design authority |

## Child READMEs

- UI mockups: [`ui/README.md`](./ui/README.md)
- Character / Avatar Studio: [`character/README.md`](./character/README.md)
- Mood experiments: [`mood/README.md`](./mood/README.md)
- Archive: [`archive/README.md`](./archive/README.md)
- Legacy `images/` redirect: [`images/README.md`](./images/README.md)

## Provenance & boards

- Provenance table: [`REFERENCE_SOURCES.md`](./REFERENCE_SOURCES.md)
- Portrait authority: [`PORTRAIT_REFERENCE_BOARD.md`](./PORTRAIT_REFERENCE_BOARD.md)
- Licenses on ship: [`ASSET_LICENSES.md`](./ASSET_LICENSES.md)

## Agent rules

- UI sprints: [`avatar-builder-deferred.mdc`](../../../.cursor/rules/avatar-builder-deferred.mdc) — use `ui/**`; do not implement PNG avatar layers or gemini-ingest without owner reopen.
- Portrait ingest (when unpaused): [`portrait-gemini-ingest.mdc`](../../../.cursor/rules/portrait-gemini-ingest.mdc)
