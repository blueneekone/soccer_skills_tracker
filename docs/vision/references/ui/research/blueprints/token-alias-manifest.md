# Token Alias Manifest (CDO blueprint)

Source: Gemini Vanguard Architect AI · VS-0a · normalized for repo.

## Core token alias table

| Token | Hex | Role | Persona | Forbidden | Repo alias |
|-------|-----|------|---------|-----------|------------|
| `--pd-void-base` | `#000000` | Canvas | ALL | Not text color | `--pd-bg` |
| `--pd-navy-panel` | `#0f172a` | Z2 surface | ALL | No transparency | `--vanguard-bg` (Coach) · Player panels use `--pd-panel` `#05050a` |
| `--pd-action-gold` | `#fbbf24` | Critical CTA | **Player only** | Coach/Parent | `--pd-accent-action` |
| `--pd-data-cyan` | `#14b8a6` | Metrics | ALL | Not nav | `--pd-accent-data` |
| `--pd-nav-cyan` | `#06b6d4` | Wayfinding | ALL | Not data viz | `--pd-nav-primary` |
| `--pd-atom-amber` | `#d97706` | Warning | ALL | Not decorative | `--pd-status-warn` |
| `--pd-grey-trim` | `#334155` | Borders | ALL | Not text | `--pd-border-low` |

## Geometry & scrim

| Token | Value |
|-------|-------|
| `--pd-chamfer-sm` | 6px (wells, buttons) |
| `--pd-chamfer-md` | 12px (panels) |
| `--pd-chamfer-lg` | 16px (hero modals) |
| `--pd-chamfer-depth` | defaults to `md` until owner §H pick |
| `--pd-scrim-void-low` | 0.7 |
| `--pd-scrim-void-high` | 0.8 |
| `--pd-scrim-void` | defaults to high |

## Implementation notes (repo)

- Aliases live on `.player-dossier-root` in `player-dossier.css`.
- **Do not** apply manifest `clip-path` on `.player-dossier-root` — chamfer stays on controls/modals only.
- Coach gold-strip via `.persona-coach .player-dossier-root` is **invalid** — Coach routes do not mount dossier root; enforce gold ban in Coach CSS separately (VS-0b).

## Sprint

`VS-0a` · [`PLATFORM_VISUAL_REDESIGN_PLAN.md`](../PLATFORM_VISUAL_REDESIGN_PLAN.md)
