# Agent — diegetic-modals

**Branch:** `closure/diegetic-modals`

**Owns:** `src/lib/components/player/OperativeLoadoutStudio.svelte`, `src/lib/components/player/PlayerDiegeticOverlay.svelte`, `src/routes/(app)/player/workout/+page.svelte` (slider conduit if in scope)

## Task

Register **J-03**, **J-09**:

1. Remove all `Swal` / `sweetalert2` from `OperativeLoadoutStudio.svelte` — use `PlayerDiegeticOverlay` + `dopamineOnCommit` pattern (match Train/Armory pages).
2. Optionally replace native `<input type="range">` on Train with `pw-loadbar` conduit if ≤5 files.
3. Extend `playerHudSprint244.test.ts` / `playerHudSprint250.test.ts` to assert Studio has no Swal.

**Acceptance:** Zero Swal imports under `src/lib/components/player/` and player routes.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03. Each commit: HudSprint244 + 250 tests, npm run check, npm run build. Do not ask questions.
