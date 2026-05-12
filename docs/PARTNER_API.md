# Vanguard Partner API — Hotel Block Rebates

**Version:** 1.0  
**Base URL:** `https://vanguardcommand.app/v1`  
**Authentication:** Partner API key + HMAC body signature  
**Format:** JSON  

---

## Overview

Hotel partners (Marriott Bonvoy, Hilton Honors, and compatible booking platforms) file room-night commission statements against Vanguard through this REST API. Vanguard records the commission, splits it between the host NGB and Vanguard's platform fee, and queues a Stripe Transfer to pay the NGB.

Two payload formats are supported:

| `payloadFormat` | Description |
|---|---|
| `vanguard_v1` | Vanguard native (default) |
| `marriott_v1` | Marriott Group Commission API shape |
| `hilton_v1`   | Hilton Group Sales Commission shape |

Your account's `payloadFormat` is set at provisioning. Contact your Vanguard account manager to change it.

---

## Authentication

Every request must include:

```
Authorization: Partner <partnerId>:<base64url-api-key>
X-Vanguard-Signature: <hex(HMAC-SHA256(rawBody, signingKeyMaterial))>
X-Vanguard-Timestamp: <unix-milliseconds>
```

### Signing key material

The `signingKeyMaterial` used in the HMAC is the **hex-encoded scrypt-derived hash** of your signing secret:

```
signingKeyMaterial = hex(scrypt(signingSecret, keySalt, 64, {N:16384, r:8, p:1}))
```

Your `keySalt` is provided during provisioning. Both `signingSecret` and `keySalt` are returned once at provisioning and never retrievable again. If lost, request a key rotation.

### Timestamp replay protection

`X-Vanguard-Timestamp` must be within **±5 minutes** of the server clock. Requests outside this window are rejected with HTTP 401.

---

## Endpoints

### POST `/v1/partners/hotel-rebates`

File a commission statement. Idempotent on `idempotencyKey` — duplicate submissions return the original result without double-counting.

**Required headers:** `Authorization`, `X-Vanguard-Signature`, `X-Vanguard-Timestamp`, `Content-Type: application/json`  
**Rate limit:** 600 requests / minute per partner

#### Native (`vanguard_v1`) request body

```json
{
  "nationalGoverningBodyId": "acme_fc",
  "periodStart": "2026-04-01",
  "periodEnd": "2026-04-05",
  "roomNights": 180,
  "partnerCommissionCents": 145000,
  "idempotencyKey": "SETTLE-2026-04-ABC123",
  "timestamp": 1746108000000,
  "linkedEventId": "spring_invitational_2026"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `nationalGoverningBodyId` | string | ✓ | Vanguard NGB tenant ID agreed with Vanguard |
| `periodStart` | ISO-8601 date | ✓ | First night of stay |
| `periodEnd` | ISO-8601 date | ✓ | Last night of stay (checkout date) |
| `roomNights` | integer | ✓ | Total occupied room nights |
| `partnerCommissionCents` | integer | ✓ | Gross commission amount in USD cents |
| `idempotencyKey` | string | ✓ | Your settlement reference (min 3 chars) |
| `timestamp` | integer (unix ms) | ✓ | Must be within 5 minutes of server time |
| `linkedEventId` | string | | Optional link to a `tournament_events` doc |

#### Marriott V1 request body (`marriott_v1` partners)

```json
{
  "settlement_id": "MARR-20260430-ABC123",
  "property_code": "WASDC",
  "group_code": "VGRD-SPRING26",
  "arrival_date": "2026-04-01",
  "departure_date": "2026-04-05",
  "occupied_room_nights": 180,
  "commission_usd": 1450.00,
  "ngb_account_id": "acme_fc",
  "timestamp": 1746108000000
}
```

#### Hilton V1 request body (`hilton_v1` partners)

```json
{
  "confirmation_number": "HIL-2026-78901",
  "property_id": "HNLDT",
  "group_name": "Vanguard Spring Tournament",
  "check_in": "2026-04-02",
  "check_out": "2026-04-06",
  "room_nights_billed": 220,
  "commission_amount": "1820.00",
  "currency": "USD",
  "partner_reference": "acme_fc",
  "timestamp": 1746108000000
}
```

> **Note:** Only `currency: "USD"` is supported in the Hilton adapter.

#### Success response `201 Created`

```json
{
  "rebateId": "SETTLE-2026-04-ABC123",
  "ngbCreditCents": -101500,
  "vanguardRetentionCents": 43500,
  "rateBp": -7000
}
```

| Field | Description |
|---|---|
| `rebateId` | Stable identifier for this rebate record |
| `ngbCreditCents` | Amount (negative = credit) transferred to the NGB |
| `vanguardRetentionCents` | Amount retained by Vanguard |
| `rateBp` | Rate in basis points used for the split |

#### Idempotent replay response `200 OK`

When the same `idempotencyKey` is submitted again, the original response is returned with `alreadyRecorded: true`. No double-billing occurs.

---

### GET `/v1/partners/hotel-rebates/:rebateId`

Retrieve a previously filed rebate.  Partners can only read their own records.

#### Success response `200 OK`

```json
{
  "rebateId": "SETTLE-2026-04-ABC123",
  "tenantId": "acme_fc",
  "status": "submitted",
  "partnerCommissionCents": 145000,
  "ngbCreditCents": -101500,
  "vanguardRetentionCents": 43500,
  "rateBp": -7000,
  "periodStart": "2026-04-01",
  "periodEnd": "2026-04-05",
  "roomNights": 180,
  "linkedEventId": "spring_invitational_2026",
  "submittedAt": "2026-04-30T12:00:00.000Z"
}
```

**Rebate statuses:**

| Status | Meaning |
|---|---|
| `submitted` | Filed; pending platform review |
| `approved` | Approved; Transfer queued |
| `transferred` | Stripe Transfer complete; NGB paid |
| `rejected` | Rejected; contact support |

---

## Error codes

| HTTP | `error` | Description |
|---|---|---|
| 400 | `invalid_argument` | Missing or invalid field |
| 400 | `invalid_payload` | Adapter-level payload shape error |
| 400 | `idempotency_key_required` | Mutating request missing `idempotencyKey` |
| 401 | `unauthenticated` | Missing/invalid credentials, expired timestamp, or bad signature |
| 403 | `permission_denied` | Partner account paused/revoked, or NGB not in allowlist |
| 404 | `not_found` | NGB or rebate not found |
| 429 | `rate_limited` | Exceeded 600 req/min; back off and retry |
| 500 | `internal` | Contact support |

---

## Example: signing a request (Node.js)

```js
const crypto = require('crypto');

const PARTNER_ID    = process.env.VANGUARD_PARTNER_ID;
const API_KEY       = process.env.VANGUARD_API_KEY;
const SIGNING_KEY   = process.env.VANGUARD_SIGNING_KEY_MATERIAL; // hex scrypt hash

const body = JSON.stringify({
  nationalGoverningBodyId: 'acme_fc',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-05',
  roomNights: 180,
  partnerCommissionCents: 145000,
  idempotencyKey: 'SETTLE-2026-04-ABC123',
  timestamp: Date.now(),
});

const signature = crypto.createHmac('sha256', SIGNING_KEY)
  .update(body)
  .digest('hex');

const response = await fetch('https://vanguardcommand.app/v1/partners/hotel-rebates', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Partner ${PARTNER_ID}:${Buffer.from(API_KEY).toString('base64url')}`,
    'X-Vanguard-Signature': signature,
    'X-Vanguard-Timestamp': String(Date.now()),
  },
  body,
});
```

---

## Key rotation

When a key rotation is requested:
1. Your new credentials are returned **once** — save them immediately.
2. Your **previous** credentials remain valid for **24 hours** (grace period).
3. Update your production systems within the grace window.
4. After 24 hours the old credentials are permanently invalidated.

---

## Partner onboarding checklist

- [ ] Receive `partnerId`, `apiKey`, `signingSecret`, and `keySalt` from Vanguard provisioning.
- [ ] Derive `signingKeyMaterial = hex(scrypt(signingSecret, keySalt, 64, {N:16384, r:8, p:1}))` and store it securely.
- [ ] Confirm your `payloadFormat` with your Vanguard account manager.
- [ ] Confirm the `nationalGoverningBodyId` values your allowlist covers.
- [ ] Test using a staging payload with a dummy `idempotencyKey` (e.g. `"test-001"`).
- [ ] File the first live commission statement after your first group block completes.

---

*For API support: api-support@vanguardcommand.app*
