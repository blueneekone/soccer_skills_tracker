---
description: P2 — Extract CoachTeamRosterPanel into the full Vanguard Trinity Pattern (Shell, Brain, Glass, HUD) to eliminate the current monolith violation.
---

# Workflow: Fix Roster Panel Trinity Pattern

**Priority:** P2 🟡 MEDIUM  
**Rule Enforced:** GEMINI.md §2 — "Vanguard Trinity Pattern: All features must adhere to Shell, Brain, Glass, HUD." Enterprise Rules §13 — "If a Svelte file exceeds 500 lines of markup or contains complex interactive graphical state, you MUST extract that specific module into a dedicated component in `src/lib/components/` BEFORE attempting to patch its logic."

---

## Context
`CoachTeamRosterPanel.svelte` currently combines Brain logic (`saveEdit()`, `startEdit()`, `setDoc()` calls), Glass markup (edit form inputs), and Shell responsibilities into a single file. This violates the Trinity Pattern and makes the component untestable in isolation.

---

## Step 1: Read the Existing File

Read `src/lib/coach/logistics/CoachTeamRosterPanel.svelte` in full before making any changes.

Document:
- All `$state` variables
- All functions (startEdit, saveEdit)
- All Firestore calls
- All props

---

## Step 2: Create the Brain — `RosterPanelEngine.svelte.ts`

**File:** `src/lib/coach/logistics/RosterPanelEngine.svelte.ts`  
**Action:** [NEW]  
**Trinity Role:** Brain

```typescript
import { db } from '$lib/firebase.js';
import { doc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';

export interface RosterPlayer {
  id: string;
  displayName: string;
  email: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}

export interface EditData {
  displayName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}

export class RosterPanelEngine {
  players = $state<RosterPlayer[]>([]);
  loading = $state(true);
  err = $state('');
  editingPlayerId = $state<string | null>(null);
  editData = $state<EditData>({ displayName: '', parentName: '', parentPhone: '', parentEmail: '' });

  private unsub: (() => void) | null = null;

  subscribe(teamId: string) {
    this.unsub?.();
    if (!teamId || !isFirestoreReady()) {
      this.players = [];
      this.loading = false;
      return;
    }
    this.loading = true;
    this.err = '';
    const q = query(collection(db, 'player_lookup'), where('teamId', '==', teamId));
    this.unsub = onSnapshot(q, this.onSnapshot.bind(this), this.onError.bind(this));
  }

  private onSnapshot(snap: any) {
    this.players = snap.docs.map(this.mapDoc).sort(
      (a: RosterPlayer, b: RosterPlayer) => a.displayName.localeCompare(b.displayName)
    );
    this.loading = false;
  }

  private onError(e: Error) {
    this.err = e.message || 'Could not load roster.';
    this.loading = false;
  }

  private mapDoc(d: any): RosterPlayer {
    const data = d.data();
    const email = d.id.toLowerCase();
    const displayName =
      (typeof data.displayName === 'string' && data.displayName.trim()) ||
      (typeof data.playerName === 'string' && data.playerName.trim()) ||
      email.split('@')[0];
    return {
      id: d.id, displayName, email,
      parentName: typeof data.parentName === 'string' ? data.parentName : '',
      parentPhone: typeof data.parentPhone === 'string' ? data.parentPhone : '',
      parentEmail: typeof data.parentEmail === 'string' ? data.parentEmail : '',
    };
  }

  startEdit(p: RosterPlayer) {
    this.editingPlayerId = p.id;
    this.editData = { displayName: p.displayName, parentName: p.parentName, parentPhone: p.parentPhone, parentEmail: p.parentEmail };
  }

  cancelEdit() { this.editingPlayerId = null; }

  async saveEdit(playerId: string): Promise<void> {
    if (!this.editingPlayerId) return;
    await setDoc(doc(db, 'player_lookup', playerId), {
      displayName: this.editData.displayName,
      playerName: this.editData.displayName,
      parentName: this.editData.parentName,
      parentPhone: this.editData.parentPhone,
      parentEmail: this.editData.parentEmail,
    }, { merge: true });
    this.editingPlayerId = null;
  }

  detach() { this.unsub?.(); }
}
```

---

## Step 3: Rebuild `CoachTeamRosterPanel.svelte` as Glass Only

**File:** `src/lib/coach/logistics/CoachTeamRosterPanel.svelte`  
**Action:** MODIFY — remove all Brain logic, delegate entirely to Engine

```svelte
<script lang="ts">
  import { RosterPanelEngine } from './RosterPanelEngine.svelte.js';
  import RosterEditForm from './RosterEditForm.svelte';
  import CoachRosterImportPanel from './CoachRosterImportPanel.svelte';

  let { teamId = '' } = $props();
  const engine = new RosterPanelEngine();

  $effect(() => { engine.subscribe(teamId); return () => engine.detach(); });
</script>
```

All JSX markup for the roster list and edit form moves to `RosterEditForm.svelte`.

---

## Step 4: Create `RosterEditForm.svelte` — Glass Layer

**File:** `src/lib/coach/logistics/RosterEditForm.svelte`  
**Action:** [NEW]  
**Trinity Role:** Glass

Accepts `engine: RosterPanelEngine` as a prop and renders the player list with conditional edit forms. All user interaction calls `engine.startEdit()`, `engine.cancelEdit()`, `engine.saveEdit()`.

---

## Step 5: Write Tests

**File:** `src/lib/coach/logistics/__tests__/rosterPanelEngine.test.ts`  
**Action:** [NEW]

Tests must verify:
1. `subscribe()` calls `onSnapshot` with correct `teamId` query
2. `startEdit()` populates `editData` correctly
3. `saveEdit()` calls `setDoc` with merged payload
4. `cancelEdit()` nulls `editingPlayerId`
5. `detach()` calls `unsub()`

---

## Step 6: Verify & Commit

```
npm run check  # 0 errors
npx vitest run src/lib/coach/logistics/__tests__/rosterPanelEngine.test.ts
git add .
git commit -m "refactor(coach): extract RosterPanel to Trinity Pattern (Engine + Glass)"
git push origin dev
```
