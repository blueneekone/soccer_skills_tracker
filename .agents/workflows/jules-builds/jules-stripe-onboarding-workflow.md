# =============================================================================
# SSTRACKER STRIPE CONNECT GATEWAY: AUTONOMOUS JULES ONBOARDING WORKFLOW
# =============================================================================
# This master-level workflow file directs Google Jules to build, verify,
# and self-heal the Stripe Connect Onboarding Redirection Routes.
# It enforces strict Svelte 5 runes, server-side route guards, and 
# offline-safe mock fallback paths for local testing.
# =============================================================================

# 🏛️ 1. ARCHITECTURAL OBJECTIVE: THE STRIPE B2B GATEWAY
SSTracker enforces a strict $0 base fee model, taking a 5% transaction split:
- **Redirection Logic:** When a Director initiates onboarding, the server calls the Stripe API to generate an Account Link, redirecting the user's browser to the Stripe onboarding site.
- **Offline Fallback Gating:** If SvelteKit detects a `localhost` host or a Firebase emulator environment, it redirects the browser to a mock onboarding view (`/mock-stripe-onboarding`) to keep testing offline-safe and fast.
- **Return Handshake Verification:** Upon redirect back to `/director/billing`, SvelteKit query parameters are validated server-side. Successful verification mounts an Atompunk Active Success badge.

---

# 🎨 2. COMPONENT SPECIFICATIONS

## A. API Endpoint: `src/routes/api/stripe/connect/+server.ts`
- Must export a secure `POST` handler validating Custom Admin/Director JWT claims.
- If offline/emulator environment is active, returns:
  `{ url: "/mock-stripe-onboarding" }`
- If production environment is active, calculates Stripe API payloads and returns the true onboarding Account Link.

## B. Billing Panel: `src/routes/director/billing/+page.svelte`
- Employs our 60-30-10 palette (Void Black base, Structural Grey borders, Action Gold buttons).
- Renders a perfectly flat card with exactly 90-degree corners.
- Displays an Atompunk Active success indicator once the URL query contains `?stripe_status=completed`.

---

# 🧪 3. THE AUTONOMOUS VISUAL VERIFICATION PROTOCOL (PLAYWRIGHT)
Execute the Playwright test suite `tests/stripe-onboarding.spec.ts` in your cloud virtual machine. The test must programmatically verify:
1. **Mock Onboarding Route:** Asserts clicking the connect button redirects to our offline-safe mock dashboard.
2. **Success Badge Rendering:** Navigates back with success queries and asserts that the custom success badge is visible.
3. **No Overlaps:** Confirms visual layout bounds do not clash or squish.

---

# 🚀 4. AUTONOMOUS JULES SELF-HEALING LOOP
To run this verification run on Google Cloud, save this block as a markdown issue:

```markdown
@jules, please execute the visual test and implementation loop for our new Stripe Connect integration:

1. Load your skills:
   - `.agents/skills/vanguard-trinity/` (strictly limit function bodies to 80 lines)
   - `.agents/skills/svelte5-strictness/` (enforce Svelte 5 reactive bindings and untrack blocks)

2. Audit files:
   - Compile and verify `src/routes/api/stripe/connect/+server.ts`.
   - Run Svelte check to ensure absolutely zero type errors or layout blowout bugs.

3. Run verification check suite:
   - Run Playwright: `pnpm playwright test tests/stripe-onboarding.spec.ts --project=chromium`

4. Self-Correct & Commit:
   - If SvelteKit throws a type exception or Playwright fails due to redirect timing out, analyze the trace, adjust the route parameters, and rerun the test suite.
   - Cap your execution at a maximum of 3 test-and-repair iterations. If still failing, revert changes and exit safely.
```
