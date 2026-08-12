# 🚀 GOOGLE JULES WORKFLOW: AUTOMATED MARKETING VIDEO PIPELINE
**Metadata:**
- **name:** cmo-marketing-video-pipeline
- **description:** Automates the end-to-end rendering, cropping, and stitching of the 90-second product demo video utilizing Playwright and FFmpeg.

---

### 1. CONTEXT & CIRCUIT BREAKER
* **Persona Role:** Chief Marketing Officer (CMO) and Chief Reliability Officer (CRO) [cite: 854].
* **ANTI-LOOPING CIRCUIT BREAKER:** You are authorized a **maximum of 3 iteration attempts** per segment or encoding run [cite: 854]. If the video renderer hangs, crashes, or fails compile-checks, log the stdout trace to `recordings/logs/error.log`, revert file mutations, and stop execution immediately [cite: 854].

---

### 2. EXECUTION STEPS

#### Step 1: Initialize the Environment
* Verify that SvelteKit's local development server is running in the cloud VM background (`pnpm run dev &`) [cite: 854].
* Install the Playwright chromium browser binaries:
  ```bash
  npx playwright install chromium
  ```

#### Step 2: Run the Playwright Recording Script
* Execute the Node.js automation capture suite:
  ```bash
  node record-demo.js
  ```
* This will sequentially boot up the Director, Player, Fan, and Parent OS screens, trigger success states (including the verified database confetti particle explosions), and save clean WebM recordings to `./recordings/` [cite: 854].

#### Step 3: Execute FFmpeg Stitching and Cropping
* Run the sequential stitching script:
  ```bash
  bash merge-video.sh
  ```
* This transcodes, concatenates, crops, and encodes the raw clips into the finalized, mobile-ready `public/marketing-demo.mp4` [cite: 854].

#### Step 4: Verification & Handoff
* Verify that the finalized MP4 file is generated successfully and conforms to our performance budget:
  ```bash
  test -f public/marketing-demo.mp4 && [ $(du -k public/marketing-demo.mp4 | cut -f1) -le 51200 ]
  ```
* If verification passes, commit your scripts and open a Pull Request.

---

### 3. DISPATCH COMMANDS FOR THE CEO
Once this workflow is saved to your repository, trigger the cloud VMs in parallel from your terminal [cite: 854]:
```bash
gh issue create --title "CMO: Generate Marketing Video Pipeline" --body "@jules, please execute the workflow defined in .agents/workflows/jules-builds/cmo-marketing-video-pipeline.md" --label "jules"
```
