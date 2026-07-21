---
description: Scans the entire repository to evaluate current feature implementation against the master roadmap and automatically marks completed items.
---

#### Steps
1. Read the master project plan at `@ROADMAP.md` and the architecture rules at `@GEMINI.md`.
2. Scan the current workspace codebase, focusing on Epics 1 through 6, to verify the functional presence of listed features (e.g., Vanguard Prism Charts, WebAuthn Biometric Enclaves, Stripe Connect Billing).
3. Automatically modify `@ROADMAP.md` to check off (`[x]`) items that have been successfully verified as complete in the codebase.
4. Generate an Implementation Plan artifact summarizing the items that are still pending to help prioritize the next development sprint.