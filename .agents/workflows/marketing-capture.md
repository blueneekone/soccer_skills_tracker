---
name: marketing-capture
description: Automated, choreographed multi-scene browser-in-the-loop marketing video capture workflow matching the 90-Second SSTracker Demo Script.
trigger: manual
---

# WORKFLOW: AUTOMATED 90-SECOND DEMO SCENE CAPTURE
**Owner**: Chief Marketing Officer (CMO) | **Priority**: P1 — RELEASE READINESS

This workflow orchestrates the **CRO (Chief Reliability Officer)** browser subagent to execute a choreographed, multi-scene visual simulation of sstracker.app directly matching the approved 90-Second Demo Script. The CMO agent acts as the director, recording high-resolution webm/mp4 visual proof without manual screen-recording.

---

## CRITICAL SAFETY & DEPLOYMENT GUARDRAIL
The CMO and Browser subagents are **mathematically prohibited** from executing any production deployment, external API writes, or remote hosting upload scripts. All recorded scenes, cropped viewports, and metadata overlays must remain local within `/marketing/pending-review/` for human offline validation.

---

## SCENE-BY-SCENE CAPTURE PROTOCOL

### SCENE 1: The Director OS & B2B Revenue Engine (0:00 - 0:15)
*   **Initialization**: Mint a custom JWT token for the *Visionary Club Director* persona. Bypass auth to instantly land on the `/director/dashboard`.
*   **Action 1 (Tomorrow.io Webhook)**: Programmatically trigger a mock "Lightning Detected" telemetry event. Verify that the map status dynamically shifts and display the neon-bloom *"Fields Auto-Locked"* alert panel.
*   **Action 2 (The Vampire Importer)**: Open the logistics tab and trigger a simulated, frictionless CSV upload. Animate the headless parsing and rapid ingestion of roster rows into Svelte's reactive `$state`.
*   **Action 3 (Stripe Connect Split)**: Trigger a mock subscription payment and record the Stripe Connect auto-billing successful animation.
*   **Recording**: Capture this 15-second sequence in high-density viewport dimensions.

### SCENE 2: The Athlete OS & Dopamine Engine (0:15 - 0:35)
*   **Transition**: Authenticate as the *Ambitious Athlete* persona. Land on `/player/dashboard`.
*   **Action 1 (Gaming HUD & 6-Axis Prism)**: Animate a smooth, fluid pan across the 40% Void Black Gaming HUD. Render the SVG-based 6-axis Vanguard Prism tracking the "Scout's Six" physical telemetry.
*   **Action 2 (RPG Skill Tree Swipe)**: Trigger a mock mouse swipe navigating the Svelte 5 interactive skill tree component, highlighting kinetic 150-250ms node micro-interactions.
*   **Action 3 (Dopamine Commit Celebration)**: Mock a completed verified video trial. Animate a server-verified database commit that triggers the `dopamineOnCommit` canvas-confetti particle explosion directly over the athlete's badge.
*   **Recording**: Record this 20-second sequence, ensuring no layout squishing occurs during animations.

### SCENE 3: The Fan OS & Broadcast Monetization (0:35 - 0:55)
*   **Transition**: Authenticate as the *Engaged Fan/Parent* persona and navigate to `/fan/stream`.
*   **Action 1 (Smart Camera Stream)**: Simulate a live football stream using a pre-buffered, lazy-loaded local video file. Overlay real-time gamified overlays (e.g., MVP voting panel).
*   **Action 2 (Interactive Superdraw & Apple Pay)**: Trigger a 60-second digital fundraising prompt on screen. Simulate an Apple Pay button click, showing a frictionless, successful payment verification checkmark.
*   **Recording**: Capture this 20-second broadcast overlay sequence.

### SCENE 4: SafeSport & Zero-Trust Safety (0:55 - 0:75)
*   **Transition**: Authenticate as the *Coach* persona and navigate to `/messages`.
*   **Action 1 (1:1 Messaging Lock)**: Attempt to open a direct, 1-on-1 private message window with a minor athlete. Ensure the UI displays the serious, SafeSport-compliant block screen: *"1:1 Messaging Restricted: Parents must be CC'd."*
*   **Action 2 (Shadow CC Trigger)**: Type a mock team message and show the server-side Shadow CC engine in action, programmatically resolving the minor's household and automatically CC'ing the parent's email.
*   **Recording**: Record this 20-second compliance security sequence.

---

## POST-PRODUCTION, RESOLUTION, & EXPORT METRICS

1.  **Viewport Dimensions**: Lock the headless browser viewport strictly to a high-refresh, non-skewed resolution (1920x1080 or custom 16:9 box).
2.  **Typography Overlays**: The CMO must programmatically overlay Geist Mono micro-typography labels showing real-time frame rates and database transaction latencies (e.g., *"14ms Inference Latency"*, *"1000Hz Telemetry Stream"*) on the video corners.
3.  **Hashed Static Compression**: Save the resulting video files with cryptographic file-hash names to prevent browser caching when reviewed.
4.  **Save Path**: Output all scene files and the combined compilation strictly to:
    `/workspace/scratch/marketing/pending-review/`
    Once post-production completes, copy the unified file exactly once to:
    `/workspace/out/SSTracker-90s-Demo-Capture.mp4`

---

## VERIFICATION & HANDOVER
The CMO must verify that:
*   The final MP4 renders cleanly at exactly 90 seconds.
*   No system-level error overlays or uncompiled Svelte code blocks are visible in the capture.
*   The file is saved correctly to the public outbox before alerting the user.
