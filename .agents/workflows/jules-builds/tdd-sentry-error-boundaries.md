---
name: sentry-client-error-boundaries
description: Secure the platform client-side with Sentry error boundaries to log unhandled DOMExceptions and proxy serialization failures.
---

# ⚙️ SSTracker Sentry Client-Side Error Boundary Integration

@jules, act as our joint Chief Security Officer (CSO) and Lead Frontend & UX Architect. Your objective is to design, implement, and verify real-time client-side Sentry error boundaries and global exception handlers to intercept and log unhandled DOMExceptions, gRPC auth timeouts, and Svelte 5 state serialization errors in production.

### 🛡️ Critical Operational Constraints (Non-Negotiable)

1. **80-Line Function Limit**: No error boundary lifecycle hook, custom hook, or capture utility may exceed 80 lines. Extract custom formatting tags or meta-payload compilation into separate helper files under `src/lib/utils/sentryHelpers.ts`.
2. **PII Data Minimization**: You are strictly forbidden from passing raw user profiles, unencrypted minor names, or exact parent coordinates inside Sentry breadcrumbs or error contexts (SafeSport/GDPR Compliance). Sanitize all metadata before transmission.
3. **Pessimistic Definition of Done**: The build must compile with exactly 0 Svelte compiler warnings and 0 TypeScript "any" type violations. All tests must pass with 100% green status; skipped assertions are strictly banned.

### 🛠️ Execution Sequence & Targets

- **Task 1: Global Client-Side Hook (`hooks.client.ts`)**
  * Target: `src/hooks.client.ts`
  * Action: Initialize the Sentry client SDK inside the runtime initialization scope. Configure Sentry to capture unhandled promise rejections and global browser `onerror` events.
  * Integration: Integrate a custom `beforeSend` callback to detect and flag any `SecurityError` DOMExceptions (such as WebAuthn relying party ID mismatches) or `TypeError` crashes relating to Svelte 5 proxy serialization.

- **Task 2: Svelte 5 Custom Error Boundary Component**
  * Target: `src/lib/components/errors/SentryErrorBoundary.svelte`
  * Action: Rebuild our global layout error wrapper using a clean, Svelte 5-native component structure.
  * Resiliency Pattern: Use the SvelteKit `handleError` Sentry wrapper to cleanly report unexpected load errors while rendering a friendly "Nuclear Americana" style fallback HUD page in Atompunk Amber (#f59e0b) to prevent visual layout shifts.

- **Task 3: Client-Side Metadata Sanitization Helper**
  * Target: `src/lib/utils/sentryHelpers.ts`
  * Action: Implement `sanitizeSentryEvent(event)` to recursively scan and scrub any PII keys (`email`, `phone`, `birthdate`, `address`, `passport`) from the Sentry context, ensuring strict compliance with COPPA 2.0 and SafeSport regulations.

### 🚦 Test & Handover

1. Write a Vitest integration test inside `src/lib/utils/__tests__/sentryHelpers.test.ts` proving that `sanitizeSentryEvent` strips PII but preserves system-level debug tags (like the failing component name and browser dimensions).
2. Run `pnpm run check && pnpm run build` to verify Svelte 5 compilation and type checks.
3. Commit with message: `feat(security): implement sentry error boundary and PII sanitization filters` and push to 'dev'.
