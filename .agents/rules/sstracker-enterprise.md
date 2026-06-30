---
name: sstracker-experts
description: Core principles for Svelte 5 frontend architecture and Firebase v10 database execution.
---

### SSTracker Technical Syntax Guidelines

#### Svelte 5 Frontend Architecture (for `*.svelte` files)
*   **Runes Mandate:** You are writing Svelte 5. You MUST use Runes (`$state`, `$derived`, `$effect`). NEVER use Svelte 4 `export let` syntax [7].
*   **CSS Architecture:** All CSS MUST be placed inside a `<style>` tag at the bottom of the file or use Tailwind classes with the `tw-` prefix [7]. Do not use inline styles [42].
*   **Design Implementation:** Apply the "Strategic Minimalism" design rules: Use `Geist Mono` for data, remove heavy glassmorphism, use deep slate (`#0B0F19`) backgrounds, and utilize `clamp()` functions for liquid padding spacing [4].

#### Firebase v10 & Security Architecture (for `*.ts` and `*.js` files)
*   **Modular SDK:** You are writing Firebase/Firestore logic. You MUST use the v10+ Modular SDK (e.g., `import { doc, setDoc } from 'firebase/firestore'`). NEVER use the compat SDK [7].
*   **Atomic Data Safety:** If updating multiple documents, you MUST use `writeBatch` capped at 500 operations [13, 14]. If incrementing a counter, you MUST use `increment()` to prevent race conditions [13, 40].
*   **Zero-Trust Enforced:** Never trust client payloads. Validate roles and isolated cell access via Custom JWT claims [24, 43].