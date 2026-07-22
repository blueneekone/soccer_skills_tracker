---
description: E2E Single-Persona Comprehensive Audit
---

#### Description
The main agent MUST delegate all testing and execution of this workflow to the CRO (Chief Reliability Officer) subagent. This workflow isolates testing to one specific persona per session, exhaustively navigating every available page and user journey, and exporting all visual documentation to a dedicated review folder.

#### Steps
1. **Zero-Touch Authentication & Impersonation:** Do NOT pause execution to prompt for credentials, and do NOT attempt to manually type passwords into the frontend UI. Utilize the platform's native Epic 1 Account Impersonation capability. Use the Firebase MCP backend tools to programmatically mint a custom JWT token via `admin.auth().createCustomToken(uid)` for the target persona requested by the user. Inject this token directly into the browser subagent's local storage/session to bypass the login screen instantly.
2. **Microscopic Traversal (CRO Execution):** Using the integrated Chrome browser, the CRO subagent must systematically navigate to *every single page, modal, tab, and route* accessible to this specific authenticated persona. It must execute every potential user workflow (e.g., submitting forms, opening context menus, testing validation errors, and triggering database mutations) leaving no component untested.
3. **The Self-Correction Loop:** If the CRO encounters any error, broken UI, or blocked route during traversal, DO NOT prompt the user. Immediately execute a TDD fix for the broken component, restart the development server, and resume the persona workflow. Ensure all fixes adhere to Zero-Trust Security (stripping payloads on the backend) and the 80-Line Function Limit.
4. **Visual Documentation & Artifact Export:** Throughout the traversal, the agent must generate Artifacts, continuously capturing screenshots of every UI state and raw browser video recordings (MP4s) of the active sessions [cite: 559, 560]. 
5. **Final Save:** Once the comprehensive traversal is complete, output all generated video recordings, screenshots, and a detailed Walkthrough summary artifact directly into the project's `/audit-artifacts/[persona-name]/` directory so the user can review the visual proof offline.
