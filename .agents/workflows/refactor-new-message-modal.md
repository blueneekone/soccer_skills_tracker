# Workflow: Refactor New Message Monolith

**Description**: Fractures the massive 859-line `NewMessageModal.svelte` file into the Vanguard Trinity Pattern (Shell, Brain, Glass, HUD) and migrates the SafeSport Shadow CC resolution to a server-side Firestore trigger to enforce Zero-Trust Security.

## Step 1: Brain Extraction (The Engine)
- **Action**: Create `NewMessageEngine.svelte.ts` in `src/lib/components/coach/comms/`.
- **Task**: Move all state management, user filtering, and component logic from the monolithic file into this strictly typed Svelte 5 `$state` class.
- **Constraint**: Ensure no single function in the Engine exceeds 80 lines. Extract complex list sorting or filtering into pure utilities if needed.

## Step 2: Server-Side SafeSport Migration
- **Action**: Remove the client-side `fetchParentEmailsForPlayer` logic from the frontend entirely.
- **Task**: The frontend should only write the `memberIds`. Implement or update a Firebase Cloud Function (e.g., `onChannelCreated`) to autonomously resolve linked parent emails and inject them into `ccParentEmails`, guaranteeing strict 1:1 adult-to-minor restrictions even if the client is bypassed.

## Step 3: View Layer Fracturing (Glass & HUD)
- **Action**: Create `NewMessageArena.svelte` (the main list of selectable candidates) and `NewMessageHUD.svelte` (search bar, selected chips, and submit actions).
- **Task**: Refactor the original `NewMessageModal.svelte` to act purely as the Shell, orchestrating the Engine, Arena, and HUD components.

## Step 4: Verification and Clean Up
- **Action**: Run `npm run check` and ensure all TypeScript typing matches.
- **Output**: Present the fractured file structure to the user for final review and confirm the monolithic file has been safely dissolved.
