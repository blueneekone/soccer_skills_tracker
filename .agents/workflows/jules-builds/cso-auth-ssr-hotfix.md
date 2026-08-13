# 🛡️ CSO & CSA Hotfix: Google Sign-In & SSR Onboarding Remediation Workflow

This blueprint directs Google Jules to autonomously audit, refactor, and verify the client-server identity boundaries of the SSTracker platform to resolve login blocks, permissions omissions, and SvelteKit SSR desynchronizations.

---

## 1. Context & Persona Formulation
*   **Persona**: You are acting as a joint task force consisting of the **Chief Security Officer (CSO)** and the **Chief Software Architect (CSA)**.
*   **Operational Directives**: Adhere to the strict **Pessimistic Definition of Done**: 0 Svelte compiler errors, 0 TypeScript 'any' violations, and 100% green unit tests.

---

## 2. Technical Diagnostic Mandates

### Phase A: Google Sign-In Path Sanitation (CSO / CSA)
*   **The Issue**: Google Sign-In is keying user profiles by `users/{uid}` in the client auth state store/router. However, the secure backend services, specifically `syncUserClaims`, require user documents to be located strictly at `users/{email}`. Because of this path desynchronization, `syncUserClaims` never fires, leaving logged-in accounts with zero custom claims.
*   **Execution**:
    *   Scan all client authentication hooks, login routing files, and Svelte stores (`src/lib/auth/loginRouting.js`, `src/lib/auth/postAuthRouting.ts`, `src/lib/stores/auth.ts`).
    *   Find the user document creation or updates where the path matches `doc(db, 'users', user.uid)`.
    *   Surgically refactor this to index strictly by the email string: `doc(db, 'users', user.email.toLowerCase())`.
    *   Ensure any fields writing user metadata include both `uid` and lowercase `email` keys cleanly.

### Phase B: Enforcing Server-Side Coach Onboarding (CSO)
*   **The Issue**: The coach onboarding views allow the client application to directly write `role: 'coach'` to the user's Firestore document. This bypasses the secure server-side `claimCoachInvite` Cloud Function, meaning the cryptographically signed JWT in IndexedDB is never populated with the required `clubId` and `role` claims, triggering permissions denials on all dashboards.
*   **Execution**:
    *   Scan Svelte routes and views (e.g., `src/routes/onboarding/coach/+page.svelte`, `src/lib/components/admin/UserSidecar.svelte`).
    *   Locate any raw client-side updates setting `role` fields via `updateDoc`.
    *   Eradicate these client-side writes and replace them strictly with an asynchronous call to the secure backend Cloud Function: `httpsCallable(functions, 'claimCoachInvite')`.
    *   Immediately following a successful invitation claim, inject a programmatic token refresh check: `await auth.currentUser?.getIdToken(true)` to force the client SDK to discard the stale IndexedDB JWT and fetch updated custom claims.

### Phase C: SvelteKit SSR Session Cookie Sync (Lead Frontend Architect / CSA)
*   **The Issue**: When SvelteKit pre-renders layout routes, the server cannot read the browser's client-side IndexedDB session credentials, rendering a blank interface or throwing Firestore permissions errors.
*   **Execution**:
    *   Locate the global Firebase authentication state listener (e.g., `src/lib/stores/auth.ts`, `src/lib/firebase/client.ts`).
    *   Inside the `onIdTokenChanged` observer block, ensure that when the token resolves, it is serialized directly to a secure HTTP cookie named `"token"`:
        ```typescript
        const token = newUser ? await newUser.getIdToken() : undefined;
        document.cookie = `token=${token || ''}; path=/; max-age=${token ? 3600 : 0}; SameSite=Strict; Secure`;
        ```
    *   If a token was successfully assigned but was previously empty, trigger a clean reload: `window.location.reload();` to allow the SvelteKit layout servers to immediately hydrate the view with verified user parameters.

---

## 3. Verification & CI/CD Pipeline
*   Execute Svelte compiler checks (`pnpm run check`) and unit test suites (`pnpm test`).
*   Verify that no files contain unhandled exceptions when executing in browser-less contexts.
*   Once fully validated and all tests are 100% green, commit the changes on your working branch and open the Pull Request.
