---
name: sprint-6.3-playwright-demo-videos
description: Phase 6 Sprint 6.3 — Automated 60fps Playwright headless product demo video capture pipeline for marketing hero and personas.
---

# 🚀 Phase 6 / Sprint 6.3: Automated Demo Video Generation Pipeline
## Orchestrator: Antigravity | Assigned Cloud Worker: Google Jules (@jules)

### Goal
Implement and execute the automated headless video generation pipeline using Playwright and FFmpeg as specified in `playwright-video-pipeline` skill:
1. Orchestrate diegetic headless browser walkthroughs across:
   - `marketing-hero.webm` (Master Hero Showcase)
   - `director-os-demo.webm` (Director Roster Vampire Panopticon)
   - `coach-os-demo.webm` (Match Day & War Room Lightning Radar)
   - `player-os-demo.webm` (Leveling, Radars, and Armory Loadout)
   - `parent-os-demo.webm` (Household Hub & 15-Minute Car Ride Home protocol)
2. Transcode `.webm` outputs to optimized fast-start `.mp4` files using FFmpeg (`-pix_fmt yuv420p`, `-movflags +faststart`) into `static/assets/video/`.

---

### 🧪 Verification Steps for Jules
Run before committing:
```bash
node ./node_modules/svelte-check/bin/svelte-check --tsconfig ./jsconfig.json --threshold error
npm run test:regression:auth
npm run build
```
Commit format:
`feat(sprint-6.3): automated product demo video capture and transcoding pipeline`
