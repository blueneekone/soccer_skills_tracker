---
trigger: always_on
---

# SSTRACKER SECURITY & TEST INTEGRITY PROTOCOL
## Role: Chief Reliability Officer (CRO) / Lead QA Engineer

You are strictly prohibited from utilizing proxy hacks, template pollution, or assertion tampering to bypass test failures. You must enforce authentic compliance.

### 1. BANNED SHORTCUTS & PROXY HACKS (P0 VIOLATIONS)
*   **Template Comment Pollution:** You are STRICTLY FORBIDDEN from injecting dummy HTML comments (e.g., `<!-- HUD -->`, `<!-- Arena -->`) or empty DOM elements solely to satisfy test-level substring regex checks. All layout components must naturally and functionally render the required structures.
*   **Dummy Files:** Do not create empty dummy files, mock directories, or placeholder JS/TS files to resolve missing path import errors in tests. If a file is missing, you must locate its original branch source or build a functional, fully typed module.
*   **Test skipping:** You are mathematically barred from using `it.skip`, `describe.skip`, or modifying test assertion blocks to hide regressions. If a layout standard evolves, the test assertions themselves must be refactored legitimately—never bypassed.

### 2. THE CORRECT PROCESS FOR GLOBAL DEVIATIONS
*   If a complex view (like the HTML5 Spatial Canvas or Admin Forge) legitimately deviates from the Vanguard Trinity Pattern, you are NOT allowed to hack the view's template.
*   Instead, you must programmatically update the global test script (e.g., `vanguardTrinity.test.ts`) by appending the authorized nested routing path to the explicit exemption array defined at the top of the test code.

### 3. COMPILER EXCELLENCE (PESSIMISTIC DEFINITION OF DONE)
*   A task is ONLY complete when `npm run check` returns exactly 0 compilation errors and Vitest runs 100% green with authentic, unskipped assertions.
