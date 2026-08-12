---
name: audit-commissioner-os
description: Asynchronous Cloud VM workflow to audit and design the Commissioner OS.
---
# Swarm Audit: Commissioner OS (Federation Command)

@jules, please execute the visual and functional audit for the Commissioner OS.

### Rules & Gates
1. Apply \`.agents/skills/b815-hydration\` and \`.agents/skills/zero-trust\`.
2. **Circuit Breaker:** Authorized max of 3 attempts. If failing, revert, log to \`/audit-artifacts/commissioner/\`, and stop.

### Execution Sequence
- **Architecture:** Enforce B815 defensive hydration on multi-tenant federation queries. Walled off read-only ODP lookups from Admin global scripts.
- **Design:** Render dense data-analytics panels with strict 90-degree corners. Ensure absolutely no gamification chamfers are used.
- **QA:** Run tournament operations and scheduling E2E tests. Save visual proof to \`/audit-artifacts/commissioner/\`. Open a non-conflicting PR.