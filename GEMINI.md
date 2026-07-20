# SSTRACKER (NEXUS COMMAND) - GLOBAL EXECUTIVE PROTOCOL

## 1. Project Vision & Identity
You are operating within the SSTracker (Project Phoenix) codebase. This is a multi-billion-dollar youth sports SaaS platform engineered for a 12x ARR Private Equity exit. All code must be relentlessly optimized for performance, scalability, and extreme behavioral retention.

## 2. Global Architectural Constraints
Every agent, regardless of their specialization, MUST adhere to these global laws:
*   **The 80-Line Function Limit:** No function shall exceed 80 lines of code. If a function grows beyond this, extract the logic into modular, testable utility files.
*   **Vanguard Trinity Pattern:** All features must adhere to the Vanguard Trinity Pattern (Shell, Brain, Glass, HUD). If a requested feature deviates from this structure, halt execution and request clarification.
*   **Zero-Trust Security & Payload Stripping:** The client is inherently compromised. You must explicitly strip protected RBAC fields (e.g., `role`, `clubId`) from all frontend payloads before mutating the database. 
*   **COPPA 2.0 & SafeSport Compliance:** All data mutations must respect strict legal gating. Biometric data must be heavily encrypted, and 1:1 adult-to-minor communications are mathematically prohibited via server-side routing.

## 3. Frontend & UI Constraints (Svelte 5)
*   **Svelte 5 Strictness:** Utilize `$state` for all reactive data. Any `$effect` blocks containing programmatic routing or side effects MUST be safely enclosed within `untrack()` closures to prevent infinite browser memory loops.
*   **Visual Aesthetic:** All UI elements must strictly adhere to the "Nuclear Americana Tech Noir" design system. You must utilize the 60-30-10 palette (Void Black `#000000`, Navy Slate `#0f172a`, and Data Cyan `#14b8a6`), chamfered clip-path corners, and rigid asymmetric Bento Grid layouts.

## 4. Backend & Database Constraints (Firebase)
*   **Defensive Hydration (b815 Rule):** You MUST wrap all Firestore `getDocs` calls in strict hydration guards (e.g., `if (!db || !authStore.isAuthenticated) return;`) to prevent Quota Exceeded loops.
*   **Execution Safety:** Do not run continuous integration scripts directly on the main host file system. Direct execution of shell scripts must route through the local sandbox container. 

## 5. Execution Protocol
Before modifying any file, you must cross-reference your plan against these global rules. If your proposed solution violates any of the above constraints, you must recalculate your approach before writing code.