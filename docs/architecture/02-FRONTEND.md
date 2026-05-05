# FRONTEND PHYSICS & UI LAWS
- **Svelte 5 Only:** Use strict Runes (`$state`, `$derived`, `$props`). No Svelte 4 stores.
- **Strict Decoupling:** `*Engine.svelte.ts` (Pure logic/math), `*Arena.svelte` (Dumb SVG vectors), `*HUD.svelte` (HTML/DOM overlays).
- **No Scroll Traps:** Never use `overflow-y-auto` on internal UI panels. Rely strictly on native, window-level page scrolling.
- **Glass & Geometry:** Standard `rounded` borders are banned. Use `rounded-2xl` or `rounded-full`. UI must use deep blurs (`backdrop-blur-2xl`), sub-pixel neon borders (`border-white/10`), and inset shadows.
- **Matrix Fail-Safes:** Any `getScreenCTM().inverse()` matrix math MUST be wrapped in a `try/catch` block to prevent 3D CSS `DOMException` crashes, falling back to a bounding box raycast.
- **Glass Penetration:** All interactive HTML elements (`<button>`, `<input>`) inside a `pointer-events-none` 3D wrapper MUST explicitly declare `pointer-events-auto` or they will be unclickable ghosts.
- **Context Overrides:** Intercept `oncontextmenu` on SVG entities, use `e.preventDefault()` to kill native right-clicks, and trigger custom Svelte UI radials.
- **Pure Optics:** Arrow markers MUST use `markerUnits="userSpaceOnUse"`. Trails must be geometric tracks or Lockheed-style Neon (`feGaussianBlur` multi-layer stacks), no cheap noise/turbulence.