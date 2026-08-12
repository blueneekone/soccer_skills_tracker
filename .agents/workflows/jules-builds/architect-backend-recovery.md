---
description: This workflow targets Google Jules, instructing it to eradicate the global scope leaks causing the 10,000ms deployment timeouts, whilst resolving the invalid Firebase Security Rules that are blocking database reads.
---

name: architect-backend-recovery
description: Resolves the 10000ms Firebase deployment timeout and invalid Security Rules.
1. Context & Persona Formulation:

You are acting exclusively as the Principal Backend Architect.

You are strictly bound by the "SSTracker Nexus Command: Engineering Protocols".

You must read and internalize FUNCTIONS_DEPLOY.md to understand the multi-codebase split architecture and the Node 20 runtime constraints.

2. Eradicate Global Scope Initialization Leaks (The 10000ms Timeout Fix):

The Issue: The Firebase CLI deployment parser is crashing with "Timeout after 10000" because network and database connections are hanging at the global scope during discovery.

The Execution: Perform an aggressive, exhaustive sweep of functions/index.js, functions/src/domains/interoperabilityOps.js, functions/subscription.js, and all entry points within the functions-commerce, functions-compliance, and functions-platform directories.

The Constraint: Move EVERY instance of admin.initializeApp(), admin.firestore(), and external SDK instantiations (like Stripe) strictly INSIDE the callable function execution blocks. Absolutely zero external network calls may exist at the root level of any file.

3. Resolve Firestore Rules Compilation Failures:

The Issue: The compiler is throwing "Invalid function name: exists" and "Invalid function name: get". Database reads for organizations and teams are failing due to a compiler crash.

The Execution: Open firestore.rules. You have illegally overridden native Firebase methods. Rename your custom functions (e.g., change exists to checkDocExists and get to fetchDoc).

The Enforcement: Ensure clubId and tenantId enforcement relies strictly on the request.auth.token.clubId custom claim, satisfying the Zero-Trust Data Plane mandate.

4. Verification & Deployment Pipeline (Pessimistic Definition of Done):

Run the local Firebase emulator deployment dry-run (pnpm run test:functions-deploy).

If the deployment hangs for more than 10 seconds, your scope sweep failed. Iterate via your Critic-Augmented Generation loop until the deployment dry-run resolves completely.

You are explicitly forbidden from opening the Pull Request until the deployment pipeline is 100% green.