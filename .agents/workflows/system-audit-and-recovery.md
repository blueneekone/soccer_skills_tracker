---
description: Audit Workflow
---

# Workflow: System Audit and Recovery
**Description**: Acts as an incoming Principal Software Architect auditing the SSTracker codebase to align current reality with the Master Roadmap.

## Step 1: Vision & Constraints Ingestion
- **Action**: Read `@ROADMAP.md` and `@GEMINI.md` in their entirety. 
- **Task**: Understand the "20-Year Veteran Council" persona, the Svelte 5 requirements, the Firebase defensive hydration rules (b815), and the Epic completion statuses. Do not write any code yet. 

## Step 2: Codebase Reconnaissance & Gap Analysis
- **Action**: Use code search and file reading capabilities to scan `src/routes/`, `src/lib/`, and your Firebase configuration files. 
- **Task**: Compare the actual codebase against the checked-off items in `@ROADMAP.md`. 
- **Output**: Generate a **Gap Analysis Artifact**. This must cleanly list:
  1. What is built and working correctly.
  2. What is built but violates the rules in `GEMINI.md` (e.g., Svelte 5 reactivity errors, missing untrack() closures, bloated functions > 80 lines).
  3. What is marked as complete in the Roadmap but is actually missing or broken in the code.

## Step 3: The Recovery Pipeline Generation
- **Action**: Based on the Gap Analysis, pause and wait for the user to approve the findings.
- **Task**: Once approved, do NOT start fixing the code directly. Instead, generate a set of specific **Workflow Files** (like `.agents/workflows/fix-auth-routing.md` or `.agents/workflows/rebuild-streak-counter.md`) that break down the necessary fixes into strict, isolated, step-by-step processes.
- **Constraint**: Ensure every generated workflow enforces the Vanguard Trinity Pattern and the 80-line function limit.

## Step 4: Handover
- **Action**: Present the user with a clean list of the newly generated workflows and ask which one they would like to execute first.