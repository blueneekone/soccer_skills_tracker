# HQ Mission Hero Modal (CDO blueprint — VS-1a)

Source: Gemini Vanguard Architect AI · implemented VS-1a.

## Layer architecture

- **Z4:** Scrim `--pd-void-base` @ 70%, no blur
- **Z3:** Hero chassis `--pd-navy-panel`, 1px `--pd-grey-trim`, 12px chamfer, gold L-brackets
- **Z1:** Mission ID well `--pd-void-base`, inset `--pd-grey-trim`

## Typography

| Element | Style |
|---------|--------|
| Mission ID (well) | Mono 600, `--pd-data-cyan` |
| Header | Sans bold caps, `--pd-action-gold` |
| Readout | Sans regular, `--pd-grey-trim` |

## Actions

| Control | Spec |
|---------|------|
| ENGAGE MISSION | Solid gold, void text, 6px chamfer |
| TERMINATE_LINK | Ghost amber, underline on hover |

## Shadow

Hard 4px × 4px, 0 blur, `--pd-void-base`

## Implementation

- `src/lib/components/hud/MissionHeroModal.svelte`
- Wired from `ActiveBounties.svelte` on `complete` + `/player/workout` missions

## Rejections

- Pill buttons · X close icon · gold glow · Z4 blur · nav cyan `#06b6d4`

## Sprint

`VS-1a` · [`PLATFORM_VISUAL_REDESIGN_PLAN.md`](../PLATFORM_VISUAL_REDESIGN_PLAN.md)
