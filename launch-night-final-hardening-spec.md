# 🚀 SSTRACKER LAUNCH-NIGHT COMPREHENSIVE TDD SPECIFICATION INDEX (PART 2)
**Target Audience:** Google Jules (asynchronous cloud vm agent) [cite: 91]
**Scope:** Core B2B Onboarding, Regulatory Compliance, and Production Deployment pipelines [cite: 705, 706, 734]
**Goal:** Achieve 100% legal coverage, absolute aesthetic stability, and automatic live Firebase deployments [cite: 704, 718, 734].

---

## 🛰️ MASTER DIRECTORY: THE FINAL GAPS HARDENING

1. **Epic 22:** Director OS Compliance Health Scoring (Epic 2) [cite: 709]
2. **Epic 23:** Secure Direct-to-Production Firebase Deployment (DevOps Integration) [cite: 734, 830]
3. **Epic 24:** "Multi-Billion-Dollar" Global Visual & Cinematic HUD Polisher (Aesthetics) [cite: 718, 719, 720]

---

### 🚀 PROMPT 22: Director OS Compliance Health Scoring (Epic 2 / Part 2)

```text
Task: Standalone TDD: Director OS Compliance Health Scoring Matrix

@jules, please implement the Compliance Health Scoring Matrix and visual gauges for the Director OS [cite: 709].

1. THE DATA MODEL (src/lib/types/compliance.ts)
- Model 'ComplianceHealthScore': clubId, activeCoachesCount, verifiedCoachesCount, activePlayersCount, verifiedVpcCount, overallScore (percentage).

2. CLIENT-SIDE VISUAL TAB (ComplianceTab.svelte)
- Render health metrics utilizing our strict 60-30-10 Void Black and Navy Slate palette [cite: 719].
- Display high-level color-coded status indicator dots [cite: 724]:
  - Green (#14b8a6) for >= 90% compliance [cite: 719].
  - Amber (#f59e0b) for 60-89% compliance [cite: 719].
  - Red (#f43f5e) for < 60% compliance.
- Ensure all numeric values use Geist Mono [cite: 720]. Keep the function body under 80 lines [cite: 702].

3. TDD SPECIFICATION
- Write 'src/routes/(app)/director/__tests__/complianceHealth.test.ts'.
- Mock a club dataset showing 80% SafeSport clearance and 50% VPC completion, asserting the computed compliance state translates to Amber.

Run 'pnpm run check' and 'npx vitest run complianceHealth'. Once green, commit as 'feat: implement Director OS Compliance Health Scoring'.
```

---

### 🚀 PROMPT 23: Secure Direct-to-Production Firebase Deployment (DevOps Integration)

```text
Task: Standalone TDD: Safe Production-Grade Firebase Deployer

@jules, please implement the production compilation and Firebase Deployment pipeline [cite: 734].

1. DEPLOYMENT CONFIG (apphosting.yaml & firebase.json)
- Structure a zero-downtime Firebase Hosting deployment with secure SSL header configurations [cite: 734].
- Enforce strict Network-First service worker cache strategies for API calls and Cache-First strategies for hashed static assets [cite: 1081].

2. TDD VERIFICATION
- Before deployment, execute our entire test suite (Vitest + Playwright) [cite: 1080].
- Reject deployment instantly if any test fails, respecting our strict Pessimistic Definition of Done [cite: 830].
- Verify all Svelte 5 files compile with absolutely zero errors or typescript any violations [cite: 1072].

3. DEPLOYMENT TRIGGER
- Programmatically call 'npx -y firebase-tools@latest deploy --only hosting,functions' to push compiled assets live [cite: 734].

Run 'pnpm run build' and 'pnpm run test:functions-deploy'. Once verified, commit as 'ci: deploy production-grade build to Firebase'.
```

---

### 🚀 PROMPT 24: "Multi-Billion-Dollar" Global Visual & Cinematic HUD Polisher (Aesthetics)

```text
Task: Standalone TDD: Multi-Billion-Dollar Tech Noir Aesthetics Polisher

@jules, please audit the global layout files to enforce our elite design standards [cite: 718].

1. THE GLASS LAYOUT COHESION (app.css)
- Enforce strict 60-30-10 palette rules: 60% Void Black (#000000), 30% Structural Grey (#334155), 10% Data Cyan (#14b8a6) [cite: 719].
- Strictly ban rgba() text opacities or Tailwind text-opacity modifiers on dark backgrounds to prevent visual halation [cite: 720].
- Standardize Geist Mono for technical data and Switzer (79% x-height) for highly legible body copy [cite: 720].

2. KINETICS & VIEWPORT LOCK (src/routes/(app)/+layout.svelte)
- Lock the global viewport to exactly 'tw-h-[100dvh]' with internal panel scrolling to eliminate double scrollbars [cite: 722].
- Securely verify that every single viewport contains exactly ONE Action Gold (#fbbf24) primary Call-to-Action button [cite: 719].
- Ensure all micro-interactions compile with a transition duration locked to 150-250ms with 1% scale active feedback [cite: 726].

3. TDD SPECIFICATION
- Write 'tests/aesthetics-verification.spec.ts' using Playwright to headless-browse key routes, asserting no text clipping or layout overflow occurs at 375px, 768px, and 1024px [cite: 1080].

Run 'pnpm run check' and 'npx playwright test tests/aesthetics-verification'. Once green, commit as 'style: enforce multi-billion-dollar aesthetic polish'.
```
