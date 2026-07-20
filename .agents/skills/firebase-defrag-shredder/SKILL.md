---
name: firebase-defrag-shredder
description: Permanently purges ghost data, shreds Personally Identifiable Information (PII), and enforces strict cascading deletes across all Firebase/Firestore cells to satisfy "Right to be Forgotten" and COPPA 2.0 mandates.
---

### Execution Protocol: Firebase Database Defrag & PII Shredder

When tasked with deleting user data, purging ghost records, or handling PII removal, you MUST adhere to the following strict procedural execution. 

#### 1. Scope and Isolation
*   This skill must be executed as a throwaway Firebase script or isolated backend utility function.
*   Do not run continuous integration scripts directly on the main host file system. Direct execution of shell scripts must route through the local sandbox container.

#### 2. The Cascading Delete Mandate
*   When a user, team, or club is deleted, you must traverse the multi-sport "Rec Center" data topology (Tenant -> Programs -> Teams -> Rosters).
*   You must implement batch deletes or recursive delete functions to ensure absolutely zero orphaned ghost records remain in connected Firestore collections.

#### 3. Zero-Liability PII Stripping
*   Before deleting, explicitly identify and shred all biometric data, location data, and PII. 
*   If migrating or archiving deactivated accounts, you MUST explicitly strip protected RBAC fields (e.g., `role`, `clubId`) and PII from the payload. The client is inherently compromised; all stripping must occur on the server side.

#### 4. Defensive Hydration (b815 Rule)
*   If your defrag script requires querying Firestore to find the ghost data, you MUST wrap all `getDocs` calls in strict hydration guards (e.g., `if (!db || !authStore.isAuthenticated) return;`) to prevent Quota Exceeded loops during the scan.

#### 5. Verification 
*   Before finalizing the script, output a dry-run log of the exact collections and document paths that will be dropped. 
*   Ensure the function does not exceed the 80-line global limit. If the cascading delete logic is too long, extract the recursive traversal into a separate utility file inside `src/lib/utils/`.