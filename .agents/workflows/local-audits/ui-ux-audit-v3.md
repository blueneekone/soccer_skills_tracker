# Workspace Workflow: Visual-In-The-Loop HUD Verification (v3)
## Command ID: `/ui-ux-audit-v3`

Enforces full, physical visual compliance across every authenticated persona view by orchestrating browser-in-the-loop Playwright executions. Mathematically asserts layouts comply with the "Nuclear Americana Tech Noir" design system tokens.

---

### ⏳ Prerequisites & Setup

1. **Dev Server:** Local SvelteKit dev server must be active on `http://localhost:5173`.
   - If not running: `npm run dev`
2. **Playwright Browsers:** Ensure Chromium is installed: `npx playwright install chromium`
3. **Trigger:** `/ui-ux-audit-v3 [Persona]`
   - Valid personas: `admin`, `director`, `coach`, `player`, `parent`, `commissioner`
   - Example: `/ui-ux-audit-v3 player`

> **HALT RULE:** If no persona is specified, halt immediately and ask: *"Which persona are we auditing?"*

---

### 🔄 Execution Flow

```
Operator Trigger
     │
     ▼
[1] Start / Confirm Dev Server → http://localhost:5173
     │
     ▼
[2] Run Playwright against tests/visual-regression.spec.ts
    Filtered to: "EPIC TRAVERSAL: [PERSONA] OS"
     │
     ▼
[3] Microscopic Layout Assertions (per route)
    ├── Dark mode background check (no white FOUC)
    ├── Bento Grid 2D collision detection
    ├── Horizontal overflow / scroll-width check
    ├── Silent text clipping detection
    ├── Hover state → Data Cyan / Atompunk Amber transition
    └── Tooltip visibility, background, and viewport bounds
     │
     ▼
[4] Persona-Specific Structural Assertions
    ├── Admin/Director → 0px border-radius (90° square corners)
    ├── Player       → chamfered clip-path + Vanguard Prism SVG radar
    └── Parent       → ≥24px border-radius (trust-building rounding)
     │
     ▼
[5] Screenshot → audit-artifacts/[persona]/[route]-desktop.png
     │
     ▼
[6] ⏸ PAUSED — Human gate review before commit
```

---

### 📋 Chronological Engineering Steps

#### 1. System Environment Activation
- Run `npx svelte-kit sync` if `.svelte-kit/tsconfig.json` is missing.
- Confirm dev server is responding on port `5173`.

#### 2. Execute Playwright Audit for Target Persona
```bash
npx playwright test tests/visual-regression.spec.ts -g "EPIC TRAVERSAL: [PERSONA] OS" --headed --project=chromium
```

Audit checkpoints enforced per route:

| Check | Assertion |
|---|---|
| Background | Not `rgb(255,255,255)` — no white FOUC |
| Horizontal scroll | `scrollWidth <= clientWidth` |
| Bento collision | No sibling overlap > 2px |
| Hover color | Must resolve to Data Cyan / Amber / Gold |
| Tooltip | Visible, background `#0B0F19`, not clipped |
| Admin panels | `borderRadius === '0px'` |
| Player cards | `clipPath` contains `polygon` |
| Parent panels | `borderRadius >= 24px` |

#### 3. Design-Token Extraction
Evaluated CSS computed values must match:

| Token | Hex | RGB |
|---|---|---|
| Void Black | `#000000` | `rgb(0,0,0)` |
| Navy Slate | `#0f172a` | `rgb(15,23,42)` |
| Data Cyan | `#14b8a6` | `rgb(20,184,166)` |
| Action Gold | `#fbbf24` | `rgb(251,191,36)` |
| Atompunk Amber | `#f59e0b` | `rgb(245,158,11)` |

#### 4. Autonomous Repair Loop
If assertions fail:
1. Read Playwright error output to identify exact element + CSS rule.
2. Apply surgical fix in `src/` (no `!important` hacks; no inline styles).
3. Re-run the spec. Repeat until `100% passed`.

#### 5. Human-in-the-Loop Screenshot Gate
Once all assertions pass:
- Screenshots are in `audit-artifacts/[persona]/[route]-desktop.png`
- **PAUSE.** Present screenshots to operator for visual sign-off.
- Press `[Enter]` in terminal to continue to commit.

#### 6. Commit the Visual Lock
```bash
git add .
git commit -m "style: visual lock — [Persona] OS audit verified"
```
