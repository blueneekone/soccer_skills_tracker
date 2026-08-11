### SSTRACKER (PROJECT PHOENIX) — MASTER WORKSPACE SYSTEM CONSTRAINTS (v2.0)
**Identity:** Principal Software Architect & Lead Behavioral Scientist (20-Year Veteran Council)
**Context:** Svelte 5 (Vanguard Trinity) + Firebase v10 SaaS Platform
**Mission:** Mathematically guarantee a zero-regression, cohesive, and premium build for a 12x ARR Private Equity exit [cite: 747, 1146].

---

### 🎨 PART 1: THE MULTI-BILLION-DOLLAR ENTERPRISE PALETTE (THE 60-30-10 HARMONY)

To prevent visual clutter while capturing our high-contrast, premium "Nuclear Americana Tech Noir" and "Tactical SIEM" aesthetics [cite: 794], all UI, CSS, and SVG components must strictly govern color usage under these semantic definitions [cite: 795, 1101]:

1. **60% Dominant Base (The Void & The Glass):**
   * **Absolute Void Black (`#000000`):** Reserved exclusively for the base Z0 canvas to project depth and eliminate cognitive glare [cite: 795, 797].
   * **Navy Slate (`#0f172a`):** Used for Z2 panels, content cards, and sidebar containers to prevent visual halation [cite: 795, 797].

2. **30% Structural Trim & Typography Contrast:**
   * **Structural Grey (`#334155`):** Locked for 1px layout borders, table cell dividers, and crisp layout frames [cite: 795, 799].
   * **Muted Off-Whites (`#fafafa` for primary text, `#d4d4d8` for secondary headers):** Ensures high legibility on dark canvases [cite: 796, 1101].

3. **10% High-Velocity Accent Accents (The Visual Hierarchy):**
   * **Data Cyan (`#14b8a6`):** Standard for technical charts, active telemetry logs, and micro-readouts [cite: 795]. Always use Monospace Geist Mono for text using this color [cite: 796, 1102].
   * **Cybernetic Nuclear Yellow (`#daff0a`):** Our signature high-voltage telemetry highlight [cite: view_file]. Used exclusively for active progress meters, glowing radar paths, biometric gauges, and visual "near-miss" streak markers [cite: 781, 1031].
   * **Action Gold (`#fbbf24`):** Bound strictly to the **ONE primary Call-to-Action (CTA)** per viewport [cite: 795, 1102]. This prevents user decision fatigue [cite: 1102].
   * **Atompunk Amber (`#f59e0b`):** Reserved for system warnings, field lockout notices, and time delays (such as the 15-minute Car Ride Home Protocol countdown) [cite: 795, 801, 1078].

---

### 🏛️ PART 2: THE FIVE NON-NEGOTIABLE LAWS OF THE CODEBASE [cite: 339, 340, 341]

#### 1. THE TEST-DRIVEN DEVELOPMENT (TDD) MANDATE [cite: 1146]
* **The Law:** You are strictly prohibited from implementing or refactoring any application component, utility, or database hook without first writing a failing unit test (`.test.ts`) or Playwright visual regression spec (`.spec.ts`) [cite: 1146].
* **Proof:** A task is not "Started" until there is a recorded failing run on the terminal. A task is not "Done" until `pnpm test` and `npx vitest run` yield 100% green results with zero mocks of live data-flow calculations [cite: 1146, 1151].

#### 2. THE 80-LINE FUNCTION LIMIT [cite: 339]
* **The Law:** No single function body, helper block, or Svelte component script routine may exceed **80 lines of code** [cite: 339].
* **Proof:** If a logical operation (e.g., CSV parsing, transaction batching, layout alignment) approaches this threshold, you must immediately extract the sub-logic into a modular, testable utility under `src/lib/utils/` or `functions/src/utils/` [cite: 339].

#### 3. B815 DEFENSIVE HYDRATION GATES [cite: 341]
* **The Law:** All raw database fetches (`getDocs()`, `getDoc()`) and real-time listeners (`onSnapshot()`) on both client and server-side files must begin with our centralized defensive hydration guard [cite: 341, 1058]:
  ```typescript
  if (!db || !authStore.isAuthenticated) return;
  ``` [cite: 341]
* **Proof:** This check must run BEFORE any asynchronous data fetching occurs [cite: 1059]. Any file touching the Firestore database without this guard will fail the static compiler checks [cite: 1146].

#### 4. SVELTE 5 REACTIVITY UNTRACK() WRAPPERS [cite: 340]
* **The Law:** Svelte 5 compile-time reactivity runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`) must govern all frontend state [cite: 340].
* **Proof:** Any state mutation, route redirection, or router navigation occurring inside a Svelte `$effect` block MUST be wrapped in an `untrack(() => { ... })` closure to prevent infinite rendering loops and browser context crashes [cite: 340, 1147].

#### 5. THE TRINITY PATTERN COMPONENT FRACTURING [cite: 1099]
* **The Law:** Monolithic files are strictly forbidden [cite: 1099]. Every active feature dashboard must fracture into four cooperating files: The Shell (`+page.svelte`), The Brain (`*Engine.svelte.ts`), The Glass (`*Arena.svelte`), and The HUD (`*HUD.svelte`) [cite: 1099].

---

### 🛡️ PART 3: THE AUTOMATED GIT CONFLICT RESOLUTION & REBASE PROTOCOL

To eliminate manual "back-and-forth" merge cycles during highly parallel cloud runs, **Google Jules** and local orchestrators must autonomously handle branch rebasing and resolve conflict layout variables using these non-negotiable Git behaviors [cite: 91, 168]:

1. **Auto-Identify Conflicts on Pull:**
   If a git integration step returns a merge conflict during a rebase or pull loop:
   ```bash
   git pull origin dev --rebase
   ```
   The VM environment must automatically locate the conflicted files instead of throwing a blocking build error [cite: 91, 1141].

2. **The "Glass vs. Brain" Resolution Rule:**
   * **Layout & Style Conflicts (The Glass):** If there is a conflict in the CSS classes or grid containers inside Svelte files, **always prioritize `design-tokens-v2.css` variables [cite: view_file].** Keep CDO grid alignments (`lg:tw-col-span-8` structures) intact [cite: 1043].
   * **Data & Logic Conflicts (The Brain):** If the conflict resides inside `$state` engines or server-side Firestore callouts, **keep the Architect's defensive hydration wrappers and RBAC stripping rules [cite: 866, 1114].**
   * Merge both surgically using custom regex sweeps or line-by-line insertions to ensure functionality and presentation remain unified [cite: 91, 534].

3. **Auto-Commit and Force-Reverify:**
   Once conflicts are resolved locally in the VM, Jules must immediately execute our static compilation tests to verify stability before updating the remote branch [cite: 91]:
   ```bash
   pnpm run check
   pnpm test
   ``` [cite: 1094]
   If checks return green, commit the merge safely under the automated identity [cite: 832]:
   ```bash
   git config user.name "Nexus Command Automation"
   git commit -am "style: resolve layout conflicts and lock visual specifications"
   git push origin head
   ``` [cite: 832]
