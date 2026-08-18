---
name: tdd-player-os
description: Master production-ready specification to audit, secure, and build the Player OS (Dopamine Engine). Focuses strictly on backend logic and database security.
---

# 🛰️ SSTracker Master Specification: Player OS (Dopamine Engine)

@jules, act as our Principal Backend Architect, Chief Product Officer, and Lead Frontend Architect. You are instructed to execute the full functional and visual stabilization of the Player OS.

This build is gated by our strict **Pessimistic Definition of Done**: 0 Svelte compiler errors, 0 TypeScript 'any' violations, and 100% green unit tests.

---

### 🛡️ Critical Architectural Constraints (Non-Negotiable)

1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract XP progression or math decay algorithms to `src/lib/utils/gamificationMath.ts`.
2. **Commit-Bound Celebration**: Never trigger visual rewards (confetti) optimistically. Confetti must strictly execute in the `.then()` or `try/catch` success blocks of verified Firestore writes.
3. **Pessimistic Definition of Done**: You are strictly forbidden from opening a PR until the Svelte 5 compiler yields 0 warnings and TypeScript returns 0 errors.

---

### ⚙️ Complete Backend Feature Matrix & APIs

You must audit and fully implement the functional codebases across these Svelte routes: `dashboard`, `armory`, `intake`, `media`, `proving-grounds`, `settings`, `skill-tree`, `tracker`, `waivers`, `workout`.

#### 📂 Collection 1: Loss Avoidance (2% Daily Skill Decay) (CPO/CSA)
*   **Target**: `functions/src/domains/skillDecayOps.js` and `src/lib/utils/gamificationMath.ts`
*   **APIs**: Automated physical skill decay PubSub cron job.
*   **Security**: Implement the 2% daily scoutsSix stats decrement after 24 hours of inactivity. It must first query and verify if an active `streakFreeze` token exists; if present, consume the token and skip decay. Ensure it mutates the nested armory map inside the canonical `users/{email}` doc (never using isolated collections).

#### 📂 Collection 2: Strip Svelte 5 Proxies ($state.snapshot) (CSA)
*   **Target**: `src/lib/components/player/VanguardPrism.svelte`
*   **Task**: Use `$state.snapshot()` to serialize and strip proxies before passing telemetry dataset vectors to third-party graphing libraries (like Chart.js).

#### 📂 Collection 3: Immutable Array Operations (CSA)
*   **Target**: `src/lib/player/dashboard/`
*   **Task**: Ensure Svelte 5 reactive arrays are mutated via immutable spread operations (e.g. `arr = [...arr, item]`) rather than legacy `.push()` or `.splice()`.

#### 📂 Collection 4: Dopamine Engine Commit Celebrations (CPO)
*   **Target**: `src/lib/components/player/DopamineEngine.svelte.ts`
*   **Task**: Replace client-side optimistic confetti triggers with `syncDecayFromServer()` cloud function callbacks. Confetti must only fire upon verified server acknowledgments.

---

### 🎨 Part 3: Svelte 5 Visual & Layout Controls

*   **Gaming HUD Design**: Override panels to use a dark 40% Void Black (`#000000`) background layout, Geist Mono for numerical cells, and custom SVG Vanguard Prism radar charts.
*   **Chamfered Card Corners**: Enforce the official Vanguard chamfered clip-path on the outer boundary of all specialty card panels:
    `style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);"`
*   **Viewport Constraints**: Restrict the page viewport to exactly ONE Action Gold (`#fbbf24`) Call-To-Action button.

---

### 🚦 Test & Handover

1. Run Svelte compilation checks: `pnpm run check && pnpm run build`.
2. Run targeted tests: `pnpm test components/player`.
