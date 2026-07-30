---
name: cdo-fix-marketing-landing
description: CDO — Rebuild Marketing Landing Page (The Training Triangle)
---

# Workflow: CDO — Rebuild Marketing Landing Page (The Training Triangle)

**CRITICAL GUARDRAIL:** The marketing landing page is a static, prerendered route (`prerender = true`). The CDO and Browser Subagents are strictly forbidden from referencing, importing, or testing Firebase Auth, session stores, or login states. Do not test authentication during this workflow.

**Objective**: Overhaul the public marketing landing page (`src/routes/(marketing)/+page.svelte`) to enforce the "Nuclear Americana Tech Noir" design system and the "Training Triangle" narrative.

#### Steps for the CDO Subagent:

1. **The Hero Section & CTA (First Impression)**
   * **Action**: Locate the main H1 hero text and replace it with the exact approved declarative headline: **"Stop managing teams. Start developing athletes. The Youth Sports OS."**.
   * **Action**: Replace any static gray placeholder boxes with a lazy-loaded interactive video loop showcasing the UI.
   * **Action**: Ensure there is exactly ONE Action Gold (`#fbbf24`) primary Call-To-Action button that reads **"Deploy Your Club"**.

2. **The Asymmetric Training Triangle Grid**
   * **Action**: Delete any legacy symmetrical 3-column layouts.
   * **Action**: Implement a strict 12-column asymmetric Bento Grid using fluid clamp math to visually prioritize the three core decision-makers without text squishing:
     * **Player Development**: Must span **6 columns**.
     * **Coach Tactics**: Must span **4 columns**.
     * **Parent Shield**: Must span **2 columns**.

3. **Color Palette & Typography Enforcement**
   * **Action**: Strip out any unauthorized default Tailwind blues (`tw-text-[#3b82f6]`).
   * **Action**: Enforce the 60-30-10 color taxonomy: Void Black (`#000000`) and Navy Slate backgrounds, Structural Grey borders, and Data Cyan (`#14b8a6`) for accents.
   * **Action**: Ensure all data/telemetry uses `tw-font-mono` (Geist Mono) and body copy uses `tw-font-sans` (Switzer).

4. **Visual Verification (Unauthenticated)**
   * **Action**: Launch the browser subagent to navigate to the local host's root url (`/`). Do not attempt to log in.
   * **Action**: Take a screenshot Artifact of the fully rendered page so the user can verify the Bento Grid layout and styling changes without deploying.
