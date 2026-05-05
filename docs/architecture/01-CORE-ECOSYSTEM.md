# FRONTEND PHYSICS & VANGUARD AESTHETICS
## 1. THE TRINITY PATTERN (SVELTE 5)
Complex UI must be ripped into three isolated layers:
1. `*Engine.svelte.ts`: The Brain. Pure Svelte 5 class. NO DOM manipulation.
2. `*Arena.svelte`: The Glass. Dumb SVG/Canvas presentation layer.
3. `*HUD.svelte`: The HTML UI. Overlays mapping to 3D space.

## 2. THE VISUAL MANIFESTO (ULTRA-PREMIUM)
- **Glassmorphism:** Use `bg-[#020202]/80`, `backdrop-blur-3xl`, and 1px `border-white/10`.
- **Typography:** Use `tw-font-mono` for all numerical telemetry, HUD labels, and timers.
- **Physics:** No internal scroll traps. Use native page scrolling. Transitions must use `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Z-Axis:** Modals must feel like hardware panels extruding via `scale` and `fly`.