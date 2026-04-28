# Registrar vs Director OS — migration inventory (Epic 5.2)

## Current surfaces (April 2026)

| Area | Standalone `/registrar` | Director OS (`/director`) |
|------|-------------------------|---------------------------|
| Roster edits, compliance table | `src/routes/(app)/registrar/+page.svelte` — full registrar console | Tabs: `ComplianceTab`, `HouseholdComplianceTab`, roster via `TeamsTab`, `RegistrarInviteTab` with `tab=registrars` |
| Club scope | `authStore.userProfile.clubId` + workspace context | Same + `DirectorCommandCenter`, context switcher |
| Navigation | Enterprise shell, registrar-specific IA | Sidebar: home, teams, field, registrars, brand, playbook, licenses, compliance, household |

## Parity notes

- **Compliance matrix**: exists in Director (`compliance`, `household`) and Registrar OS data loaders (`src/lib/registrar/loadComplianceRows.js`). Treat **registrar-only** workflows as authoritative until QA confirms Director tabs cover every registrar action **without** data drift.
- **Invite flows**: Director exposes `RegistrarInviteTab`; registrar page has overlapping invite/roster tooling — consolidation should pick one UX and redirect the other role-by-role once verified.

## Phased migration (suggested)

1. **Document-only** — this file + `docs/EPIC5_STATUS.md` track gaps.
2. **Navigation** — optional redirect from `/registrar` → `/director?tab=registrars` for roles that already have `/director` access (`director`, `registrar`, `global_admin`, `super_admin`); **`registrar`** was added to `ROLE_ROUTE_POLICIES['/director']` to allow that path.
3. **Decommission** — remove `/registrar` routes after feature parity and user comms.

## Redirect behavior

`src/routes/(app)/registrar/+layout.svelte` sends eligible roles to Director **Registrars** tab. If a team needs the legacy page, temporarily remove or narrow the layout guard.
