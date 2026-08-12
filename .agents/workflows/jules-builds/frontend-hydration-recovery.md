---
name: frontend-hydration-recovery
description: Rectifies Svelte 5 infinite navigation loops, forces custom claim refreshes, and enforces strict B815 hydration query checks [595].
---

# Blueprint 3: Client-Side Reactivity and B815 Hydration

This workflow directs Google Jules to repair client-side reactive state desynchronizations, force IndexedDB token flushes to unlock database visibility, and establish defensive hydration guards to avoid infinite quota-burn loops [567, 570, 595].

## 1. Context & Persona Formulation
* **Persona**: Act exclusively as the **Lead Frontend & UX Architect** [40/551, 51/643, 595].
* **Standard**: You must adhere to Svelte 5 single-pass hydration principles and protect the data ingestion pipeline using "B815 Defensive Hydration" query guards [570, 573, 595].

---

## 2. Force Custom Claim Token Refreshes (Data Visibility Fix)
* **The Problem**: Newly assigned role or tenant parameters are written in the database, but client browsers load cached, stale JSON Web Tokens (JWTs) from IndexedDB, resulting in unauthorized permission rejections [567, 568, 596].
* **The Solution**: Force immediate client-side token refreshes after successful role assignment, test directory provisioning, or passkey authentication ceremonies [569, 596].
* **Action**: Locate auth transition lifecycle methods and inject [533, 569, 596]:
  ```typescript
  await auth.currentUser?.getIdToken(true);
  ```
  This immediately flushes the IndexedDB auth cache and pulls down the updated custom claims payload (`clubId`/`role`) [533, 568, 569].

---

## 3. Enforce "B815 Defensive Hydration" Guards
* **The Problem**: Raw database calls triggering during component mounting, before user authentication is resolved, crash Svelte's single-pass SSR hydration and result in infinite Firebase database queries that exhaust server quotas [570, 574, 597].
* **The Solution**: Scan all query hooks within `/admin/organizations`, `/admin/users`, and the Coach Team Ops directories [597].
* **Action**: Guard every `getDocs` transaction or `onSnapshot` listener with early-return assertions [533, 570, 597]:
  ```typescript
  function loadData() {
      // ✅ B815 Defensive Hydration Guard
      if (!db || !authStore.isAuthenticated) return;

      // Safe to query collections
      const ref = collection(db, 'training_sessions');
      // ...
  }
  ```

---

## 4. Wrap Navigation and Mutations inside untrack() Closures
* **The Problem**: Programmatic routing or reactive array mutations (such as `.push()`) inside Svelte 5 `$effect` runes register as active dependencies, triggering infinite self-updating render loops that freeze the browser [40/550, 571, 597].
* **The Solution**: Isolate imperative side effects and navigation from the reactive signal tracking loop [572, 597].
* **Action**:
  1. Wrap all SvelteKit `goto()` calls inside an `untrack()` closure inside `$effect` blocks [533, 572, 597]:
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
  2. Refactor array mutations from legacy `.push()` or `.splice()` to Svelte 5 immutable spreads [533, 572, 597]:
     ```typescript
     // ❌ Forbidden legacy mutable push: roster.push(newPlayer);
     // ✅ Safe Svelte 5 immutable spread
     roster = [...roster, newPlayer];
     ```

---

## 5. Verification & Validation
* Run the Vitest component test suites [598].
* Confirm there are 0 Svelte compiler reactivity warnings or hydration errors in SvelteKit console logs [112, 598].
