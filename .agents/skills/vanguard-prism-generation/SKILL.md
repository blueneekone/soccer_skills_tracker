---
name: vanguard-prism-generation
description: Renders the 6-axis Chart.js Vanguard Prism radars for the "Scout's Six" skill tree using Svelte 5. Enforces strict canvas cleanup within $effect runes to prevent memory leaks upon unmounting.
---

### Execution Protocol: Vanguard Prism Generation

When tasked with building or modifying the Vanguard Prism Charts or any Chart.js radar component, you MUST adhere to the following architectural and aesthetic constraints.

#### 1. The "Scout's Six" Axes
*   The radar chart must always enforce exactly six axes in this specific order: 
    `['POW' (Power), 'AGI' (Agility), 'ACC' (Accuracy), 'PAC' (Pace), 'STM' (Stamina), 'COMP' (Composure)]`
*   Do not hallucinate additional stats or change the acronyms.

#### 2. Svelte 5 Lifecycle & Memory Leak Prevention
*   You must bind the `<canvas>` element using a Svelte 5 reference.
*   Chart instantiation MUST occur within an `$effect` block.
*   **CRITICAL:** You must return a cleanup function (`return () => chartInstance.destroy();`) at the end of the `$effect` block to prevent detached DOM tree memory leaks when the component unmounts.
*   If reactive chart data updates are required, safely enclose the update logic within an `untrack()` closure to prevent infinite reactivity loops.

#### 3. Aesthetic Constraints (Nuclear Americana Tech Noir)
*   **Background Void:** The chart area background must remain Void Black (`#000000`).
*   **Radar Webbing:** The grid lines (angle lines) must use Structural Grey (`#334155`).
*   **Data Fill & Stroke:** The actual player data polygon must use a Data Cyan (`#14b8a6`) stroke with a semi-transparent Data Cyan fill (`rgba(20, 184, 166, 0.2)`).
*   **Typography:** All axis labels and numerical tooltips MUST use the `Geist Mono` font family.

#### 4. The 80-Line Function Limit
*   If the Chart.js configuration object (options, scales, plugins) causes the Svelte component script block to exceed 80 lines, you MUST extract the configuration object into a separate file located at `src/lib/configs/chartConfigs.ts`.