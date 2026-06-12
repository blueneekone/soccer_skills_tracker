# Coach OS Token Skin Manifest (CDO blueprint)

Source: Gemini Vanguard Architect AI · VS-0b · normalized for repo.

## Identity

- **Environment:** SIEM flat analytics
- **Persona:** Coach only — gold **rejected**

## Z-layer mapping

| Layer | Background | Border |
|-------|------------|--------|
| Z0 void | `--pd-void-base` `#000000` | — |
| Z1 well | `--pd-void-base` | 1px `--pd-grey-trim` |
| Z2 panel | `--pd-navy-panel` `#0f172a` | — |
| Z4 chrome | `--pd-navy-panel` | 2px bottom `--pd-grey-trim` |

## Vanguard ↔ PD bridge

| Vanguard (manifest) | PD token | Hex |
|---------------------|----------|-----|
| `--vanguard-bg-main` | `--pd-void-base` | `#000000` |
| `--vanguard-surface-level-1` | `--pd-navy-panel` | `#0f172a` |
| `--vanguard-border-default` | `--pd-grey-trim` | `#334155` |
| `--vanguard-accent-primary` | `--pd-data-cyan` | `#14b8a6` |
| `--vanguard-status-alert` | `--pd-atom-amber` | `#d97706` |

## Geometry

- Z2/Z4: **4px** 45° chamfer (Coach — subtler than Player 12–16px)
- Mono data readouts · stroke graphs cyan · no area fills

## Rejections

- `--pd-action-gold` on Coach
- Rounded pills · glassmorphism · neon glow / drop shadows
- Hover: border → cyan only, no scale

## Implementation

- Tokens on `.coach-os-root` (`src/routes/(app)/coach/+layout.svelte`)
- Styles: `src/lib/styles/coach-os.css`
- Does **not** change global `:root` `--vanguard-*` (Parent/Director share EnterpriseConsoleShell)

## Sprint

`VS-0b` · [`PLATFORM_VISUAL_REDESIGN_PLAN.md`](../PLATFORM_VISUAL_REDESIGN_PLAN.md)
