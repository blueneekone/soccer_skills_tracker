---
name: sprint-1.2-security-license-guards
description: Sprint 1.2 guard extraction for WebAuthn passkeys, cross-tab impersonation, and club license boundaries to de-monolith +layout.svelte under strict 80-line limits.
---

# 🛡️ Sprint 1.2: Security & License Boundary Guard Extraction
## Orchestrator: Antigravity | Assigned Worker: Google Jules (@jules)

### Goal
De-monolith `src/routes/(app)/+layout.svelte` by extracting three isolated, single-responsibility security/licensing sub-guards into `src/lib/components/shell/guards/`.

---

### 🏛️ Strict Architectural Constraints (Non-Negotiable)
1. **The Two-File / Micro-Sprint Law**: Modify ONLY:
   - `src/lib/components/shell/guards/PasskeyGateGuard.svelte` [NEW]
   - `src/lib/components/shell/guards/ImpersonationGuard.svelte` [NEW]
   - `src/lib/components/shell/guards/LicenseSyncGuard.svelte` [NEW]
   - `src/routes/(app)/+layout.svelte` [MODIFY]
2. **80-Line Function Limit**: No function body, script block, or handler may exceed 80 lines.
3. **B815 Defensive Hydration**: Every Firestore query or listener must begin with:
   ```typescript
   if (!db || !authStore.isAuthenticated) return;
   ```
4. **Svelte 5 Untrack Mandate**: Programmatic navigation (`goto`) or state mutations inside `$effect` runes must be wrapped in an `untrack(() => { ... })` closure.
5. **Zero Skipped Tests & Zero Any**: Never add `it.skip` or `any`.

---

### 📦 Exact Implementation Specifications

#### 1. `PasskeyGateGuard.svelte` [NEW]
- Location: `src/lib/components/shell/guards/PasskeyGateGuard.svelte`
- Responsibility:
  - Encapsulate the passkey enrollment gate check currently inside `+layout.svelte`.
  - Use `authStore` and `requiresPasskeyEnrollmentBeforeApp`.
  - Wrap any `goto(PASSKEY_ENROLL_ROUTE)` inside `untrack()`.
  - Render `<slot />` or `{@render children?.()}` when passkey check is satisfied.

#### 2. `ImpersonationGuard.svelte` [NEW]
- Location: `src/lib/components/shell/guards/ImpersonationGuard.svelte`
- Responsibility:
  - Encapsulate `impersonationStore` state monitoring.
  - Render `<ImpersonationBanner />` conditionally when impersonation is active.
  - Render `{@render children?.()}`.

#### 3. `LicenseSyncGuard.svelte` [NEW]
- Location: `src/lib/components/shell/guards/LicenseSyncGuard.svelte`
- Responsibility:
  - Encapsulate `licenseEntitlementStore` synchronization for the current club.
  - Guard database fetches with B815 check: `if (!db || !authStore.isAuthenticated) return;`.
  - Conditionally render `<LockoutInterstitial />` or `<DunningBanner />` if license state demands.
  - Render `{@render children?.()}`.

#### 4. `+layout.svelte` [MODIFY]
- Replace inline passkey, impersonation banner, and license sync logic with the new guards:
  ```svelte
  <MaintenanceModeGuard>
    <AuthRouteGuard>
      <PasskeyGateGuard>
        <ImpersonationGuard>
          <LicenseSyncGuard>
            <!-- Shell and views -->
          </LicenseSyncGuard>
        </ImpersonationGuard>
      </PasskeyGateGuard>
    </AuthRouteGuard>
  </MaintenanceModeGuard>
  ```

---

### 🧪 Verification & Acceptance Gate
Before opening your Pull Request:
```bash
pnpm run check
npm run test:regression:auth
```
- `svelte-check` must return **0 errors**.
- `npm run test:regression:auth` must return **100% green**.

Open a Pull Request targeting branch `dev`.
