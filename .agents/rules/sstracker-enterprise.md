---
trigger: always_on
description: Core principles for Svelte 5 frontend architecture and Firebase v10 database execution.
---

1. THE PESSIMISTIC DEFINITION OF DONE & AI PROTOCOL
The Checkbox Law: You are explicitly prohibited from modifying ROADMAP.md or marking a task as complete [x] until you have mathematically proven the code and the layout are stable [cite: 125, 236].
Test-Driven Development (TDD) Mandate: You must scan for existing Vitest or Playwright tests. If none exist, you MUST write a failing test block before writing the functional component logic [cite: 236, 1508].
Visual & Structural Verification: You must utilize JSDOM or Happy DOM virtual rendering in vitest.config.ts to assert that layouts adhere to the CSS box model and compute correctly [cite: 236]. You must use static regex-based tests to ensure components utilize the mandated design tokens (e.g., bg-slate-900) and explicitly fail the build if banned styling (e.g., inline style="...") is detected [cite: 236, 278, 1341].
Proof of Stability: A task is ONLY "Done" when you have autonomously run npm run check and npx eslint in the terminal, and the compiler returns absolutely 0 Svelte 5 errors and zero TypeScript any violations [cite: 236, 1164].
Two-File Governance System: No single execution plan may encompass more than 2 to 3 distinct architectural tasks to prevent context degradation and code hallucination [cite: 1164, 1265].
2. SVELTE 5 & THE VANGUARD TRINITY PATTERN
Strict Svelte 5 Runes: You must exclusively use Svelte 5 compile-time reactivity ($state, $derived, $effect, $props, $bindable). Legacy Svelte 4 syntax is completely banned [cite: 1164, 1220]. Programmatic routing (goto()) invoked within an $effect block must be wrapped in an untrack() enclosure to prevent infinite rendering loops [cite: 1204, 1256].
Component Fracturing (The Trinity Pattern): Monolithic files are forbidden. Every interactive screen must fracture into four cooperating files:
The Shell (+page.svelte): Route-level mounting and layout topology. Forbidden from holding business state or direct Firestore reads [cite: 1222, 1255].
The Brain (*Engine.svelte.ts): Reactive state machine utilizing Svelte 5 runes. Forbidden from containing JSX/markup or interacting with the DOM [cite: 1222, 1255].
The Glass (*Arena.svelte): High-performance presentation layer (SVG/Canvas). Must call Brain methods; forbidden from private reactive state [cite: 1222, 1255].
The HUD (*HUD.svelte): Tailwind-styled overlay for KPIs and chrome. Must apply tw-pointer-events-none on the root container [cite: 1222, 1255].
The 80-Line Limit: Function bodies are mathematically restricted to a maximum of 70 to 80 lines. Complex parsing or conditionals must be extracted into independent utilities located in src/lib/utils/ [cite: 1164, 1265, 1508].
3. MULTI-TENANT DATA PLANE & OFFLINE DURABILITY
Cell-Based Routing Integrity: Direct getFirestore() calls are banned. All database access must use getActiveDb() (client) or getAdminDb(cellId) (server) to maintain isolated Firestore cell integrity [cite: 1213, 1265].
Database Concurrency & Atomic Safety: Standard set() or update() loops are prohibited for telemetry aggregations. All session updates must be dispatched server-side via atomic Firestore writeBatch transactions, mathematically capped at a hard limit of 500 operations per batch [cite: 838, 1265].
Absolute Immutability: Client-side application memory is strictly immutable. Use immutable spread operators (e.g., [...array, newItem]) instead of legacy methods like .push() on reactive states to prevent race conditions [cite: 886, 1164].
Data Liquidity & Pagination: Never fetch full collections for Data Tables. You must use server-side cursor pagination (startAfter + limit(100)) with role filters to keep payload sizes sub-200KB. Client-side filtering of massive collections is banned [cite: 380].
4. COPPA 2026, SAFESPORT, & LEGAL PERIMETER
Verifiable Parental Consent (VPC): Embed strict age-gating guardrails. All telemetry collection must pause entirely until an adult's VPC token is explicitly verified [cite: 897, 1206]. Gate all data-collection routes behind a SvelteKit $effect interception step via the isDataCollectionRoute() policy [cite: 1548, 1550].
SafeSport "Shadow CC" Hub: Private 1-on-1 adult-to-minor messaging is mathematically blocked at the callable level. The system must autonomously resolve and inject the linked parent's email into the ccParentEmails array for all squad threads [cite: 1153, 1228].
PII Time-To-Live (TTL) Shredder: Enforce a daily cron job that autonomously overwrites Personally Identifiable Information (PII) inside the users and passports collections after 24 hours of inactivity. The consents collection must be strictly exempted to maintain legal multi-year retention audits [cite: 1153, 1553].
5. THE ATOMPUNK VISUAL SYSTEM & Z-DEPTH ARCHITECTURE
Z-Depth Hierarchy: Interactive surfaces must be organized to create tactile differentiation:
Z0 (Canvas): Absolute background void; forced-navy background CSS to prevent white flashes [cite: 1259].
Z1 (Wells): Recessed telemetry wells with inner box shadows for a precision feel [cite: 1259].
Z2 (Panels): Liquid Glassmorphism 2.0; opaque surfaces with 1px edge-lit borders and alpha-channel gradients to simulate refraction without performance-heavy blurs [cite: 1209, 1259].
Z3 (Identity): Raised elements utilizing chamfered geometries and Action Gold accents [cite: 1209, 1259].
Z4 (Navigation): Floating rails for global transit, utilizing cyan structural trust markers [cite: 1209, 1259].
Color Token Taxonomy: Adhere to the strict palette: Void Black (#000000/#020617), Navy Slate (#0f172a/#1e293b), Structural Grey (#334155), Action Gold (#fbbf24), Data Cyan (#14b8a6), and Atompunk Amber (#f59e0b) [cite: 957]. High-saturation warm colors are strictly banned unless signifying a critical error [cite: 897].
Halation-Free Contrast: Pure white text on pure black backgrounds is banned to prevent visual halation. Use deep slate paired with muted off-whites (#FAFAFA to #D4D4D8) [cite: 236, 1230].
6. COGNITIVE ACCESSIBILITY & NEURODIVERSITY (WCAG 2.2 AA)
The Void Contract: Weaponize negative space to prevent cognitive overload. Target a "Void Density" of at least 40% using deep slate or absolute black [cite: 1190, 1208, 1231].
The Singular Directive: Executive dysfunction and choice paralysis must be mathematically blocked. Every single viewport must contain exactly ONE primary "Action Gold" Call-To-Action (CTA) [cite: 1210, 1231].
Dyslexia-Friendly Typography: Strictly enforce the Geist Mono typeface for all technical data, statistical axes, and numerical readouts to ensure predictable character alignment [cite: 897, 1210]. Use Switzer for body copy, enforcing a 79% x-height for maximum legibility [cite: 897, 1210]. Bolding is for emphasis; italics are strictly banned to prevent letterform distortion [cite: 236].
Predictable Navigation (WCAG 3.2.3): Navigation menus, search bars, and key controls must remain in the exact same mathematical position across every page to reduce working memory burdens [cite: 849, 854].
7. EMOTIONAL DESIGN & OCTALYSIS GAMIFICATION
Three Levels of Emotional Design:
Visceral: Immediate visual polish via 150-250ms micro-interactions for a lightning-fast feel [cite: 1282, 1664].
Behavioral: Frictionless workflows using progressive disclosure, hiding complex configuration until it is required [cite: 1664, 1665].
Reflective: Aligning the software experience with professional aspirations, utilizing badges, ranks, and continuous progress visualization [cite: 1664].
The Dopamine Engine (Core Drive 2 - Accomplishment): Visual behavioral reinforcement operations, such as the canvas-confetti HTML5 particle explosion, must run strictly asynchronously on a separate thread immediately following a verified database commit [cite: 897, 1231].
Loss Avoidance (Core Drive 8): Deploy rigorous daily habit streaks; program automated Skill Decay algorithms that drain fractions of inactive XP after 5 consecutive missed days, triggering urgent re-engagement alerts [cite: 1286, 1399].
The "I See You" Protocol: Every user interaction must trigger a tactile pulse, haptic trigger, or micro-animation (soft physical bounce) confirming the system received the input [cite: 1231, 1265].
8. STRATEGIC MINIMALISM & FLUID LAYOUTS
The Asymmetric Bento Grid: Symmetrical grids are banned for data-heavy dashboards. You must utilize a 12-column asymmetric Bento Grid topology (e.g., an 8-column Primary Canvas and a 4-column Sidecar) to mimic complex SIEM dashboards [cite: 1152, 1468].
Anti-Squishing Math: Static margin utility classes (e.g., .mt-4 or .mb-15) are completely deprecated [cite: 897, 930]. Dynamic spatial limits must be enforced exclusively through CSS functions structured precisely as clamp(20px, 4vw, 32px) to prevent layout squishing across devices [cite: 897, 1231].
100dvh Viewport Flow: The Admin and Director dashboards must transition to an App-like 100dvh Viewport Flow using CSS Grid flex: 1 1 auto; min-height: 0 to prevent double scrollbars and ensure native application feel [cite: 179, 181].
9. PWA CACHING & VITE PIPELINE
File-Hash Versioning: Legacy query-string cache busting configurations (e.g., ?v=1.2) must be completely abandoned [cite: 906, 1204]. The pipeline must implement strict cryptographic file-hash versioning ([name].[hash].js) within vite.config.js to resolve Progressive Web App (PWA) caching desynchronization and fatal parsing exceptions [cite: 887, 1152, 1214].
Network First / Cache First Strategies: Service workers must utilize a 'Network First' strategy for API calls to guarantee fresh data, and a 'Cache First' strategy for hashed static assets to ensure offline durability [cite: 1639].
10. INTELLIGENT ERROR RECOVERY
Humanized Error Boundaries: Raw, machine-like error codes are strictly banned. You must intercept high-anxiety operational moments (e.g., failed payments, API timeouts) with empathetic, highly actionable recovery interfaces that inform the user exactly how to proceed [cite: 236, 1236].
Graceful Degradation: If a feature flag is disabled or a data stream is missing, components must gracefully fallback to mock data or a "0" state rather than causing the entire Dashboard SIEM to throw a white screen of death [cite: 1152, 1297].