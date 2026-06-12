# TRAIN_EXECUTE_THEATER — VS-2a

**Persona:** Player OS · Execute (`/player/workout`)  
**Status:** Implemented in `player-train-theater.css`

## Z-layers

| Z | Role | Token |
|---|------|-------|
| Z0 | Void canvas | `--pd-void-base` |
| Z1 | Telemetry wells | `--pd-navy-panel` + `--pd-data-cyan` border |
| Z2 | Configure/quest panels | 8px chamfer, navy |
| Z3 | `pd-os-deck--hero` execution theater | Hard void shadow |
| Z4 | Terminal scan + amber trim | `--pd-atom-amber` |

## Actions

- **EXEC_COMMIT** — exactly one gold focal (`.pw-exec-commit`)
- Secondary bundle/proof actions use `.pw-exec--alt` (amber, not gold)

## Rejections

- Gradients, double gold, neon glow, border-radius, blur/glass
