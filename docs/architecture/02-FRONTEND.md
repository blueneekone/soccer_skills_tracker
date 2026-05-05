# FRONTEND PHYSICS & STRICT MODULARIZATION
This app handles complex 3D math, SVG manipulation, and real-time physics. You MUST enforce the "Trinity Pattern" for all complex features to prevent DOM/Context collapse.

## 1. THE TRINITY PATTERN (SVELTE 5)
Complex UI (like the Tactical Board) must be ripped into three isolated layers:
1. `*Engine.svelte.ts`: The Brain. Pure Svelte 5 class holding ONLY `$state`, timeline loops, and math (e.g., matrix fallbacks). NO DOM manipulation here.
2. `*Arena.svelte`: The Glass. Dumb SVG/Canvas presentation layer. It takes state from the Engine and renders vectors.
3. `*HUD.svelte`: The HTML UI. Overlays mapping to 3D space.

## 2. UI PHYSICS LAWS
- **Svelte 5 Only:** Strict Runes (`$state`, `$derived`, `$props`, `$effect`). No Svelte 4 stores.
- **No Scroll Traps:** Never use `overflow-y-auto` on internal UI panels. Rely strictly on native page scrolling.
- **Glass & Geometry:** Use `rounded-2xl` or `rounded-full`. UI utilizes deep blurs (`backdrop-blur-2xl`), sub-pixel neon borders (`border-white/10`), and inset shadows.
- **Z-Axis Mounts:** Modals and menus extrude using Svelte transitions (`fly`, `scale`).
- **Matrix Fail-Safes:** Any `getScreenCTM().inverse()` math MUST be wrapped in a `try/catch` block.