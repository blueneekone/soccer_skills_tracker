# SSTracker — Demo Environment Secrets Runbook

**Purpose:** Operator checklist for buyer demos on **`sports-skill-tracker-dev`** / https://sstracker.app.  
**Not production:** Do not apply this runbook to `soccer-skills-tracker` (prod).  
**Authority:** [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) · [`TRANSFER.md`](./TRANSFER.md) §3 · [`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md)

---

## Tier 0 — Deploy + tenant (no secrets)

Run before every demo when callables fail or hosting is stale.

### Phase 0 deploy

```bash
firebase use sports-skill-tracker-dev
export FUNCTIONS_DISCOVERY_TIMEOUT=120
cp functions/.env.sports-skill-tracker-dev functions-core/.env
cp functions/.env.sports-skill-tracker-dev functions-rl/.env
cp functions/.env.sports-skill-tracker-dev functions-commerce/.env
cp functions/.env.sports-skill-tracker-dev functions-compliance/.env
cp functions/.env.sports-skill-tracker-dev functions-integrations/.env
cp functions/.env.sports-skill-tracker-dev functions-platform/.env
npm run build
firebase deploy --only firestore:rules,storage
npm run deploy:backend:systematic
npm run deploy:comms
firebase deploy --only hosting
```

Full checklist: [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md) Phase 0

### QA tenant provision (first-time or broken tenant)

```bash
node scripts/dev-tenant-reset.mjs --provision --club-id qa_launch_2026 --team-id qa_launch_2026_ppc
```

| Field | Value |
|-------|-------|
| Club | `qa_launch_2026` |
| Team | `qa_launch_2026_ppc` |
| Team dispatch code | `QA-PP26` |
| Household doc | `qa_launch_2026_parent_hh` |

### Test accounts

| Role | Account |
|------|---------|
| Super admin | `ecwaechtler@gmail.com` |
| Parent | `ecwaechtler+parent@gmail.com` |
| Coach | `ecwaechtler+coach@gmail.com` |
| Player | Operative linked via parent household (`*@operative.local`) |

**Comms demo:** Parent must enable **`consentComms`** in VPC (`/parent/vpc`) before omnichannel / Parent Lounge demos work.

### Between demos (same operative — stats only)

```bash
node scripts/dev-tenant-reset.mjs --reset-demo-stats --club-id qa_launch_2026
# Owner approval, then:
node scripts/dev-tenant-reset.mjs --reset-demo-stats --execute --club-id qa_launch_2026
```

Preserves operative Auth, household link, VPC/consent. Wipes XP, missions, bounties, team-scoped stats. See [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).

---

## Tier 1 — Exec cut minimum (MUST SET)

Copy-paste block for a **15-minute exec cut** (Train + XP loop):

```bash
firebase use sports-skill-tracker-dev

# Workout HMAC — blocks logTrainingSession / Train without it
firebase functions:secrets:set WORKOUT_ATTESTATION_HMAC_SECRET

# functions/.env.sports-skill-tracker-dev (sync to all split codebases before deploy)
# APP_BASE_URL=https://sstracker.app
# WEBAUTHN_RP_ID=sstracker.app
# WEBAUTHN_RP_ORIGIN=https://sstracker.app

cp functions/.env.sports-skill-tracker-dev functions-core/.env
cp functions/.env.sports-skill-tracker-dev functions-compliance/.env
export FUNCTIONS_DISCOVERY_TIMEOUT=120
npm run deploy:core
npm run deploy:compliance
firebase deploy --only hosting
```

| Name | Type | Set command | Blocks if missing |
|------|------|-------------|-------------------|
| `WORKOUT_ATTESTATION_HMAC_SECRET` | Firebase secret | `firebase functions:secrets:set WORKOUT_ATTESTATION_HMAC_SECRET` | Train / `logTrainingSession` |
| `APP_BASE_URL` | functions `.env` | `https://sstracker.app` | Wrong email / magic-link URLs |
| `WEBAUTHN_RP_ID` | functions `.env` | `sstracker.app` | Passkey registration/login errors |
| `WEBAUTHN_RP_ORIGIN` | functions `.env` | `https://sstracker.app` | Passkey origin mismatch |

Redeploy after secrets: **`npm run deploy:core`** (+ **`npm run deploy:compliance`** if passkeys).

---

## Tier 2 — Recommended polish

| Name | Type | Set command | Enables |
|------|------|-------------|---------|
| `SENDGRID_API_KEY` | Firebase secret | `firebase functions:secrets:set SENDGRID_API_KEY` | Email fallback when `feature_flags/commsEmailFallback` `{ enabled: true }` |
| `VITE_FCM_VAPID_KEY` | root `.env` | Firebase Console → Cloud Messaging → Web Push key pair | Browser push (parent dashboard) |
| `TWILIO_ACCOUNT_SID` | functions `.env` | Project env file | Emergency SMS only |
| `TWILIO_AUTH_TOKEN` | functions `.env` | Project env file | Emergency SMS only |
| `TWILIO_FROM_NUMBER` | functions `.env` | Project env file | + `feature_flags/commsSmsEmergency` `{ enabled: true }` |

Redeploy: **`npm run deploy:comms`** after SendGrid/Twilio + flag docs change.

---

## Tier 3 — Full 45-min demo modules (optional)

One-line pointers — full transfer list in [`TRANSFER.md`](./TRANSFER.md) §3:

| Secret / param | Module |
|----------------|--------|
| `STRIPE_*` | Registration-lite checkout, club payouts |
| `CHECKR_*` | Coach clearance / compliance matrix |
| `GEMINI_API_KEY` | Media / integrations callables |
| `PII_VAULT_MASTER_KEY` | Passport vault seal/unseal |
| `TREMENDOUS_*` | Parent bounty rebates |
| `VITE_GOOGLE_MAPS_*` | Director Field Ops map |

---

## Firestore feature flags (not secrets)

Set in Firebase Console → Firestore. No redeploy required for flag-only toggles.

| Document | Purpose |
|----------|---------|
| `feature_flags/commsEmailFallback` | `{ "enabled": true }` — SendGrid email fallback |
| `feature_flags/commsSmsEmergency` | `{ "enabled": true }` — Twilio emergency SMS only |
| `feature_flags/brandedTicketReceipts` | Branded ticket PDF receipts |
| `config/feature_flags` | Client-visible toggles (RL `abPercent`, skill decay, etc.) |

---

## Pre-demo checklist (10 items)

- [ ] `firebase use sports-skill-tracker-dev`
- [ ] Phase 0 deploy green ([`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md))
- [ ] Tier 1 secrets set + `deploy:core` (+ compliance for passkeys)
- [ ] QA tenant: `--provision` (first time) or `--reset-demo-stats --execute` (repeat demo)
- [ ] Parent linked operative + dispatch code `QA-PP26` if needed
- [ ] VPC granted per child (`/parent/vpc`)
- [ ] **`consentComms`** enabled for comms / messages demo
- [ ] Demo avatar seeded (auto on stats reset execute, or manual command below)
- [ ] Incognito / sign out between persona switches
- [ ] Hard refresh https://sstracker.app/login

---

## Demo operative appearance

After stats reset (or standalone):

```bash
node scripts/seed-demo-operative-avatar.mjs --operative-email <child@operative.local> --execute
```

- Precomposed bust: **`precomposed_bust_demo_teen_home`** — label **Demo · Professional**
- Asset: `static/portrait/approved/bust_demo_teen_professional_home.jpeg`
- Sets `users/{email}.operativeAvatar` v2 parts + `ownedPortraitParts` (idempotent merge)

---

## Honest buyer talk track

- **Core loop (Tier 1):** Coach intent → player Train → XP on HQ works on dev with HMAC + hosting deploy. This is the moat demo.
- **Omnichannel (Tier 2):** Code shipped; email/SMS need SendGrid/Twilio + feature flags — say *integration-ready, not always live on sandbox*.
- **Payments / Checkr / tryouts fees (Tier 3):** Callable surfaces exist; keys are acquirer-operated — see [`PRODUCT_STATE.md`](./PRODUCT_STATE.md).
- **Avatar:** Precomposed bust default for demo; full Avatar Studio deferred post-launch.

---

## Related

- Walkthrough: [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md)
- Handoff: [`TRANSFER.md`](./TRANSFER.md)
- Product honesty: [`PRODUCT_STATE.md`](./PRODUCT_STATE.md)
