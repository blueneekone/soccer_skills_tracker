# FRONTEND PHYSICS & VANGUARD AESTHETICS
## 1. THE TRINITY PATTERN (SVELTE 5)
Every complex feature in ANY silo (e.g., Director Roster, Admin Audit, Coach Board) must use this split:
- **Engine (`.svelte.ts`):** Pure Svelte 5 Class for math/state. NO DOM.
- **Arena (`.svelte`):** Pure Presentation. SVG/Canvas vectors.
- **HUD (`.svelte`):** Pure Interface. Glassmorphic overlays.

## 2. THE VISUAL MANIFESTO (ALL WORKSPACES)
- **Surfaces:** `bg-[#020202]/85`, `backdrop-blur-3xl`, 1px `border-white/10`.
- **Typography:** `tw-font-mono` for all numerical telemetry, HUD labels, and timers.
- **Physics:** No internal scroll traps. Use native page scrolling. All transitions MUST use `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Z-Axis:** Components must extrude via `scale` and `fly` to feel like hardware panels.