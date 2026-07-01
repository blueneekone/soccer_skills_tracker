---
trigger: always_on
description: Core principles for Svelte 5 frontend architecture and Firebase v10 database execution.
---

SSTRACKER: ENTERPRISE GOVERNANCE & ARCHITECTURAL MANDATES
1. AI EXECUTION & WORKFLOW PROTOCOL
Aggressive Atomicity (Two-File Governance): Execute no more than 2 to 3 distinct architectural tasks per execution plan. You must generate an Implementation Plan artifact for my approval before modifying any source code. Do not attempt monolithic refactors.
Multi-Persona Agent Simulation (Council of Experts): When diagnosing bugs, executing roadmap tasks, or refactoring architecture, you must automatically partition your reasoning into specialized sub-agents (e.g., [AGENT 1: Principal DevSecOps Engineer], [AGENT 2: Staff UI/UX Architect]). You must evaluate the codebase from these distinct expert perspectives and synthesize their findings before generating your Implementation Plan artifact.
2. UI/UX STABILITY & ARCHITECTURAL MANDATES
The Contrast Nuke (Gap U-01 Prevention): You are strictly forbidden from using rgba() text opacities or Tailwind opacity modifiers (e.g., text-white/50) on dark backgrounds, as this causes Gap U-01 contrast failures. You must exclusively enforce our 3-tier solid hex code scale (#fafafa, #d4d4d8, #a1a1aa for dark mode) to maintain WCAG AA compliance. You must apply the .dark-form-surface utility to guarantee legibility on forced-dark panels.
The Asymmetric Grid Lock (Anti-Squish): Symmetrical grids are banned for data-heavy dashboards. You must utilize a 12-column asymmetric Bento Grid topology (e.g., an 8-column Primary Canvas and a 4-column Sidecar). You MUST explicitly apply responsive Tailwind breakpoints (e.g., lg:tw-grid-cols-12 or xl:tw-grid-cols-12) to parent containers to prevent the layout from collapsing into a single mobile column on desktop monitors.
Grid Child Proportions: All auto-fit Bento grids must utilize exact minmax clamp math: grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr)); to drop organically to the next row instead of crushing content.
The Viewport Scroll Trap Resolution: The outermost .app-shell wrapper must utilize tw-h-[100dvh] and tw-flex-col. The .app-main container holding the cards MUST use flex: 1 1 auto; min-height: 0; overflow-y: auto; to permit the flex child to shrink and scroll vertically. Never use overflow: hidden on the main canvas if it traps data tables.
Emotional Design & Peak-End Rule: You are strictly forbidden from rendering raw, machine-like error codes or dead-end empty states. You must identify "ownable moments" in high-anxiety workflows (e.g., failed payments, compliance bottlenecks)
. You must intercept these valleys with warm, highly actionable recovery interfaces. The conclusion of a high-stress administrative task MUST fire an asynchronous, hardware-accelerated "High-Five" visual validation (e.g., canvas-confetti) immediately following a successful Firebase atomic commit to shift the user's emotional state to satisfaction
.
3. TECH STACK & CORE PROTOCOLS
Svelte 5 Runes Mandate: You are writing Svelte 5. You MUST use Runes ($state, $derived, $effect). NEVER use Svelte 4 export let syntax
.
CSS Architecture: All CSS MUST be placed inside a <style> tag at the bottom of the file or use Tailwind classes with the tw- prefix
. Do not use inline styles
. Apply the "Strategic Minimalism" design rules: Use Geist Mono for data, remove heavy glassmorphism, use deep slate (#0B0F19) backgrounds, and utilize clamp() functions for liquid padding spacing
.
Service Worker Auth Bypass: To prevent Progressive Web App (PWA) caching desynchronization and infinite auth loops, the Service Worker must explicitly bypass and ignore /auth/ routes, passkeys, and Firebase Identity Platform endpoints. All auth network requests must bypass the cache directly
.
Firebase Operations: You must use the v10+ Modular SDK. If updating multiple documents, use atomic writeBatch (capped at 500 operations). If incrementing, use increment().