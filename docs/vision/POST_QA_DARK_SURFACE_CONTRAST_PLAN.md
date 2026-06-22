# Post-QA — dark-surface text contrast & theme toggle coherence

**Slice id:** `POST-QA-DOC-DARK-SURFACE-THEME-PLAN` (doc) · `post-qa/dark-surface-contrast` (implementation)  
**Gap register:** [`U-01`](../acquisition/PLATFORM_GAP_REGISTER.md#u-ux--theme--dark-surface-contrast-post-qa)  
**Authority:** [`ROADMAP.md`](../../ROADMAP.md) TABLED · post-acquisition queue  
**Last updated:** 2026-06-21

---

## Status

**Deferred until after owner QA (GP-ACQ / [`OWNER_QA_CHECKLIST.md`](./OWNER_QA_CHECKLIST.md) Phase 5).**

Owner is running acquisition QA first on `qa_launch_2026`. This slice is **documentation only** in the current session. CSS/Svelte/test implementation is scheduled **after GP-ACQ sign-off** — it must **not** block the exec cut or Phase 5–7 acquisition narrative.

---

## Product truth

SSTracker is **designed dark-mode-first** — Vanguard / SIEM aesthetic: `#09090B` canvas, slate/teal chrome, flat analytical Coach OS, chamfered Player OS instruments.

The app exposes a user-facing theme toggle (**Light / Dark / System**) via `themeStore` → `html.dark`. That toggle is **currently broken for UX**: many surfaces are **forced-dark** regardless of `html.dark` (e.g. `#020202` Forge workbench, `#0B0F19` login shell, `.coach-os-root`, Player HUD wells) while **global tokens in `style.css` default to light** (`:root` sets `--text-primary: #0a0a0a`, `--input-text` inherits → near-black text).

When `html.dark` is **OFF** (user picks Light or OS resolves to light), bare inputs and labels inherit light-theme text colors on dark panels → **unreadable**. Reported during QA: `/login` email field, `/coach/forge` deploy panel fields.

**Technical root:** Tailwind preflight is disabled; global `style.css` rule `input, select, textarea { color: var(--input-text) }` wins unless a surface wrapper or utility overrides it. Partial mitigation exists (`.login-surface` in `style.css` for inputs + autofill; `.coach-os-root` scoped rules on drill library). **No equivalent** on Forge deploy panel or setup wizard bare inputs.

This is **not** a request for a full light-theme redesign. The fix is: **dark-first product with a non-broken light/system preference** on forced-dark shells.

---

## Root cause — token split

Three layers fight each other:

| Layer | Behavior when `html.dark` OFF |
|-------|-------------------------------|
| **`:root` tokens** | Light text tokens (`--text-primary #0a0a0a`, `--input-text` → black) |
| **`html.dark` overrides** | Dark text/surface tokens — **not applied** when user picks Light |
| **Forced-dark shells** | Hard-coded or scoped dark backgrounds (`#020202`, `#0B0F19`, `.coach-os-root`, Player HUD) — **always dark** |

Result: dark panel + light-theme form text = contrast failure. Per-page Tailwind color utilities (`tw-text-slate-300` etc.) are inconsistent; some labels use low-opacity teal/white (`tw-text-[#14b8a6]/40`, `tw-text-white/20`) that fail WCAG even on dark backgrounds.

---

## Affected surfaces inventory

### P0 — blocks readable forms at light theme preference

| Surface | Route / component | Symptom |
|---------|-------------------|---------|
| **Login** | `/login` · `.login-surface` | Email/password near-black on `#0B0F19` when `html.dark` off; autofill may regress without scoped rules |
| **Forge deploy panel** | `/coach/forge` · `ForgeDeployPanel.svelte` · `.coach-forge-deploy-panel` | All inputs/selects unreadable @ light theme; labels/helpers low contrast |
| **Setup wizard** | `/setup` · `.setup-theme` | Bare inputs inherit `:root` `--input-text` on dark full-screen center |
| **Coach Messages DM compose** | `/messages` · `MessagesTab` dm-compose | Compose field unreadable on dark coach shell when `!html.dark` |

### P1 — same class of bug, lower acquisition exposure

| Surface | Route | Notes |
|---------|-------|-------|
| **Parent household** | `/parent/household` | Bare inputs on dark Parent OS shell if no scoped form tokens |
| **Parent VPC** | `/parent/vpc` | Ceremony form fields — same token split |

### P2 — contrast polish (dark shell, both theme prefs)

| Surface | Symptom |
|---------|---------|
| **Forge / Coach HQ labels** | Helper copy at `tw-text-[#14b8a6]/40` or `tw-text-white/20` — below readable contrast on `#020202` |
| **ForgeDeployPanel hints** | Field labels and validation hints need floor: labels ≥ teal/70 or `slate-300`; hints ≥ `white/45` |

### Out of scope (this slice)

- Full light-theme redesign of Player OS, Parent OS, or marketing surfaces
- Replacing Vanguard dark-first visual identity
- Avatar / Gemini visual system (tabled)

---

## Proposed fix — systemic, not per-page whack-a-mole

### a) `.dark-form-surface` utility in `style.css`

Extend the existing `.login-surface` pattern into a **reusable utility**:

```css
.dark-form-surface {
  color-scheme: dark;
}
.dark-form-surface label { color: #cbd5e1; }
.dark-form-surface input:not([type="checkbox"])…,
.dark-form-surface select,
.dark-form-surface textarea {
  color: #e2e8f0;
  caret-color: #e2e8f0;
}
/* placeholder, :focus, -webkit-autofill — mirror .login-surface */
```

Properties: `color-scheme: dark`, label `#cbd5e1`, input/select/textarea `#e2e8f0`, caret, autofill, placeholder — **independent of `html.dark`**.

### b) Apply wrapper class to forced-dark form hosts

| Host class | File / route |
|------------|--------------|
| `.login-surface` | `/login` — migrate to extend `.dark-form-surface` or compose both |
| `.coach-forge-workbench` | `/coach/forge` layout |
| `.coach-os-root` and/or `.coach-forge-deploy-panel` | Coach routes + Forge deploy column |
| `.setup-theme` | `/setup` |

Prefer **one wrapper** per form region over scattering input-level utilities.

### c) Raise Forge label/helper contrast

Within Forge deploy panel and related Coach form bands:

- **Labels:** ≥ `teal/70` or `slate-300` (not `/40` opacity)
- **Hints / helpers:** ≥ `white/45` (not `/20`)

Audit `ForgeDeployPanel.svelte` and `coach-forge-workbench.css` for hard-coded low-opacity utilities.

### d) MessagesTab dm-compose

Ensure compose textarea + send affordance readable on dark coach shell **without requiring `html.dark`**. Apply `.dark-form-surface` to dm-compose host or equivalent scoped rules.

### e) Optional product decision (owner)

Pick one — document choice in implementation slice:

1. **Default theme to dark** in `themeStore` (recommended for dark-first product), **or**
2. **Force `html.dark` on auth + coach routes** via layout effect (light toggle only affects Player/Parent), **or**
3. **Keep tri-state toggle** but guarantee every forced-dark shell uses `.dark-form-surface`

Option 3 is the minimum bar; 1 or 2 reduce edge-case surface area.

---

## Guard test plan

**New file:** `src/lib/platform/__tests__/contrastDarkSurfaces.guard.test.ts`

| Guard | Asserts |
|-------|---------|
| `.dark-form-surface` exists in `style.css` with label + input color rules |
| `.login-surface`, `.coach-forge-deploy-panel`, `.setup-theme` (or hosts) reference `.dark-form-surface` or equivalent scoped input colors |
| `ForgeDeployPanel.svelte` does not use `tw-text-[#14b8a6]/40` or `tw-text-white/20` on label/helper elements (post-fix) |
| Existing `loginWorkflow.test.ts` continues to assert login surface class presence |

**Verify command:**

```bash
npm test -- src/lib/platform/__tests__/contrastDarkSurfaces.guard.test.ts src/lib/auth/__tests__/loginWorkflow.test.ts
npm run check
npm run build
```

---

## Manual QA matrix (test with Light theme explicitly)

Set theme to **Light** in Settings (or OS light + System preference) before each row. Confirm `document.documentElement.classList.contains('dark') === false`.

| Id | Route | Action | Pass if |
|----|-------|--------|---------|
| **C-01** | `/login` | Focus email field; type; trigger autofill | Email text + caret readable on dark panel; autofill text light |
| **C-02** | `/login` | Password + OTP fields | Same as C-01 |
| **C-03** | `/coach/forge` | Open deploy panel; every input + select | Typed text readable; placeholder visible |
| **C-04** | `/coach/forge` | Scan all field labels + helper copy | Labels ≥ readable contrast; no `/40` teal ghost text |
| **C-05** | `/setup` | Profile provision form (if reachable) | Inputs readable on dark setup shell |
| **C-06** | `/messages` | Coach persona; open DM compose | Compose textarea readable; send control visible |
| **C-07** | `/parent/household` | Any bare form inputs | Readable @ light theme (P1) |
| **C-08** | `/parent/vpc` | VPC grant form | Readable @ light theme (P1) |

**Owner checklist ids:** QA-CONTRAST-01 (C-01–C-02) · QA-CONTRAST-02 (C-03–C-04) · QA-CONTRAST-03 (C-05) · QA-CONTRAST-04 (C-06). C-07–C-08 optional P1 follow-up.

Repeat spot-check with **Dark** and **System** preferences after fix — no regressions on dark-default path.

---

## Implementation prompt reference

**Agent mode slice (after GP-ACQ sign-off):** `DARK-SURFACE-TEXT-CONTRAST-SWEEP`

```
Scope: Implement POST_QA_DARK_SURFACE_CONTRAST_PLAN.md
- Add .dark-form-surface to style.css (extend login-surface)
- Wire hosts: login-surface, coach-forge-workbench, coach-forge-deploy-panel, setup-theme, MessagesTab dm-compose
- Raise Forge label/helper contrast floors
- Add contrastDarkSurfaces.guard.test.ts
- Do NOT redesign full light theme
- Verify: contrastDarkSurfaces.guard.test.ts + loginWorkflow.test.ts + npm run check + npm run build
- Close gap U-01; run QA-CONTRAST-01–04 manual matrix
```

---

## Cross-links

- [`OWNER_QA_CHECKLIST.md`](./OWNER_QA_CHECKLIST.md) — Post-QA fixes subsection (QA-CONTRAST-01–04)
- [`PLATFORM_GAP_REGISTER.md`](../acquisition/PLATFORM_GAP_REGISTER.md) — U-01
- [`NOTABLE_GAPS.md`](../acquisition/NOTABLE_GAPS.md) — summary matrix row
