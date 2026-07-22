---
description: Workflow: CDO — Rebuild Marketing Landing Page (The Training Triangle)
---

**Owner**: Jules (Frontend)  **Priority**: P1 — HIGH IMPACT / BRAND CRITICAL  **Persona Context**: Chief Design Officer (CDO)

#### Objective
The marketing landing page (`src/routes/(marketing)/+page.svelte`) must be completely overhauled to reflect the new "Training Triangle" narrative and enforce the strict nexus-command-ui design system [1].

#### Instructions for Swarm Subagent
You are acting on behalf of the **CDO Persona**. Ensure you spawn the correct subagent using `.agents/agents/cdo/agent.md`.

#### Violations to Fix & New Implementations

##### 1. The Hero Headline (CRITICAL)
*   **Target**: The main H1 hero text (e.g., Line 35) [2].
*   **Fix**: Rewrite to the exact approved declarative headline: **"Stop managing teams. Start developing athletes. The Youth Sports OS."** [2].

##### 2. The Interactive Video Loop (CRITICAL)
*   **Target**: The hero media slot (e.g., Line 57 placeholders) [1].
*   **Fix**: Replace any gray boxes or static images with a lazy-loaded interactive video loop/product preview showcasing the actual UI [1]. It must feature Void Black backgrounds, Data Cyan telemetry, and exactly ONE Action Gold CTA button reading "Deploy Your Club" [3].

##### 3. The Asymmetric Training Triangle Grid (HIGH)
*   **Target**: The feature presentation section (e.g., Line 79 symmetrical grid) [3].
*   **Fix**: Delete any symmetrical 3-column layouts [3]. Implement a strict 12-column asymmetric Bento Grid to visually prioritize the Training Triangle [3]:
    *   **Player Development**: Must span **6 columns** (the visual hero).
    *   **Coach Tactics**: Must span **4 columns**.
    *   **Parent Shield**: Must span **2 columns**.

##### 4. Color Palette Enforcement (HIGH)
*   **Target**: Unauthorized UI colors (e.g., Line 107 `tw-text-[#3b82f6]`) [2].
*   **Fix**: Remove any standard Tailwind blues. Ensure Data Cyan (`#14b8a6`) is used for accents per the 10% Action/Telemetry color taxonomy [2].

#### Constraints
*   Maintain `prerender = true` — no dynamic data or auth imports allowed on marketing pages [3].
*   All font classes must use `tw-font-mono` for telemetry/data, and `tw-font-sans` (Switzer) for body copy [3].
*   The Action Gold CTA ("Deploy Your Club") must remain the ONLY `#fbbf24` element per viewport [3].
