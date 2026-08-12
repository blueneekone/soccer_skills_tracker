# 🛠️ ANTIGRAVITY AGENT SKILL: PLAYWRIGHT & FFMPEG MARKETING VIDEO PIPELINE
**Metadata:**
- **name:** playwright-video-pipeline
- **description:** Teaches local and cloud-native agents how to programmatically execute browser-in-the-loop tests using Playwright and stitch WebM captures into a production-grade MP4 utilizing FFmpeg.

---

### 1. OBJECTIVE & EXECUTION BOUNDARIES
When the CEO requests a product demonstration video, or when the repository triggers an automated marketing capture on merge, **do not attempt manual screen recording or GUI interactions**. You must strictly automate the lifecycle from script writing to FFmpeg composition.

---

### 2. THE THREE-STEP PIPELINE

#### Phase 1: Isolated Context Recording
* **The Rule:** Do not record the entire 90-second workflow in a single massive browser session. Playwright's recording encoder can experience buffer starvation or drop frames during heavy animations (like canvas-confetti particle bursts).
* **The Solution:** Record each distinct segment (Director, Player, Fan, Parent) as a separate BrowserContext [cite: 853]. 
* **The Code Blueprint:**
  ```javascript
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: './recordings/raw',
      size: { width: 1920, height: 1080 }
    }
  });
  ```
* **Finalization:** You MUST explicitly call `await context.close()` after each segment. Playwright will not finalize or flush the WebM container until the associated context is closed [cite: 853].

#### Phase 2: Programmatic JWT Authentication (Zero-Trust Bypass)
* To bypass login pages and layout-level routing gates without using hardcoded credentials, you must call the Firebase MCP server to programmatically mint a Custom JWT token [cite: 207]:
  ```javascript
  const customToken = await admin.auth().createCustomToken(uid, customClaims);
  ```
* Inject this minted token directly into the browser subagent's local storage before navigating to the route, ensuring the SvelteKit router reads the profile as cleared and verified [cite: 207, 210].

#### Phase 3: FFmpeg Stitching and Cropping
* **Unified Transcoding:** Transcode all raw WebM files into identical intermediate H.264 streams to prevent video track sync errors [cite: SECTION 2].
* **The Layout Crop:** Apply a precise crop filter to remove any browser address bars, chrome extensions, or empty layout margins, focusing solely on the high-density grid panels [cite: SECTION 2].
* **Mobile-Ready Encoding:** Use the high H.264 profile, YUV420p pixel format, and AAC audio codec [cite: 853]:
  ```bash
  ffmpeg -y -i raw_input.mp4 -vf "crop=1920:1080:0:0" -c:v libx264 -pix_fmt yuv420p -an public/marketing-demo.mp4
  ```

---

### 3. THE DEFINITION OF DONE
The pipeline is only successful when:
1. `public/marketing-demo.mp4` is programmatically verified as existing.
2. The final file size is mathematically under **50MB** to ensure immediate mobile load times [cite: 703].
3. The video contains zero blank frames or layout overlaps.
