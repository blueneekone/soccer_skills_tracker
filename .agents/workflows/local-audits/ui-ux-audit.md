---
description: Persona-Specific UI/UX Visual Audit
---

#### Description
Executes a microscopic, browser-in-the-loop visual verification of a specific persona's interface using Chrome DevTools and Puppeteer to ensure strict adherence to the SKILL.md protocols [2]. 

#### Mandatory Pre-Flight Check
1. **Persona Requirement:** The user MUST provide a specific persona to audit when calling this workflow (e.g., `/ui-ux-audit Player` or `/ui-ux-audit Coach`). If no persona is specified, **HALT EXECUTION immediately** and ask the user which persona to audit to conserve context tokens.

#### Audit Execution Steps
2. **Launch Puppeteer:** Spin up a local Chrome DevTools instance and navigate to the requested persona's dashboard [2].
3. **Global Foundation Audit (All Personas):**
   - Verify the layout uses the strict 12-column asymmetric Bento Grid [3].
   - Verify the 60-30-10 color taxonomy is mathematically perfect: Void Black (#000000) for the Z0 Canvas, Navy Slate (#0f172a) for Z2 Panels, and Data Cyan (#14b8a6) for telemetry [4, 5]. 
   - Ensure absolutely no `rgba()` text opacities or Tailwind opacity modifiers are used on dark backgrounds [6].
4. **Targeted Persona Trim Audit (Execute ONLY the one requested):**

   *IF PLAYER OS (The Gamified HUD):*
   - Verify the presence of the 6-axis Vanguard Prism radar charts [7].
   - Ensure chamfered clip-paths are applied *exclusively* to outer specialty cards [7].
   - **CRITICAL:** Scan the viewport to ensure there is exactly ONE Action Gold (#fbbf24) primary CTA present [7].

   *IF COACH & DIRECTOR OS (Tactical SIEM):*
   - Verify strict 90-degree corners on all core layout panels [7].
   - Scan for the HTML5 Spatial Drill Designer or compliance audit feeds [7].
   - **CRITICAL:** Aggressively flag and fail the audit if ANY gamification chamfers or Action Gold CTAs are found on this route [7].

   *IF PARENT OS (Compliance Vault):*
   - Verify the UI utilizes a calm, flat aesthetic [7].
   - Verify exactly 24px border radii are used for the outer panel wrappers [7].
   - **CRITICAL:** Verify the absence of gamification elements and confirm the presence of Verifiable Parental Consent (VPC) queues or Stripe billing modules [7].

5. **Artifact Generation:** Capture high-fidelity screenshots of any flagged layout violations, CSS discrepancies, or color halation issues, and generate a final UI/UX Audit Report Artifact.