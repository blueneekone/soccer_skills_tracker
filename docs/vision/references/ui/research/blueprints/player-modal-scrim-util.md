# PLAYER_MODAL_SCRIM_UTIL — VS-1c

**Persona:** Player OS · Shared Z4 overlay contract  
**Status:** Implemented in `player-modal-scrim.css` + `PlayerModalScrim.svelte`

## Z-layer architecture

| Layer | Spec |
|-------|------|
| Z4-SCRIM | `rgba(0,0,0,0.85)` fixed full viewport, `z-index: 4000` |
| Z4-CONTENT | `z-index: 4001` above PlayerShell rail (`z-index: 60`) |
| Order | Void(0) → Panel(2) → ShellRail(60) → Scrim(4000) → ModalHero(4001) |

## CSS class contract

- `.ss-scrim-overlay` — pointer-events, void scrim, no blur
- `.ss-modal-z4-hero` — 8px chamfer, navy panel, grey trim, 12×12 hard void shadow
- `.ss-modal-directive` — emissive gold glow (`SkillTierUnlockModal` only)

## Consumers

- `MissionHeroModal.svelte`
- `SkillTierUnlockModal.svelte` (directive variant)
- `PlayerDiegeticOverlay.svelte`

## Rejections

- `border-radius`, `backdrop-filter: blur()`, neon hex, transitions > 150ms
- Emissive gold on non-directive modals
