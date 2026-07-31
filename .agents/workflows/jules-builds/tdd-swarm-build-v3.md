# Master Swarm Orchestration Protocol: TDD Sequential Swarm Build (v3)
# Enforced Role: Chief Architect / Chief Reliability Officer
# Trigger Mode: Automated Sequential Persona Chain (Overnight Build Loop)

## 1. Overview
This workflow automates the sequential end-to-end assembly, test stabilization, and visual style validation for all 6 SSTracker Operating Systems. It chains asynchronous backend engineering (Jules in the cloud) with synchronous browser-in-the-loop design audits (Antigravity local), performing automated hot-fixes in-place before auto-advancing to the next persona in the queue.

---

## 2. The 6-Persona Queue
The overnight build sequence executes strictly in the following order:
1. **Global Admin OS** (Command Plane) -> `/admin/dashboard`
2. **Director OS** (Revenue Engine & Rosters) -> `/director/dashboard`
3. **Coach OS** (Sideline SIEM & Tactics) -> `/coach/dashboard`
4. **Player OS** (Void Black Gaming HUD & Telemetry) -> `/player/dashboard`
5. **Parent OS** (SafeSport Compliance Vault) -> `/parent/dashboard`
6. **Recruiter OS** (ODP Vetting Pipeline) -> `/recruiter/dashboard`

---

## 3. Step-by-Step Persona Execution Loop
For each Persona $[P]$ in the queue:

### Phase A: Cloud Logical Build (Jules)
1. **Fetch & Isolate:** Jules boots a clean VM, checks out the active development branch, and reads the rules in `.agents/rules/jules-focus.md`.
2. **Logical Synthesis:** Jules writes the Svelte 5 server loads, actions, state handlers, and Firestore transactions for $[P]$.
3. **Security Injection:** Jules configures local Firestore Security Rules to block client-side writes of role/tenant privileges.
4. **Test Assertion:** Jules executes unit tests (`vitest run`). All backend logical assertions must pass 100%.
5. **Push:** Jules commits and pushes the logical changes to `origin/dev-[P]`.

### Phase B: Local Visual Validation (Antigravity)
1. **Auto-Pull:** Antigravity intercepts the branch push locally and checks out `dev-[P]`.
2. **Launch Dev Suite:** Antigravity initiates the local environment:
   ```bash
   npm run dev -- --port 5173
   ```
3. **Trigger Visual Audit:** Antigravity executes the modern computed styles Playwright verification targeting the persona's route:
   ```bash
   node .\scripts\audit-computed-styles-v4.js [P]
   ```
4. **The Gate Decision:**
   * **IF PASSED (Exit Code 0):** Antigravity merges the branch into main `dev`, deletes the local branch, and automatically calls the GitHub API to trigger the next Persona $[P+1]$ in the queue.
   * **IF FAILED (Exit Code 1):** The pipeline pauses and deploys the **CDO Subagent** locally.

### Phase C: Automated Visual Healing (CDO Agent)
1. **Examine Failure:** The CDO agent parses the style violations (e.g., text halation, grid squishing, or missing HUD cards).
2. **In-Place Refactor:** The CDO rewrites the Svelte CSS utility classes in the relevant components strictly following the design system tokens in `tailwind.config.js` and `app.css`.
3. **Verify:** CDO re-runs the visual audit. Once passing green, it commits, merges, and triggers the next Persona $[P+1]$.

---

## 4. Launch Command
To initiate the entire overnight loop from your Antigravity TUI console before logging off:
```text
/tdd-swarm-build-v3 all
```
