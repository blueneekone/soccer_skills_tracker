# Workspace Workflow: Visual-In-The-Loop HUD Verification (v3)
## Command ID: `/ui-ux-audit-v3`

Enforces visual compliance across active views by orchestrating browser-in-the-loop Playwright runs. It mathematically ensures layouts comply with the strict "Nuclear Americana Tech Noir" design tokens and verified HUD module metrics.

---

### ⏳ Prerequisites & Setup
1. **Target View:** Local Svelte 5 dev server must be active on `http://localhost:5173` [cite: 112].
2. **Required Node Packages:** Ensure `playwright` is installed.
3. **Trigger command:** In the Antigravity TUI pane, type:
   `/ui-ux-audit-v3 {Persona}` (e.g., `/ui-ux-audit-v3 Player`)

---

### 🔄 Execution Flow Diagram
```
[Antigravity TUI] ────> Run Svelte Server ────> Spawn Playwright Subagent
                                                       │
                                                       ▼
[Studio Panel] <─── Render PDF Audit Report <─── Run v3 Styles Audit Script
```

---

### 📋 Chronological Engineering Steps

#### 1. System Environment Activation
- Verify `env.development` is loaded so the local app connects directly to the Firestore Auth emulators.
- Establish baseline CLI connections.

#### 2. Visual CSS Audit Execution
- Run the Playwright script `node ./scripts/audit-computed-styles-v3.js`.
- The headless browser will load `http://localhost:5173/player/dashboard` using a strict mobile-viewport size (375x812).

#### 3. Module Verification Assertions
The Playwright subagent will assert the physical render states of these four core layouts:
- **Biometrics:** Scans for `.hud-biometrics-card` container element.
- **Tactical Pitch Map:** Scans for `.hud-tactical-map` container element.
- **Smart Boots & Shin-Guards:** Scans for `.hud-equipment-schematic` container element.
- **Neural Link Avatar:** Scans for `.hud-avatar-station` container element.

#### 4. Design-Token Extraction
- Evaluates calculated CSS variables for Void Black background (`#000000`), Navy Slate (`#0f172a`), Data Cyan (`#14b8a6`), and Action Gold (`#fbbf24`).
- Asserts that all telemetry data features have the **Geist Mono** font family applied.
- Checks elements for transparency violations like `text-white/50`.

#### 5. Report Compilation & Output
- If violations are found, the CRO and CDO subagents automatically execute inline CSS and markup fixes in-place and re-run the tests.
- Once green, compiles the layout validation scores, saves a visual report, and triggers success telemetry.
