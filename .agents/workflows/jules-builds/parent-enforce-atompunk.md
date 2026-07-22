# Parent Persona Recovery (CDO / Vanguard)

## Target
- `src/routes/(app)/parent/dashboard/+page.svelte`

## Mandate
Remove zombie Firebase SDK imports that bypass B815 hydration rules and enforce strict Atompunk UI chamfered grids.

## Instructions
1. Open `src/routes/(app)/parent/dashboard/+page.svelte`.
2. Locate the unused `doc` and `onSnapshot` Firebase imports at the top of the file and remove them.
3. Locate instances of `tw-rounded-[var(--radius-premium,24px)]`.
4. Replace standard rounded corners on Bento Grid panels with the strict Vanguard chamfered clip-path:
   `style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);"` and remove the `tw-rounded-[...]` class.
5. Verify the UI via CRO browser subagent validation.
