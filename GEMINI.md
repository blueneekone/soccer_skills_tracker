# NEXUS COMMAND: VANGUARD PROTOCOL 2026
# GLOBAL ARCHITECTURE & EXECUTION RULES

## 1. PROJECT IDENTITY & TACTICAL SIEM AESTHETIC
*   **Platform Identity:** A professional-grade, strategic SaaS platform for youth athlete development targeting a 7x-12x ARR enterprise valuation.
*   **The UI Aesthetic:** "Tactical SIEM / Commander." It must feel like an ultra-premium cybersecurity Mission Control dashboard [3]. 
*   **Colors:** Deep muted slate/navy dark mode (e.g., `#0B0F19`), stark white data points, and 1px borders [4]. NO PURE BLACK backgrounds. NO NEON GLOWS or heavy glassmorphism on data-dense tables [4, 5].
*   **Typography:** Use `Switzer` for body text and strictly use `Geist Mono` for all data labels, metrics, and technical readouts [5].
*   **Information Architecture:** Enforce "Progressive Disclosure" and the "Master-Detail" pattern. Never cram Orgs, Rosters, and Billing into a single modal. Use widescreen, edge-to-edge high-density data tables.

## 2. TECH STACK & STRICT SVELTE 5 MANDATES
*   **Core Stack:** Svelte 5 (Strict Runes), SvelteKit, TypeScript, Tailwind CSS, Firebase v10+ Modular SDK [6, 7].
*   **Reactivity:** Use Svelte 5 Runes strictly (`$state`, `$derived`, `$effect`). You must use `untrack()` for `goto()` calls inside `$effect` blocks to prevent infinite execution loops [8, 9].
*   **Formatting:** All functions capped at 80 lines; extract complex transformations to `src/lib/utils/` [10].
*   **The Vanguard Trinity Pattern:** Fracture all interactive screens into The Shell (`+page.svelte`), The Brain (`*Engine.svelte.ts`), The Glass (`*Arena.svelte`), and The HUD (`*HUD.svelte`) [11].

## 3. ZERO-TRUST DATABASE DEFENSE
*   **Cell Awareness:** Direct `getFirestore()` calls from the client are strictly prohibited. Access must route through `getActiveDb()` or `getAdminDb(cellId)` to maintain multi-tenant cell routing integrity [10, 12].
*   **Atomic Safety:** Ban raw `set()` or `update()` in loops; use `increment()` or atomic batches (`writeBatch`) limited to 500 actions to prevent race conditions [13, 14].
*   **No 1-on-1 Minors:** The Triad Protocol must mathematically block unsupervised adult-to-minor direct messages at the database level, forcing a parent CC [15, 16].

## 4. EXECUTION DIRECTIVES
*   **Plan Before Building:** Always generate an Implementation Plan artifact before writing code [17, 18].
*   **No Placeholders:** Write every single line of production code. Do not use `// ... existing code`.