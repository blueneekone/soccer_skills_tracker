---
name: html5-spatial-svg-math
description: Executes the precise SVG coordinate mapping (getScreenCTM().inverse()), bounding limits, and "Nuclear Americana" neon physics for the Coach OS Tron War Room Drill Designer.
---

### Execution Protocol: HTML5 Spatial SVG Math

When tasked with building or modifying the HTML5 Spatial Drill Designer or any interactive SVG canvas, you MUST adhere to the following mathematical and aesthetic constraints.

#### 1. Coordinate Translation Math
*   Do not rely on standard `clientX` / `clientY` DOM positioning. 
*   You MUST translate all mouse/touch events into the SVG coordinate space using the inverse Current Transformation Matrix (CTM).
*   Use this exact logic pattern for drag-and-drop coordinate resolution:
    ```javascript
    const pt = svgElement.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svgElement.getScreenCTM().inverse());
    ```

#### 2. Spatial Bounding & Svelte 5 Reactivity
*   Store the tactical element coordinates using Svelte 5 `$state` runes (e.g., `let diskPosition = $state({ x: 0, y: 0 })`).
*   Enforce `min-w-0` bounding mathematically. Elements must not be dragged outside the 16:9 full-screen `viewBox` boundaries. Clamp the `x` and `y` coordinates to `0` and the maximum `viewBox` width/height before updating the `$state`.

#### 3. The "Tron War Room" Aesthetic
*   **Vantablack Identity Discs:** The tactical player elements must use the Void Black `#000000` fill with a Data Cyan `#14b8a6` stroke.
*   **Neon Bloom Physics:** You must inject and apply the following SVG filter definition inside the `<defs>` tag of the canvas to create the glowing light cycle trails:
    ```xml
    <filter id="neonBloom" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
        <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
        </feMerge>
    </filter>
    ```

#### 4. 80-Line Function Limit
*   If the SVG math, bounding box collision detection, and array mutations exceed the global 80-line function limit, you must extract the coordinate math into `src/lib/utils/spatialMath.ts`.