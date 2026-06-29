---
name: nexus-command-ui
description: Strict guidelines for building the SSTracker user interface, layouts, and CSS. Use this whenever editing layouts, components, or style.css.
---
# Nexus Command Aesthetic Blueprint

## Topology & Layout
- Migrate all layouts to a 12-column Bento Grid topology using fluid `clamp()` spacing (e.g., `var(--bento-pad-liquid)`). 
- Completely eradicate trailing margins, generic Bootstrap templates, and unanchored dead space.
- Use sharp 90-degree corners or precise chamfered clip-paths. Rounded Material Design pills are forbidden.

## 60-30-10 Tech Noir Palette
- **Dominant Base (60%):** Void Black (`#000000`, `#020617`) and Navy Slate (`#0f172a`, `#1e293b`).
- **Structural Trim (30%):** Structural Grey (`#334155`) and Silver (`#94a3b8`) for 1px geometric borders.
- **Action & Telemetry (10%):** Action Gold (`#fbbf24`) for the singular primary CTA per screen. Data Cyan (`#14b8a6`) for telemetry grids. Atompunk Amber (`#f59e0b`) for secondary mechanical details.

## Typography & Layers
- Use **Geist Display** for hero metrics and **Geist Mono** for ultra-small (`text-[10px]`), heavily letter-spaced labels.
- Implement "Liquid Glassmorphism 2.0" on Z3 layers by pairing highly transparent background fills (e.g., `bg-[#040f16]/85`) with extreme blur variables (`backdrop-filter: blur(20px)`).