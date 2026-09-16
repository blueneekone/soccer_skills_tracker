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
