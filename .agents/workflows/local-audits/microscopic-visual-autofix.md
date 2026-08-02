---
name: microscopic-visual-autofix
description: P0 — Uncompromising Microscopic Visual, Padding, Mobile, and Grammar Audit & Auto-Fix
---

# MICROscopic Visual & Typographical Audit Protocol (v1.0)
**Persona Scope:** Chief Design Officer (CDO) & Chief Reliability Officer (CRO)
**Target Platform:** SSTracker (Project Phoenix) Enterprise OS Suite
**Operational Directive:** Relentlessly identify, verify, and auto-heal every micro-layout drift, padding violation, Svelte 5 reactivity loop, mobile scaling failure, and grammatical error across all personas.

---

### 🏛️ 1. GLOBAL FOUNDATIONAL GUIDELINES (THE TECH NOIR BASELINE)
Every compiled viewport must pass through these structural filters:
*   **The 60-30-10 Color Taxonomy:**
    *   **60% (Canvas):** Absolute Void Black (`#000000` / `rgb(0,0,0)`) on the root application background and page wrappers [cite: 783]. No default Tailwind slate or blue bleeds are permitted.
    *   **30% (Panels & Wells):** Z2 panels must use deep Navy Slate (`#0f172a` or `#1e293b`) with crisp, single-pixel Structural Grey (`#334155`) borders [cite: 783].
    *   **10% (Telemetry Accents):** Critical alerts, real-time tracking segments, and data-flow conduits must use glowing **Data Cyan (`#14b8a6`)** [cite: 783].
*   **Contrast Safeguards:** Absolutely no `rgba()` text transparency overlays or opacity utilities are permitted on dark backgrounds to ensure WCAG AAA accessibility under stadium floodlights [cite: 1151].
*   **Typography Separation:**
    *   **Headers & Navigation:** Strict Title Case using **Geist Sans** font [cite: 783].
    *   **Body Copy:** High-legibility swatches using the **Switzer** font [cite: 783].
    *   **Metrics & Telemetry:** Monospace figures, counters, dates, coordinates, and statistics must use **Geist Mono** [cite: 783, 784].

---

### ⚙️ 2. PADDING, LAYOUT, & RESPONSIVE GRID STANDARDS

#### A. Microscopic Edge Padding
*   **The Hugging Violation:** Text, icons, or structural elements must **NEVER** touch the physical borders of their containers [cite: 783].
*   **Standard Container Bounds:**
    *   Desktop cards and Bento Grid wells must enforce a minimum padding of **`1.5rem` (24px)** inside the card boundaries [cite: 783].
    *   Mobile card wrappers (375px) must support a minimum padding of **`1rem` (16px)** to maximize screen density without crowding text [cite: 783].
*   **Flex-box Guard:** Any component utilizing flex row alignments must apply the `tw-min-w-0` utility to its text children [cite: 783]. This explicitly prevents content from expanding beyond parent boundaries and causing layout overflows.

#### B. Responsive Bento Grid Math (Anti-Squish Guidelines)
*   **The Layout Stacking Rule:** Symmetrical, multi-column layouts are strictly forbidden [cite: 784, 1062].
*   **Responsive Fluid Clamp Math:** All dashboard grids must leverage the Svelte-native responsive bento structure [cite: 1040]. Apply the clamp formula inside standard inline style variables to protect card content from vertical squishing [cite: 1040]:
    ```html
    style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"
    ```
*   **Mobile Auto-Adjust Check (375px Viewport):**
    *   At the `sm` screen breakpoint, the 12-column bento container must collapse cleanly into a single-column, linearly stacking feed [cite: 1149].
    *   The root wrapper must enforce a rigid viewport lock of `tw-h-[100dvh]` and `tw-flex-col` [cite: 1066]. Scrolling feeds must use `tw-overflow-y-auto` [cite: 1066]. Double scrollbars are treated as a P0 compilation failure.

---

### 📋 3. PERSONA-SPECIFIC STYLING MANDATES
The visual check client must dynamically toggle its assertions depending on the target persona route:

```
                  ┌───────────────────────────────┐
                  │   Microscopic Audit Target   │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
  [ Player OS ]             [ Parent OS ]           [ Coach / Admin ]
  - Chamfered clip-path     - 24px rounded corners   - 90-degree sharp corners
  - 40% Void Black HUD      - Warm Amber shield      - High-density data grid
  - 6-axis Vanguard Prism   - Calm, spacious style   - Zero gamification elements
  - Exactly ONE Gold CTA    - Household Graph        - No Action Gold allowed
```

#### 🎮 A. Player OS (The Gamified HUD)
*   **HUD Density:** Establish a high-saturation **40% Void Black gaming HUD** designed to drive athletic habit loops [cite: 784, 1104].
*   **Card Geometry:** Apply sharp, aggressive, physical-digital **chamfered clip-paths** exclusively to the outer bounds of player profiles and card components to project a tech-forward HUD aesthetic [cite: 784]:
    ```css
    style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);"
    ```
*   **Specialized Widgets:** Must render the 6-axis **Vanguard Prism** radar charts (pure SVG, no canvas-stretching libraries allowed) and custom circular XP progress rings [cite: 784, 889].
*   **The Single-CTA Guard:** Scan the viewport and assert that **exactly ONE primary CTA** uses the Action Gold (`#fbbf24`) fill, prioritizing engagement [cite: 784]. All secondary options must use muted Data Cyan or Structural Grey borders [cite: 784].

#### 📋 B. Coach & Global Admin OS (The Tactical SIEM)
*   **Panel Geometry:** Enforce strict **90-degree square corners** (border-radius: `0px`) on all layout panels to project clinical, military-grade administrative authority [cite: 784].
*   **Telemetry Feeds:** Integrate high-density layout panels displaying real-time system metrics, ODP analytics, and the **Tron War Room** Spatial Drill Designer (SVG canvas featuring moving Vantablack discs and neon-bloom light tracks) [cite: 784, 1104].
*   **Zero-Gamification Constraint:** **Absolutely no gamification chamfers, XP rings, or Action Gold CTAs are permitted on these routes** to prevent administrative clutter and distraction [cite: 784].

#### 🛡️ C. Parent OS (The Compliance Vault)
*   **Panel Geometry:** Maintain unified tables but apply a calm, flat, spacious layout utilizing comforting, rounded **24px border radii** to project trust and safety [cite: 784].
*   **Specialized Widgets:** Display the Household Graph, SafeSport Shadow CC trigger logs, and **The Car Ride Home Protocol** countdown timer [cite: 745].
*   **The Car Ride Home Protocol (EQ Guard):** Suppress raw post-match athletic performance metrics for exactly 15 minutes post-game behind a warm, Atompunk Amber (`#f59e0b`) countdown shield to protect beginner self-worth [cite: 745, 784].

---

### ✍️ 4. COPY, GRAMMAR, & PUNCTUATION AUDIT
*   **Title Case Enforcement:** All h1, h2, and h3 header elements must strictly use Title Case (e.g., "The Car Ride Home Protocol") [cite: 745].
*   **The Terminal Period Rules:**
    *   **Body Paragraphs:** Every complete sentence in body copy, descriptions, and tooltips **MUST** end with a terminal period.
    *   **Button & CTA Labels:** UI buttons, checkboxes, and tabs **MUST NEVER** end with a period (e.g., "Deploy Your Club", not "Deploy Your Club.") [cite: 1064].
    *   **Stat Badges:** KPI readouts, metrics, and abbreviations must have no periods.
*   **TCU Burnout Grounding verification:** Ensure that all references to the university burnout studies strictly credit the principal investigator: **"Alyssa Oh (alyssa.oh@tcu.edu) under TCU IRB# 2022-74"** [cite: 38].

---

### 🚀 5. THE AUTONOMOUS TEST & AUTO-FIX LOOP

This workflow enforces browser-in-the-loop validation using Playwright and the local Antigravity CLI agent [cite: 1104, 1149]:

```
                    ┌───────────────────────────────┐
                    │  Read Workflow Rules (v5)     │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Seed local Firestore Emulator │
                    │    (Bypass /setup redirect)   │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Execute Playwright Suite    │
                    │   (Desktop, Tablet, Mobile)   │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Analyze Computed Styles     │
                    │  (Paddings, Colors, Borders)  │
                    └───────────────┬───────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼ (Failures Found)                              ▼ (All Green)
┌───────────────────────────────┐               ┌───────────────────────────────┐
│ Invoke Antigravity Auto-Fix   │               │ Capture Screenshots & Video   │
│  agy -p "/ui-ux-autofix [p]"  │               │    Save to /audit-artifacts   │
└───────────────┬───────────────┘               └───────────────┬───────────────┘
                │                                               │
                └─────────── Re-Test ◄──────────────────────────┘
```

#### How to execute the microscopic audit:
1.  **Start Background Context:** Ensure your local Svelte dev server and Firebase Emulator suite are running in separate console tabs [cite: 1104].
2.  **Run the Verification:** Execute the localized PS1 scripts directly:
    ```powershell
    PowerShell -ExecutionPolicy Bypass -File .\run-all-local-audits-v5.ps1
    ``` [cite: 1104]
3.  **Target Specific Routes:**
    ```powershell
    # Manually invoke targeted Playwright checks
    $env:AUDIT_TARGET="player"; node scripts/audit-computed-styles-v5.js
    ``` [cite: 1104]
4.  **Auto-Fix Command:** If visual checking fails due to edge padding leaks or mobile squishing, invoke the auto-healer:
    ```powershell
    agy -p "/ui-ux-audit-v3 player"
    ``` [cite: 1104]
