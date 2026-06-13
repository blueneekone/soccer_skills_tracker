# Global Admin QA — full verification checklist

**Persona:** `super_admin` / `global_admin`  
**Primary URL:** https://sstracker.app (custom domain on **`sports-skill-tracker-dev`** — not `soccer-skills-tracker.web.app`)  
**Account (example):** `ecwaechtler@gmail.com`  
**Branch:** `dev`  
**Companion doc:** [`QA_DEV_PERSONA_VERIFICATION.md`](QA_DEV_PERSONA_VERIFICATION.md) (parent · coach · player phases)

Run this checklist **before** persona phases 2–7 when you are the operator signing in as Global Admin. Paste section results (pass/fail + notes) into chat; agent logs blockers and tracks fixes.

---

## How to use this doc

1. Sign in at `/login` → expect landing on `/admin/overview`.
2. Work **top to bottom**; do not skip **Shell & chrome** (layout bugs affect every page).
3. For each row: **Pass** | **Fail** | **Skip** (with reason).
4. Use **Context Switcher** (top bar) only when a section says to pivot to Director/Coach QA views.
5. After Global Admin is green, continue persona QA at **Phase 2 — Parent VPC** in the companion doc.

**Session log template:**

```
Section:
Tester:
Deploy / commit:
Results:
Blockers (UI / functional / console):
Agent sign-off:
```

---

## A — Shell & chrome (all admin + director pages)

These checks apply on **every** enterprise workspace (admin, director, coach shell).

| # | Check | Expected | Pass |
|---|-------|----------|------|
| A.1 | Login landing | `/admin/overview` (not `/home` loop) | [ ] |
| A.2 | Sidebar nav | Seven admin links; active state matches route | [ ] |
| A.3 | **Sign out — System actions** | **One** sign-out in sidebar **System actions** (bottom). **Not** duplicated in top bar | [ ] |
| A.4 | Sign out works | Returns to `/login`; session cleared | [ ] |
| A.5 | Command palette | `Ctrl+K` / `⌘K` opens search; org jump + nav shortcuts work | [ ] |
| A.6 | Topbar search trigger | “Search & jump to…” opens palette (not broken focus trap) | [ ] |
| A.7 | Context Switcher pill | Shows `admin`; menu lists Platform, QA Director, QA Coach, etc. | [ ] |
| A.8 | Breadcrumb / workspace label | Matches current context (Global Admin / Director / Coach) | [ ] |
| A.9 | Settings icon (top right) | Opens `/settings` account page | [ ] |
| A.10 | Maintenance bypass | Super admin not blocked when maintenance flag on (optional toggle in System Settings) | [ ] |
| A.11 | Mobile (390px) | Hamburger opens sidebar; sign-out in **System actions** at bottom of drawer | [ ] |
| A.12 | Impersonation banner | After “Login as”, yellow banner + **Exit impersonation** visible | [ ] |

**Known layout regressions to watch:**

| Issue | Where | Pass when fixed |
|-------|-------|-----------------|
| Search icon overlaps placeholder text | Organizations, Recruiters, Audit Log toolbars | `AdminConsoleSearch` flex row — icon beside text, not overlay |
| Duplicate sign-out | Admin + Director shells | Only sidebar System actions — not top bar |

---

## B — Overview (`/admin/overview`)

| # | Check | Expected | Pass |
|---|-------|----------|------|
| B.1 | Page load | No infinite spinner; KPI cards or honest empty state | [ ] |
| B.2 | Tab strip | Executive · Growth · Security · Platform switch without reload loop | [ ] |
| B.3 | Charts | MAU / revenue / sport mix render or empty-state copy (no chart JS crash) | [ ] |
| B.4 | Live audit feed | Recent events or “no events” (not stuck “Decrypting…”) | [ ] |
| B.5 | Console errors | No uncaught errors on tab change | [ ] |

---

## C — Organizations (`/admin/organizations`)

| # | Check | Expected | Pass |
|---|-------|----------|------|
| C.1 | Toolbar | Title, count “N of M”, sport tabs | [ ] |
| C.2 | **Filter organizations search** | Magnifier **does not overlap** placeholder or typed text | [ ] |
| C.3 | Client filter | Typing filters table rows live | [ ] |
| C.4 | Enterprise filter panel | Verification / tier / state filters apply; reset clears | [ ] |
| C.5 | State typeahead (if >6 states) | Search states field readable; no icon overlap | [ ] |
| C.6 | Add club | Form opens; validation on required fields | [ ] |
| C.7 | StackSports import | Button present; click logs or opens flow (no silent fail) | [ ] |
| C.8 | QA tenant visible | Club **`qa_launch_2026`** in list (provision if missing) | [ ] |
| C.9 | Row actions | View org · Login as director · compliance badge | [ ] |
| C.10 | Pagination | Page controls when > page size | [ ] |

### C-drill — Org detail chain

| # | Route | Expected | Pass |
|---|-------|----------|------|
| C.11 | `/admin/organizations/[clubId]` | Identity, license, seat gauge, edit/delete | [ ] |
| C.12 | `/admin/organizations/[clubId]/teams` | Teams list; add team | [ ] |
| C.13 | `/admin/organizations/.../teams/[teamId]/roster` | Roster table; athlete filter search readable | [ ] |
| C.14 | Generate license (org detail) | Callable succeeds or shows actionable error | [ ] |

---

## D — Global Users (`/admin/users`)

| # | Check | Expected | Pass |
|---|-------|----------|------|
| D.1 | Role gate | Page loads for super_admin; others blocked | [ ] |
| D.2 | RBAC tabs | Filter by role (admin, coach, parent, player, …) | [ ] |
| D.3 | Email prefix search | Input readable; **Enter** triggers search (not on every keystroke) | [ ] |
| D.4 | Row actions | Suspend / deactivate / purge guarded for super admins | [ ] |
| D.5 | Impersonate | “Login as” sets impersonation banner; exit restores admin | [ ] |
| D.6 | Add Admin | Grant flow or validation error surfaced | [ ] |

---

## E — Recruiters (`/admin/recruiters`)

| # | Check | Expected | Pass |
|---|-------|----------|------|
| E.1 | Table load | Recruiter rows or empty state | [ ] |
| E.2 | Search toolbar | Narrow search; icon not overlapping text | [ ] |
| E.3 | Verification toggle | Status updates with toast/feedback | [ ] |
| E.4 | Checkr vetting action | Request path or honest “not configured” | [ ] |

---

## F — Audit Log (`/admin/audit-log`)

| # | Check | Expected | Pass |
|---|-------|----------|------|
| F.1 | Single load | Page fetches **once** (no reload loop) | [ ] |
| F.2 | Event search | “Search events…” — icon not overlapping text | [ ] |
| F.3 | Action filter | Secondary “Action…” filter works without magnifier clash | [ ] |
| F.4 | Table body | Rows with timestamp + action + actor, or empty state | [ ] |
| F.5 | `createdAt` / `timestamp` | Older docs still render (fallback field) | [ ] |

---

## G — Coach clearance — platform (`/admin/coach-clearance`)

| # | Check | Expected | Pass |
|---|-------|----------|------|
| G.1 | SIEM shell | Void/navy panopticon (not white Material pills) | [ ] |
| G.2 | Breadcrumb | Global Admin → Coach clearance | [ ] |
| G.3 | Matrix | Staff rows or empty state; no spinner loop | [ ] |
| G.4 | Simulate clearance | QA simulate updates coach `clearance.status` (for Phase 3 handoff) | [ ] |
| G.5 | Revoke / override actions | Director/admin actions show feedback | [ ] |

---

## H — System Settings (`/admin/system-settings`)

| # | Check | Expected | Pass |
|---|-------|----------|------|
| H.1 | Access Control | Super admin list loads | [ ] |
| H.2 | Revoke admin | Confirmation modal; list refreshes | [ ] |
| H.3 | Feature flags | Maintenance kill switch toggles (test A.10) | [ ] |
| H.4 | Integrations panel | Stripe / Checkr / maps status or config hints | [ ] |

---

## I — Deep links (not in sidebar)

Manually open each URL; confirm gate + render.

| # | Route | Expected | Pass |
|---|-------|----------|------|
| I.1 | `/admin/sports-configs` | Registry CRUD or role gate message | [ ] |
| I.2 | `/admin/rl-policy` | RL policy console for super_admin | [ ] |
| I.3 | `/admin/rebates/upload` | CSV upload UI (super_admin only) | [ ] |

---

## J — Context Switcher QA pivots

Use top-bar Context Switcher **without signing out**. Confirm nav set changes per workspace.

| # | Pivot | Lands on | Nav set | Pass |
|---|-------|----------|---------|------|
| J.1 | Platform | `/admin` | Admin sidebar (7 items) | [ ] |
| J.2 | QA: Director View | `/director` | Director tabs + staff clearance | [ ] |
| J.3 | QA: Coach View | `/coach` | Coach daily intel / forge / … | [ ] |
| J.4 | QA: Registrar View | `/director?tab=registrars` | Registrar tab active | [ ] |
| J.5 | Household (stats) | `/stats` | Player stats (troubleshooting) | [ ] |
| J.6 | Recruiting | `/recruiter` | Recruiter shell if entitled | [ ] |

**Sign out once** from any pivot → sidebar **System actions** only (A.3).

---

## K — Director surfaces (via Global Admin)

Super admin can reach director routes for club-scoped QA.

| # | Route / tab | Expected | Pass |
|---|-------------|----------|------|
| K.1 | `/director?tab=home` | Director overview loads | [ ] |
| K.2 | `/director?tab=teams` | Roster & teams | [ ] |
| K.3 | `/director?tab=licenses` | License / seat management | [ ] |
| K.4 | `/director/compliance` | Staff clearance + billing audit panel; **no reload loop** | [ ] |
| K.5 | `/director?tab=household` | Households & COPPA | [ ] |
| K.6 | `/director/events` | Tournaments list | [ ] |
| K.7 | `/director/scan/[eventId]` | Scan gate (valid event id) | [ ] |

---

## L — Cross-cutting enterprise routes

| # | Route | Expected | Pass |
|---|-------|----------|------|
| L.1 | `/settings` | Account / danger zone | [ ] |
| L.2 | `/messages` | Cross-tenant messaging UI for super_admin | [ ] |
| L.3 | `/upgrade` | Plans & billing (sidebar link on director) | [ ] |

---

## M — Blocked / troubleshooting routes

| # | Route | Expected for super_admin | Pass |
|---|-------|--------------------------|------|
| M.1 | `/parent/*` | **Blocked** — redirect per route policy | [ ] |
| M.2 | `/player/dashboard` | **Allowed** (God Mode troubleshooting) | [ ] |
| M.3 | `/player/settings` | Allowed; player rail sign-out when testing player OS | [ ] |
| M.4 | `/compliance` | Coach clearance terminal (super_admin not auto-redirected) | [ ] |

---

## N — Provision & data prerequisites

Run once before org/user checks if QA tenant is missing:

```bash
node scripts/dev-tenant-reset.mjs --provision
```

| # | Check | Pass |
|---|-------|------|
| N.1 | Club `qa_launch_2026` exists | [ ] |
| N.2 | Team `qa_launch_2026_ppc` exists | [ ] |
| N.3 | Parent / coach / player test accounts linked | [ ] |

---

## Final sign-off

| Section | Date | Pass |
|---------|------|------|
| A Shell & chrome | | [ ] |
| B Overview | | [ ] |
| C Organizations (+ drill) | | [ ] |
| D Global Users | | [ ] |
| E Recruiters | | [ ] |
| F Audit Log | | [ ] |
| G Coach clearance | | [ ] |
| H System Settings | | [ ] |
| I Deep links | | [ ] |
| J Context Switcher | | [ ] |
| K Director surfaces | | [ ] |
| L Cross-cutting | | [ ] |
| M Blocked routes | | [ ] |
| N Provision | | [ ] |

**Blockers →** GitHub issue or [`FUNCTIONAL_AUDIT_BACKLOG.md`](FUNCTIONAL_AUDIT_BACKLOG.md)

**Next after green →** [`QA_DEV_PERSONA_VERIFICATION.md`](QA_DEV_PERSONA_VERIFICATION.md) **Phase 2 — Parent VPC**
