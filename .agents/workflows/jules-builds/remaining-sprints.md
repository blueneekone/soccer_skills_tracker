# SSTracker Phase-by-Phase Orchestration (Zero-Touch Pipeline)

This workflow is designed to execute the remaining 23 sprints from ROADMAP.md (v3.0) via a zero-touch pipeline. Jules should consume these prompts sequentially. Execution halts if `npm run check` or `pnpm test` fails.

## Phase 5: Authentication & Security Integrity Fortress

### Sprint 5.2: Multi-Tenant Custom Claims & Cell Boundary Gates
**Jules Prompt**: Create `src/lib/security/__tests__/tenantClaimsBoundary.test.ts`. Write 10+ test cases that verify: (1) `request.auth.token.clubId == clubId` claim matching on `/clubs/{clubId}` reads/writes, (2) cross-tenant read attempts return `permission-denied`, (3) `getActiveDb(cellId)` returns isolated Firestore instances per tenant, (4) `cellRouter.js` routes to correct cell based on custom claims, (5) admin impersonation respects tenant boundaries. Use Vitest with mocked Firestore admin SDK. All tests must pass with `pnpm test -- src/lib/security/__tests__/tenantClaimsBoundary.test.ts`.

### Sprint 5.3: WebAuthn Biometric Enclave & Passkey Attestation Tests
**Jules Prompt**: Create `functions/__tests__/passkeyEnclaveVerification.test.ts`. Write 8+ test cases that verify: (1) `navigator.credentials.create()` attestation object parsing, (2) origin-binding tamper protection (reject mismatched `rpId`), (3) challenge replay prevention (used nonces rejected), (4) authenticator data flag validation (`UV` bit set for biometric), (5) credential storage to `devices/{deviceId}` collection, (6) assertion verification flow (`navigator.credentials.get()`), (7) cross-origin attack rejection, (8) passkey deletion cascade cleanup. Use Vitest with mocked WebAuthn CBOR payloads. All tests must pass with `pnpm test -- functions/__tests__/passkeyEnclaveVerification.test.ts`.

## Phase 7: Ultra-Premium Design Remediation & Visual Parity Audit

### Sprint R8: Backend Parity — Missing httpsCallable Endpoints (Priority 0)
**Jules Prompt**: For each missing callable (commitMatchTelemetry, getAccountabilityReport, secureFulfillIntent, initiateStripeConnect, logPlayerActivity, getPublicRecruitProfile, extractTenantData, replayIngestionRow): (1) Check if a domain file already has the logic (search `functions/src/domains/` and `functions/lib/domains/`), (2) if logic exists, wire it to `functions/index.js` via `exports.{name} = require('./path').{name}`, (3) if logic does NOT exist, create a new `onCall` function in the appropriate domain file following the pattern in existing functions (use `onCall` from `firebase-functions/v2/https`, validate `auth` context, apply RBAC checks via `rbacUtil.js`, wrap in try/catch with `logger.error`), (4) ensure each new function body stays under 80 lines, (5) add B815 defensive guards where Firestore reads are involved. Run `node -e "require('./functions/index.js')"` to verify no import crashes. Create a test file `functions/__tests__/backendParity.test.js` with smoke tests for each new export.

### Sprint R2: Transfer Portal Visual Audit & Design Upgrade
**Jules Prompt**: Open `src/lib/components/player/TransferPortal.svelte`. Audit and fix: (1) replace any `border-radius: 4px` with `0` or `2px` per design system, (2) replace any `font-size` below `10px` with minimum `clamp(0.625rem, 1vw, 0.75rem)`, (3) replace inline `onmouseenter`/`onmouseleave` handlers with CSS `:hover` pseudo-selectors, (4) verify all colors use Enterprise Palette tokens (Data Cyan `#14b8a6`, Action Gold `#fbbf24`, Void Black `#000000`, Navy Slate `#0f172a`), (5) add `Geist Mono` for data readouts, `Switzer` for body copy. Run `pnpm run check` and `pnpm test -- src/lib/components/player/__tests__/` to verify 0 errors.

### Sprint R3: Global Typography Audit & Normalization
**Jules Prompt**: Run `grep -rn "font-family" src/ --include="*.svelte"` and audit every file for: (1) technical/data text must use `'Geist Mono', ui-monospace, monospace`, (2) body copy must use `'Switzer', system-ui, sans-serif`, (3) no browser-default `serif` or `sans-serif` without explicit font family, (4) verify files: `consent/[token]/+page.svelte`, `terms/+page.svelte`, `privacy/+page.svelte`, `+error.svelte`, `VanguardEmptyState.svelte`, `VanguardPrism.svelte`, `SkillTreeArena.svelte`, `RecruiterPortal.svelte`, `ParentHouseholdArena.svelte`, `MarketingNav.svelte`, `PricingTable.svelte`. Run `pnpm run check` to verify 0 errors.

### Sprint R4: Consent Token Page Design Polish
**Jules Prompt**: Open `src/routes/(legal)/consent/[token]/+page.svelte`. Fix: (1) replace `#020208` with `#000000` (Void Black) or `#0f172a` (Navy Slate) per Z-depth, (2) replace `#ffffff` with `#fafafa` (anti-halation muted off-white), (3) if `<style>` block exceeds 200 lines, extract reusable CSS into `src/lib/styles/consent-tokens.css` and `@import` it, (4) ensure single Action Gold CTA per viewport, (5) verify `Geist Mono` for token display, `Switzer` for body. Run `pnpm run check` to verify 0 errors.

### Sprint R5: Ghost Route Final Deletion
**Jules Prompt**: (1) Verify `src/routes/(app)/coach/matchday/` has a working `+page.svelte`, (2) delete `src/routes/(app)/coach/match-day/` entirely, (3) verify `src/routes/(app)/admin/audit-logs/` has a working `+page.svelte`, (4) delete `src/routes/(app)/admin/audit-log/` entirely, (5) search for any remaining imports/links referencing `/coach/match-day` or `/admin/audit-log` and update them to canonical paths. Run `pnpm run check` and `pnpm test` to verify 0 errors. Update any test files that reference ghost paths.

### Sprint R6: Generic Emerald Color Normalization
**Jules Prompt**: For each of the 26 files with emerald violations (MatchDayHUD, MatchDayArena, etc.): (1) replace `tw-bg-emerald-500` / `tw-bg-emerald-600` / `tw-bg-emerald-700` with `tw-bg-[#14b8a6]` (Data Cyan) for success indicators, (2) replace `tw-text-emerald-*` with `tw-text-[#14b8a6]`, (3) replace `tw-border-emerald-*` with `tw-border-[#14b8a6]`, (4) audit `tw-bg-green-500` indicators in `HouseholdComplianceTab.svelte` and normalize to Data Cyan. Process files in batches of 5-6 to stay within the 2-3 task governance limit. Run `pnpm run check` after each batch.

### Sprint R7: Raw Cyan Purge
**Jules Prompt**: (1) Open `src/lib/components/ui/VanguardEmptyState.svelte`, find all instances of `rgba(0,255,255` and replace with `#14b8a6` (Data Cyan) or `rgba(20,184,166,...)` for opacity variants, (2) open `src/lib/components/parent/SeasonRegistration.svelte` and perform the same replacement, (3) verify no other files contain raw cyan by running `grep -rn "rgba(0,255,255" src/ --include="*.svelte"` — expect 0 results. Run `pnpm run check` to verify 0 errors.

---

## Phase 7B: Ultra-Premium Platform Design Sweep — "Nuclear Americana Tech Noir"

> Execute DS1→DS2→DS3→DS4→DS5→DS6 sequentially. Each sprint creates a Vitest static assertion file that becomes a permanent regression gate. Halt and fix if any assertion fails before proceeding to the next sprint.

### Sprint DS1: 60-30-10 Palette Enforcement & Static Assertion Lock
**Jules Prompt**: (1) Create `src/lib/styles/__tests__/paletteEnforcement.test.ts` using Vitest with JSDOM. Write static regex-based assertions that scan every `.svelte` file under `src/` and FAIL the build if any of the following banned patterns are detected: `bg-white`, `bg-black` (raw Tailwind without token), `text-white`, `text-black`, `#ffffff` (literal — must use `#fafafa`), primary hues `#ff0000`/`#00ff00`/`#0000ff`, `bg-blue-*`, `bg-red-*`, `bg-purple-*` (non-palette generics), `rgba(0,255,255` (raw cyan — must be `#14b8a6`), `rgba(0,0,0,1)` (must be `#000000` token). (2) Create `src/lib/styles/design-tokens.css` consolidating ALL palette variables: `--color-void: #000000`, `--color-navy: #0f172a`, `--color-structural: #334155`, `--color-text-primary: #fafafa`, `--color-text-secondary: #d4d4d8`, `--color-cyan: #14b8a6`, `--color-yellow: #daff0a`, `--color-gold: #fbbf24`, `--color-amber: #f59e0b`. (3) Import `design-tokens.css` at the top of `src/app.css`. (4) Run `pnpm test -- src/lib/styles/__tests__/paletteEnforcement.test.ts` — must be 100% green before proceeding to DS2.

### Sprint DS2: Action Gold Single-CTA Enforcement & Viewport Governor
**Jules Prompt**: (1) Create `src/lib/styles/__tests__/ctaGovernor.test.ts`. Write Vitest assertions that scan every `+page.svelte` and `*Arena.svelte` file and assert: exactly ONE element per file can have `tw-bg-[#fbbf24]` or `var(--color-gold)` or `action-gold` class — any file with 2+ instances FAILS. (2) For every failing file: audit which CTA is the primary conversion action, downgrade secondary buttons to `tw-bg-[#334155]` (Structural Grey) ghost variant (`tw-border tw-border-[#fbbf24] tw-text-[#fbbf24] tw-bg-transparent`). (3) Ensure every primary CTA has `id="cta-{persona}-{action}"` (e.g., `cta-coach-create-drill`, `cta-director-import-roster`) for Playwright targeting. Run `pnpm run check` and `pnpm test -- src/lib/styles/__tests__/ctaGovernor.test.ts`.

### Sprint DS3: Liquid Glassmorphism 2.0 & Z-Depth Architecture Sweep
**Jules Prompt**: (1) In `src/app.css`, define the five Z-depth utility classes: `.z0-canvas { background: #000000; }`, `.z1-well { background: #0a0f1a; }`, `.z2-panel { background: rgba(15,23,42,0.85); backdrop-filter: blur(12px) saturate(180%); border: 1px solid rgba(51,65,85,0.6); box-shadow: 0 0 24px rgba(20,184,166,0.08), inset 0 1px 0 rgba(255,255,255,0.04); }`, `.z3-identity { background: rgba(15,23,42,0.95); border: 1px solid #334155; }`, `.z4-nav { background: #000000; border-bottom: 1px solid #334155; }`. (2) Audit every `*Arena.svelte`, `*HUD.svelte`, and panel component — replace ad-hoc `bg-slate-900`, `bg-gray-900`, `bg-neutral-900` with the correct Z-depth class. (3) Fix the overflow-hidden glow-clip bug: search for any parent container that has BOTH `overflow-hidden` AND contains a `.z2-panel` or `.glass-panel` child — remove `overflow-hidden` from the parent and add `border-radius: inherit; overflow: hidden` to the child instead. Run `pnpm run check` to verify 0 errors.

### Sprint DS4: Micro-Animation Physics & "I See You" Protocol
**Jules Prompt**: (1) In `src/app.css`, define animation token library: `--anim-fast: 150ms`, `--anim-std: 250ms`, `--anim-slow: 400ms`, `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`. Add global `.interactive { transition: transform var(--anim-fast) var(--ease-out-expo), box-shadow var(--anim-fast) ease; } .interactive:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(20,184,166,0.2); } .interactive:active { transform: scale(0.98); }` and `.pulse-confirm { animation: pulseConfirm var(--anim-std) var(--ease-spring); } @keyframes pulseConfirm { 0% { box-shadow: 0 0 0 0 rgba(20,184,166,0.6); } 100% { box-shadow: 0 0 0 12px rgba(20,184,166,0); } }`. (2) Apply `.interactive` class to ALL `<button>`, `<a href>`, `role="button"`, and card click handlers across every persona. (3) Trigger `.pulse-confirm` via `$effect` immediately after any verified Firestore `writeBatch` commit in `writes.svelte.ts`, `feeLedger.svelte.ts`, `offlineSync.svelte.ts`. (4) Create `src/lib/styles/__tests__/microAnimations.test.ts` asserting `.interactive` class presence on all CTA buttons. Run `pnpm run check`.

### Sprint DS5: Anti-Squish Math, Asymmetric Bento Grid & 100dvh App-Flow
**Jules Prompt**: (1) Static margin/padding sweep: run `grep -rn "margin: [0-9]\+px\|padding: [0-9]\+px" src/ --include="*.svelte" --include="*.css"` — replace all fixed pixel spacing with `clamp()`: `4px→clamp(2px,0.5vw,4px)`, `8px→clamp(4px,1vw,8px)`, `16px→clamp(8px,2vw,16px)`, `24px→clamp(12px,3vw,24px)`, `32px→clamp(16px,4vw,32px)`, `48px→clamp(24px,5vw,48px)`. (2) Asymmetric Bento Grid: for `CommandCenter.svelte`, `DirectorDashboardArena.svelte`, all Admin/Commissioner dashboards — replace `grid-cols-2`/`grid-cols-3` with `grid-template-columns: repeat(12, 1fr)` and varied `grid-column: span N` (primary: `span 8`, supporting: `span 4`). Symmetrical grids banned on data dashboards. (3) 100dvh App-Flow: for Coach OS, Director OS, Admin OS root layout containers — apply `height: 100dvh; display: grid; grid-template-rows: auto 1fr auto; overflow: hidden`. Inner scrollable areas: `overflow-y: auto; min-height: 0; flex: 1 1 auto`. (4) Create `src/lib/styles/__tests__/layoutPhysics.test.ts` — FAIL if any `margin: \d+px` without `clamp` is found. Run `pnpm run check`.

### Sprint DS6: Void Density & WCAG 2.2 AA Accessibility Compliance Sweep
**Jules Prompt**: (1) Void Density: create `src/lib/styles/__tests__/voidDensity.test.ts` — FAIL if any `*Arena.svelte` or `+page.svelte` uses light background tokens (`bg-white`, `bg-gray-50`, `bg-slate-50`, `bg-neutral-50`). (2) WCAG 2.2 AA contrast: install `color-contrast` package, write tests verifying every palette pair meets ≥4.5:1 ratio: `#fafafa on #0f172a`, `#d4d4d8 on #000000`, `#14b8a6 on #000000`, `#fbbf24 on #000000`, `#daff0a on #000000`. (3) Halation purge: `grep -rn "color: #ffffff\|color: white" src/ --include="*.svelte"` → change all to `#fafafa`. `grep -rn "background.*#ffffff\|background.*white" src/ --include="*.svelte"` → change all to `#0f172a` or `#000000`. (4) Typography: add `font-size-adjust: 0.79` for Switzer on `body` in `app.css`. Apply `font-family: 'Geist Mono'` to all `[data-readout]`, `[data-metric]`, `[data-stat]`, `[data-timestamp]`, `.kpi-value`, `.telemetry-value` selectors. (5) SVG physics lock: scan all `*.svelte` files containing `<svg` — assert `viewBox` present on every SVG, no `tw-text-[Npx]` class inside SVG elements (use native `font-size="N"` attribute). Run `pnpm run check` and `pnpm test -- src/lib/styles/__tests__/`.

---

## Phase 8: Monolithic File Extraction (Anti-Fragility — 500-Line Mandate)

### Sprint M1: Extract FacilityMapVault.svelte (1834 lines)
**Jules Prompt**: Fracture `src/lib/components/field-ops/FacilityMapVault.svelte` into: (1) `FacilityMapVaultEngine.svelte.ts`, (2) `FacilityMapVaultArena.svelte`, (3) `FacilityMapVaultHUD.svelte`. The original file becomes the Shell. Each file must stay under 500 lines. Preserve functionality. Run `pnpm run check` and `pnpm test -- src/lib/components/field-ops/`.

### Sprint M2: Extract SquadTelemetryView (1553 lines) & RecruiterPortal (1529 lines)
**Jules Prompt**: (A) Fracture `src/lib/components/hud/SquadTelemetryView.svelte` into Engine+Arena+HUD. (B) Fracture `src/lib/components/recruiter/RecruiterPortal.svelte` into Engine+Arena+HUD. Each resulting file must be under 500 lines. Run `pnpm run check` after each extraction.

### Sprint M3: Extract FacilityDrawingMap (1498 lines) & MessagesTab (1331 lines)
**Jules Prompt**: (A) Fracture `src/lib/components/field-ops/FacilityDrawingMap.svelte` into Engine+Arena+HUD. (B) Fracture `src/lib/components/coach/MessagesTab.svelte` into Engine+Arena+HUD. Each file under 500 lines. Run `pnpm run check`.

### Sprint M4: Extract tracker/+page.svelte (1283 lines) & TeamsTab.svelte (1264 lines)
**Jules Prompt**: (A) Fracture `src/routes/(app)/tracker/+page.svelte` into Shell+Engine+Arena+HUD. (B) Fracture `src/lib/components/director/TeamsTab.svelte` into Engine+Arena+HUD. Each file under 500 lines. Run `pnpm run check`.

### Sprint M5: Extract CoachDrillsView (1208 lines) & CommandCenter (1077 lines)
**Jules Prompt**: (A) Fracture `src/lib/coach/drills/CoachDrillsView.svelte` into Engine+Arena+HUD. (B) Fracture `src/lib/components/coach/CommandCenter.svelte` into Engine+Arena+HUD. Each file under 500 lines. Run `pnpm run check`.

### Sprint M6: Extract SquadMatrix (1026 lines), ComplianceHub (989 lines) & CoachMatchDayView (970 lines)
**Jules Prompt**: Fracture each into Engine+Arena+HUD following Vanguard Trinity. Each file under 500 lines. Run `pnpm run check`.

### Sprint M7: Extract stats/+page.svelte (933 lines), ClipAnalyzer (862 lines) & OrgInvites (861 lines)
**Jules Prompt**: Fracture each into Shell/Engine+Arena+HUD. Each file under 500 lines. Run `pnpm run check`.

## Phase 9: Production Deployment Readiness

### Sprint D1: Firestore Security Rules Audit
**Jules Prompt**: Audit all 510 lines of `firestore.rules` against actual collection paths used in code (`/tenants/{tenantId}`, `/devices/{deviceId}`, `/clubs/{clubId}`, `/team_assignments/{assignmentId}`, `teams/{teamId}/matches`, `match_sessions`). Verify RBAC claim checks (`request.auth.token.clubId`, `request.auth.token.role`) cover all write paths. Verify PII collections (`users`, `passports`) have TTL-compatible read rules. Add missing rules for any new collections added since last audit.

### Sprint D2: Service Worker Cache Strategy Verification
**Jules Prompt**: Audit `src/service-worker.ts` for: (1) 'Network First' strategy on API/callable endpoints, (2) 'Cache First' on hashed static assets, (3) proper cache invalidation on deploy (file-hash versioning in `vite.config.js`), (4) offline fallback page for disconnected state. Verify `InstallPrompt.svelte` handles update-available lifecycle correctly.

### Sprint D3: End-to-End Smoke Test Suite
**Jules Prompt**: Create `e2e/production-smoke.spec.ts` Playwright suite that: (1) verifies login flow for each persona role, (2) navigates to dashboard for each persona, (3) verifies no white-screen-of-death on any primary route, (4) checks B815 guard prevents unauthorized Firestore access, (5) verifies marketing landing page renders with correct SEO meta tags. Must run in CI via `.github/workflows/ci.yml`.

### Sprint D4: Environment Variable & Secret Audit
**Jules Prompt**: Audit `functions/.env`, `.env.example`, `.env.soccer-skills-tracker`, `.env.sports-skill-tracker-dev` for: (1) no leaked API keys or secrets committed to git, (2) all required env vars documented in `.env.example`, (3) Stripe keys, Resend keys, Google Maps keys, Checkr keys, and Firebase config all present for both dev and prod. Verify `firebase.json` codebase splits reference correct source directories.

## Phase 6: Persona Marketing Engine, Training Triangle & Demo Video Pipeline

### Sprint 6.1: Persona Storytelling & Narrative Blueprint
**Jules Prompt**: Expand `src/lib/components/marketing/landing/landingContent.ts` (or `.js`) with comprehensive narrative objects for all 8 personas. Each persona object must include: `heroTitle`, `heroSubtitle`, `features[]` (3-5 each with `icon`, `title`, `description`), `ctaLabel`, `ctaRoute`, `demoVideoSrc` (placeholder path). Export as `PERSONA_NARRATIVES` array. Run `pnpm run check` to verify 0 errors.

### Sprint 6.3: Playwright Headless Product Demo Video Automation
**Jules Prompt**: Create `scripts/capture-persona-demos.mjs` using Playwright. Script must: (1) launch headless Chromium at 1920x1080 @60fps, (2) authenticate as each persona role using test credentials from `.env.test`, (3) navigate through 3-5 key screens per persona with 2-second dwell times and smooth scroll animations, (4) record to WebM and convert to MP4 via ffmpeg, (5) output files to `static/assets/video/`. Add `"demo:record": "node scripts/capture-persona-demos.mjs"` to `package.json` scripts.

### Sprint 6.4: Public Video Showcase Integration
**Jules Prompt**: Update `src/lib/components/marketing/landing/LandingHero.svelte` and create `StakeholderBento.svelte` persona video modals. Each persona card must: (1) show a play button overlay on hover, (2) open a centered modal with `<video>` element on click, (3) use `poster` attribute for first-frame fallback, (4) implement fast-start MP4 streaming with `preload="metadata"`, (5) auto-pause on modal close. Wire video `src` to `PERSONA_NARRATIVES[].demoVideoSrc`. Run `pnpm run check` to verify 0 errors.
