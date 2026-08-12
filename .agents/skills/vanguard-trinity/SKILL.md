---
name: vanguard-trinity
description: Enforces the Vanguard Trinity Pattern and strict 80-line function limits.
---
# Vanguard Trinity Pattern

You are mathematically forbidden from generating monolithic files. Every interactive screen must be cleanly partitioned.

### Mandates
1. **The Trinity Split:** interactive routes must fracture into:
   - **The Shell (`+page.svelte`):** Z0 parent wrapper managing mounting.
   - **The Brain (`*Engine.svelte.ts`):** Controller managing reactive states via runes.
   - **The Glass (`*Arena.svelte`):** Pure interactive view layer.
   - **The HUD (`*HUD.svelte`):** Telemetry readout and control deck.
2. **The 80-Line Function Limit:** No single function body or Svelte script block may exceed a hard limit of 80 lines. Extract complex conditionals or mapping functions to `src/lib/utils/`.