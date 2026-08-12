---
name: svelte5-strictness
description: Enforces Svelte 5 runes strictness, untrack() closures, and memory cleanup.
---
# Svelte 5 Reactivity Strictness

You must enforce the Svelte 5 compile-time reactivity standard. Legacy Svelte 4 reactivity syntax is completely banned.

### Mandates
1. **The Untrack Gate:** Any programmatic routing or side-effects triggered inside an \`$effect\` block MUST be safely wrapped inside an \`untrack()\` closure to prevent rendering memory loops:
   \`\`\`javascript
   $effect(() => {
     if (condition) {
       untrack(() => {
         // Safe to mutate state or route here
       });
     }
   });
   \`\`\`
2. **Garbage Collection:** Ensure dynamic components (such as those in the Spatial Drill Designer) explicitly clear their effect boundary references and event listeners upon unmounting.
3. **Raw State:** Use \`$state.raw\` instead of \`$state\` for massive, read-only telemetry data arrays to bypass deep proxying and avoid browser lag.