---
trigger: always_on
---

### Rule: Workflow Directory Routing
**Activation:** Always On
**Description:** Enforces strict directory routing when creating or modifying workflow blueprints.

#### Mandate
Whenever you generate, modify, or save a `.md` workflow file, you are STRICTLY FORBIDDEN from saving it in the root `.agents/workflows/` directory. You MUST categorize and save the file into one of the following two subdirectories based on its execution environment:

1. **`.agents/workflows/local-audits/`**: Use this directory ONLY for workflows that rely on local execution. This includes visual UI/UX audits utilizing Chrome DevTools/Puppeteer, high-level project planning, roadmap parsing, and gap-analysis tools.
2. **`.agents/workflows/jules-builds/`**: Use this directory for ALL workflows designed to write application code, execute Test-Driven Development (TDD) Swarms, repair backend logic, or orchestrate multi-agent feature builds. These are files meant to be pushed to GitHub and executed in the cloud by Jules.