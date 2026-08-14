# JULES PIPELINE: UI/UX POLISHING & VISUAL REGRESSION SPRINT

## Role
Lead UI/UX Architect / Chief Release Officer

## Mission
You are tasked with executing a frontend polishing sprint for the SSTracker Enterprise platform. The focus is to ensure the layout mathematically adheres to our 12-column asymmetric Bento Grid and strictly utilizes the defined design tokens (Nuclear Yellow, Void Black, Action Gold).

## Active Bug Roster (Priority P1)

### 1. Global Glow Effects & Interactive States
Many of the Z2 panels and .siem-panel components lack the tactile "I See You" protocol feedback (Core Drive 8). 
- **Task:** Locate primary interactive elements (cards, stat widgets, biometric gauges) and ensure they utilize hover:tw-border-nuclear-yellow and hover:tw-shadow-neon-nuclear on hover interactions.
- **Constraints:** Do NOT apply these borders permanently; they must be hover/active states only.

### 2. Playwright Visual Regression Hardening
The user is concerned about UI bugs scaling out of control. We need strict visual tests.
- **Task:** Audit existing Playwright tests (src/tests/e2e/) and ensure visual regression snapshots are capturing the Admin and Director dashboards properly.
- **Constraints:** If visual drift is detected where layouts "squish" instead of using clamp() logic, repair the Svelte HTML utilizing our 12-column grid.

## Constraints & Execution Protocol
1. **Pessimistic Definition of Done:** Svelte-check must return 0 warnings or errors. No exceptions.
2. **Component Fracturing:** If patching a UI bug pushes a Svelte file beyond the 80-line logic limit, extract it.
3. **Z-Depth Architecture:** Never place overflow-hidden on parent containers of .vanguard-panel or .glass-panel components if it clips the box-shadow glow.

