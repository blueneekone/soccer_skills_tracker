---
name: architect-backend-recovery
description: Resolves the 10,000ms Firebase deployment timeout and invalid Security Rules compilation crashes [587].
---

# Blueprint 1: Architectural Recovery of Backend Timeouts and Firebase Rules

This workflow targets Google Jules, directing it to eradicate the global scope resource leaks causing the 10,000ms Cloud Function deployment timeouts [563, 588], while repairing the broken `firestore.rules` compilation errors that are blocking tenant read/write requests [589].

## 1. Context & Persona Formulation
* **Persona**: Act exclusively as the **Chief Software Architect (CSA) / Principal Backend Architect** [40/535, 51/643, 591].
* **Governance**: You are strictly bound by the governance rules specified in `AGENTS.md` and "SSTracker Nexus Command: Engineering Protocols" [588].
* **Reference**: Read `FUNCTIONS_DEPLOY.md` to understand the isolated multi-codebase deployment directory structure and Node 20 runtime constraints [562, 588].

---

## 2. Eradicate Global Scope Connection Leaks (The 10,000ms Timeout Fix)
* **The Problem**: During the Firebase CLI discovery phase, active network sockets established in the global file scope cause compilation hangs, triggering the fatal `Timeout after 10000` error [563, 588].
* **The Solution**: Perform an exhaustive, recursive sweep of `functions/index.js`, `functions/src/domains/interoperabilityOps.js`, `functions/subscription.js`, and all entry points within the `functions-commerce`, `functions-compliance`, and `functions-platform` split directories [588].
* **Action**: Move all instances of:
  * `admin.initializeApp()`
  * `admin.firestore()`
  * `require('stripe')(...)` or `new Stripe(...)`
  strictly *inside* the execution blocks of individual HTTPS callable functions or behind localized lazy-loading helper wrappers [533, 588]. Global-level imports are allowed; global instantiation/execution is strictly forbidden [563, 588].

---

## 3. Resolve Firestore Security Rules Compilation Crashes
* **The Problem**: Overriding native query methods inside `firestore.rules` triggers a parsing syntax exception, which completely disables database reads for organizations, teams, and rosters [589].
* **The Solution**: Open `firestore.rules` in the root directory [589].
* **Action**: 
  1. Rename the custom `exists` declaration to `checkDocExists` [533, 589].
  2. Rename the custom `get` declaration to `fetchDoc` [533, 589].
  3. Enforce the Zero-Trust multi-tenancy claim logic on the `/clubs/{clubId}` and `/team_assignments/{assignmentId}` paths [533, 566]:
     `allow read, write: if request.auth != null && request.auth.token.clubId == clubId;` [533]

---

## 4. Developer Cost Control & Targeted Deployments
* **Action**: Ensure `process.env.SCHEDULERS_ENABLED` is configured to bypass high-frequency Cloud Scheduler jobs in development environments [565, 588].
* **Targeted Push**: Deploy the specific modified functions individually rather than running global deployments [566]:
  ```bash
  firebase deploy --only functions:core:logTrainingSession
  ```

---

## 5. Verification & Definition of Done
* Run `pnpm run test:functions-deploy` to perform a dry-run compile of all split packages [113, 590].
* Verify that the deployment discovery completes under 10 seconds [590].
* The task is strictly incomplete until Svelte has 0 compiler warnings, TypeScript has 0 `any` types, and Unit Tests are 100% green [112, 590].
