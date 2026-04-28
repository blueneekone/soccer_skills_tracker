# Phase 9 — Automated Dispatch Engine — Specification Skeleton

Working document for roadmap **Phase 9** ([`roadmap.md`](../roadmap.md) § Phase 9). Captures intent, plausible trigger surfaces grounded in code, audit model, gaps, and open questions—not an implementation commitment.

## Purpose

- Close the loop between logged training and targeted homework/assignments **without silently overriding human coaches**.
- Provide a **transparent, audit-friendly** automation path aligned with Enterprise SOAR-style observability (see roadmap narrative).

## Non-goals

- Replace coach curriculum authority. **Coach sovereignty** and overrides follow [`roadmap.md`](../roadmap.md) (“Command Override Protocol”): automation must not overwrite locked coach scope; prefer deferral or coach-gated suggestion when conflicts exist.

## Trigger surfaces (proposed — verify before build)

Anchors taken from **`functions/index.js`** and client stores:

| Surface | Role | Notes |
|---------|------|-------|
| **`workout_logs`** | Canonical write target from callable training log | **`logTrainingSession`** creates `workout_logs` documents (collection write ~4354+) and updates `player_stats`, `team_stats`. Natural candidate for a future Firestore trigger or explicit post-write hook named in roadmap (`onWorkoutLogged`). |
| **`users/{emailKey}/workouts`** | Player OS mirror collection | [`src/lib/stores/playerEngine.svelte.js`](../src/lib/stores/playerEngine.svelte.js) documents `users/{emailKey}/workouts` writes via **`writePlayerOsWorkout`**; defense-in-depth mirror—**not** a substitute for `workout_logs` as canonical XP/event source on the server. |

**Explicit:** There is **`onWorkoutLogged`** only in roadmap text—not implemented as an exported Cloud Function in this codebase (confirmed: string match **only** in [`roadmap.md`](../roadmap.md)).

## Dispatch target (conceptual)

- Roadmap points at **`activeAssignments`** / **Action Inbox**—player-facing drills due. Backend uses **`assignments`** collection ([`functions/index.js`](../functions/index.js)—e.g. ~4556, ~4685, ~5566 queries). Naming in UI vs Firestore paths should be validated per product glossary before defining the trigger payload.

## Data model sketch — audit trail (each automated injection)

Minimal fields suggested for parity with roadmap observability bullets:

| Field | Description |
|-------|-------------|
| `dispatchRunId` | Idempotency/correlation id for the function execution (Firebase execution id / custom UUID). |
| `sourceWorkoutId` | **`workout_logs`** document id (or equivalent canonical id if trigger reads from transaction outcome). |
| `thresholdBranch` | Which rule/family/model branch fired (opaque string code + semver or config revision). |
| `assignmentId` | Target **`assignments`** document id written or proposed. |
| `coachApprovalStatus` *(if applicable)* | `auto` vs `pending_approval` when Command lock requires gating (see roadmap). |
| `createdAt`, `clubId`, `teamId`, `playerId` | Standard tenancy and actor context for Enterprise review. |

Store in a dedicated collection (e.g. `dispatch_audits/` or nested under athlete/team)—**TBD** with security rules and retention policy.

## Open questions (engineering + product)

- [ ] **Single source of truth:** Confirm trigger binds only to **`workout_logs`** (recommended) vs also reacting to **`users/*/workouts`** mirror writes—avoid duplicate dispatches if both fire.
- [ ] **Gen 1 vs Gen 2 functions:** Region, idempotency, and Firestore-trigger semantics vs explicit callable chaining from `logTrainingSession`.
- [ ] **Coach lock detection:** Exact data model for “locked curriculum” / manual assignments preempting automation (Firestore queries, indexes).
- [ ] **Rules engine packaging:** Threshold definitions per **`sport`** / team policy—where config lives (`teams`, `clubs`, remote config).
- [ ] **Player/parent minors policy:** Automated assignment copy and liability—reuse Safe-Comms patterns?
- [ ] **Optional model tier:** If scoring uses ML beyond rules, disclosure, privacy, and cost controls.
- [ ] **SLA:** End-to-end latency from log completion to Assignment visible in Player OS.

---

*Last drafted: April 2026 • Align with roadmap updates.*
