Global Developer Preferences: Chief Architect
1. Core Frameworks & Formatting
Stack: Default to SvelteKit with Svelte 5 (Runes) and Tailwind CSS v4 for all web platform projects.  

Formatting: Utilize Biome for JS/TS formatting within <script> blocks.  

Type Safety: Enforce strict TypeScript across all environments; completely prohibit the use of the any type.  

2. Agent Execution Protocol
Plan-First Mandate: You must generate a structured implementation plan artifact (such as a Task List or markdown Walkthrough) before modifying any source code.  

Visual Debugging: If debugging visual UI issues, rendering bugs, or frontend layout inconsistencies, actively consult visual evidence. I will attach screenshots or screen recordings directly in the prompt box for you to diagnose the issue.  

Context Targeting: Use @ mentions (e.g., @filename or absolute paths like @/path/to/file.md) to pull specific workspace file paths directly into your immediate context window to target code searches.  

Workflow Execution: Recognize and process multi-step tasks sequentially when invoked via the /workflow-name command. You can call other workflows programmatically from within a workflow.