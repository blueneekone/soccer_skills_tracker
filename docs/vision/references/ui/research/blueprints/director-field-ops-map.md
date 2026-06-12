# Director Field Ops Map (CDO blueprint)

Source: Gemini Vanguard Architect AI · **VS-5b implemented**.

## Architecture

| Layer | Role | Class hook |
|-------|------|------------|
| Z0 | Void map substrate (desaturated) | `.fm-embedded-map-frame`, `.fm-vault--embedded` |
| Z1 | Map well inset (1px grey trim) | `.director-field-ops-z1-well` |
| Z2 | Deployment calendar + facility manifest | `.director-field-ops-z2-panel` |
| Z3 | Weather lock / advisory | `.director-field-ops-z3-weather--lock` |
| Z4 | Ops HUD header | `.director-field-ops-z4-head` |

## Palette (field ops only)

| Use | Token |
|-----|-------|
| Surfaces | `#0f172a` navy |
| Borders | `#334155` grey trim |
| Facility status / sync / map nodes | `#14b8a6` **data cyan** |
| Weather lock / conflicts | `#d97706` amber |
| Void / empty map | `#000000` |
| **REJECTED** | Gold, **nav cyan `#06b6d4`**, glow, glass, gradients |

## Actions

- **Sync / save:** `.director-field-ops-btn-sync` — navy fill, data cyan text, chamfer
- **Weather lock engaged:** amber flat banner (not modal blur)

## Geometry

- 4px chamfer on panels; 8px on Z1 well wrapper
- Flat admin tables — 1px grey dividers only

## Implementation

- CSS: `src/lib/styles/director-field-ops-map.css`
- Module: `src/lib/components/director/os/FieldOpsModule.svelte`
- Embedded map: `FacilityMapVault.svelte` (CSS overrides when nested)
- Preserved: `syncFacilityToLegacyField`, `field_weather_status`, `secureBookField`

## Sprint

`VS-5b` in [`CDO_PROMPT_LIBRARY.md`](../CDO_PROMPT_LIBRARY.md)
