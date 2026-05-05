# INFRASTRUCTURE & SECURITY
- **Real-Time Sync:** The Tactical Command Deck is a live collaborative environment. Assume WebSockets or SSE for all tactical board state changes. Use Optimistic UI updates on the frontend.
- **Strict RBAC:** Roles include `ORG_ADMIN`, `HEAD_COACH`, `ASST_COACH`, and `FIELD_UNIT`. 
- **The Web Deck:** `FIELD_UNIT` accounts (Players) are strictly forbidden from altering Tactical Cartridges. If a player logs into the web dashboard, the engine renders in "Read-Only Hologram Mode" (No dragging/drawing).
- **The Mobile Edge:** Players executing routes on the mobile app sync offline-first. XP earned on the edge queues locally and syncs to the `SquadTelemetryView` upon connectivity restoration.