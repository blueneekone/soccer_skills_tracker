---
description: TDD Swarm: Core UI System & Shared Elements
---

### TDD Swarm: Core UI System & Shared Elements
#### Description
Builds and tests the foundational Svelte 5 shared components (buttons, tables, grids) universally used across all personas to guarantee absolute enterprise cohesion.
#### Swarm Execution Steps
1. **Orchestration:** Jules acts as the General Manager. Delegate the backend logic to the @architect subagent and the styling to the @cdo subagent.
2. **Logic (Architect):** Build the shared components strictly using Svelte 5 `$state` and `$derived` runes.
3. **Aesthetics (CDO):** Mathematically lock the 12-column asymmetric Bento Grid using `clamp(280px, 30vw, 350px)`. Enforce the Universal Table Standard (edge-to-edge rendering, 1px `#334155` borders, and Geist Mono typography). Apply the Z0 Void Black (#000000) canvas.
4. **Critic Review:** Jules MUST run the Critic-Augmented Generation loop to flag any `rgba()` opacities on dark backgrounds or layout bleed before creating the PR.