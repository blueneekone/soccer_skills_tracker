---
description: Automates the creation of a Svelte 5 Vanguard Trinity component suite, enforcing the 12-column asymmetric Bento Grid, strict runes, and Test-Driven Development.
---

### STAGE 1: Architectural Planning & Test Scaffold
**Context:** We are scaffolding a new feature route using the Vanguard Trinity Pattern.
**Persona:** `[AGENT 1: Principal Svelte Architect]`
**Action:**
1. Prompt the user in the terminal for the target route or component namespace (e.g., `CoachDashboard`).
2. Scan the target directory. You MUST write a failing Vitest headless rendering test file (`[Name].test.ts`) that explicitly asserts the existence of our 12-column Bento Grid classes and the 4-part Vanguard component structure [cite: 696].

### STAGE 2: Core Logic & Routing Shell
**Persona:** `[AGENT 2: Enterprise Systems Engineer]`
**Action:**
1. **The Brain (`[Name]Engine.svelte.ts`):** Generate the reactive state machine. You must exclusively use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`) [cite: 671]. Ensure absolute client-side immutability using spread operators [cite: 696]. No HTML/JSX is allowed in this file. Function bodies are mathematically restricted to a maximum of 80 lines [cite: 819].
2. **The Shell (`+page.svelte`):** Generate the route-level mounting topology [cite: 816, 823]. Implement a 12-column asymmetric Bento Grid wrapper. You must exclusively use fluid `clamp()` functions for padding and margins to eliminate mobile squishing [cite: 170, 696]. Enforce the Void Contract (minimum 40% negative space using deep slate/navy backgrounds) [cite: 696]. Do not include any direct Firestore reads here [cite: 816, 823].

### STAGE 3: Presentation & Telemetry
**Persona:** `[AGENT 1: Staff UI/UX Architect]`
**Action:**
1. **The Glass (`[Name]Arena.svelte`):** Generate the high-performance presentation layer [cite: 816, 823]. It must accept data from the Brain via Svelte 5 `$props()` and call the Brain's methods. Private reactive state is explicitly forbidden in this file [cite: 816, 823].
2. **The HUD (`[Name]HUD.svelte`):** Generate the Tailwind-styled overlay chrome [cite: 816, 823]. You MUST apply the `tw-pointer-events-none` utility on the root container so it does not block clicks [cite: 816, 823]. Strictly enforce the `Geist Mono` typeface for data labels and `Switzer` for body copy [cite: 696]. Ensure all CSS hover transitions are hardcoded to a smooth 150-250ms duration to prevent erratic neurodivergent sensory overload [cite: 696].

### STAGE 4: The Pessimistic Verification Loop
**Persona:** `[AGENT 2: Principal DevSecOps Engineer]`
**Action:**
1. Automatically run `npm run check` and `npx eslint` in the terminal [cite: 696].
2. Execute the Vitest suite via JSDOM/Happy DOM against the newly created test blocks [cite: 696].
3. Pessimistic Execution: If there are ANY Svelte 5 compilation errors, TypeScript `any` violations, or test failures, you must revert the change, slice the logic smaller, and self-heal [cite: 696].
4. ONLY after mathematically proving the code is stable with 0 errors may you atomically commit the generated files to Git [cite: 696].