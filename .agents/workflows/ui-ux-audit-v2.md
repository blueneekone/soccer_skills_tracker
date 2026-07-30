---
name: ui-ux-audit-v2
description: Advanced visual-in-the-loop UI/UX audit workflow enforcing mathematical design compliance, asset checklists, and automated Svelte 5/Tailwind DOM validations.
trigger: manual
---

# WORKFLOW: HIGH-FIDELITY UI/UX VISUAL AUDIT & DESIGN GATING
**Owner**: Chief Design Officer (CDO) & Chief Reliability Officer (CRO) | **Priority**: P1 — BRAND EXCELLENCE

This workflow executes an exhaustive, programmatically gated visual audit of a specific persona's interface using local browser-in-the-loop verification to guarantee that no visual, typography, or asset element is missed by the agent.

---

## MANDATORY PRE-FLIGHT CHECK
The user MUST specify the exact target persona to audit (e.g., `/ui-ux-audit-v2 Player` or `/ui-ux-audit-v2 Coach`). If no target is specified, **HALT execution immediately** and request clarification to conserve token limits.

---

## STAGE 1: COMPILING THE VISUAL INTEGRITY CHECKLIST
Before initiating the headless browser, the agent must build a dynamic asset checklist for the target persona.

1. **Asset Verification**: Ensure all required images, custom SVGs, and font libraries are resolved on the local filesystem.
   * *If Player OS*: Validate the presence of processed character avatars (e.g., `Meg_in_away_kit_202607212349.jpeg`) in `src/assets/avatars/processed/`.
   * *If Coach OS*: Validate that the SVG field layout assets and Vantablack Identity Discs are available.
2. **Path Mapping**: Map all route paths for the target persona using the active workspace routes (e.g., `/player/dashboard`, `/player/skill-tree`, or `/coach/war-room`).

---

## STAGE 2: HEADLESS BROWSER AUDIT PIPELINE
Spawn the **CRO (Chief Reliability Officer)** subagent to initialize Puppeteer and launch Chrome DevTools.

### Step 1: Secure Account Impersonation (Zero-Touch Auth)
* Do NOT attempt manual credentials login.
* Use the Firebase MCP tool `/auth:manage` to programmatically mint a custom JWT token via `admin.auth().createCustomToken(uid)` for the target persona.
* Inject this token directly into the browser's local storage or session store to bypass authentication screen barriers.

### Step 3: Global Design System Validations
For every route traversed, execute a programmatic DOM and CSS evaluation using `page.evaluate()` to check computed styles:
1. **The 60-30-10 Color Taxonomy**:
   * Assert that the background color (`window.getComputedStyle().backgroundColor`) strictly maps to `Void Black (#000000)` or `Navy Slate (#0f172a / #1e293b)`.
   * Assert that no layout elements utilize unauthorized Tailwind blues or default colors.
2. **Contrast & Opacity Rules**:
   * Explicitly search the DOM for elements using Tailwind opacity modifiers on text (e.g., `tw-text-white/50`) or `rgba()` opacities.
   * Flag any text contrast ratio falling below WCAG 2.2 AA standards.
3. **Typography Gating**:
   * Verify that all technical data, telemetry charts, and numeric readouts utilize the `Geist Mono` typeface.
   * Verify that body copy is rendered in `Switzer` and headers are in `Geist Sans`.
4. **Layout Squish and Bleed Protection**:
   * Scan for text truncation or bleeding by validating that all flex grid children have `tw-min-w-0` or `min-width: 0px` explicitly defined.
   * Verify the parent container is wrapped inside a `tw-h-[100dvh]` flexbox shell to guarantee an App-like vertical viewport flow.

---

## STAGE 3: PERSONA-SPECIFIC TRIMS & WIDGET VERIFICATION

### Player OS (The Gamified HUD)
* **Vanguard Prism**: Verify that the 6-axis Vanguard Prism radar chart is rendered as a clean, high-performance, native HTML5 SVG rather than a bloated Canvas.
* **Specialty Cards**: Verify that chamfered clip-paths (`polygon()`) are applied strictly to the outer boundaries of the 5:7 "Ultimate Team" player cards.
* **CTAs Limitation**: Enforce the **Singular Directive**. Scan the active viewport to ensure there is **exactly ONE** primary Action Gold (`#fbbf24`) Call-to-Action button present. Secondary options must be rendered as outline outlines.

### Coach & Director OS (Tactical SIEM)
* **90-Degree Geometry**: Ensure absolutely no rounded corners (`border-radius`) or gamification chamfers are used on core data layout panels.
* **Tron War Room**: Verify that the HTML5 Spatial Drill designer's SVG canvas implements proper coordinate translation using `matrixTransform(getScreenCTM().inverse())` instead of raw mouse client offsets.
* **Filter Defs**: Verify the presence of the `<filter id="neonBloom">` node inside the SVG definitions block.
* **CTA Block**: Aggressively fail the audit if any Action Gold (`#fbbf24`) CTAs are found on these routes.

### Parent OS (The Shield / Compliance Vault)
* **Visual Calming**: Verify that the dashboard uses a flat, low-arousal layout with a `24px` border-radius on outer panel wrappers to establish structural trust.
* **Module Audit**: Verify that the visual pipeline successfully displays the Household Graph, the Verifiable Parental Consent (VPC) queues, and read-only Stripe entitlement progress bars. Ensure absolutely no gamification mechanics are loaded.

---

## STAGE 4: EXPORTING VISUAL PROOF & ACTION BLUEPRINTS
If any discrepancies, missing visual components, or layout squishes are detected during the audit:
1. **Capture Visual Evidence**: Take a high-fidelity PNG screenshot highlighting the element bounding box of the violation.
2. **Generate Fix Trajectory**: The CRO must immediately draft a targeted `.agents/workflows/jules-builds/` recovery script to resolve the CSS box-model error or missing component Svelte markup.
3. **Save Report**: Save the final screenshot artifacts and the visual diagnostic summary directly into the `/audit-artifacts/[persona-name]/` directory for offline human review.
