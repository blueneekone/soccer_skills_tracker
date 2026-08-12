---
name: b815-hydration
description: Enforces the B815 Defensive Hydration guard on all raw Cloud Firestore fetches to prevent Quota Exceeded loops.
---
# B815 Defensive Hydration Protocol

You must permanently eliminate raw, unguarded Cloud Firestore queries that trigger Quota Exceeded deadlocks.

### Mandates
1. **The Guard Clause:** Every single instance of \`getDocs\`, \`getDoc\`, or \`onSnapshot\` must be preceded by this exact early-return check:
   \`\`\`typescript
   if (!db || !authStore.isAuthenticated) return;
   \`\`\`
2. **Zero-Trust Client Mutations:** You are forbidden from mutating raw state arrays on the client. All session mutations must be handled server-side.
3. **Atomic Writes:** All bulk writes must use \`writeBatch\`, capped strictly at a hard limit of 500 operations per batch.