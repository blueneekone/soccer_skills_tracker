# COPPA & signup posture (Epic 5.1) — flows matrix

**Intent:** map **household provisioning**, minors, VPC, and **invite-vs-open** signup relative to roadmap “tear down open signup.”

## Routes (canonical)

| Flow | Routes / hooks |
|------|----------------|
| Sign-in hub | `src/routes/login/+page.svelte` |
| Finish profile after Auth | `src/routes/setup/+page.svelte`, `complete-profile` |
| Parent household | `(app)/parent/household/+page.svelte` — COPPA stamping, operative rows |
| Minor athlete pending VPC | `(app)/+layout.svelte` gate → `/vpc-pending` when `prof.isMinor` and VPC not verified |
| Director / registrar tooling | `/director`, `/registrar` (see migration doc) |

## Cloud Functions (non-exhaustive)

- `households`, `linkHousehold`, `parentGrantVpcConsent`, `directorApproveVpc`, COPPA stamping for parent digital signatures — **`functions/index.js`** (grep `household`, `Vpc`, `COPPA`).

## Intended flows

1. **Invite / roster add** — player or parent arrives via coach/director-controlled path; fewer anonymous self-signups.
2. **Operative (minor)** — child account with parent linkage; VPC / household rules apply.
3. **Adult player** — `isMinor !== true`; VPC gate may resolve to `not_required`.

## Gap vs roadmap

- **Open self-signup teardown** is **not** fully evidenced as enforced in repo — product may still allow generic auth sign-up flows until login gates and org invites are tightened.
- Coordinate with **`route-policies.js`**, **`users/{email}` rules**, and any **callable-only** provisioning before removing public signup in Firebase Console.
