# Workflow: Sprint DS3-GLASS (P0) — Liquid Glassmorphism 2.0 & Z-Depth Architecture Sweep

**Role**: Google Jules
**Objective**: Enforce the Atompunk Z-depth architecture and liquid glassmorphism rules across all panel components, eliminating ad-hoc tailwind backgrounds.

## Execution Steps:

1. **CSS Definition**:
   In `src/app.css`, define the five Z-depth utility classes:
   ```css
   .z0-canvas { background: #000000; }
   .z1-well { background: #0a0f1a; }
   .z2-panel { 
       background: rgba(15,23,42,0.85); 
       backdrop-filter: blur(12px) saturate(180%); 
       border: 1px solid rgba(51,65,85,0.6); 
       box-shadow: 0 0 24px rgba(20,184,166,0.08), inset 0 1px 0 rgba(255,255,255,0.04); 
   }
   .z3-identity { background: rgba(15,23,42,0.95); border: 1px solid #334155; }
   .z4-nav { background: #000000; border-bottom: 1px solid #334155; }
   ```

2. **Component Sweep**:
   Audit every `*Arena.svelte`, `*HUD.svelte`, and panel component. Replace ad-hoc `bg-slate-900`, `bg-gray-900`, `bg-neutral-900` with the correct Z-depth class.

3. **Glow Clipping Fix**:
   Search for any parent container that has BOTH `overflow-hidden` AND contains a `.z2-panel` or `.glass-panel` child. Remove `overflow-hidden` from the parent and add `border-radius: inherit; overflow: hidden` to the child instead, preserving the box-shadow glow.

4. **Validation**:
   - Run `npx playwright test --grep "z-depth" e2e/visual-regression.spec.ts` to verify no glow is clipped via visual snapshot.
   - Run `pnpm run check` to verify 0 compiler errors.
   - Commit and push with standard Nexus Command Automation signature.
