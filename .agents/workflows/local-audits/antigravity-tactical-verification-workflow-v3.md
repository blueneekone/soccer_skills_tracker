# =============================================================================
# SSTRACKER TACTICAL ENGINE: ANTIGRAVITY AUTONOMOUS VISUAL VERIFICATION WORKFLOW (v3)
# =============================================================================
# This file serves as an executable Antigravity Workflow rule.
# It instructs both Antigravity and Google Jules subagents on how to write,
# compile, run browser-in-the-loop tests, and verify our new sports psychology
# features on the Coach and Player OS canvases with 100% clean Svelte 5 runes.
# =============================================================================

# 1. CORE TASK & SCOPE
@task: "Implement and visually verify high-fidelity interactive tactical canvas improvements and trauma-informed behavioral prompts with 0% compilation errors."
@target_files: [
  "src/lib/components/coach/TacticalArena.svelte",
  "src/lib/services/coach/CoachTacticalEngine.svelte.ts",
  "src/lib/components/tactical/MistakeResetOverlay.svelte",
  "tests/tactical-war-room-v2.spec.ts"
]

# =============================================================================
# 2. THE SVELTE 5 COMPILE HOTFIX (NO LITERAL BACKSLASHES IN ARRAYS)
# =============================================================================
- **The Bug:** Svelte template engine and JS parse layers in Svelte 5 fail when encountering raw escaped string literals (such as `\\n` inside arrays) during code writes.
- **The Fix:** Ensure that array literals, string configurations, and template strings inside `<script lang="ts">` blocks use proper newlines and native JavaScript escape-free notation. 
- **The Standard:** Line 58 of `TacticalArena.svelte` must read:
  ```typescript
  points: [
    { x: coords.x - 50, y: coords.y },
    { x: coords.x + 50, y: coords.y }
  ],
  ```

# =============================================================================
# 3. FEATURE IMPLEMENTATION BLUEPRINT (SVELTE 5 RUNES & SVG PATHS)
# =============================================================================

## A. Dashed Flight Paths (Ball-to-Player Vectors)
*   **Vector Rendering:** Identify when an SVG path represents a ball's flight path (`type === 'ball'`).
*   **SVG Attribute Injection:** Inject `stroke-dasharray="8,8"` programmatically on ball-attached routes to separate ball physics from player movements.
*   **Visual Standard:** Must render in high-contrast Data Cyan (`#06b6d4`) with a sharp, crisp dashed animation to indicate flight path.

## B. Right-Click Context Splicing (Targeted Route Deletion)
*   **Dynamic ID Binding:** Ensure every SVG route node holds a unique `routeId` binding.
*   **Event Handling:** Intercept right-clicks (`oncontextmenu`) on active paths.
*   **Mutation Logic:** Instead of clearing the entire canvas, trigger an in-state array splice on the reactive Svelte 5 engine (`routes = routes.filter(r => r.id !== targetedId)`) to cleanly delete only the selected vector.

## C. The Interactive "Reset Button" Mistake Ritual
*   **Visual Design:** Eradicate any legacy failure animations or negative flags. Replace them with a tactile, low-key **"Reset Button"** component (utilizing a retro-futuristic Atompunk Amber `#fbbf24` pulse).
*   **Interaction Loop:** When a route tracking execution fails, render a 3D-bevelling SVG Reset circle on-screen. Clicking it triggers a CSS-animated ripple that resets the play state and clears the error cache, restoring the player's cognitive flow.

## D. Encouragement Prompt: "Practice makes progress"
*   **Behavioral Goal:** Introduce supportive, non-intrusive physical education reinforcement when a training route is missed.
*   **UI/UX Implementation:** Avoid disruptive modal overlays. Instead, mount a smooth, low-density toast or banner sliding out from the bottom-right HUD container.
*   **Aesthetic:** Void Black (`#0a0a0a`) background, 1px Structural Grey (`#334155`) border, and crisp Switzer text rendering: **"Practice makes progress"** in a calming Data Cyan.
*   **Timeline:** The banner must slide in silently over 300ms, remain visible for exactly 2500ms, and fade away with 0% layout shifting on surrounding elements.

# =============================================================================
# 4. THE AUTONOMOUS VISUAL VERIFICATION PROTOCOL (PLAYWRIGHT)
# =============================================================================
You must write and execute `tests/tactical-war-room-v2.spec.ts` in your cloud virtual machine. The test must programmatically run the following checks using browser-in-the-loop automation:

1.  **Mount Test:** Login as a verified Coach user and navigate to `/coach/war-room`. Assert the tactical SVG arena mounts.
2.  **Interaction Simulation:** Draw two distinct routes on the canvas using Playwright drag-and-drop mouse movements.
3.  **Right-Click Splice Check:** Right-click the second route path. Simulate a context menu interaction, select "Delete Route", and assert that `SVGPathElement` count drops from 2 to 1.
4.  **Mistake & Encouragement Assertion:** Inject a route deviation state to simulate an athlete mistake. Assert that:
    *   The "Reset Button" circle element is successfully mounted and rendered in the DOM.
    *   The micro-interactive notification displaying **"Practice makes progress"** is visible and contains the exact string.
    *   The notification is positioned safely within the canvas boundary to ensure no overlap with player coordinate nodes.

# =============================================================================
# 5. PESSIMISTIC DEFINITION OF DONE & COMMIT HOOKS
# =============================================================================
1.  Run the full verification run locally inside your isolated cloud runner:
    ```bash
    pnpm run check
    npx eslint --fix
    pnpm playwright test tests/tactical-war-room-v2.spec.ts --project=chromium
    ```
2.  If the compiler returns Svelte 5 rune execution faults or Playwright timeout failures, execute your autonomous **Critic-Augmented Loop**: rewrite the failing component properties and rerun the tests.
3.  Do **NOT** push or open a Pull Request until the test suite is 100% green and the compilation returns 0 errors and 0 warnings.
