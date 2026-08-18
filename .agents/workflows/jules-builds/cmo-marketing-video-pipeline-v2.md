name: cmo-marketing-video-pipeline-v2
description: Automates the generation of the 90-second marketing video using Playwright and FFmpeg, followed by a mandatory Zero-Trust data purge.

# Automated Marketing Video Generation Pipeline (v2.0)

@jules, please execute the automated product demonstration capture and merge sequence. 

### Rules & Gates

1.  Apply `.agents/skills/playwright-video-pipeline`.
2.  **Safety constraint:** You are strictly prohibited from modifying core application files. Only modify scripts inside `scripts/` and compile the final video inside `static/assets/video/`.
3.  **Data Hygiene Mandate:** Mock data injected during the Playwright recording session MUST NOT persist in the database. 

### Execution Sequence

- **Step 1: Mock & Record**
  Run `node scripts/record-demo.js` to launch Playwright, execute automated OS transitions, and write raw segments to `./recordings/`. *(Note: This script dynamically injects mock UI/telemetry data to simulate an active club).*

- **Step 2: Transcode & Merge**
  Run `bash scripts/merge-video-v2.sh` to crop, transcode, and merge the raw clips into a production-ready MP4.

- **Step 3: Asset Verification**
  Confirm file existence of `static/assets/video/sstracker-demo.mp4` and verify size limits are under 50MB.

- **Step 4: Mandatory Data Shredder (Zero-Trust Cleanup)**
  Run `node scripts/pre-launch-shredder.js`. You MUST execute this script immediately upon video completion to securely purge all generated mock data from the Firestore database, leaving only the protected files and the Admin account intact. Do not open the Pull Request until the shredder confirms a successful `[SUCCESS]` exit code.

- **Step 5: Delivery**
  Open a Pull Request containing the new MP4 asset and the recording logs.