# Admin Persona Recovery (Architect)

## Target
- `src/routes/(app)/admin/overview/+page.svelte`

## Mandate
Enforce Anti-Squish Math constraints on executive KPI grids and apply strict typographical standards.

## Instructions
1. Open `src/routes/(app)/admin/overview/+page.svelte`.
2. Locate the main `.tw-grid` containers wrapping the `Executive KPI Strip` and the `Security Threat Matrix Strip`.
3. Currently, they use standard Tailwind grid cols. Enforce Anti-Squish Math by injecting the `clamp()` function:
   `style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"`
4. Ensure all statistical values inside the KPI strip use `tw-font-mono`.
5. Run automated Playwright visual regression loops to confirm no data truncation occurs at 1024px, 768px, and 375px viewports.
