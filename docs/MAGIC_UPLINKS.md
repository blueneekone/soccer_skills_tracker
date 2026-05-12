# Magic Uplinks — Passwordless Onboarding (Email v1)

**Phase 2, Epic 3**

Single-use, time-locked invite tokens that let directors and coaches onboard any
role without a password.  A recipient clicks a `/uplink/<token>` link, the
redeemer Cloud Function atomically verifies the token, and returns a Firebase
`signInWithCustomToken` with tenant claims pre-stamped — zero password ever set.

---

## Token format

```
<tokenId>.<secret>
```

| Segment   | Entropy      | Encoding    | Length (chars) |
|-----------|-------------|-------------|----------------|
| `tokenId` | 20 rand bytes | base64url  | ~27            |
| `.`       | separator    | literal     | 1              |
| `secret`  | 32 rand bytes | base64url  | ~43            |

The full token is embedded in the email link URL:

```
https://vanguard.app/uplink/<tokenId>.<secret>
```

Only `hex(scrypt(secret, salt))` is stored in Firestore.  The plain `secret`
travels exclusively in the email link and is never logged, persisted, or returned
by any API call.

---

## scrypt parameters

These match the parameters used in `hotelPartnerOps.js` for consistency.

| Parameter | Value  | Meaning                              |
|-----------|--------|--------------------------------------|
| `N`       | 16384  | CPU/memory cost factor               |
| `r`       | 8      | Block size                           |
| `p`       | 1      | Parallelization factor               |
| `dkLen`   | 64     | Derived key length (bytes)           |
| salt      | 32 bytes hex | Unique per uplink              |

Timing-safe comparison is performed via `crypto.timingSafeEqual` to prevent
side-channel attacks.

---

## TTL table (default by purpose)

| Purpose    | Default TTL |
|------------|-------------|
| player     | 7 days      |
| parent     | 7 days      |
| coach      | 14 days     |
| director   | 14 days     |
| registrar  | 14 days     |
| recruiter  | 30 days     |

The minter may override the default via `expiryHours` (1–720).

---

## Firestore collections

### `magic_uplinks/{tokenId}`

| Field             | Type        | Description                                      |
|-------------------|-------------|--------------------------------------------------|
| `id`              | string      | Firestore doc ID = tokenId segment               |
| `tokenHash`       | string      | `hex(scrypt(secret, salt))`                      |
| `salt`            | string      | Hex-encoded 32-byte salt                         |
| `dispatchChannel` | string      | `'email'` (SMS reserved for fast-follow)         |
| `targetEmail`     | string      | Lowercase intended recipient email               |
| `phoneE164`       | string?     | E.164 phone — only set for SMS channel           |
| `dispatchMessageId` | string?   | `mail/{docId}` ID after Trigger Email dispatch   |
| `dispatchedAt`    | Timestamp?  | Set after mail doc written                       |
| `purpose`         | string      | player·parent·coach·director·registrar·recruiter |
| `role`            | string      | JWT role claim stamped on first redemption       |
| `tenantId`        | string?     | NGB tenant                                       |
| `clubId`          | string?     | Club scope                                       |
| `teamId`          | string?     | Team scope (coach)                               |
| `householdId`     | string?     | Household scope (parent)                         |
| `status`          | string      | pending·consumed·revoked·expired                 |
| `expiresAt`       | Timestamp   | Hard expiry enforced by server                   |
| `mintedAt`        | Timestamp   | Server timestamp at creation                     |
| `mintedByUid`     | string      | UID of the minting director/coach                |
| `consumedAt`      | Timestamp?  | Set atomically on successful redemption          |
| `consumedByUid`   | string?     | Firebase UID of the account that redeemed        |
| `revokedAt`       | Timestamp?  | Set by `revokeMagicUplink`                       |
| `revokedByUid`    | string?     | Director/super_admin who revoked                 |

**Client writes: always denied.** All mutations go through the Admin SDK.

### `magic_uplink_audit/{eventId}`

Immutable audit trail.  Server writes only; super_admin read.

| Field          | Type       | Description                            |
|----------------|------------|----------------------------------------|
| `action`       | string     | minted·dispatched·redeemed·revoked·expired |
| `tokenId`      | string     | Correlation key                        |
| `targetEmail`  | string     | Recipient                              |
| `purpose`      | string     | Purpose at mint time                   |
| `actorUid`     | string?    | UID of the actor (minter/revoker)      |
| `consumedByUid`| string?    | UID of the redeemer                    |
| `clubId`       | string?    | Club scope at mint                     |
| `tenantId`     | string?    | Tenant scope at mint                   |
| `timestamp`    | Timestamp  | Server-side, tamper-evident            |

---

## Sequence diagram

```
Director/Coach          MagicUplinkComposer        mintMagicUplink CF
      │                        │                          │
      │── fill email/role ──>  │                          │
      │── click Send ────────> │── mintMagicUplink ─────> │
      │                        │                          │── generate tokenId + secret
      │                        │                          │── scrypt(secret, salt) → tokenHash
      │                        │                          │── write magic_uplinks/{tokenId}
      │                        │                          │── write magic_uplink_audit (minted)
      │                        │                          │── write mail/{docId} (Trigger Email)
      │                        │                          │── write magic_uplink_audit (dispatched)
      │                        │<── { tokenId, expiresAt }│
      │<── toast "sent" ──────  │

Recipient inbox                /uplink/[token]         redeemMagicUplink CF
      │                              │                          │
      │── clicks email link ──────>  │                          │
      │                              │── parse tokenId.secret   │
      │                              │── redeemMagicUplink ───> │
      │                              │                          │── load magic_uplinks/{tokenId}
      │                              │                          │── check status + expiresAt
      │                              │                          │── scrypt(secret, salt) compare (constant-time)
      │                              │                          │── resolve/create Firebase Auth user
      │                              │                          │── runTransaction:
      │                              │                          │     consumedAt = now
      │                              │                          │     set users/{email} (merge)
      │                              │                          │     audit row (redeemed)
      │                              │                          │── setCustomUserClaims
      │                              │                          │── createCustomToken
      │                              │<── { customToken, redirectTo }
      │                              │── signInWithCustomToken
      │                              │── goto(redirectTo)
      │<── dashboard ────────────── │

syncUserClaims trigger fires on users/{email} write → restamps cellId in JWT
```

---

## Security model

### Single-use enforcement

`redeemMagicUplink` uses `db.runTransaction()` with an optimistic lock:

1. Pre-read (fast path): reject immediately if `consumedAt`, `revokedAt`, or
   `expiresAt < now` without entering the transaction.
2. Transaction: re-read the doc inside the transaction, verify `consumedAt == null`,
   then atomically stamp `consumedAt`.  A concurrent second call will see the stamp
   and receive `failed-precondition`.

### Constant-time compare

`crypto.timingSafeEqual(derivedKey, storedKey)` is used for the scrypt comparison
so the response time does not leak information about how many bytes matched.

### Rate-limit guard (spam prevention)

`mintMagicUplink` queries for existing `pending` uplinks with the same
`(mintedByUid, targetEmail, purpose)` triple.  If 3 or more exist, the call is
rejected with `resource-exhausted`.  This prevents a compromised director account
from flooding a recipient.

### Audit trail

Every state transition (minted, dispatched, redeemed, revoked, expired) writes an
immutable row to `magic_uplink_audit`.  Rows are retained for 90 days before the
scheduled `purgeExpiredUplinks` function hard-deletes them.

---

## Cloud Functions

| Function              | Trigger    | Auth required    | Purpose                                          |
|-----------------------|------------|------------------|--------------------------------------------------|
| `mintMagicUplink`     | onCall     | director/coach/super_admin | Generate + dispatch an uplink      |
| `redeemMagicUplink`   | onCall     | **None** (public) | Verify token, return custom JWT              |
| `revokeMagicUplink`   | onCall     | director/super_admin | Cancel a pending uplink                  |
| `purgeExpiredUplinks` | onSchedule (24h) | N/A         | Stamp expired docs; hard-delete after 90 days |

---

## SMS fast-follow expansion

The schema is designed to be a superset of what email v1 needs:

- `dispatchChannel: 'email' | 'sms'` is present on every doc.
- `phoneE164` is an optional field reserved for Twilio delivery.
- `mintMagicUplink` accepts a `phoneE164` input parameter (currently unused).
- Adding SMS means: add a Twilio client, detect `dispatchChannel === 'sms'` in
  `mintMagicUplink`, send the uplink URL as an SMS body.  Zero schema changes.

The `redeemMagicUplink` and all downstream logic are completely channel-agnostic
since only the URL token matters on redemption.

---

## Firestore security rules summary

```
match /magic_uplinks/{tokenId} {
  allow read: if authed() && (
    isSuper()
    || resource.data.mintedByUid == request.auth.uid
    || (isDirector() && resource.data.clubId == tokenClub())
  );
  allow write: if false;  // Admin SDK only
}

match /magic_uplink_audit/{eventId} {
  allow read: if authed() && isSuper();
  allow write: if false;  // Admin SDK only
}
```
