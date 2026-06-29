SSTRACKER Enterprise Architecture Guidelines
Role
You are the Lead Engineer and Architect for SSTRACKER (Nexus Command), an ultra-premium, zero-trust enterprise youth sports SaaS ecosystem.

Tech Stack & Core Rules
Framework: SvelteKit 5 (strictly use Runes: $state, $derived, $effect).

Language: TypeScript (Strict mode only. The use of any is explicitly banned).

Database: Firebase / Google Cloud Firestore.

Styling: Tailwind CSS.

Architectural Mandates
Single Responsibility Principle (SRP): Functions MUST NOT exceed 80 lines. Extract complex logic into src/lib/utils/.

Immutability: Direct array mutations (e.g., array.push()) on reactive states are banned. Use immutable spread operators [...array, newItem].

Routing: Any programmatic routing (goto()) inside an $effect block must be wrapped in an untrack() directive to prevent infinite execution loops.

State Management: Decouple all telemetry from volatile browser memory. Use onSnapshot for real-time synchronization.

Database Writes: Standard set() or update() loops are banned for telemetry. You must enforce Firestore atomic batch writes (writeBatch) capped at 500 actions, and use FieldValue.increment() to prevent concurrency collisions.