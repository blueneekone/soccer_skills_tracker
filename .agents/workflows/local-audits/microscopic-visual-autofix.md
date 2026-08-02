---
description: P0 — Uncompromising Microscopic Visual, Padding, Mobile, and Grammar Audit & Auto-Fix
---

### Workflow: Microscopic Visual & Aesthetic Auto-Fix
**Priority:** P0 🔴 CRITICAL
**Persona Context:** Chief Design Officer (CDO) & Chief Reliability Officer (CRO)

#### Objective
To execute a microscopic, browser-in-the-loop visual and typographic verification of the interface. The agent is mathematically bound to enforce edge padding, mobile responsive stacking, punctuation/grammar, and the "Nuclear Americana Tech Noir" design tokens.

#### CRITICAL GUARDRAIL: NO HALLUCINATION
You are STRICTLY FORBIDDEN from evaluating the UI by merely reading the Svelte code [cite: 956]. You MUST write and execute a Playwright script to launch a headless browser, navigate the local route, and extract the `window.getComputedStyle()` properties of the rendered elements [cite: 955, 956].

#### Execution Steps for the Swarm:

**Step 1: The Multi-Viewport Playwright Launch**
*   Launch Puppeteer/Playwright and capture screenshots and computed styles across three exact viewports: **Desktop (1280px)**, **Tablet (768px)**, and **Mobile (375px)**.

**Step 2: Microscopic Edge Padding & Anti-Squish Audit**
*   Extract the computed padding of all text containers. 
*   **Mandate:** Text MUST NEVER touch the edges of its container. Assert that a minimum of `1rem` (16px) or `1.5rem` (24px) of padding exists inside all cards and Bento Grid wells.
*   **Grid Math:** Ensure all `.app-shell` and Bento Grid containers utilize fluid clamp math: `grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));` [cite: 918]. Any flex children must have `tw-min-w-0` applied to explicitly forbid text bleeding out of the container [cite: 918].

**Step 3: Mobile Screen Auto-Adjust Verification**
*   Force the mobile viewport (375px). 
*   Assert that the 12-column Bento Grid gracefully collapses into a single-column scrollable feed (`@media (max-width: 640px)`) [cite: 1159].
*   Assert the root viewport lock: The main application wrapper MUST use `tw-h-[100dvh]` and `tw-flex-col` [cite: 918]. Verify that internal scrolling uses `tw-overflow-y-auto` and that the mobile browser does not render an ugly double-scrollbar [cite: 1158, 1215].

**Step 4: Copy, Grammar, and Period Placement Pass**
*   Scrape all rendered text from the UI.
*   **Headers:** Assert that all headers use strict Title Case and the **Geist Sans** font [cite: 916, 925].
*   **Body Copy:** Assert that all body text uses the **Switzer** font for legibility [cite: 916]. Check for missing periods at the ends of sentences in paragraphs, and ensure UI button labels DO NOT have periods.
*   **Data Readouts:** Assert that all telemetry, numbers, and dates strictly use **Geist Mono** [cite: 916].

**Step 5: The "Tech Noir" Color & Contrast Validation**
*   Assert that the main background canvas computes strictly to Void Black (`rgb(0, 0, 0)`) [cite: 915].
*   Assert that all Z2 panels compute to Navy Slate (`#0f172a` or `#1e293b`) with crisp 1px Structural Grey (`#334155`) borders [cite: 915, 917].
*   **The Single-CTA Guard:** Assert there is exactly ONE Action Gold (`#fbbf24`) primary CTA button visible per viewport to prevent cognitive overload [cite: 915, 920].

**Step 6: The Autonomous Auto-Fix Loop**
*   If ANY of the above assertions fail (e.g., padding is too thin, text is cut off on mobile, grammar is sloppy), you must immediately invoke a CSS/Svelte auto-fix.
*   Modify the Tailwind classes in the `.svelte` file to correct the padding, update the grammar, or fix the mobile grid.
*   Re-run the Playwright script until the page computes perfectly across all 3 viewports.
*   Output the final passing screenshots to the `/audit-artifacts/` folder.
