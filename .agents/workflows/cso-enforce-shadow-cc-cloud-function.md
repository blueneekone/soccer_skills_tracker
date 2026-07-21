# Workflow: CSO — Enforce SafeSport Shadow CC via Cloud Function

**Owner**: Jules (Backend)
**Priority**: P0 — CRITICAL / LEGALLY NON-NEGOTIABLE
**Persona Context**: Chief Security Officer (CSO)

## Objective
The ROADMAP marks Epic 5 SafeSport Shadow CC as `[x]` complete, but the current implementation is **client-side only and legally insufficient**. A bad actor who bypasses the frontend can create 1:1 adult-to-minor channels. This workflow moves enforcement to an immovable server-side layer.

## Step 1: Strip Client-Side fetchParentEmailsForPlayer
- **File**: `src/lib/components/coach/NewMessageModal.svelte` (or `NewMessageEngine.svelte.ts` after fracture)
- **Task**: Remove the `fetchParentEmailsForPlayer` function entirely from the frontend. The frontend must ONLY write `memberIds` to the channel payload. It must NOT resolve, compute, or inject any `ccParentEmails` itself.
- **Zero-Trust Rule**: The client is compromised. Any client-side computation of `ccParentEmails` must be treated as a security vulnerability.

## Step 2: Write onChannelCreated Firebase Cloud Function
- **File**: `functions/src/onChannelCreated.ts`
- **Task**: Write a Firestore `onCreate` trigger that fires when a new document is created in the `channels` collection.
  1. Read the `memberIds` array from the new channel document.
  2. For each `memberId`, query the `users` collection to determine if the user has `role === 'player'` and `age < 18` (or a `isMinor: true` flag).
  3. For each minor member found, query their linked parent via `parentUid` or `householdId`.
  4. Resolve all linked parent emails into a `ccParentEmails: string[]` array.
  5. Perform an atomic `update()` on the channel document to inject the resolved `ccParentEmails` array.
  6. If any minor is found without a linked parent/guardian, set `channelStatus: 'BLOCKED_VPC_PENDING'` and send an admin alert.
- **Constraint**: The trigger function body must not exceed 80 lines. Extract the parent resolution logic into `functions/src/utils/resolveParentEmails.ts`.

## Step 3: Block Direct Channel Creation Without Server Validation
- **Task**: Update Firestore Security Rules for the `channels` collection:
  - Client writes are allowed ONLY if `ccParentEmails` is NOT included in the payload (the field must be absent — the server injects it).
  - If a client attempts to write `ccParentEmails` directly, the rule must reject the write.
- This ensures the server-side function is the ONLY path by which `ccParentEmails` can exist on a channel document.

## Step 4: Verification
- Write a test that creates a mock channel document with a minor member and asserts `ccParentEmails` is populated by the trigger.
- Confirm the Firestore rule rejects any client-side write that includes `ccParentEmails`.
- Run `npm run check` — 0 errors.
