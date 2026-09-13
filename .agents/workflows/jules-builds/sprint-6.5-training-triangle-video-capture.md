---
name: sprint-6.5-training-triangle-video-capture
description: Jules workflow to create an authentic Playwright E2E video capturing the full Training Triangle workflow across Coach, Player, and Parent OS.
---

# Sprint 6.5: Authentic Training Triangle Playwright Video Automation

## Objective
The previous marketing video automation failed to capture the authentic, multi-persona "Training Triangle" workflow. Your objective is to overwrite `scripts/capture-persona-demos.mjs` with a new Playwright script that logs into the actual application, works through a realistic training process across 3 personas, and exports highly polished footage.

## 1. Strict Playwright Pipeline Constraints
Before you write any code, you MUST adhere to the `playwright-video-pipeline` SKILL rules:
- **Output Filename:** `static/videos/marketing-hero.webm`
- **Aspect Ratio:** 16:9 at 1920x1080 resolution.
- **Isolated Contexts:** Create separate BrowserContexts for each clip, and explicitly `await context.close()` after each clip to finalize the recording on disk.
- **Merge/Transcode:** Ensure the script ends by triggering `node scripts/merge-marketing-video.mjs` to transcode the `.webm` to `static/assets/video/marketing-hero.mp4` using FFmpeg with `-pix_fmt yuv420p` and `-movflags +faststart`.
- **Diegetic Motion:** Interpolate cursor movements across 20-35 steps (roughly 60fps). Do not use instant 0ms clicks or jarring jumps. Ensure cursor paths sweep across the UI components naturally.

## 2. Authentic Demonstration Narrative
You must program the Playwright script to execute the following continuous narrative flow, specifically designed to highlight:
- **Ease of Coaching**: How quickly and easily a coach can assign drills and track progress.
- **The Dopamine Engine**: The visceral, gamified XP feedback loop that drives athlete retention.
- **The Parent Role**: The critical compliance and verification loop where parents monitor and protect the athlete.

### Sequence 1: Coach OS (Intent & Assignment)
1. Launch Chromium and create a `1920x1080` context.
2. Authenticate as a Coach persona using standard mock credentials.
3. Navigate to the Coach OS Dashboard (Sideline SIEM).
4. Smoothly click into the "Intent Engine" / "Drill Designer".
5. Emphasize a cursor sweep over the tactical whiteboard UI, assign a tactical drill/mission to an athlete, and quickly view the tracking dashboard to demonstrate how easy it is for the coach to assign and monitor progress.
6. `await context.close()` to save the clip.

### Sequence 2: Player OS (Dopamine Engine)
1. Create a new `1920x1080` context.
2. Authenticate as the Athlete persona assigned in Sequence 1.
3. Navigate to the Player OS Dashboard.
4. Smoothly hover over the new mission objective on the dark-mode HUD.
5. Click to "complete" the mission. Pause and meticulously capture the Dopamine Engine in action: the XP level-up animation, badges unlocking, and the visceral progression feedback loop, ensuring the cursor hovers near the Cyber Yellow (`#daff0a`) telemetry gauges.
6. `await context.close()` to save the clip.

### Sequence 3: Parent OS (Compliance Shield)
1. Create a new `1920x1080` context.
2. Authenticate as the Parent persona linked to the Athlete.
3. Navigate to the Parent OS (Co-Op Trust Center).
4. Smoothly scroll the Household feed to view the completed activity log, highlighting the parent's crucial role in the process.
5. Hover the cursor over the Data Cyan (`#14b8a6`) compliance status indicators to emphasize the parent's verification and emotional safety role.
6. `await context.close()` to save the clip.

## 3. Definition of Done
Your task is only complete when:
- `scripts/capture-persona-demos.mjs` is fully written and correctly executes the above 3-part sequence.
- You have verified the script does not contain any static 0ms clicks.
- The script successfully creates the browser contexts and merges them into `static/assets/video/marketing-hero.mp4`.
