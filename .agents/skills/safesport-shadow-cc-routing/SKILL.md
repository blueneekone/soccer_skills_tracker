---
name: safesport-shadow-cc-routing
description: Enforces the SafeSport Shadow CC routing layer to mathematically prohibit 1:1 adult-to-minor direct messages by automatically injecting parental CCs into all payload communications for Epic 5.
---

### Execution Protocol: SafeSport Shadow CC Routing

When tasked with building or modifying the messaging system, chat functions, or any communication layer between a coach/recruiter and a player, you MUST adhere to the following strict legal and security constraints.

#### 1. The Shadow CC Mandate
*   **The Law:** 1:1 direct messaging between an adult (Coach, Director, Recruiter) and a minor is mathematically prohibited. 
*   **Execution:** Whenever a message payload is constructed where the recipient is a minor, the system MUST automatically append the linked Parent/Guardian `uid` to the thread's participants array.

#### 2. Zero-Trust Payload Validation (CSO Mandate)
*   **Client Distrust:** The frontend client is inherently compromised. A malicious user could attempt to strip the Parent `uid` from the payload before sending it. 
*   **Execution:** The Shadow CC injection and validation MUST occur securely on the backend. You must enforce this either via Firebase Cloud Functions (intercepting the message and appending the parent) or via strict Firebase Security Rules that reject the `create` operation if the parent's `uid` is missing from the payload.

#### 3. Defensive Hydration (b815 Rule)
*   When fetching the parent's `uid` to append to the message, you MUST wrap the Firestore `getDoc` call in strict hydration guards to prevent Quota Exceeded loops.

#### 4. The 80-Line Function Limit
*   If the logic required to look up the user's age, fetch the associated parent `uid`, and construct the secure message payload exceeds 80 lines, you MUST extract the routing logic into a separate utility file located at `src/lib/utils/safeSportRouting.ts`.