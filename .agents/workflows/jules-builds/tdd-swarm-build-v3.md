---
name: tdd-swarm-build-v3
description: Master sequential assembly line for all 6 SSTracker operating systems. Cloud-bound backend logic is executed asynchronously by Jules (gated strictly by headless unit tests), while local visual styling audits, Playwright verification, and CDO auto-healing are executed within the local Antigravity runtime.
---

# Master Multi-Persona TDD Swarm Build (Sequential Cloud-to-Local Assembly Line)

This master workflow coordinates our automated engineering council to build, design, secure, and verify all 6 SSTracker operating system views sequentially. 

To eliminate integration collisions, the pipeline strictly divides labor:
1. **Google Jules (Cloud VM):** Writes backend logic, Svelte 5 state models, and Firestore mutations. Gated strictly by headless unit tests (Vitest).
2. **Google Antigravity (Local Watcher):** Spawns the local Svelte dev server, runs Playwright visual audits, and deploys the local CDO agent to auto-heal layout bugs in real time.

---

## The Master Sequential Execution Loop

### Phase 1: Admin OS View (Command Plane)
1. **Cloud Execution (Jules):**
   * Action: Implement `AdminDashboardHUD.svelte` and `AdminDashboardArena.svelte` state logic.
   * Security Rule: Strip raw RBAC fields (`role`, `clubId`) from frontend payloads before database mutation. Keep functions under 80 lines.
   * Verification Gate: Run `pnpm test:unit` in the cloud VM.
   * Handoff: Submit Pull Request and auto-merge to the `dev` branch.
2. **Local Intercept (Antigravity):**
   * Watcher Action: Pull merged changes, start local Firebase emulators, and boot Svelte dev server.
   * Playwright Check: Run `node ./scripts/audit-computed-styles-v4.js admin` (bypasses auth via IndexedDB helper).
   * Auto-Heal: If layout drift or grid-squishing is detected on `/admin/overview`, run `/tdd-ui-ux-autofix` to force CDO styling compliance.
   * Completion Gate: Commit visual fixes and trigger the next phase.

### Phase 2: Director OS View (Revenue Engine)
1. **Cloud Execution (Jules):**
   * Action: Implement Stripe Connect subscription checkouts and frictionless CSV roster ingestion logic.
   * Verification Gate: Run `pnpm test:unit` in the cloud VM.
   * Handoff: Submit Pull Request and auto-merge to the `dev` branch.
2. **Local Intercept (Antigravity):**
   * Watcher Action: Pull merged changes.
   * Playwright Check: Run `node ./scripts/audit-computed-styles-v4.js director` (asserts `.revenue-engine-analytics` and `.roster-hierarchy-tree` render correctly).
   * Auto-Heal: If layout drift is detected, run `/tdd-ui-ux-autofix`.
   * Completion Gate: Commit visual fixes and trigger the next phase.

### Phase 3: Coach OS View (Sideline SIEM)
1. **Cloud Execution (Jules):**
   * Action: Implement the Coach OS backend logic, tactical spatial math, and ZPD difficulty scaling engines.
   * Verification Gate: Run `pnpm test:unit` in the cloud VM.
   * Handoff: Submit Pull Request and auto-merge to the `dev` branch.
2. **Local Intercept (Antigravity):**
   * Watcher Action: Pull merged changes.
   * Playwright Check: Run `node ./scripts/audit-computed-styles-v4.js coach` (asserts `.sideline-siem-panel` and `.tactical-playbook-board` render correctly).
   * Auto-Heal: If layout drift is detected, run `/tdd-ui-ux-autofix` (CDO enforces strict 90-degree corners, Geist Mono typography, and removes any gamification chamfers).
   * Completion Gate: Commit visual fixes and trigger the next phase.

### Phase 4: Player OS View (Dopamine Engine)
1. **Cloud Execution (Jules):**
   * Action: Implement the 2% daily skill decay and Firestore-verified streak freeze token consumption.
   * Verification Gate: Run `pnpm test:unit` in the cloud VM.
   * Handoff: Submit Pull Request and auto-merge to the `dev` branch.
2. **Local Intercept (Antigravity):**
   * Watcher Action: Pull merged changes.
   * Playwright Check: Run `node ./scripts/audit-computed-styles-v4.js player` (asserts `.hud-biometrics-card`, `.hud-tactical-map`, `.hud-equipment-schematic`, and `.hud-avatar-station` render correctly).
   * Auto-Heal: If layout drift is detected, run `/tdd-ui-ux-autofix` (CDO enforces the Vanguard chamfered clip-path and exactly ONE Action Gold CTA button).
   * Completion Gate: Commit visual fixes and trigger the next phase.

### Phase 5: Parent OS View (Compliance Vault)
1. **Cloud Execution (Jules):**
   * Action: Implement the server-side `onChannelCreated` Firestore trigger to automatically resolve linked parent emails and intercept 1:1 adult-to-minor channels.
   * Verification Gate: Run `pnpm test:unit` in the cloud VM.
   * Handoff: Submit Pull Request and auto-merge to the `dev` branch.
2. **Local Intercept (Antigravity):**
   * Watcher Action: Pull merged changes.
   * Playwright Check: Run `node ./scripts/audit-computed-styles-v4.js parent` (verifies the household graph, VPC consent queues, and Stripe billing metrics layout).
   * Auto-Heal: If layout drift is detected, run `/tdd-ui-ux-autofix` (CDO enforces standard 24px border-radii for outer panel wrappers to establish structural trust).
   * Completion Gate: Commit visual fixes and trigger the next phase.

### Phase 6: Recruiter OS View (Vetted Engine)
1. **Cloud Execution (Jules):**
   * Action: Implement Checkr API integration and restrict prospects' telemetry access to verified/cleared scouts only.
   * Verification Gate: Run `pnpm test:unit` in the cloud VM.
   * Handoff: Submit Pull Request and auto-merge to the `dev` branch.
2. **Local Intercept (Antigravity):**
   * Watcher Action: Pull merged changes.
   * Playwright Check: Run `node ./scripts/audit-computed-styles-v4.js recruiter` (verifies background checks status and cursor-paginated search telemetry tables).
   * Auto-Heal: If layout drift is detected, run `/tdd-ui-ux-autofix`.
   * Completion Gate: Commit visual fixes and declare full system recovery complete.
