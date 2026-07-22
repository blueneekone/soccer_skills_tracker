---
description: TDD Swarm: Core UI System & Shared Elements
---

#### Description
Builds and tests the foundational Svelte 5 shared components (buttons, grids, tables) that are universally used across all five personas (Admin, Director, Coach, Player, Parent) to guarantee absolute enterprise cohesion [1-5].

#### Swarm Execution Steps
1. **Define Interface Constraints (Agent A - Test Architect):**
   - **Universal Table Standard Tests:** Write integration tests enforcing that every data table uses edge-to-edge rendering, crisp 1px borders (Structural Grey / #334155), and Geist Mono typography for numerical readouts [7].
   - **Grid & Layout Tests:** Mathematically lock the 12-column asymmetric Bento Grid. Tests MUST enforce `clamp(280px, 30vw, 350px)` grid templates, `tw-min-w-0` on flex children to prevent text bleed, and `.app-shell` viewport locks (`tw-h-[100dvh]`) [9].
   - **Color & Typography Tests:** Write tests that explicitly BAN all `rgba()` or Tailwind opacity modifiers on dark backgrounds [10]. Enforce the 60-30-10 palette globally: Void Black (#000000) for the Z0 canvas, Navy Slate (#0f172a) for Z2 panels, Data Cyan (#14b8a6) for telemetry, and exactly ONE Action Gold (#fbbf24) primary CTA button per viewport [11].
   - **Z-Depth Tests:** Explicitly fail the build if "Liquid Glassmorphism 2.0" blur effects are used on standard Z2 data cards (blurs are reserved strictly for Z3/Z4 floating chrome and context menus) [12, 13].

2. **Implement Logic (Agent B - Code Builder):**
   - Build the shared foundational Svelte 5 UI components inside the terminal sandbox. You are trapped in the sandbox until Agent A's tests pass.

3. **Refactor and Optimize (Agent C - Refactoring Engine):**
   - Enforce the "I See You" Kinetic Protocol: Lock all state changes to lightning-fast 150-250ms transitions and ensure every button click provides tactile feedback (a 1% dim or subtle scale `active:tw-scale-[0.98]`) for a premium feel [14]. 
