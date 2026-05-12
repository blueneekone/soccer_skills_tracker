# Phone Number Verification — Native Firebase Phone Auth (Web)

**Phase 2, Epic 3**

Secondary linking of a carrier-verified mobile number to an existing account.
Frictionless one-tap UX via invisible reCAPTCHA + Web OTP API auto-fill on
Chrome Android.  No Twilio.  No native shell required.

---

## Firebase Console setup (required before deploying)

1. **Enable the Phone provider**
   Firebase Console → Authentication → Sign-in method → Phone → Enable.

2. **Add test phone numbers for development**
   Phone → Phone numbers for testing → add e.g. `+15005550006` with code `000000`.
   These bypass real SMS during dev so you are never charged for test runs.

3. **reCAPTCHA domain allowlist**
   Firebase Console → Authentication → Settings → Authorised domains.
   Add your production domain (e.g. `vanguard.app`) and `localhost`.
   Without this, the invisible reCAPTCHA will silently fail.

4. **(Optional, recommended for production) App Check with reCAPTCHA Enterprise**
   - Create a reCAPTCHA Enterprise site key in Google Cloud Console.
   - Firebase Console → App Check → Apps → register your web app with the key.
   - In `src/lib/firebase.js`, call:
     ```js
     import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
     initializeAppCheck(app, {
       provider: new ReCaptchaEnterpriseProvider('<site-key>'),
       isTokenAutoRefreshEnabled: true,
     });
     ```
   - In `functions/index.js`, set `enforceAppCheck: true` on the phone-related callables.
   - Reference: https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider

---

## Critical: SMS body format for Web OTP API

For Chrome Android to intercept the SMS and auto-fill the 6-digit code, the
Firebase Auth SMS body **must end with**:

```
\n\n@<domain> #<6-digit-code>
```

Example:
```
Your Vanguard verification code is: 123456

@vanguard.app #123456
```

Firebase Auth generates this format automatically when the Phone provider is
enabled and the request originates from a correctly configured web app.  If you
see the SMS but Chrome does not auto-fill, verify:

- The origin domain matches the SMS footer domain exactly.
- `navigator.credentials.get({ otp: { transport: ['sms'] } })` is called from
  the same origin as the app (not inside an iframe).
- The browser is Chrome 84+ on Android.

---

## Rate limits

Firebase enforces the following per-phone-number limits (as of 2026):

| Window       | Limit            |
|--------------|------------------|
| Per hour     | 5 SMS sends      |
| Per day      | 10 SMS sends     |
| Per IP       | Firebase-internal|

When the limit is exceeded, Firebase returns `auth/too-many-requests`.
The engine maps this to `state = 'quota_exceeded'` and displays:
> "Too many attempts. Please wait a few minutes before retrying."

---

## Architecture

### Token flow

```
Client (Chrome Android)
  │
  ├─ linkWithPhoneNumber(user, e164, RecaptchaVerifier)
  │     │
  │     └── invisible reCAPTCHA solved silently
  │         Firebase → SMS delivered to device
  │
  ├─ Web OTP API: navigator.credentials.get({ otp: { transport: ['sms'] } })
  │     │
  │     └── Chrome intercepts SMS, resolves { code: '123456' }
  │         (or user types manually — both paths converge here)
  │
  ├─ confirmationResult.confirm('123456')
  │     │
  │     └── Firebase Auth: phone credential linked to UID
  │         user.phoneNumber now = '+15555550123'
  │         ID token now carries phone_number claim
  │
  ├─ getIdToken(user, true)  — force-refresh JWT
  │
  └─ mirrorPhoneVerification (onCall CF)
        │
        ├─ reads phone_number from JWT (tamper-proof)
        ├─ writes users/{email}: { phoneE164, phoneVerifiedAt, phoneVerified: true }
        ├─ setCustomUserClaims: { ...existing, phoneVerified: true }
        └─ syncUserClaims trigger fires → restamps all claims including phoneVerified
```

### Unlink flow

```
Client
  └─ unlinkPhoneVerification (onCall CF)
        ├─ admin.auth().updateUser(uid, { phoneNumber: null })
        ├─ users/{email} merge: { phoneE164: null, phoneVerifiedAt: null, phoneVerified: false }
        └─ setCustomUserClaims: strips phoneVerified
```

---

## Engine states and user-facing messages

| State              | User-visible message                                      |
|--------------------|-----------------------------------------------------------|
| `idle`             | (initial — form empty)                                    |
| `sending_code`     | "SENDING…" (button spinner)                               |
| `awaiting_code`    | "STEP 2 OF 2 — ENTER THE 6-DIGIT CODE"                    |
| `verifying`        | "VERIFYING…" (button spinner)                             |
| `success`          | "Phone verified · ending XXXX"                            |
| `already_linked`   | "A phone number is already linked to this account."       |
| `invalid_phone`    | "Invalid phone number. Check the format and try again."   |
| `quota_exceeded`   | "Too many attempts. Please wait a few minutes."           |
| `code_expired`     | "Code expired. Request a new one."                        |
| `wrong_code`       | "Incorrect code. Check your SMS and try again."           |
| `error`            | "An unexpected error occurred." (+ raw message in dev)    |

---

## File map

| File | Purpose |
|---|---|
| `src/lib/types/phoneVerification.ts` | TypeScript interfaces for user doc fields + callable I/O |
| `src/lib/services/recaptchaService.svelte.ts` | `createInvisibleRecaptcha` + `tearDownRecaptcha` helpers |
| `src/lib/components/phone/PhoneLinkEngine.svelte.ts` | Svelte 5 Brain — state machine + `sendCode` / `confirm` / Web OTP |
| `src/lib/components/phone/PhoneLinkArena.svelte` | Glass — 2-step UI panel with E.164 formatting |
| `src/lib/utils/phoneUtils.ts` | `toE164` / `prefixAndNationalToE164` wrappers around libphonenumber-js |
| `src/routes/(app)/account/settings/phone/+page.svelte` | Shell — auth guard + verifier lifecycle + wiring |
| `src/routes/(app)/settings/+page.svelte` | Account settings — "PHONE VERIFICATION" Bento card |
| `functions/phoneVerification.js` | `mirrorPhoneVerification` + `unlinkPhoneVerification` Cloud Functions |
| `functions/src/domains/adminOps.js` | `syncUserClaims` updated to preserve `phoneVerified` claim |
| `firestore.rules` | `hasVerifiedPhone()` helper function |

---

## Firestore user doc additions (`users/{email}`)

| Field           | Type      | Set by                       |
|-----------------|-----------|------------------------------|
| `phoneE164`     | string    | `mirrorPhoneVerification` CF |
| `phoneVerifiedAt` | Timestamp | `mirrorPhoneVerification` CF |
| `phoneVerified` | boolean   | `mirrorPhoneVerification` CF |

All three are cleared to `null` / `false` by `unlinkPhoneVerification`.

---

## JWT custom claims

| Claim           | Type    | Set by                                        |
|-----------------|---------|-----------------------------------------------|
| `phoneVerified` | boolean | `mirrorPhoneVerification` + `syncUserClaims`  |

Use `hasVerifiedPhone()` in `firestore.rules` to gate sensitive collections:

```javascript
// Example: require phone verification for high-value export
match /recruiter_export_log/{logId} {
  allow create: if authed() && isRecruiter() && hasVerifiedPhone();
}
```

---

## SMS fast-follow for Magic Uplinks

The Magic Uplink schema (`src/lib/types/magicUplink.ts`) already reserves:
- `dispatchChannel: 'email' | 'sms'`
- `phoneE164?: string`

Once a user has a verified phone (`hasVerifiedPhone()` passes), a follow-on
epic can extend `mintMagicUplink` to:
1. Accept `{ targetPhone: string }` input.
2. Set `dispatchChannel: 'sms'`.
3. Use Twilio (or Firebase's own SMS gateway) to send the `/uplink/<token>` URL
   as an SMS body.  The `redeemMagicUplink` CF is already channel-agnostic.

No schema changes are required — this is a pure additive change to the
`mintMagicUplink` function.
