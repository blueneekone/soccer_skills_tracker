# JULES PIPELINE: COMMISSIONER OS UI/UX POLISHING SPRINT
## Role: Lead UI/UX Architect
## Mission: Polish the Commissioner OS dashboard, enforcing Bento Grid layouts and Nuclear Yellow/Data Cyan aesthetics.

### Context & Rules:
1. The Commissioner OS must strictly adhere to the Enterprise Design System.
2. Ensure `tw-text-nuclear-yellow` and `tw-bg-nuclear-yellow` are used for high-voltage telemetry highlights, active progress meters, and important CTA accents instead of default colors.
3. Replace missing icons on critical buttons.
4. Ensure the 12-column asymmetric Bento Grid topology is strictly respected (`st-bento`, `lg:tw-col-span-8`).
5. Ensure Svelte 5 `$effect` enclosures use `untrack()` for navigation to prevent SSR freezing loops.

### Task:
Navigate to the Commissioner components and conduct a deep visual audit.
Identify any buttons, headers, or progress bars that lack the required Nuclear Americana design (especially yellow accents) and surgically inject the missing Tailwind classes and missing Phosphor icons. 
Commit your changes immediately upon verification.
