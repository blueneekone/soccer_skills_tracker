# =============================================================================
# SSTRACKER NUCLEUS COMMAND: ULTIMATE TACTICAL WAR ROOM SWARM WORKFLOW
# =============================================================================
# This master-level workflow directs Google Jules to implement, polish, 
# and verify the ultimate sports tactics engine inside the Coach OS.
# It enforces strict Svelte 5 runes, unified roster population, interactive
# position-tagged hostile deployment, and an in-depth, premium Help panel.
# =============================================================================

# 🏛️ 1. ARCHITECTURAL & DESIGN STANDARDS (VOID BLACK TECH NOIR)
All components must adhere strictly to the Chief Design Officer (CDO) guidelines:
- **Zero Symmetrical Grids:** Evacuate any legacy flex or grid cards [cite: 391].
- **60-30-10 Palette:** Void Black (#000000) base canvas, Navy Slate panels, Structural Grey (#334155) borders, and Data Cyan (#06b6d4) interactive accents [cite: 218, 391].
- **90-Degree Atompunk Corners:** No rounded utility classes (`tw-rounded-none` only) [cite: 218].
- **Micro-Interactions:** 150ms transition thresholds with crisp scale feedback (`active:tw-scale-[0.98]`) [cite: 240].
- **Clean Headers:** The raw, ugly debug buttons must be completely removed from the main tactical headers [cite: 57].
- **Function Code limits:** Limit all helper function bodies to **80 lines of code** maximum to maintain maintainability [cite: 57].

---

# 🚀 2. TACTICAL ENGINE & HUD ENHANCEMENT ROADMAP

## A. Active Team Roster Population
- **Integration:** The `TacticalPitchBoard` must integrate with the Coach OS reactive team states.
- **Roster Panel Loading:** When the active team holds verified roster records, load those names as draggable visual tokens labeled with the player's real initials (e.g., "JS" for John Smith) or full names into a designated **"Active Roster Sidebar"** [cite: 268].
- **Interactive Dragging:** Coaches can drag players straight from their actual roster into the active play vectors on the pitch [cite: 268].

## B. Position-Specific Opponent Tokens
- **Hostile Badge Overhaul:** Right-clicking to place red defensive units must deploy circular Atompunk Amber (#fbbf24) badges displaying position acronyms [cite: 57] rather than generic serial numbers.
- **Acronym Set:** Map selections to real positional profiles:
  * `GK` (Goalkeeper) - Safe hands, penalty-box commander.
  * `CB` (Center Back) - Defensive anchor, spatial interceptor.
  * `CDM` (Center Defensive Midfielder) - Transition engine, midfield disruptor.
  * `LWB` (Left Wing Back) - Overlapping threat, wide distributor.
  * `ST` (Striker) - Clinical finisher, direct goal scorer.

## C. The Collapsible [HUD_HELP] Manual & Laws Console
Remove the raw mistake-generator buttons from the primary view. Instead, mount a low-density `[ HUD_HELP ]` toggle in the far-right header [cite: 57]. Clicking it opens a right-aligned slider manual with the following exact, high-fidelity sports science sections:

### 1. The Core Maturation & Positional Blueprint
- **CB (Center Back):** Spatial anchor; requires accelerated tactical orientation (sensitive period ages 12–14) [cite: 131, 326].
- **CDM (Defensive Midfielder):** Transition engine; demands optimal kinesthetic differentiation (form, timing, and strength modulation; sensitive period ages 10–11) [cite: 131, 306].
- **LWB (Wing Back):** High-speed overlapping; aligns with early agility and balance adaptation (ages 8–13) [cite: 131, 305].
- **ST (Striker):** Peak spatial reaction and synchronization (sensitive period ages 6–10) [cite: 131].
- **GK (Goalkeeper):** Exceptional visual reactions and upper-body coordination [cite: 499].

### 2. Pitch Dimensions per Age Group (Small-Sided Standards)
- **U6 / U8 (FUNdamentals Stage):** 4v4 (No GK) | Size 3 ball [cite: 50, 115]. Pitch size: **25 x 15 Yards** to maximize deliberate play touches [cite: 225].
- **U10 (Learn to Train Stage):** 7v7 (With GK) | Size 4 ball [cite: 50, 226]. Pitch size: **55 x 35 Yards** for basic tactical orientation [cite: 226, 326].
- **U12 (Learn to Train Stage):** 9v9 (With GK) | Size 4 ball [cite: 50, 226]. Pitch size: **75 x 50 Yards** as spatial awareness scales [cite: 226, 326].
- **U14+ (Train to Train / Investment Stage):** 11v11 | Size 5 ball [cite: 50, 226]. Pitch size: **110 x 70 Yards** (Standard field) [cite: 226].

### 3. Pediatric Safety & Laws of the Game per Stage (LTAD & AMPlify Rules)
- **Practice-to-Game Ratios:** FUNdamentals (U6-U9) and Learn to Train (U9-U12) stages require a **2:1 or 3:1 training-to-competition ratio** to prioritize movement quality and fun over high-pressure games [cite: 117, 228].
- **Volume Rule of Thumb:** Organized sports training must never exceed **the athlete's chronological age in hours per week** (e.g., a 10-year-old trains maximum 10 hours/week) [cite: 216, 228].
- **Cumulative Off-Season Cap:** Youth athletes must not participate in a single organized sport for more than **8 months cumulative per year** to avoid overtraining and overuse injuries [cite: 216, 228].
- **Mandatory Rest:** A minimum of **2 complete, consecutive days off per week** from organized sport [cite: 216, 228].
- **The "Diagnostic Check" Trigger:** Hide your testing trigger inside this panel as a subtle system check button labeled: **`[ SYSTEM_DIAGNOSTIC: INJECT_PATH_DEVIATION ]`**. Clicking it simulates a player path error to activate the *"Practice makes progress"* reset state [cite: 57, 193].

---

# 🤖 3. JULES STEP-BY-STEP IMPLEMENTATION ROADMAP

### Step 1: Scan & Audit the War Room Files
Locate your current active UI workspace:
- State Management: `src/lib/states/war-room/tacticalWarRoom.svelte.ts`
- Primary Svelte View: `src/lib/components/coach/grid/TacticalPitchBoard.svelte` (or equivalent file)
- Route Drawing Nodes: `src/lib/components/coach/grid/GridRoute.svelte`

### Step 2: Implement State and UI Mutations
1. **Roster Panel:** Add a sidebar component `<div class="tw-col-span-3 tw-bg-[#0a0a0a] tw-border-r tw-border-slate-800 tw-p-4">` displaying your player roster list [cite: 268].
2. **Positional Opponents:** Bind position properties into right-clicked hostile objects and render them as labeled monospaced circles.
3. **Collapsible HUD Help:** Move the simulate button inside a sliding sidebar panel. Include the exact in-depth text contents of sections 1, 2, and 3 [cite: 57, 193].

### Step 3: Run the Continuous Verification Loop
Run your local type checks and regression tests in your container [cite: 16]:
```bash
pnpm run check
pnpm playwright test tests/tactical-war-room-v3.spec.ts --project=chromium
```
- **If tests fail or compiler throws Svelte 5 errors:** Read the stack trace, locate any unescaped backslashes (`\\n`), reactivity loops (wrap Svelte effects in `untrack()`), or layout offsets, patch the lines, and retest up to 3 times before breaking out [cite: 57, 240].

---

# 🛡️ 4. PESSIMISTIC DEFINITION OF DONE & COMMIT HOOKS
- **Compiler standard:** Exactly **0 compile warnings and 0 errors** on build check [cite: 238].
- **Visual Assurance:** Playwright E2E suite runs 100% green [cite: 238].
- **Delivery:** Open a single non-conflicting Pull Request directly to your target branch.
