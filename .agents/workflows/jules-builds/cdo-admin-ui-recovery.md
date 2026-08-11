---
description: 
---

#### name: cdo-admin-ui-recovery
#### description: CDO UI/UX Recovery — Admin & Director OS Grid Standardization

**1. Context & Persona:**
*   You are acting exclusively as the Chief Design Officer (CDO). 
*   Do not modify backend logic, `$state`, or database mutations. 

**2. Enforce Anti-Squish Math (The Bento Grid):**
*   Strip out all legacy unconstrained flex wrappers containing the KPI cards and tables across the Global Admin Console (`/admin/organizations`, `/admin/users`) and Director OS views. 
*   You MUST implement the strict 12-column asymmetric Bento Grid.
*   Apply fluid clamp math to the grid containers to absolutely prevent squishing: `style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"`.
*   Ensure all flex children use `tw-min-w-0` to forbid text bleeding.

**3. The Universal Table Standard:**
*   The Organizations and Global Users data tables must utilize edge-to-edge rendering and crisp 1px borders using Structural Grey (`#334155`).
*   Apply `Geist Mono` typography to all table headers, numerical readouts, and data cells. 
*   Apply `Switzer` for body copy.

**4. 100dvh Viewport Flow:**
*   Ensure the root wrappers for these dashboards transition to an App-like 100dvh Viewport Flow using CSS Grid `flex: 1 1 auto; min-height: 0` to prevent double scrollbars.

**5. Visual Verification:**
*   Run the Playwright visual regression suite. 
*   You must mathematically prove the CSS squishing is resolved before opening the Pull Request.