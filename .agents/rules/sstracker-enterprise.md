---
trigger: always_on
description: Core principles for Svelte 5 frontend architecture and Firebase v10 database execution.
---

### SSTracker Technical Syntax Guidelines

#### Svelte 5 Frontend Architecture (for `*.svelte` files)
*   **Runes Mandate:** You are writing Svelte 5. You MUST use Runes (`$state`, `$derived`, `$effect`). NEVER use Svelte 4 `export let` syntax [7].
*   **CSS Architecture:** All CSS MUST be placed inside a `<style>` tag at the bottom of the file or use Tailwind classes with the `tw-` prefix [7]. Do not use inline styles [42].
*   **Design Implementation:** Apply the "Strategic Minimalism" design rules: Use `Geist Mono` for data, remove heavy glassmorphism, use deep slate (`#0B0F19`) backgrounds, and utilize `clamp()` functions for liquid padding spacing [4].

#### Firebase v10 & Security Architecture (for `*.ts` and `*.js` files)
*   **Modular SDK:** You are writing Firebase/Firestore logic. You MUST use the v10+ Modular SDK (e.g., `import { doc, setDoc } from 'firebase/firestore'`). NEVER use the compat SDK [7].
*   **Atomic Data Safety:** If updating multiple documents, you MUST use `writeBatch` capped at 500 operations [13, 14]. If incrementing a counter, you MUST use `increment()` to prevent race conditions [13, 40].
*   **Zero-Trust Enforced:** Never trust client payloads. Validate roles and isolated cell access via Custom JWT claims [24, 43].

The Contrast Nuke (Gap U-01 Prevention): You are strictly forbidden from using rgba() text opacities or Tailwind opacity modifiers (e.g., text-white/50) on dark backgrounds, as this causes Gap U-01 contrast failures. You must exclusively enforce our 3-tier solid hex code scale (#fafafa, #d4d4d8, #a1a1aa for dark mode) to maintain WCAG AA compliance. You must apply the .dark-form-surface utility to guarantee legibility on forced-dark panels.
The Asymmetric Grid Lock (Anti-Squish): Symmetrical grids are banned for data-heavy dashboards. You must utilize a 12-column asymmetric Bento Grid topology (e.g., an 8-column Primary Canvas and a 4-column Sidecar). You MUST explicitly apply responsive Tailwind breakpoints (e.g., lg:tw-grid-cols-12 or xl:tw-grid-cols-12) to parent containers to prevent the layout from collapsing into a single mobile column on desktop monitors.

Grid Child Proportions: All auto-fit Bento grids must utilize exact minmax clamp math: grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr)); to drop organically to the next row instead of crushing content.

The Viewport Scroll Trap Resolution: The outermost .app-shell wrapper must utilize tw-h-[100dvh] and tw-flex-col. The .app-main container holding the cards MUST use flex: 1 1 auto; min-height: 0; overflow-y: auto; to permit the flex child to shrink and scroll vertically. Never use overflow: hidden on the main canvas if it traps data tables.

Service Worker Auth Bypass: To prevent Progressive Web App (PWA) caching desynchronization and infinite auth loops, the Service Worker must explicitly bypass and ignore /auth/ routes, passkeys, and Firebase Identity Platform endpoints. All auth network requests must bypass the cache directly.