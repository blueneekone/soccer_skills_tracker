# Teen 13-16 Ad-Block Interceptors

Phase 2, Epic 3 · VANGUARD Soccer Skills Tracker

---

## Overview

COPPA 2.0 (Children's Online Privacy Protection 2026) extends the ad-data sharing restriction from children under 13 to include teenagers aged 13-16. VANGUARD implements a **four-layer zero-trust** enforcement stack that prevents any targeted advertising data from being shared for teen subjects.

---

## Age Band System

A new `ageBand` JWT custom claim and Firestore field (`users/{email}.ageBand`) classifies users into three tiers:

| Band | Age Range | Description |
|------|-----------|-------------|
| `under13` | age < 13 | Full COPPA; parental consent required |
| `teen13to16` | 13 ≤ age ≤ 16 | COPPA 2.0; targeted ad sharing blocked |
| `adult` | age ≥ 17 | Unrestricted |

**Computation:** `computeAgeBand(dob)` in `functions/src/utils/formatters.js` derives the band from the player's date of birth.

**Stamping:** `setPlayerDateOfBirth` and `playerSelfReportDob` write `ageBand` to `users/{email}`. The `syncUserClaims` Cloud Function trigger stamps `ageBand` into the JWT custom claim on every login.

**Default for legacy users:** If a user has no DOB on file, `ageBand` defaults to:
- `'teen13to16'` if `isMinor === true` (lean-restrictive)
- `'adult'` otherwise

---

## Four-Layer Enforcement Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Teen 13-16 Zero-Trust Stack                  │
├────────────────────────────────────────────────────────────────┤
│ Layer 1 │ Firestore Security Rules                             │
│         │ isTeen13to16() / ageBandBlocksAdShare()              │
│         │ Gates: public_player_profiles, recruiter_export_log  │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2 │ Cloud Function Write Validators                       │
│         │ teenAdInterceptor.js                                  │
│         │ assertNoTeenForAdContext() — zero-tolerance           │
│         │ filterTeenRows() — drop-and-audit                     │
│         │ Wired into: recruiterBilling, profileSyncer,          │
│         │             partnerHandlers, mail dispatch            │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3 │ Client Pixel Suppression                              │
│         │ teenAdGuard.svelte.js                                 │
│         │ loadThirdPartyScript() — blocks FB Pixel, gtag        │
│         │ isTeenAdBlocked — reactive Svelte 5 derived state     │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4 │ Cell-Level Egress Whitelist                           │
│         │ egressGuard.js                                        │
│         │ Wraps globalThis.fetch                                │
│         │ AsyncLocalStorage per-request taint propagation       │
│         │ Blocks non-whitelisted outbound fetch for teen data   │
└─────────────────────────────────────────────────────────────────┘
```

Each layer operates independently. A failure or bypass in one layer does not disable the others.

---

## Layer 1: Firestore Security Rules

Three helper functions added to `firestore.rules`:

```
function tokenAgeBand() {
  return request.auth.token.ageBand != null ? request.auth.token.ageBand : 'adult';
}
function isTeen13to16() {
  return authed() && tokenAgeBand() == 'teen13to16';
}
function ageBandBlocksAdShare() {
  return authed() && (tokenAgeBand() == 'teen13to16' || tokenAgeBand() == 'under13');
}
```

**Collection gates:**
- `public_player_profiles/{uid}`: recruiters cannot read teen profiles.
- `recruiter_export_log/{exportId}`: client cannot read export rows with `containsTeenRows: true`.

---

## Layer 2: Cloud Function Write Validators

### `functions/teenAdInterceptor.js`

| Export | Description |
|--------|-------------|
| `assertNoTeenForAdContext(rows, type, ctx)` | Throws `TEEN_BLOCKED` if ANY row maps to teen13to16. Zero-tolerance. |
| `filterTeenRows(rows, options)` | Non-throwing; returns `{ kept, dropped }`. Writes audit for dropped rows. |
| `markPayloadTainted(context)` | Sets `context.teenTainted = true` for egress guard propagation. |
| `logTeenAdBlock` (onCall) | Beacon from client guard; writes `ad_block_audit`. |

**Integration points:**
- `recruiterBilling.js` → `filterTeenRows` + reject if any dropped
- `profileSyncer.js` → early-return + delete public doc for teen13to16
- `partnerHandlers/hotelRebates.js` → `assertNoTeenForAdContext` (documents pattern)
- `coppa.js sendMail` → `mailType: 'transactional'` convention
- `magicUplinks.js sendMagicUplinkEmail` → `mailType: 'transactional'`

### `mailType` Convention

| Value | Description | Teen Block |
|-------|-------------|-----------|
| `'transactional'` | Consent emails, OTP, invite links | Never blocked |
| `'marketing'` | Newsletters, event announcements | Blocked for teen subjects |

---

## Layer 3: Client Pixel Suppression

### `src/lib/stores/teenAdGuard.svelte.js`

```javascript
import { loadThirdPartyScript, isTeenAdBlocked } from '$lib/stores/teenAdGuard.svelte.js';

// Gate UI sections:
if (!isTeenAdBlocked.current) {
  loadAnalytics();
}

// Load a script (auto-suppressed for teens):
loadThirdPartyScript('https://connect.facebook.net/en_US/fbevents.js', 'fb-pixel');
```

When `isTeenAdBlocked.current === true`:
- `loadThirdPartyScript` returns `null` without injecting.
- Console warning is emitted.
- `logTeenAdBlock` CF beacon is fired (writes `ad_block_audit`).

**Any new third-party SDK must use `loadThirdPartyScript`** — see note in `src/app.html`.

---

## Layer 4: Cell-Level Egress Guard

### `functions/egressGuard.js`

Wraps `globalThis.fetch` before any other module loads (installed at top of `functions/index.js`).

**Per-request context (AsyncLocalStorage):**
```javascript
const { egressContext } = require('./egressGuard');
await egressContext.run(
  { teenTainted: true, callerUid: uid, integrationType: 'recruiter_export' },
  () => yourHandler()
);
```

Inside `yourHandler()`, any outbound fetch to a non-whitelisted host throws `EgressBlockedError`.

---

## Egress Whitelist

Hosts **always allowed** even for teen-tainted requests:

| Host Pattern | Service |
|-------------|---------|
| `*.googleapis.com` | Firebase, Cloud Functions internals |
| `*.firebaseio.com` | Firebase Realtime Database |
| `api.stripe.com` | Stripe payments |
| `*.sendgrid.net` | Transactional email |
| `api.checkr.com` | Background checks |
| `api.open-meteo.com` | Weather data |
| `api.weather.gov` | Weather data |
| `fcm.googleapis.com` | Firebase Cloud Messaging |

## Ad-Tech Blocklist

Hosts **blocked for teen-tainted requests**:

| Host | Service |
|------|---------|
| `connect.facebook.net` | Facebook Pixel / Meta SDK |
| `googletagmanager.com` | Google Tag Manager |
| `google-analytics.com` | GA4 / Universal Analytics |
| `doubleclick.net` | Google Display Network |
| `tiktok.com` | TikTok Pixel |
| `snap.licdn.com` | LinkedIn Insight |
| `bat.bing.com` | Microsoft Advertising UET |
| `ads.twitter.com` | X (Twitter) Pixel |
| `clarity.ms` | Microsoft Clarity |
| `cdn.amplitude.com` | Amplitude Analytics |
| `cdn.segment.com` | Segment CDP |

---

## Adding a New Partner Without Tripping the Egress Guard

1. **Check if the partner is ad-tech** (collects, profiles, or targets users for advertising).
   - If yes: add to `EGRESS_AD_BLOCKLIST` in `egressGuard.js`.
   - If no: add to `EGRESS_WHITELIST`.

2. **If the partner receives player data**, call `assertNoTeenForAdContext` (or `filterTeenRows`) before sending any payload. See `partnerHandlers/hotelRebates.js` for the pattern.

3. **Test with the smoke test** in `functions/__tests__/egressGuard.test.js`.

4. **Document the partner** in this file's tables above.

---

## Audit Collections

### `ad_block_audit/{logId}`

Written by: `teenAdInterceptor.js` (CF), `egressGuard.js` (CF), `logTeenAdBlock` onCall (client beacon).

| Field | Type | Description |
|-------|------|-------------|
| `integrationType` | string | e.g. `'recruiter_export'`, `'client_pixel_block'` |
| `blockedEmailHashes` | string[] | SHA-256 first 16 hex chars of blocked emails |
| `blockedCount` | number | Number of blocked subjects |
| `callerUid` | string | Firebase Auth UID of the CF caller |
| `callerIp` | string | IP address of the caller |
| `reason` | string | e.g. `'assertNoTeenForAdContext_thrown'` |
| `at` | Timestamp | Server-side write timestamp |

**Access:** `isSuper()` or `isDirector() && tenantId == tokenClub()`

### `egress_block_audit/{logId}`

Written by: `egressGuard.js` `wrapFetch` interceptor.

| Field | Type | Description |
|-------|------|-------------|
| `host` | string | Blocked destination hostname |
| `callerUid` | string | UID from egress context |
| `integrationType` | string | Integration type from egress context |
| `stackFrame` | string | JS stack frame (for debugging) |
| `at` | Timestamp | Server-side write timestamp |

**Access:** `isSuper()` only (network-level detail)

---

## Compliance Report Queries

### Pull all ad blocks for a tenant (Firestore console)
```
Collection: ad_block_audit
Filter: tenantId == '<clubId>'
Order by: at DESC
```

### Count blocks by integration type (Admin SDK)
```javascript
const snap = await admin.firestore()
  .collection('ad_block_audit')
  .where('integrationType', '==', 'recruiter_export')
  .get();
console.log(`Total recruiter export blocks: ${snap.size}`);
```

### Pull all egress blocks in the last 30 days
```javascript
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const snap = await admin.firestore()
  .collection('egress_block_audit')
  .where('at', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
  .orderBy('at', 'desc')
  .get();
snap.forEach(doc => console.log(doc.data()));
```
