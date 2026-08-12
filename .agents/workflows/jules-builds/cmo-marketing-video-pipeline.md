---
name: cmo-marketing-video-pipeline
description: Automates the generation of the 90-second marketing video using Playwright and FFmpeg.
---
# Automated Marketing Video Generation Pipeline

@jules, please execute the automated product demonstration capture and merge sequence.

### Rules & Gates
1. Apply \`.agents/skills/playwright-video-pipeline\`.
2. **Safety constraint:** You are strictly prohibited from modifying core application files. Only modify scripts inside \`scripts/\` and compile the final video inside \`static/assets/video/\`.

### Execution Sequence
- **Step 1:** Run \`node scripts/record-demo.js\` to launch Playwright, execute automated OS transitions, and write raw segments to \`./recordings/\`.
- **Step 2:** Run \`bash scripts/merge-video-v2.sh\` to crop, transcode, and merge clips into a production-ready MP4.
- **Step 3:** Confirm file existence of \`static/assets/video/sstracker-demo.mp4\` and verify size limits are under 50MB. Open a Pull Request.