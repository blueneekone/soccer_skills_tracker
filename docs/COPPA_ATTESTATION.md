# COPPA Attestation — WebAuthn Biometric Parent Consent

Phase 2, Epic 3 · VANGUARD Soccer Skills Tracker

---

## Overview

The WebAuthn COPPA Attestation feature binds a parent's consent decision to an on-device biometric credential (fingerprint, face ID, Windows Hello) using the W3C Web Authentication API. This creates a hardware-backed, cryptographically verifiable proof of the parent's identity at the moment of consent.

The attestation record is stored immutably in `coppa_attestations/{tokenId}` and satisfies the COPPA "digital signature" audit requirement for legal discovery.

---

## Sequence Diagram

```
Parent Browser                    Cloud Functions                  Firestore
─────────────                    ───────────────                  ─────────
GET /consent/{token}
                                  (token validation happens in verifyParentalConsent)
→ generateConsentAttestationChallenge({token})
                                  ← { challenge, rpId, userIdHandle, userName }
                                    Writes webauthnChallenge to consent_tokens/{token}
navigator.credentials.create({
  publicKey: {
    challenge: <32-byte random>,
    rp: { id: rpId, name: 'VANGUARD COPPA Consent' },
    user: { id: userIdHandle, name: parentEmail },
    pubKeyCredParams: [ES256, RS256],
    authenticatorSelection: { userVerification: 'required' },
    attestation: 'direct'
  }
})
→ OS biometric prompt (TouchID / FaceID / Windows Hello)
→ PublicKeyCredential returned
→ attestParentalConsent({
    token,
    action: 'granted' | 'denied',
    attestationObjectB64,
    clientDataJSONB64,
    credentialIdB64
  })
                                  1. Validate token (not consumed, not expired)
                                  2. Verify clientDataJSON:
                                     - type === 'webauthn.create'
                                     - challenge matches stored challenge
                                     - origin matches WEBAUTHN_RP_ORIGIN
                                  3. Decode attestationObject (CBOR):
                                     - Verify RP ID hash (SHA-256 of rpId)
                                     - Check UV flag (bit 2 of authData[32])
                                     - Extract COSE public key
                                  4. Atomic Firestore transaction:
                                     - consume token
                                     - flip users/{childEmail}.coppaStatus
                                     - write coppa_attestations/{tokenId}
                                  5. setCustomUserClaims: vpcVerified = true
                                  6. Write consent_logs audit entry
                                  ← { success: true, attestationStored: true }
← phase: 'granted' or 'denied'
```

---

## Fallback Policy (WebAuthn Unsupported)

If the parent's browser does not support `navigator.credentials.create` or `window.PublicKeyCredential`, the page automatically falls back to the classical `verifyParentalConsent` callable:

1. A warning banner is displayed: *"This browser cannot perform biometric attestation — your consent will be recorded by classical signature only."*
2. The existing `verifyParentalConsent` flow runs (token validation, coppaStatus flip, vpcVerified claim).
3. No `coppa_attestations` record is created for the fallback path.

Both paths produce a legally valid COPPA consent; the biometric path provides the stronger audit trail.

---

## Browser Support Matrix

| Browser | WebAuthn Support | Notes |
|---------|-----------------|-------|
| Chrome (desktop) | ✓ | TouchID / Windows Hello / security key |
| Chrome (Android) | ✓ | Fingerprint / biometric |
| Safari (iOS 16+) | ✓ | Face ID / Touch ID |
| Safari (macOS 14+) | ✓ | TouchID |
| Edge (Chromium) | ✓ | Windows Hello |
| Firefox 100+ | ✓ | Security keys; biometric depends on OS |
| Samsung Internet | ✓ | Android biometric |
| IE / Legacy Edge | ✗ | Falls back to classical path |

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `WEBAUTHN_RP_ORIGIN` | Full origin of the consent page (no trailing slash) | `https://vanguard.app` |
| `PLATFORM_URL` | Fallback if `WEBAUTHN_RP_ORIGIN` not set | `https://vanguard.app` |

Set via Firebase Functions config or Secret Manager:
```bash
firebase functions:config:set webauthn.rp_origin="https://vanguard.app"
```

---

## Firestore Schema: `coppa_attestations/{tokenId}`

| Field | Type | Description |
|-------|------|-------------|
| `tokenId` | string | consent_tokens document ID (= document ID) |
| `parentEmail` | string | Parent email (from consent_tokens.parentEmail) |
| `childUid` | string | Firebase Auth UID of the child |
| `tenantId` | string | Club/tenant the child belongs to |
| `publicKeyB64` | string | COSE public key extracted from authData, base64url |
| `attestationObjectB64` | string | Raw attestationObject from browser, base64url |
| `clientDataJSONB64` | string | Raw clientDataJSON from browser, base64url |
| `credentialIdB64` | string | credential.id from PublicKeyCredential |
| `rpId` | string | Relying Party ID (e.g. `vanguard.app`) |
| `origin` | string | Origin at attestation time |
| `action` | string | `'granted'` or `'denied'` |
| `parentIp` | string | IP address of the attesting parent (server-extracted) |
| `parentUserAgent` | string | HTTP User-Agent of the parent's browser |
| `attestedAt` | Timestamp | Server-side write timestamp |

**Access control (Firestore rules):**
- Read: `isSuper()` OR `isDirector() && tenantId == tokenClub()`
- Write: `if false` — Admin SDK only

---

## Operator Runbook: Retrieving an Attestation for Legal / Audit Response

### Via Firebase Console
1. Go to **Firestore → coppa_attestations**.
2. Use the document ID (= consent token, 64 hex chars) to look up the specific record.
3. Export the document as JSON for legal discovery.

### Via Admin SDK (Cloud Shell / Script)
```javascript
const admin = require('firebase-admin');
admin.initializeApp();
const doc = await admin.firestore()
  .collection('coppa_attestations')
  .doc('<64-char-token>')
  .get();
console.log(JSON.stringify(doc.data(), null, 2));
```

### Verifying the Attestation Offline
The `clientDataJSONB64` and `attestationObjectB64` can be decoded and verified independently:

```javascript
const clientData = JSON.parse(
  Buffer.from(attestationRecord.clientDataJSONB64, 'base64url').toString('utf8')
);
// clientData.type === 'webauthn.create'
// clientData.origin === 'https://vanguard.app'
// clientData.challenge === the challenge stored on consent_tokens/{token}
```

---

## Security Properties

- **Hardware-bound:** The private key never leaves the parent's device TPM/Secure Enclave.
- **Challenge-bound:** Each consent session uses a fresh 32-byte random challenge; replay is impossible.
- **Origin-bound:** The RP origin is verified server-side against `WEBAUTHN_RP_ORIGIN`.
- **Immutable:** `coppa_attestations` has `write: if false` in Firestore rules; Admin SDK is the only write path.
- **Rate-limited:** Max 5 challenge issuances per consent token (`challengeCount` field).
