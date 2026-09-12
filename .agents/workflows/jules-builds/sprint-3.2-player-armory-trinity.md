---
name: sprint-3.2-player-armory-skill-tree-trinity
description: Sprint 3.2 Vanguard Trinity fracturing for Player Armory and Skill Tree with isolated styling and clean canvas unmount.
---

# 🛡️ Sprint 3.2: Player Armory & Skill Tree Trinity Overhaul
## Orchestrator: Antigravity | Assigned Cloud Worker: Google Jules (@jules)

### Goal
Decompose and fracture the Player Armory (`/player/armory`) and Skill Tree (`/player/skill-tree`) routes into the strict Vanguard Trinity Pattern:
1. **The Shell** (`+page.svelte`): Lightweight reactive routing container.
2. **The Brain** (`*Engine.svelte.ts`): Svelte 5 `$state` / `$derived` runes managing loadouts, cosmetic items, and nodes.
3. **The Glass** (`*Arena.svelte`): Clean visual presentation and SVG/HTML5 canvas with explicit cleanup on unmount to prevent memory leaks.
4. **The HUD** (`*HUD.svelte`): Operative cosmetics, gear slots, and skill tree node progress.

---

### 🏛️ Non-Negotiable System Constraints
1. **The Two-File / Scope Law**: Target strictly:
   - `src/routes/(app)/player/skill-tree/`
   - `src/routes/(app)/player/armory/`
2. **80-Line Function Limit**: Extract complex tree calculations or SVG rendering helpers into `src/lib/utils/`.
3. **Strict Svelte 5 Runes**: Use `$state`, `$derived`, `$effect`, and wrap any route navigations or mutations inside `$effect` with `untrack(() => { ... })`.
4. **Clean Canvas Unmount**: In Skill Tree, clean up all resize and canvas animation listeners on unmount.
5. **No Regressions**: All existing tests must pass 100% green (`npm run test:regression:auth`, `npm run check`, `npm run build`).

---

### 🧪 Verification Steps for Jules
Run before committing:
```bash
node ./node_modules/svelte-check/bin/svelte-check --tsconfig ./jsconfig.json --threshold error
npm run test:regression:auth
npm run build
```
Commit format:
`feat(sprint-3.2): fracture player armory and skill tree into vanguard trinity`
