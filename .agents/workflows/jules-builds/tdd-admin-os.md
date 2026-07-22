---
description: TDD Swarm: Global Admin OS (The Command Plane)
---

#### Description
Builds the Admin OS for total multi-tenant infrastructure control and absolute observability.
#### Swarm Execution Steps
1. **Security & Logic (CSO & Architect):** Wire the Account Impersonation engine securely using `admin.auth().createCustomToken(uid)`. Build the Database Defrag and PII Shredder throwaway scripts for GDPR "Right to be Forgotten" compliance.
2. **Aesthetics (CDO):** Build the Telemetry Single Pane and the System Maintenance "Kill Switch." The UI must be brutally efficient, using Geist Mono for all system readouts.
3. **Critic Review:** Jules MUST verify through the Critic agent that all protected RBAC fields (role, clubId) are explicitly stripped from frontend payloads before database mutation.