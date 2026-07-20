---
name: dopamine-skill-decay
description: Calculates the 2% daily loss avoidance metrics (skill decay), manages streak freezes, and triggers canvas-confetti strictly on verified database commits for Epic 4.
---

### Execution Protocol: Dopamine Engine & Skill Decay Math

When tasked with implementing gamification mechanics, streak counters, or visual rewards, you MUST adhere to the following behavioral psychology and mathematical constraints.

#### 1. The 2% Skill Decay (Loss Avoidance)
*   **The Math:** If an athlete fails to log a verified training session within a 24-hour rolling window, their "Scout's Six" skill ratings must degrade by exactly 2%. 
*   **The Psychology:** This utilizes Black Hat motivation (Loss Aversion). Users are mathematically forced to return to protect their progress because the psychological pain of losing 2% of their stats is greater than the effort required to practice.

#### 2. Streak Freezes & Burnout Protection
*   **The Guardrail:** Breaking a long streak without a safety net causes severe user burnout (the "rage-quit" effect). 
*   **The Logic:** Before applying the 2% daily decay or resetting the streak counter to zero, you MUST query the database to check if the user has an active `streakFreeze` or `weekendAmulet` token. If true, consume the token, maintain the current streak count, and bypass the 2% decay penalty.

#### 3. Canvas-Confetti Validation (The Dopamine Hit)
*   **Zero-Spoofing Rule:** Do not attach the `canvas-confetti` explosion trigger directly to a frontend button `onclick` event. The client is compromised and players could spam the button for fake rewards.
*   **Execution:** The confetti particle explosion MUST fire strictly inside the `.then()` block or `try/catch` success block of a verified Firestore `setDoc`, `updateDoc`, or `addDoc` commit. 
*   **Performance:** The animation must never block the main Svelte 5 layout rendering. 

#### 4. The 80-Line Function Limit
*   If the mathematical logic for determining the 2% decay across the 6-axis skill tree combined with the streak freeze verification exceeds 80 lines, you MUST extract the math into a pure utility function located at `src/lib/utils/gamificationMath.ts`.