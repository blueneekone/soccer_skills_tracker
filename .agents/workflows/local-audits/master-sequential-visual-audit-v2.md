# Master Sequential Platform-Wide Visual Audit & Recovery (v2)

Orchestrates a full platform traversal across all 6 authenticated personas in strict architectural sequence using `tests/visual-regression.spec.ts`.

---

## 🏛️ Phase 1: Environment Pre-Flight

Before initiating browser traversal, the orchestrator validates and repairs the environment:

```bash
# 1. Regenerate SvelteKit type definitions (required after cache purge)
npx svelte-kit sync

# 2. Confirm dev server is live
# If not: npm run dev
```

**Auth Bypass Method:** The spec injects a localStorage token via `page.addInitScript()` — no real login or emulator required. Profiles are hydrated with:

| Persona | UID | Role | isProfileComplete |
|---|---|---|---|
| Admin | `mock-admin-uid` | `admin` | `true` |
| Director | `mock-director-uid` | `director` | `true` |
| Coach | `mock-coach-uid` | `coach` | `true` |
| Player | `mock-player-uid` | `player` | `true` |
| Parent | `mock-parent-uid` | `parent` | `true` |
| Commissioner | `mock-commissioner-uid` | `commissioner` | `true` |

---

## 🚀 Phase 2: Sequential Persona Traversal

Run each persona in strict sequence to prevent auth token collisions. Use the `-g` grep filter:

```bash
# Admin OS (6 routes)
npx playwright test tests/visual-regression.spec.ts -g "EPIC TRAVERSAL: ADMIN OS" --headed --project=chromium

# Director OS (4 routes)
npx playwright test tests/visual-regression.spec.ts -g "EPIC TRAVERSAL: DIRECTOR OS" --headed --project=chromium

# Coach OS (6 routes)
npx playwright test tests/visual-regression.spec.ts -g "EPIC TRAVERSAL: COACH OS" --headed --project=chromium

# Player OS (5 routes)
npx playwright test tests/visual-regression.spec.ts -g "EPIC TRAVERSAL: PLAYER OS" --headed --project=chromium

# Parent OS (4 routes)
npx playwright test tests/visual-regression.spec.ts -g "EPIC TRAVERSAL: PARENT OS" --headed --project=chromium

# Commissioner OS (1 route)
npx playwright test tests/visual-regression.spec.ts -g "EPIC TRAVERSAL: COMMISSIONER OS" --headed --project=chromium
```

**Full platform run (all 26 routes):**
```bash
npx playwright test tests/visual-regression.spec.ts --headed --project=chromium
```

### Platform Areas Covered

1. **Admin OS** — `overview`, `users`, `organizations`, `audit-log`, `system-settings`, `support-terminal`
2. **Director OS** — `dashboard`, `compliance`, `events`, `uplinks`
3. **Coach OS** — `dashboard`, `tactical`, `war-room`, `drills`, `match-day`, `daily-intel`
4. **Player OS** — `dashboard`, `skill-tree`, `tracker`, `armory`, `proving-grounds`
5. **Parent OS** — `dashboard`, `household`, `trust-center`, `payments`
6. **Commissioner OS** — `matrix`

---

## 🛡️ Phase 3: Assertion Checkpoints

Every route is physically audited in headless Chromium with these mandatory checks:

### Universal Checks (all personas, all routes)
| Check | Assertion |
|---|---|
| Dark Mode | Body background is not `rgb(255,255,255)` |
| No H-Scroll | `scrollWidth <= clientWidth` |
| Bento Collision | Sibling elements do not overlap >2px |
| Text Clipping | No hidden `overflow` on text elements |
| Hover State | Interactive elements resolve to Data Cyan / Amber / Gold |
| Tooltips | Visible, correctly backgrounded, within viewport |

### Persona-Specific Checks
| Persona | Check |
|---|---|
| Admin | `borderRadius === '0px'` on all `.admin-panel` elements |
| Director | `borderRadius === '0px'` on all `.director-card` elements |
| Player | `clipPath` contains `polygon` on `.chamfered-card`; Vanguard Prism radar visible on `/dashboard` |
| Parent | `borderRadius >= 24px` on `.parent-panel` elements |

---

## 🔁 Phase 4: Self-Healing Loop

If any persona test returns failures:

1. **Diagnose:** Read Playwright error + screenshot to identify the failing element.
2. **Invoke Autofix:** Trigger `/microscopic-visual-autofix-v3 [PersonaName]` to isolate and repair.
3. **Re-run:** Execute only the failing persona's suite using the `-g` grep filter.
4. **Gate:** Only proceed to the next persona once the current one returns `100% passed`.

---

## 🔒 Phase 5: Visual Lock & Git Commit

Once all 6 personas pass:

```bash
git add audit-artifacts/
git add src/
git commit -m "style: master visual lock — all 6 personas verified [$(date -u +%Y-%m-%d)]"
git push
```

Screenshots are stored in `audit-artifacts/[persona]/[route]-desktop.png` as forensic proof.
