# Workflow: Sprint DS4-ANIM (P1) — Micro-Animation Physics & I See You Protocol

**Role**: Google Jules
**Objective**: Enforce the "I See You" Protocol by ensuring every interaction triggers a tactile pulse or micro-animation, specifically for primary CTAs.

## Execution Steps:

1. **CSS Definitions**:
   In `src/app.css`, create the `.interactive` and `.pulse-confirm` utility classes:
   ```css
   .interactive {
       cursor: pointer;
       transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
   }
   .interactive:active {
       transform: scale(0.98);
   }
   
   @keyframes pulse-border {
       0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
       70% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
       100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
   }
   .pulse-confirm {
       animation: pulse-border 300ms ease-out;
   }
   ```

2. **Component Sweep (Interaction States)**:
   Audit all `<button>`, `<select>`, and `<a>` tags. If they are missing hover/active states, append the `.interactive` class.

3. **I See You Protocol (Action Gold Pulsing)**:
   Inject Svelte 5 event handlers on all primary `action-gold` CTAs to trigger the pulse:
   ```svelte
   onclick={(e) => { 
       e.currentTarget.classList.add('pulse-confirm'); 
       setTimeout(() => e.currentTarget?.classList.remove('pulse-confirm'), 300);
   }}
   ```

4. **Validation**:
   - Run `npx eslint` to ensure no `any` types were introduced in the Svelte event handlers.
   - Run `npx vitest run` to ensure no component tests were broken.
   - Commit and push with standard Nexus Command Automation signature.
