---
name: frontend-hydration-recovery
description: Rectifies Svelte 5 infinite navigation loops, forces custom claim refreshes, enforces strict B815 hydration query checks, and handles proxy boundaries and blackout lockouts [505, 506, 507].
---

# Blueprint 3: Client-Side Reactivity and B815 Hydration (v2)

This workflow directs Google Jules to repair client-side reactive state desynchronizations, force IndexedDB token flushes to unlock database visibility, and establish defensive hydration guards to avoid infinite quota-burn loops [505, 506, 507]. It also establishes deep proxy boundaries and enforces crucial safety holds [97].

## 1. Context & Persona Formulation
* **Persona**: Act exclusively as the **Lead Frontend & UX Architect** [40/551, 51/643, 595].
* **Standard**: You must adhere to Svelte 5 single-pass hydration principles and protect the data ingestion pipeline using "B815 Defensive Hydration" query guards [505, 507].

---

## 2. Force Custom Claim Token Refreshes (Data Visibility Fix)
* **The Problem**: Newly assigned role or tenant parameters are written in the database, but client browsers load cached, stale JSON Web Tokens (JWTs) from IndexedDB, resulting in unauthorized permission rejections [506].
* **The Solution**: Force immediate client-side token refreshes after successful role assignment, test directory provisioning, or passkey authentication ceremonies [506].
* **Action**: Locate auth transition lifecycle methods and inject [506]:
  ```typescript
  await auth.currentUser?.getIdToken(true);
  ```
  This immediately flushes the IndexedDB auth cache and pulls down the updated custom claims payload (`clubId`/`role`) [506].

---

## 3. Enforce "B815 Defensive Hydration" Guards & COPPA Safeguards
* **The Problem**: Raw database calls triggering during component mounting, before user authentication is resolved, crash Svelte's single-pass SSR hydration and result in infinite Firebase database queries that exhaust server quotas [507].
* **COPPA 2.0 Compliance / Parental Vault Hold**: Under our strict compliance shield, player data collection and metric recording must be **fully paused and masked** within the `users/{email}` document path [97].
* **Action**:
  1. Scan all query hooks within `/admin/organizations`, `/admin/users`, and the Coach Team Ops directories [507]. Guard every `getDocs` transaction or `onSnapshot` listener with early-return assertions [507]:
     ```typescript
     function loadData() {
         // ✅ B815 Defensive Hydration Guard
         if (!db || !authStore.isAuthenticated) return;

         // Safe to query collections
         const ref = collection(db, 'training_sessions');
         // ...
     }
     ```
  2. Enforce the parental consent hold. Check that queries block or return masked data until a validated COPPA 2.0 Verifiable Parental Consent (VPC) token is marked active on the child's profile [97].

---

## 4. Wrap Navigation and Mutations inside untrack() Closures & Derived Decay
* **The Problem**: Programmatic routing or reactive array mutations (such as `.push()`) inside Svelte 5 `$effect` runes register as active dependencies, triggering infinite self-updating render loops that freeze the browser [507].
* **The Solution**: Isolate imperative side effects and navigation from the reactive signal tracking loop [507].
* **Action**:
  1. Wrap all SvelteKit `goto()` calls inside an `untrack()` closure inside `$effect` blocks [507]:
     ```typescript
     import { untrack } from 'svelte';
     import { goto } from '$app/navigation';

     $effect(() => {
         if (sessionStore.isComplete) {
             untrack(() => {
                 goto('/dashboard/analytics');
             });
         }
     });
     ```
  2. Refactor array mutations from legacy `.push()` or `.splice()` to Svelte 5 immutable spreads [507]:
     ```typescript
     // ❌ Forbidden legacy mutable push: roster.push(newPlayer);
     // ✅ Safe Svelte 5 immutable spread
     roster = [...roster, newPlayer];
     ```
  3. **Lazy Evaluation for Metric Decay**: Ensure that the daily 2% metric decay display is calculated lazily using Svelte's `$derived` rune rather than copying state inside `$effect` blocks, completely removing the risk of infinite write-back feedback loops [97, 507].

---

## 5. Svelte 5 Deep Proxy Boundaries (`$state.snapshot`)
* **The Problem**: Svelte 5 state variables utilize raw JavaScript proxies under the hood [543]. When passing these stateful objects directly to third-party data visualization packages (like Chart.js), analytical engines, or browser-native serializers (like `JSON.stringify` or `structuredClone`), the libraries cannot parse the proxies, causing the client runtime to crash [543].
* **Action**: Before any user profile, team data, or metric collection is serialized or handed off to external libraries, cleanly strip the proxy envelope using Svelte 5's dedicated unboxing utility [543]:
  ```typescript
  const plainUserData = $state.snapshot(userStore.current);
  ```

---

## 6. Enforce "The Car Ride Home Protocol" Gate
* **The Problem**: To avoid negative post-match parent-player pressure, the Parent OS requires a strict visual blackout window immediately following game events [97].
* **Action**: 
  1. Hardcode a server-validated **15-minute lockout period** on all match metrics for both parent and player dashboards [97].
  2. The parent and player UIs must hide metric charts and instead render a secure locked card with a dynamic countdown clock [97].
  3. The lockout screen and countdown typography must be styled strictly in **Atompunk Amber (`#f59e0b`)** to serve as a high-visibility compliance notice [654].

---

## 7. Verification & Validation
* Run the Vitest component test suites [598].
* Confirm there are 0 Svelte compiler reactivity warnings or hydration errors in SvelteKit console logs [112, 598].
