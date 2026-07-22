# Director Persona Recovery (CDO / Architect)

## Target
- `src/routes/(app)/director/dashboard/+page.svelte`

## Mandate
Fix critical Svelte 5 reactivity violations that could trigger catastrophic memory loops during context switching.

## Instructions
1. Open `src/routes/(app)/director/dashboard/+page.svelte`.
2. Locate the `$effect` blocks handling `clubId` synchronization and `activeTab` URL parsing.
3. Wrap any direct mutations of `clubId`, `activeTab`, or `workspaceContextStore.setActiveClubId` inside strict `untrack(() => { ... })` closures.
4. Locate the legacy CSS grids (`bento-grid`, `bento-grid--liquid`, `bento-span-8`, `bento-span-4`) inside the `<section>` elements.
5. Replace legacy classes with strict Vanguard Tailwind grid structures (e.g., `tw-grid`, `tw-grid-cols-12`, `lg:tw-col-span-8`).
6. Run `npm run check` to verify zero type or reactivity compilation errors.
