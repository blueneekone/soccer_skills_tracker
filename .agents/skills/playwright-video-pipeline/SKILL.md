---
name: playwright-video-pipeline
description: Evaluates and captures visually stunning product demo clips using headless browser orchestration and post-processing automation.
---
# Playwright & FFmpeg Marketing Video Automation

When generating automated product demos, you must strictly adhere to the following pipeline:
1. **Isolated Contexts:** Do not record one massive video. Record one short clip for each narrative beat and give each clip its own BrowserContext to prevent the Playwright video encoder from falling behind.
2. **Context Configuration:** Initialize the context with strict dimensions and the recordVideo parameter:
   \`\`\`javascript
   const context = await browser.newContext({
     viewport: { width: 1920, height: 1080 },
     recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } }
   });
   \`\`\`
3. **Finalization:** You MUST await context.close() after each clip's sequence is complete. The .webm video file only finalizes when the context closes.
4. **FFmpeg Post-Processing:** Generate an FFmpeg script to crop the raw .webm files to the relevant UI bounding boxes, merge the clips sequentially, and encode them into a highly optimized public/demo.mp4 for web playback. Use -c:v libx264 -pix_fmt yuv420p for maximum mobile compatibility.