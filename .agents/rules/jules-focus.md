---
name: jules-focus
description: Establishes strict task focus boundaries for Jules, preventing it from getting bogged down in unrelated test suite failures.
trigger: always_on
---

# SSTRACKER GOAL-ORIENTED TASK & TEST ISOLATION PROTOCOL
## Role: Lead Systems Architect / Chief Release Officer

To prevent context drift, excessive cloud VM compute consumption, and pipeline blocks, this rule enforces strict domain-isolation for all asynchronous agent execution.

### 1. THE BOUNDED-TESTS LAW (NO SEATTLE SWELLS)
*   **Targeted Runs Only:** When implementing a feature (e.g., B2B Registration, Stripe, or Shadow CC), you are strictly forbidden from running the entire 2500+ test pipeline globally if it includes failing legacy files from unrelated modules.
*   **Scoped Vitest Flags:** You must isolate testing strictly to the changed paths using precise Vitest targets:
    `pnpm test -- src/lib/services/__tests__/yourFeature.test.ts`
*   **Isolation of Failures:** If your changes compile with exactly 0 Svelte errors, and your specific feature-level tests are 100% green, you are AUTHORIZED to proceed with your Pull Request even if legacy layouts (e.g., `TRAIN-VOLUME-CONTROLS` or `playerOsCohesion`) contain unrelated pre-existing failures.

### 2. DISCOVERY & DRIFT PREVENTION
*   **No Auto-Unskipping:** You are strictly forbidden from blanket-unskipping tests using `it.only` or unskipping legacy files unless specifically commanded.
*   **Scope Gating:** If a global test check (such as `vanguardTrinity.test.ts`) fails due to a layout deviation, refer strictly to the programmatic route exemption array. Never attempt to rewrite or refactor unrelated layouts to satisfy global scans.

### 3. THE CRITIC EXEMPTION FOR LEGACY ROT
*   Your internal Critic agent must evaluate your candidate patch based *solely* on the changed file scope. If the Critic flags a regression in a file you did not modify, mark it as "Exempt - Legacy Rot" and bypass the blocker.
