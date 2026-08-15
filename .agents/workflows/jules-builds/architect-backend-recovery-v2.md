---
name: architect-backend-recovery
description: Resolves the 10,000ms Firebase deployment timeouts, Firestore rules compilation crashes, and aligns systemic writer/reader data-plane mismatches [96, 501, 502, 503].
---

# Blueprint 1: Architectural Recovery of Backend Timeouts and Firebase Rules (v2)

This workflow targets Google Jules, directing it to eradicate the global scope resource leaks causing the 10,000ms Cloud Function deployment timeouts [502, 563, 588], repair the broken `firestore.rules` compilation errors that block tenant requests [503, 589], and resolve the systemic writer/reader field desynchronizations paralyzing our data views [96].

## 1. Context & Persona Formulation
* **Persona**: Act exclusively as the **Chief Software Architect (CSA) / Principal Backend Architect** [40/535, 51/643, 591].
* **Governance**: You are strictly bound by the governance rules specified in `AGENTS.md` and "SSTracker Nexus Command: Engineering Protocols" [588].
* **Reference**: Read `FUNCTIONS_DEPLOY.md` to understand the isolated multi-codebase deployment directory structure and Node 20 runtime constraints [562, 588].

---

## 2. Eradicate Global Scope Connection Leaks & Enforce Modular Limits
* **The Problem**: During the Firebase CLI discovery phase, active network sockets established in the global file scope cause compilation hangs, triggering the fatal `Timeout after 10000` error [502, 563, 588].
* **The 80-Line Logic Limit**: No serverless function handler body in the entire project may exceed **80 lines** [97]. Any complex parsing, validation, or aggregation must be refactored into modular utility files located under `functions/src/utils/` to maintain low memory pressure and eliminate cold-start lag [97].
* **Action**: Perform an aggressive, recursive sweep of `functions/index.js`, `functions/src/domains/interoperabilityOps.js`, `functions/subscription.js`, and all entry point index files within the `functions-commerce`, `functions-compliance`, and `functions-platform` split directories [502]. Move every instance of the following strictly *inside* the execution blocks of individual callable functions or behind localized lazy-loading helper wrappers [502, 588]:
  * `admin.initializeApp()`
  * `admin.firestore()`
  * `require('stripe')(...)` or `new Stripe(...)`

---

## 3. Resolve Firestore Security Rules Compilation Crashes & Harden Cross-Tenant Boundaries
* **The Problem**: Overriding native query methods inside `firestore.rules` triggers a parsing syntax exception, which completely disables database reads for organizations, teams, and rosters [503, 589]. Additionally, team assignment rules lack explicit tenant and team ID guards, risking severe cross-tenant data leaks at launch [96].
* **The Solution**: Open `firestore.rules` in the root directory [503, 589].
* **Action**: 
  1. Rename the custom `exists` declaration to `checkDocExists` [503, 589].
  2. Rename the custom `get` declaration to `fetchDoc` [503, 589].
  3. Enforce strict, multi-tenant boundaries on `/clubs/{clubId}` and `/team_assignments/{assignmentId}` paths [503]:
     ```javascript
     allow read, write: if request.auth != null && request.auth.token.clubId == clubId;
     ```
  4. Harden the security rules governing the `team_assignments` collection [96]. Do not simply verify if a user has a general `player` role; explicitly require that their custom token claims match the resource data tenant and team identifiers [96]:
     ```javascript
     allow read, write: if request.auth != null && request.auth.token.role == 'player' && request.auth.token.clubId == resource.data.clubId && request.auth.token.teamId == resource.data.teamId;
     ```

---

## 4. Resolve Systemic Writer/Reader Field Mismatches
* **The Problem**: Gaps exist where backend functions write data under one key or collection, but frontend components and subscribers expect another, causing silent visualization blocks [96].
* **Action**:
  1. **Coach Scheduling and Player Routing**: Resolve the conflict where the backend writes schedule data to `team_workouts` using the `startTimestamp` field, but the player dashboard attempts to read from `schedules` expecting `startAt` [96]. Align both client and server to read and write strictly to the canonical `schedules` collection utilizing a standardized `startTimestamp` (Unix epoch milliseconds) [96].
  2. **Billing and Subscription Gates**: Standardize the billing gates [96]. The platform's layout gates must evaluate `subscriptionStatus` (camelCase) on the `organizations` collection, and the commerce engine must write the matching status as `subscriptionStatus` rather than legacy snake_case `subscription_status` on `license_entitlements` [96].
  3. **Push Notifications Token Alignment**: Standardize device registration [96]. The client registers push tokens under a `users.fcmTokens` array, but the backend dispatchers are searching for a flat `device_tokens` field [96]. Force the backend queries to traverse the canonical `fcmTokens` array, and inject the missing notification dispatch triggers into core workout creation endpoints [96].
  4. **Recruiter Search Engine Gate**: Secure the recruiter search system [97]. Force the query handlers in `functions-platform` to return empty search results unless the recruiter's account document in `users/{email}` has its `checkr_status` field explicitly set to `'clear'` [97].

---

## 5. Developer Cost Control & Targeted Deployments
* **Action**: Ensure `process.env.SCHEDULERS_ENABLED` is configured to bypass high-frequency Cloud Scheduler jobs in development environments [565, 588].
* **Targeted Push**: Deploy the specific modified functions individually rather than running global deployments to protect build quotas [566]:
  ```bash
  firebase deploy --only functions:core:logTrainingSession
  ```

---

## 6. Verification & Definition of Done
* Run `pnpm run test:functions-deploy` to perform a dry-run compile of all split packages [113, 590].
* Verify that the deployment discovery completes under 10 seconds [590].
* The task is strictly incomplete until Svelte has 0 compiler warnings, TypeScript has 0 `any` types, and Unit Tests are 100% green [112, 590].
