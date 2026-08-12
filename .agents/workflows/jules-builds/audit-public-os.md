---
name: audit-public-os
description: Overhauls the public facing static website per the CMO's core strategic directives.
---
# Swarm Audit: Public Brand OS (The Training Triangle)

@jules, please overhaul the static public website.

### Rules & Gates
1. Apply \`.agents/skills/vanguard-trinity\` and \`.agents/skills/zero-trust\`.
2. **Prerender Static Route:** You are strictly forbidden from executing any authentication calls or database fetches in this workflow.

### Execution Sequence
- **Aesthetic:** Enforce the 60-30-10 palette using Void Black and Navy Slate. Replace unstyled cards with a 12-column asymmetric Bento Grid mapping the Training Triangle.
- **Typography:** Enforce Geist Mono for technical metrics and Switzer for all brand copywriting.
- **QA:** Verify the page compiles with 0 errors via \`pnpm run check\`. Open a non-conflicting PR.