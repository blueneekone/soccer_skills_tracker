---
name: sprint-6.2-training-triangle-showcase
description: Phase 6 Sprint 6.2 — Interactive Training Triangle marketing showcase uniting Coach intents, Player XP, and Parent compliance.
---

# 🚀 Phase 6 / Sprint 6.2: The "Training Triangle" Interactive Showcase
## Orchestrator: Antigravity | Assigned Cloud Worker: Google Jules (@jules)

### Goal
Build and embed an interactive visual showcase component (`TrainingTriangleShowcase.svelte`) on the public marketing page representing the foundational triad of youth sports:
1. **The Coach Node**: Prescribes high-velocity tactical drills & intent formulations.
2. **The Athlete Node**: Logs performance, levels up XP, earns badges, avoids skill decay.
3. **The Parent Node**: Validates compliance, signs consent, and guards post-game emotional safety.

---

### 🏛️ Visual & Aesthetic Guidelines (GEMINI.md §1 & §12)
- **Geometry**: SVG dynamic equilateral triangle with animated glowing neon pulse vectors connecting the three stakeholder nodes.
- **Palette**: Void Black base (`#000000`), Navy Slate panels (`#0f172a`), Cyber Yellow telemetry highlights (`#daff0a`), Action Gold CTAs (`#fbbf24`), and Data Cyan (`#14b8a6`) readout streams.
- **Micro-Interactions**: Hovering or tapping any node updates an active HUD readout explaining how that stakeholder interacts with the other two with zero platform friction.

---

### 🧪 Verification Steps for Jules
Run before committing:
```bash
node ./node_modules/svelte-check/bin/svelte-check --tsconfig ./jsconfig.json --threshold error
npm run test:regression:auth
npm run build
```
Commit format:
`feat(sprint-6.2): add interactive training triangle showcase component`
