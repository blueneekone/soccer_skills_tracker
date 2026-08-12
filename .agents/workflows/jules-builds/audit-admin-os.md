---
name: audit-admin-os
description: Asynchronous Cloud VM workflow to audit, secure, and design the Global Admin Console.
---
# Swarm Audit: Global Admin Console (Z4)

@jules, please execute the visual and functional audit for the Global Admin Console.

### Rules & Gates
1. Apply `.agents/skills/b815-hydration` and `.agents/skills/zero-trust`.
2. **Circuit Breaker:** Authorized max of 3 attempts. If failing, revert, log to `/audit-artifacts/admin/`, and stop.

### Execution Sequence
- **Architecture:** Wrap all `getDocs` and `onSnapshot` calls in B815 guards. Maintain the 80-line limit.
- **Security:** Ensure account impersonation routes securely mint custom JWTs via `admin.auth().createCustomToken(uid)`.
- **Design:** Implement the strict 12-column asymmetric Bento Grid with fluid clamp math. Standardize the data tables with crisp 1px borders (#334155) and Geist Mono numbers.
- **QA:** Run Playwright and Vitest. Save visual artifacts to `/audit-artifacts/admin/`. Open a non-conflicting PR.