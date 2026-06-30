SSTracker / Nexus Command: Enterprise Governance Rules
1. AI Execution & Workflow Protocol
Plan-First Mandate: You must generate a structured implementation plan artifact before modifying any source code.  

Two-File Governance: No single execution plan may encompass more than 2 to 3 distinct architectural tasks.  

2. Core Architecture & Coding Constraints
Function Limits: Functions are mathematically restricted to a maximum of 80 lines. Abstract complex parsing or conditionals into independent utilities located in src/lib/utils/.  

Strict TypeScript: The any type is strictly prohibited across all interfaces. All data schemas and custom claims must be heavily typed and centralized in the types/ directory.  

Svelte 5 Runes: You must exclusively use Svelte 5 compile-time reactivity ($state, $derived, $effect, $props, $bindable). Legacy Svelte 4 syntax ($:, export let) is completely banned.  

Array Mutations: Use immutable spread operators (e.g., [...array, newItem]) instead of legacy methods like .push().  

3. The Vanguard Trinity UI Topology
Every interactive viewport must be rigorously fractured into four bounded files :  

The Shell (+page.svelte): Exclusively handles route mounting and layout. Strictly forbidden from holding business state or direct database reads.  

The Brain (*Engine.svelte.ts): Pure headless reactive state machine using Svelte 5 Runes. Forbidden from holding JSX/markup or interacting directly with the DOM.  

The Glass (*Arena.svelte): High-performance SVG/Canvas presentation. Consumes Brain methods and is forbidden from containing private reactive states.  

The HUD (*HUD.svelte): Overlay chrome and KPIs. Must apply tw-pointer-events-none on the root container.  

4. UI/UX & Atompunk Design Constraints
Void Contract: Weaponize negative space. Target a "Void Density" of 40% using absolute black (#000000) or deep slate.  

Typography: Strictly enforce the Geist Mono typeface for all statistical axes, kickers, and data points. Use Switzer for highly legible body copy.  

Layout Math: Layouts must strictly use a 12-column responsive Bento Grid topology. Eliminate vestigial dead space and component squishing on mobile by exclusively using fluid CSS clamp() functions for padding and margins.  

5. Multi-Tenant Data Plane Security
Cell Isolation: Direct frontend getFirestore() calls or raw database initializations are universally banned. All database ingress/egress must route exclusively through getActiveDb() on the client or getAdminDb(cellId) on the server.  

Database Concurrency: Standard set() or update() loops are prohibited for telemetry aggregations. All session updates must be dispatched server-side via atomic Firestore writeBatch transactions, mathematically capped at 500 operations per batch.