---
name: audit-fan-os
description: Asynchronous Cloud VM workflow to audit and design the Fan OS.
---
# Swarm Audit: Fan OS (Broadcast Monetization)

@jules, please execute the visual and functional audit for the Fan OS.

### Rules & Gates
1. Apply `.agents/skills/b815-hydration`.
2. **Circuit Breaker:** Authorized max of 3 attempts. If failing, revert, log to `/audit-artifacts/fan/`, and stop.

### Execution Sequence
- **Architecture:** Securely bind the Stripe-powered Superdraw Fundraising trigger, verifying campaign endTime validation.
- **Design:** Implement high-contrast broadcast overlay HUDs. Allow live fan interaction emoji particle streams to render on top of live video feeds.
- **QA:** Run visual regression tests. Deposit visual proof to `/audit-artifacts/fan/`. Open a non-conflicting PR.