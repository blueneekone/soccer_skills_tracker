---
name: audit-director-os
description: Asynchronous Cloud VM workflow to audit and design the Director OS B2B Revenue Engine.
---
# Swarm Audit: Director OS (B2B Revenue Engine)

@jules, please execute the visual and functional audit for the Director OS.

### Rules & Gates
1. Apply \`.agents/skills/svelte5-strictness\` and \`.agents/skills/b815-hydration\`.
2. **Circuit Breaker:** Authorized max of 3 attempts. If failing, revert, log to \`/audit-artifacts/director/\`, and stop.

### Execution Sequence
- **Architecture:** Fix Svelte 5 reactivity loops by wrapping dashboard tab mutations inside strict \`untrack()\` gates.
- **Security:** Wire Stripe Connect checkout session mappings server-side.
- **Design:** Render the 12-column asymmetric Bento Grid for logistics and field matrix slots. Implement color-coded compliance scoring dots on the Compliance Tab.
- **QA:** Ensure svelte-check returns 0 errors. Deposit visual proof to \`/audit-artifacts/director/\`. Open a non-conflicting PR.