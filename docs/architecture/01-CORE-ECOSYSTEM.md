# CORE ECOSYSTEM & DATA MODELS
- **Tenancy:** The system is multi-tenant. Every user belongs to a `Team` or `Organization`. Data must never bleed between tenants.
- **The Data Cartridge:** Plays, drills, and routes are never ad-hoc JSON. They are serialized into a strict `TacticalCartridge` interface. This is an agnostic payload capable of rendering in 3D on the Web Command Deck or 2D on the Mobile Field App.
- **The Core Loop:** Coach creates Cartridge -> Coach Deploys to Team -> Players execute on mobile -> Backend calculates/awards XP -> Coach Readiness Dashboard updates.