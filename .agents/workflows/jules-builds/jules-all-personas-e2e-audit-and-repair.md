---
title: "Jules Master Cloud Swarm: Complete Platform E2E Audit, Visual Verification & Self-Healing"
description: "Cloud-native autonomous workflow for Jules to execute the interactive Playwright test suite, audit buttons/routes/features across all 6 personas, capture screenshots, and self-heal any regressions."
---

# 🌐 SSTRACKER (PROJECT PHOENIX) — MASTER PLATFORM AUDIT & REPAIR WORKFLOW
**Executor:** Google Jules (Autonomous Cloud VM Swarm)
**Directives:** Test-Driven Development (TDD), Zero Svelte Warnings, 80-Line Function Limit, Vanguard Trinity Pattern

---

## 🎯 MISSION STATEMENT
Execute an end-to-end interactive and visual verification sweep across all **6 SSTracker personas** (Coach, Director, Parent, Player, Admin, Commissioner).
Autonomously test all route functions, button clicks, tab switches, and live telemetry integrations. If any assertion fails, diagnose the root cause, apply surgical repairs complying with the Vanguard Trinity architecture, and verify 100% green tests.

---

## 🏛️ NON-NEGOTIABLE ARCHITECTURAL LAWS

1. **The 80-Line Function Limit**:
   - No single function body or helper routine may exceed 80 lines of code. Extract sub-logic into `src/lib/utils/`.
2. **Defensive Hydration Gate (B815)**:
   - All raw Firestore listeners (`onSnapshot`) and fetches (`getDocs`, `getDoc`) must begin with:
     ```typescript
     if (!db || !authStore.isAuthenticated) return;
     ```
3. **Svelte 5 Reactivity Strictness**:
   - All router transitions (`goto`) or state mutations inside `$effect` must be wrapped in `untrack(() => { ... })`.
4. **Zero-Trust Multi-Tenancy**:
   - Strip all elevated role permissions on client writes and respect tenant cell boundaries (`/clubs/{clubId}`, `/teams/{teamId}`).
5. **The 60-30-10 Enterprise Palette**:
   - 60% Void Black (`#000000`) & Navy Slate (`#0f172a`).
   - 30% Structural Grey (`#334155`) & Muted Off-Whites (`#fafafa`).
   - 10% Accents: Data Cyan (`#14b8a6`), Nuclear Yellow (`#daff0a`), Action Gold (`#fbbf24`), Atompunk Amber (`#f59e0b`).

---

## 🧪 CLOUD EXECUTION PROTOCOL (STEP-BY-STEP)

### Phase 1: Interactive Playwright Persona Verification
Run the master interactive test suite across all personas:
```bash
pnpm playwright test tests/persona-interactive-e2e.spec.ts tests/platform-cohesion-master.spec.ts --project=chromium
```

### Phase 2: Persona-by-Persona Route & Feature Deep-Dive

#### 1. Coach OS (`@persona-coach`)
- **Route**: `/coach/logistics`
  - Verify tab navigation (`comms`, `schedule`, `roster`, `attendance`).
  - Verify team selection dropdown and Team Dispatch Code issuance.
- **Route**: `/coach/matchday`
  - Verify Tactical Telemetry Pad (5-column Bento grid with Pass, Shot, Tackle, Aerial, Mistake).
  - Verify zero rogue purple styling and clean HUD counter increments.
- **Route**: `/coach/tactics` (War Room)
  - Verify HTML5 spatial SVG canvas rendering and player marker drag-and-drop.

#### 2. Director OS (`@persona-director`)
- **Route**: `/director/dashboard`
  - Verify zero blank screens on initial load.
  - Verify club resolution via `authStore.userProfile.clubId` and `pickDirectorClubId`.
  - Verify Facility Map Satellite Vault & AEGIS lightning weather lockout triggers.

#### 3. Parent OS (`@persona-parent`)
- **Route**: `/parent/household`
  - Verify parent athlete registration and Team Dispatch Code linking.
- **Route**: `/parent/vpc`
  - Verify COPPA 2.0 Verifiable Parental Consent waivers and biometric WebAuthn triggers.
- **Route**: `/parent/dashboard`
  - Verify 15-minute post-game "Car Ride Home" protocol lockout.

#### 4. Player OS (`@persona-player`)
- **Route**: `/player/dashboard`
  - Verify Scout's Six Vanguard Prism 6-axis radar chart rendering.
  - Verify daily habit streak counters and 2% loss avoidance skill decay logic.

#### 5. Global Admin & Commissioner OS (`@persona-admin`)
- **Route**: `/admin/overview` & `/commissioner/governance`
  - Verify strict 12-column asymmetric Bento Grid and Geist Mono typography.

---

### Phase 3: Static Compilation & Type Check
Verify that the codebase satisfies all static architectural gates:
```bash
npm run check
```
*Requirement: Exactly 0 errors and 0 type violations.*

---

## 📸 ARTIFACT CAPTURE & PULL REQUEST GENERATION
1. Save all visual regression snapshots, console logs, and performance metrics to `/audit-artifacts/platform-e2e/`.
2. Commit with conventional commit format:
   ```bash
   git commit -am "test(e2e): complete multi-persona platform audit and visual verification"
   ```
3. Open a clean Pull Request into `dev`.
