# INFRASTRUCTURE & RBAC
- **Strict Roles:** System recognizes `ADMIN`, `DIRECTOR`, `COACH`, `PARENT`, and `PLAYER`.
- **Route Guards:** The SvelteKit `+layout.js`/`.svelte` files must enforce role-based route guards. A `PLAYER` cannot access `/director`.
- **Firestore Rules:** All queries must be gated by `request.auth.uid` and custom claims.
- **Real-Time Sync:** Features like the Tactical War Room utilize optimistic UI updates while asynchronously syncing state to Firestore/WebSockets in the background.