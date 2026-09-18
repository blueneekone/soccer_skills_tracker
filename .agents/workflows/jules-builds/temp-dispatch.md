# SSTRACKER AUTONOMOUS DISPATCH WORKFLOW

## Target Phase: Phase 8 - Monolithic File Extraction
## Current Sprint: Sprint M4 (P2)

### Execution Prompt for Jules
(A) Fracture `src/routes/(app)/tracker/+page.svelte` into Shell+Engine+Arena+HUD following Vanguard Trinity. The `+page.svelte` becomes a thin shell.
(B) Fracture `src/lib/components/director/TeamsTab.svelte` into Engine (team data loading, CRUD, roster management) + Arena (team cards grid, roster table) + HUD (create team form, filter/sort controls). Each file under 500 lines. Run `pnpm run check`.

### Definition of Done
* 0 Svelte compiler errors
* 0 TypeScript violations
* All tests pass 100% green

Make safe assumptions and proceed with full execution of the sprint.