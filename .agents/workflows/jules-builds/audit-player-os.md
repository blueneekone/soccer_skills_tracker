---
name: audit-player-os
description: Asynchronous Cloud VM workflow to audit and design the Gamified Player OS.
---
# Swarm Audit: Player OS (Dopamine Engine)

@jules, please execute the visual and functional audit for the Player OS.

### Rules & Gates
1. Apply `.agents/skills/svelte5-strictness` and `.agents/skills/b815-hydration`.
2. **Circuit Breaker:** Authorized max of 3 attempts. If failing, revert, log to `/audit-artifacts/player/`, and stop.

### Execution Sequence
- **Architecture:** Apply B815 hydration guards. Wrap Svelte 5 state mutations inside `untrack()` closures to eliminate infinite loops.
- **Gamification:** Wire the Dopamine Engine streak freezes and daily 2% decay to verified Firestore database commits. Do not trigger confetti optimistically.
- **Design:** Overhaul the UI into an aggressive 40% Void Black Gaming HUD with outer chamfered clip-paths. Render pure SVG Vanguard Prism radar charts.
- **QA:** Run visual regression tests. Deposit visual proof to `/audit-artifacts/player/`. Open a non-conflicting PR.