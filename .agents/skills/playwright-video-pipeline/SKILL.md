---
name: playwright-video-pipeline
description: Evaluates and captures visually stunning product demo clips using headless browser orchestration and post-processing automation.
---
# Playwright & FFmpeg Marketing Video Automation

When generating automated product demos for the SSTracker SaaS platform, you must strictly adhere to the following enterprise pipeline:

1. **Exact Web Asset Mapping:** All video captures must output to `static/videos/` and match the exact filenames and 16:9 aspect ratios required by the public website:
   - `static/videos/marketing-hero.webm` (Master Hero Showcase)
   - `static/videos/director-os-demo.webm` (Director OS)
   - `static/videos/coach-os-demo.webm` (Coach OS)
   - `static/videos/player-os-demo.webm` (Player OS)
   - `static/videos/player-cv-demo.webm` (Player Computer Vision)
   - `static/videos/parent-os-demo.webm` (Parent OS)

2. **Isolated Contexts:** Do not record one massive unsegmented video. Record one short clip for each narrative beat and give each clip its own `BrowserContext` to prevent the Playwright video encoder from dropping frames:
   ```javascript
   const context = await browser.newContext({
     viewport: { width: 1920, height: 1080 },
     recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } }
   });
   ```

3. **Diegetic Motion & Cursor Choreography:** Never perform sudden jumps or static 0ms clicks. Interpolate cursor trajectories across 20-35 steps (~60fps) to create smooth, human-like interaction curves over Nuclear Yellow (`#daff0a`) telemetry gauges and Action Gold (`#fbbf24`) CTAs.

4. **Context Finalization:** You MUST `await context.close()` after each clip's sequence is complete. The `.webm` video file only finalizes on disk when the context closes.

5. **Post-Processing & Transcoding:** Run `node scripts/merge-marketing-video.mjs` to transcode `.webm` files into fast-start `libx264` MP4s (`-pix_fmt yuv420p`, `-movflags +faststart`) within `static/assets/video/` for mobile and low-latency browser compatibility.