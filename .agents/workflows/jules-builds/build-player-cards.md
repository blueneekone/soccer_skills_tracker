---
description: Build and Test Player Cards
---

#### Description
Builds the frontend PlayerCard.svelte component using the sliced avatars, enforces strict SKILL.md design protocols, and runs visual browser-in-the-loop tests for UI verification.

#### Steps
1. **Exploration:** Verify that the required avatar images exist in the project's asset directory. Do not write any code until the files are confirmed [cite: 1106].
2. **Planning:** Generate an Implementation Plan Artifact detailing the Svelte 5 structure, layout geometry, and Tailwind classes needed for the component [cite: 1106]. 
3. **Execution:** 
   - **Pre-flight Script:** First, execute `python scripts/slice_avatars.py` in the local terminal to automatically crop, slice, and format the raw Google Flow images [cite: 618].
   - **Delegate to CDO:** Once the images are successfully processed into `src/assets/avatars/processed`, delegate the frontend build to the `@cdo` agent. 
   - The CDO must:
     - Enforce the 12-column Bento Grid with fluid anti-squish math (`clamp(280px, 30vw, 350px)`).
     - Apply the Z2 Panel styling (Navy Slate #0f172a background against the Void Black canvas).
     - Apply chamfered clip-paths exclusively to the outer specialty card wrapper using the newly processed 731x1024 images.
     - Add a single Action Gold (#fbbf24) primary CTA beneath the card.
     - Integrate Vanguard Prism Charts for physical telemetry.
4. **Verification:** Use the Chrome DevTools and Puppeteer skills to launch a local browser-in-the-loop testing session [cite: 130, 265]. 
5. **Visual Audit:** Execute visual automation tests to ensure the 5:7 image aspect ratio does not distort or squish on mobile viewports [cite: 265]. 
6. **Artifact Generation:** Capture visual screenshots and browser recordings of the rendered component and present them to the user for final approval [cite: 130].