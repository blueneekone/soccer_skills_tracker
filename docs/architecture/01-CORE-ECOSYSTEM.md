# CORE ECOSYSTEM & BACKEND (FIREBASE)
- **Stack:** SvelteKit (SSR/CSR), Firebase Auth, Firestore, Firebase Cloud Storage, Firebase Cloud Functions.
- **Tenancy:** Multi-tenant hierarchy: `Organizations` (Clubs) -> `Teams` -> `Rosters`. Data must NEVER bleed between organizations.
- **The Data Cartridge:** Plays, drills, and workouts are serialized into strict JSON interfaces. These cartridges are agnostic payloads that render in the 3D Web Deck (Coach) or 2D Mobile View (Player).