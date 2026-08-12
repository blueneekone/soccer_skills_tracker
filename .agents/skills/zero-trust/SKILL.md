---
name: zero-trust
description: Enforces Zero-Trust Security by stripping protected RBAC fields from client-side payloads.
---
# Zero-Trust Security

The frontend client is inherently compromised. You must never trust the client to self-assert roles or credentials.

### Mandates
1. **Payload Stripping:** Explicitly strip all protected RBAC fields (specifically `role` and `clubId`) from client-side payloads before database mutations are attempted.
2. **Cloud Function Gates:** All role modifications, streak freeze grants, and background invitations must route exclusively through secure server-side Cloud Functions that verify caller Custom JWT Claims.