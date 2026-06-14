# Agent — player-os-6f

**Branch:** `closure/player-os-6f`

**Owns:** `src/routes/(app)/player/armory/**`, `src/lib/components/player/OperativeLoadoutStudio.svelte`, `src/lib/styles/player-dossier.css` (armory scope), `docs/visual-acceptance/sprint-2.22-slice-6f/**`

## Task

Register **J-01**, **J-08** — Armory Studio hologram + header canon:

1. Replace custom `qa-strap` with `PlayerOsPageStrap` on armory route (PLATFORM_BUILD_MANDATES Wave E).
2. Remove competing `#00d4ff` cyber accent where it breaks gold/teal canon.
3. Ensure Studio tab `HologramCardShell` dossier matches ROADMAP 6f acceptance criteria.
4. Extend `playerHudSprint252.test.ts` guards.

**Out of scope:** PNG bust ingest (Blocked I-02/I-03).

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03 or new PNG layers. Each commit: `npm test -- src/lib/components/player/dashboard/__tests__/playerHudSprint252.test.ts`, npm run check, npm run build. Do not ask questions.
