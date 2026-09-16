### Sprint R7: Raw Cyan Purge
**Jules Prompt**: (1) Open `src/lib/components/ui/VanguardEmptyState.svelte`, find all instances of `rgba(0,255,255` and replace with `#14b8a6` (Data Cyan) or `rgba(20,184,166,...)` for opacity variants, (2) open `src/lib/components/parent/SeasonRegistration.svelte` and perform the same replacement, (3) verify no other files contain raw cyan by running `grep -rn "rgba(0,255,255" src/ --include="*.svelte"` — expect 0 results. Run `pnpm run check` to verify 0 errors.

---

## Phase 7B: Ultra-Premium Platform Design Sweep — "Nuclear Americana Tech Noir"

> Execute DS1→DS2→DS3→DS4→DS5→DS6 sequentially. Each sprint creates a Vitest static assertion file that becomes a permanent regression gate. Halt and fix if any assertion fails before proceeding to the next sprint.
