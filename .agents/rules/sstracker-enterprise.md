---
trigger: always_on
description: Core principles for Svelte 5 frontend architecture and Firebase v10 database execution.
---

#### trigger: always_on
#### description: Core principles for Svelte 5 frontend architecture and Firebase v10 database execution [cite: 1654].

#### 1. THE PESSIMISTIC DEFINITION OF DONE & AI PROTOCOL
*   **The Checkbox Law:** You are explicitly prohibited from modifying ROADMAP.md or marking a task as complete until you have mathematically proven the code and the layout are stable [cite: 1654].
*   **Test-Driven Development (TDD) Mandate:** You must scan for existing Vitest or Playwright tests. If none exist, you MUST write a failing test block before writing the functional component logic [cite: 1654].
*   **Visual & Structural Verification:** You must utilize JSDOM or Happy DOM virtual rendering in vitest.config.ts to assert that layouts adhere to the CSS box model and compute correctly [cite: 1654]. You must use static regex-based tests to ensure components utilize the mandated design tokens and explicitly fail the build if banned styling is detected [cite: 1654].
*   **Proof of Stability:** A task is ONLY "Done" when you have autonomously run `npm run check` and `npx eslint`, and the compiler returns absolutely 0 Svelte 5 errors and zero TypeScript `any` violations [cite: 1654].
*   **Two-File Governance System:** No single execution plan may encompass more than 2 to 3 distinct architectural tasks to prevent context degradation and code hallucination [cite: 1654].

#### 2. SVELTE 5 & THE VANGUARD TRINITY PATTERN
*   **Strict Svelte 5 Runes:** You must exclusively use Svelte 5 compile-time reactivity (`$state`, `$derived`, `$effect`, `$props`, `$bindable`) [cite: 1654]. Legacy Svelte 4 syntax is completely banned [cite: 1654]. Programmatic routing invoked within an `$effect` block must be wrapped in an `untrack()` enclosure to prevent infinite rendering loops [cite: 1654].
*   **Component Fracturing (The Trinity Pattern):** Monolithic files are forbidden. Every interactive screen must fracture into four cooperating files: The Shell (`+page.svelte`), The Brain (`*Engine.svelte.ts`), The Glass (`*Arena.svelte`), and The HUD (`*HUD.svelte`) [cite: 1654].
*   **The 80-Line Limit:** Function bodies are mathematically restricted to a maximum of 70 to 80 lines. Complex parsing or conditionals must be extracted into independent utilities located in `src/lib/utils/` [cite: 1654].

#### 3. MULTI-TENANT DATA PLANE & OFFLINE DURABILITY
*   **Cell-Based Routing Integrity:** Direct `getFirestore()` calls are banned [cite: 1654]. All database access must use `getActiveDb()` (client) or `getAdminDb(cellId)` (server) to maintain isolated Firestore cell integrity [cite: 1654].
*   **Database Concurrency & Atomic Safety:** Standard `set()` or `update()` loops are prohibited for telemetry aggregations [cite: 1654]. All session updates must be dispatched server-side via atomic Firestore `writeBatch` transactions, mathematically capped at a hard limit of 500 operations per batch [cite: 1654].
*   **Absolute Immutability:** Client-side application memory is strictly immutable. Use immutable spread operators instead of legacy methods like `.push()` on reactive states to prevent race conditions [cite: 1654].
*   **Data Liquidity & Pagination:** Never fetch full collections for Data Tables [cite: 1654]. You must use server-side cursor pagination with role filters to keep payload sizes sub-200KB [cite: 1654]. Client-side filtering of massive collections is banned [cite: 1654].

#### 4. COPPA 2026, SAFESPORT, & LEGAL PERIMETER
*   **Verifiable Parental Consent (VPC):** Embed strict age-gating guardrails [cite: 1655]. All telemetry collection must pause entirely until an adult's VPC token is explicitly verified [cite: 1655]. Gate all data-collection routes behind a SvelteKit `$effect` interception step via the `isDataCollectionRoute()` policy [cite: 1655].
*   **SafeSport "Shadow CC" Hub:** Private 1-on-1 adult-to-minor messaging is mathematically blocked at the callable level [cite: 1655]. The system must autonomously resolve and inject the linked parent's email into the `ccParentEmails` array for all squad threads [cite: 1655].
*   **PII Time-To-Live (TTL) Shredder:** Enforce a daily cron job that autonomously overwrites PII inside the `users` and `passports` collections after 24 hours of inactivity [cite: 1655]. The `consents` collection must be strictly exempted to maintain legal multi-year retention audits [cite: 1655].

#### 5. THE ATOMPUNK VISUAL SYSTEM & Z-DEPTH ARCHITECTURE
*   **Z-Depth Hierarchy:** Z0 (Canvas), Z1 (Wells), Z2 (Panels - Liquid Glassmorphism 2.0), Z3 (Identity), Z4 (Navigation) [cite: 1655].
*   **Color Token Taxonomy:** Adhere to the strict palette: Void Black, Navy Slate, Structural Grey, Action Gold, Data Cyan, and Atompunk Amber [cite: 1655]. High-saturation warm colors are strictly banned unless signifying a critical error [cite: 1655].
*   **Halation-Free Contrast:** Pure white text on pure black backgrounds is banned to prevent visual halation [cite: 1655]. Use deep slate paired with muted off-whites [cite: 1655].

#### 6. COGNITIVE ACCESSIBILITY & NEURODIVERSITY (WCAG 2.2 AA)
*   **The Void Contract:** Weaponize negative space to prevent cognitive overload. Target a "Void Density" of at least 40% using deep slate or absolute black [cite: 1655].
*   **The Singular Directive:** Executive dysfunction and choice paralysis must be mathematically blocked. Every single viewport must contain exactly ONE primary "Action Gold" Call-To-Action (CTA) [cite: 1655].
*   **Dyslexia-Friendly Typography:** Strictly enforce the Geist Mono typeface for all technical data, statistical axes, and numerical readouts [cite: 1655]. Use Switzer for body copy, enforcing a 79% x-height for maximum legibility [cite: 1655]. Bolding is for emphasis; italics are strictly banned [cite: 1655].
*   **Predictable Navigation:** Navigation menus, search bars, and key controls must remain in the exact same mathematical position across every page [cite: 1655].

#### 7. EMOTIONAL DESIGN & OCTALYSIS GAMIFICATION
*   **Three Levels of Emotional Design:** Visceral (150-250ms micro-interactions), Behavioral (progressive disclosure), Reflective (professional aspirations) [cite: 1656].
*   **The Dopamine Engine (Core Drive 2):** Visual behavioral reinforcement operations must run strictly asynchronously on a separate thread immediately following a verified database commit [cite: 1656].
*   **Loss Avoidance (Core Drive 8):** Deploy rigorous daily habit streaks; program automated Skill Decay algorithms that drain fractions of inactive XP after 5 consecutive missed days [cite: 1656].
*   **The "I See You" Protocol:** Every user interaction must trigger a tactile pulse, haptic trigger, or micro-animation confirming the system received the input [cite: 1656].

#### 8. STRATEGIC MINIMALISM & FLUID LAYOUTS
*   **The Asymmetric Bento Grid:** Symmetrical grids are banned for data-heavy dashboards [cite: 1656]. You must utilize a 12-column asymmetric Bento Grid topology [cite: 1656].
*   **Anti-Squishing Math:** Static margin utility classes are completely deprecated [cite: 1656]. Dynamic spatial limits must be enforced exclusively through CSS functions structured precisely as `clamp(20px, 4vw, 32px)` [cite: 1656].
*   **100dvh Viewport Flow:** The Admin and Director dashboards must transition to an App-like 100dvh Viewport Flow using CSS Grid `flex: 1 1 auto; min-height: 0` to prevent double scrollbars [cite: 1656].

#### 9. AUTOMATED VISUAL REGRESSION & E2E TESTING (PLAYWRIGHT)
*   **The E2E Mandate:** You must utilize the existing Playwright E2E scaffold for all validation [cite: 1657]. Playwright E2E tests must validate core workflows without ever mocking live database calls to ensure true production parity [cite: 1657].
*   **Visual QA Loop:** Before committing any changes to UI components, Tailwind classes, or layout architecture, you must execute Playwright's visual regression testing [cite: 1657].
*   **Execution Protocol:** You must run the Playwright suite to capture automated layout screenshots in a headless environment [cite: 1657]. If the visual comparison detects any layout drift, CSS squishing, or text bleeding that violates our 12-column Bento Grid constraints, the commit MUST be automatically aborted [cite: 1657]. You are required to diagnose the CSS box-model failure and generate a surgical fix before re-testing [cite: 1657].

#### 10. PWA CACHING & VITE PIPELINE
*   **File-Hash Versioning:** Legacy query-string cache busting configurations must be completely abandoned [cite: 1657]. The pipeline must implement strict cryptographic file-hash versioning within `vite.config.js` [cite: 1657].
*   **Network First / Cache First Strategies:** Service workers must utilize a 'Network First' strategy for API calls and a 'Cache First' strategy for hashed static assets to ensure offline durability [cite: 1657].

#### 11. INTELLIGENT ERROR RECOVERY
*   **Humanized Error Boundaries:** Raw, machine-like error codes are strictly banned. You must intercept high-anxiety operational moments with empathetic, highly actionable recovery interfaces [cite: 1657].
*   **Graceful Degradation:** Components must gracefully fallback to mock data or a "0" state rather than causing the entire Dashboard SIEM to throw a white screen of death [cite: 1657].

#### 12. DOM HIERARCHY AND SVG PHYSICS MANDATE
*   **SVG Scaling:** You are STRICTLY FORBIDDEN from using Tailwind text sizing utilities (e.g., `tw-text-[9px]`) inside `<svg>` components governed by a `viewBox`. You MUST use native SVG attributes (e.g., `font-size="9"`) to prevent catastrophic mathematical scaling failures.
*   **Aspect Ratio Lock:** When rendering tactical arenas, radars, or coordinate-mapped SVGs, you must use absolute geometries (e.g., `viewBox="0 0 1200 800"`) paired with `preserveAspectRatio="xMidYMid slice"` and proper CSS bounding to prevent viewport warping.
*   **Z-Depth & Overflow:** You are strictly forbidden from placing `overflow-hidden` on parent containers of `.vanguard-panel` or `.glass-panel` components if it causes the `box-shadow` (glow) to be clipped into hard squares.

#### 13. THE ISOLATION PROTOCOL (ANTI-MONOLITH)
*   **Extraction over Patching:** If a Svelte file exceeds 500 lines of markup or contains complex interactive graphical state (e.g., the Tactical War Room or Player Showcase), you MUST extract that specific module into a dedicated component in `src/lib/components/` BEFORE attempting to patch its logic.
*   **Svelte 5 Reactivity:** When tracking complex pointer events or arrays (e.g., SVG drawing trails), explicitly trigger reactivity via reassignment in `$state` proxies to prevent dropped frames and janky physics.