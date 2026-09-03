---
name: cmo-marketing-video-pipeline-v2
description: Automates the generation of the 90-second marketing video using Playwright and FFmpeg, followed by a mandatory Zero-Trust data purge.
---

# ⚙️ SSTracker Automated Marketing Video Generation Pipeline (v2.0)

@jules, act as our joint Chief Marketing Officer (CMO), Chief Software Architect (CSA), and Chief Security Officer (CSO). Execute the automated product demonstration capture, transcode, merge, and selective defragmentation (database shredder) sequence.

### 🛡️ Critical Architectural Constraints (Non-Negotiable)

1. **Safety Constraint**: You are strictly prohibited from modifying core application files. Only modify scripts inside `scripts/` and compile the final video inside `static/assets/video/`.
2. **Data Hygiene Mandate**: Mock data injected during the Playwright recording session MUST NOT persist in the database to prevent pollution of our live showcase environment.
3. **The Consents Shield**: The `config`, `platform_config`, `sports_configs`, `consent_logs`, and `consent_records` collections must remain strictly exempted and physically immune to the shredder to maintain our legally mandated COPPA 2.0 and SafeSport audit trails.
4. **Admin Account Protection**: Ensure your deletion script handles document-level inspection inside the `users` collection to prevent the accidental deletion of the global admin account matching `admin@sstracker.com`.

### 🛠️ Execution Sequence & Targets

- **Step 1: Mock & Record**
  * Target: `scripts/record-demo.js`
  * Action: Run `node scripts/record-demo.js` to launch Playwright in our offline emulator environment, execute automated OS transitions, and write raw segments to `./recordings/`. This script dynamically injects mock UI/telemetry data to simulate active, high-density club states.

- **Step 2: Transcode & Merge**
  * Target: `scripts/merge-video-v2.sh`
  * Action: Run `bash scripts/merge-video-v2.sh` to crop, transcode, and merge the raw video frames into a production-ready MP4. Use FFmpeg to compress the output video file to improve web streaming performance.

- **Step 3: Asset Verification**
  * Action: Confirm the physical file existence of `static/assets/video/sstracker-demo.mp4` and verify size limits are strictly under 50MB.

- **Step 4: Mandatory Data Shredder (Zero-Trust Cleanup)**
  * Target: `scripts/pre-launch-shredder.js`
  * Action: Run `node scripts/pre-launch-shredder.js` immediately upon video completion to securely purge all generated mock data from the Firestore database, leaving only the protected files and the Admin account intact. 
  * Transaction Cap: Execute mutations in atomic batches of 500 documents. If the target size exceeds 500, apply cursor-based batch pagination.

### 🚦 Test & Handover

1. Run the targeted pipeline: `pnpm run check && pnpm run build`.
2. Verify the pre-launch shredder logs show:
   * `[SKIPPED] Protected architecture collection: config`
   * `[SHIELD ACTIVE] Preserving Admin Account: admin@sstracker.com`
   * `[SUCCESS]` exit codes for all shredded collections.
3. Submit your non-conflicting Pull Request containing the compiled video asset and the recording logs targeting the 'dev' branch.
