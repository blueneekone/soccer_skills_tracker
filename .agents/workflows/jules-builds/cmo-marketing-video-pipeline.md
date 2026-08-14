---
name: cmo-marketing-video-pipeline
description: Automates high-fidelity 1080p 60fps marketing video capture and transcoding across all 6 public website video slots.
---
# JULES PIPELINE: CMO MARKETING VIDEO CAPTURE & TRANSCODING SUITE
## Role: Chief Marketing Officer & Lead Video Producer
## Mission: Produce multi-billion-dollar enterprise demo videos matching the public website slots.

### Public Website Video Slots & Aspect Ratios:
Every generated video must strictly match its destination slot in `src/routes/(marketing)/`:

| Target Video File | Resolution & Ratio | Target Route / Component | Scene Description |
| :--- | :--- | :--- | :--- |
| `static/videos/marketing-hero.webm` | 1920x1080 (16:9) | `src/routes/(marketing)/+page.svelte` | Master Hero 90s platform showcase: Landing pan -> Feature Bento -> Stakeholder selector. |
| `static/videos/director-os-demo.webm` | 1920x1080 (16:9) | `src/routes/(marketing)/director/+page.svelte` | Director OS: Mission Control KPIs -> Registration Roster -> Revenue Ledger. |
| `static/videos/coach-os-demo.webm` | 1920x1080 (16:9) | `src/routes/(marketing)/features/+page.svelte` | Coach OS: Tactical War Room pitch -> SVG drill diagramming -> Squad readiness. |
| `static/videos/player-os-demo.webm` | 1920x1080 (16:9) | `src/routes/(marketing)/player/+page.svelte` | Player OS: Vanguard Prism 6-axis radar spin -> XP streak meter -> Armory loadout. |
| `static/videos/player-cv-demo.webm` | 1920x1080 (16:9) | `src/routes/(marketing)/player/+page.svelte` | Computer Vision: 30-second skill trial verification with skeleton mechanics overlay. |
| `static/videos/parent-os-demo.webm` | 1920x1080 (16:9) | `src/routes/(marketing)/parent/+page.svelte` | Parent OS: Compliance Shield -> Car Ride Home 15-min lockout countdown -> Household ledger. |

### Visual Quality & Motion Rules:
1. **Diegetic Cursor Motion:** Never use instant clicks. Use interpolated mouse curves (`smoothMouseMove`) with natural easing and hover pauses.
2. **Telemetry Highlights:** Ensure Nuclear Yellow (`#daff0a`), Data Cyan (`#14b8a6`), and Action Gold (`#fbbf24`) are crisp, uncompressed, and prominently featured.
3. **Smooth Viewport Panning:** Use smooth scrolling (`window.scrollTo({ behavior: 'smooth' })`) to transition between Bento Grid tiers.
4. **File Size Budget:** Each `.webm` file must be optimized to under 25MB for seamless web streaming.

### Execution Steps:
1. Start local dev server (`pnpm run dev` on port 5173).
2. Run `node scripts/record-demo.js` to capture all 6 slots into `static/videos/`.
3. Run `node scripts/merge-marketing-video.mjs` to verify integrity and transcode MP4 assets into `static/assets/video/`.
4. Verify file existence of all 6 `.webm` files in `static/videos/`.
5. Open a Pull Request with the generated video assets and summary.