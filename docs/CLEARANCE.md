# Vanguard Clearance Protocol

Background-check gate for every adult role that can touch minor PII.
Live as Epic 14; **extended** in Phase 2 Epic 2 Session K-L to cover
directors and tutors in addition to coaches and recruiters.

## Roles in scope

```
coach · recruiter · director · tutor
```

Players + parents are **not** in scope; they manage their own data.

## Data path

```
sign-up → +layout.svelte gate → /compliance → CheckrEmbed (iframe)
                                          ↓ checkr webhook (HMAC signed)
                                  users/{email}.clearance.status
                                          ↓ stampClearanceClaim()
                                  Auth.customClaims.isCleared = true
                                          ↓ token refresh
                                  rules.isCleared() = true  ✓
```

## Doc shape — `users/{email}.clearance`

```ts
{
  status: 'pending' | 'cleared' | 'flagged' | 'expired',
  checkrCandidateId?: string,
  ankoredId?: string,
  thirdPartyRef?: string,
  source?: 'checkr' | 'ankored' | 'manual_override' | 'org_vault_propagation',
  lastVerified?: Timestamp,
  clearedAt?: Timestamp,
  expiresAt?: Timestamp,
}
```

## Status mapping (Checkr → Vanguard)

| Checkr report.status | Vanguard status |
|----------------------|-----------------|
| `clear` | `cleared` |
| `consider` | `flagged` |
| `suspended` | `flagged` |
| anything else | `pending` |
| (daily sweep) | `expired` (cleared past 365d) |

## JWT claim

`stampClearanceClaim(uid, email)` is invoked on every status write.  It
sets the boolean `isCleared` custom claim, used by:

- `firestore.rules#isCleared()` — gates coach reads on minor-PII collections.
- `(app)/+layout.svelte` — redirects uncleared adult roles to `/compliance`.
- `functions/recruiterBilling.js#recordRecruiterExport` — defense in depth
  inside the callable.

## Validity & expiry

- **Window:** 365 days (`CLEARANCE_VALIDITY_DAYS` in
  `src/lib/types/backgroundCheck.ts`).
- **Sweep:** `functions/clearanceExpiry.js#expireStaleClearances` runs
  daily at 04:00 ET.  It flips stale `cleared` rows to `expired`, revokes
  the user's refresh tokens, and writes an `audit_logs` entry with action
  `clearance_expired`.

## Why these four roles

The U.S. Center for SafeSport requires background-screened adults for any
contact-level role.  All four roles meet that bar:

- **Coach** — direct contact with minor athletes.
- **Recruiter** — receives detailed contact info on minors via exports.
- **Director** — administrates household linkages and clearance overrides.
- **Tutor** — runs 1-to-1 training sessions logged against minor profiles.

## Routing

`src/routes/(app)/+layout.svelte` blocks navigation:

```js
const clearanceRoles = ['coach', 'recruiter', 'director', 'tutor'];
if (
  clearanceRoles.includes(authStore.role ?? '') &&
  !authStore.isCleared &&
  !currentPath.startsWith('/compliance')
) {
  untrack(() => goto('/compliance', { replaceState: true }));
}
```

Public-facing rationale lives at `src/routes/(marketing)/clearance-policy/`.

## Privacy posture

We store **only** the clearance status, an opaque Checkr candidate ID, and
timestamps.  SSNs, criminal records, and payment details remain inside
Checkr's iframe and never enter Firestore.

See `functions/compliance.js` for the canonical implementation of the
Checkr integration, including signature verification, organization-level
deduplication, and manual override flows for directors.
