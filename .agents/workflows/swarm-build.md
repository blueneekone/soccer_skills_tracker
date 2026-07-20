---
description: Master Assembly Line
---

# Workflow: Swarm Assembly Line
**Description**: Orchestrates the 5-person Executive Council to build, design, secure, and test a feature autonomously.

## Step 1: Logic & Architecture (The Architect)
- **Action**: SPAWN SUBAGENT `architect`. 
- **Task**: Instruct the Architect to build the data models, Svelte 5 state logic, and Firebase mutations for the requested feature. Instruct it to leave the UI unstyled.

## Step 2: Behavioral Injection (The CPO)
- **Action**: SPAWN SUBAGENT `cpo`.
- **Task**: Pass the Architect's code to the CPO. Instruct the CPO to inject necessary streak, XP, or EQ embargo logic into the data pipeline.

## Step 3: Security Hardening (The CSO)
- **Action**: SPAWN SUBAGENT `cso`.
- **Task**: Instruct the CSO to audit the combined code. Write the corresponding Firebase Security Rules and verify COPPA compliance and RBAC stripping.

## Step 4: UI & Styling (The CDO)
- **Action**: SPAWN SUBAGENT `cdo`.
- **Task**: Pass the secured, functional Svelte components to the CDO. Instruct the CDO to apply the "Nuclear Americana Tech Noir" CSS Grid layout using Tailwind. Do NOT let the CDO alter the `$state` logic.

## Step 5: Final QA & Handover (The CRO)
- **Action**: SPAWN SUBAGENT `cro`.
- **Task**: Instruct the CRO to review the final files for memory leaks, layout blowouts, and strict rule adherence. 
- **Final Action**: Package the approved files into a single output for the user.