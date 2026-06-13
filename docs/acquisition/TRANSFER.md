# SSTracker — Acquisition Transfer Checklist

**Purpose:** Operational handoff for acquirer engineering, DevOps, and compliance teams.  
**Last updated:** 2026-06-13

---

## 1. Repository & source

| Item | Location / action |
|------|-------------------|
| Primary repo | Git remote for `soccer-skills-tracker` monorepo |
| Branch model | `dev` canonical · overnight feature branches merge via [`MERGE_ORDER.md`](./MERGE_ORDER.md) |
| Package manager | npm (root + each `functions-*` codebase) |
| Node versions | Functions splits: **Node 20** · monolith `functions/`: **Node 22** — match CI |
| Build | `npm run build` (Vite + SvelteKit static adapter) |
| Tests | `npm test` (Vitest) · `npm run test:firestore-rules` (emulator) |

---

## 2. Firebase projects

| Project | Alias | Use |
|---------|-------|-----|
| `sports-skill-tracker-dev` | (manual `firebase use`) | **Live-fire QA** · https://sstracker.app |
| `soccer-skills-tracker` | default in [`.firebaserc`](../../.firebaserc) | Production hosting |

**Transfer artifacts:**

- [ ] Firebase project Owner / Editor IAM for acquirer Google accounts
- [ ] Billing account linkage documented
- [ ] `.firebaserc` verified against target projects
- [ ] Custom domain DNS for `sstracker.app` (dev) and production domains

---

## 3. Secrets & environment

**Never commit.** Copy pattern from [`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md):

```bash
cp functions/.env.sports-skill-tracker-dev functions-core/.env
cp functions/.env.sports-skill-tracker-dev functions-rl/.env
cp functions/.env.sports-skill-tracker-dev functions-commerce/.env
cp functions/.env.sports-skill-tracker-dev functions-compliance/.env
cp functions/.env.sports-skill-tracker-dev functions-integrations/.env
cp functions/.env.sports-skill-tracker-dev functions-platform/.env
```

| Secret / param | Used by |
|----------------|---------|
| Stripe keys / webhooks | `functions-commerce` |
| `WEBAUTHN_RP_ID` / `WEBAUTHN_RP_ORIGIN` | `functions-compliance` — must match hosting URL |
| Checkr API / webhook | `functions-compliance` |
| Tremendous / rebate partners | commerce |
| Gemini / media | `functions-integrations` |
| Weather API keys | integrations |

**Transfer:** Secure vault export (1Password / GCP Secret Manager) with rotation plan.

---

## 4. Deploy runbook (first acquirer deploy)

```bash
firebase use sports-skill-tracker-dev   # or production project
export FUNCTIONS_DISCOVERY_TIMEOUT=120

# 1. Env sync (all codebases)
# 2. Build frontend
npm run build

# 3. Rules
firebase deploy --only firestore:rules,storage

# 4. Backend (15–25 min)
npm run deploy:backend:systematic
#    OR granular: deploy:core → deploy:rl → deploy:platform → deploy:commerce → deploy:compliance → deploy:integrations

# 5. Comms batch
npm run deploy:comms

# 6. Hosting
firebase deploy --only hosting
```

Authority: [`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md)

**Verify:** Hard refresh https://sstracker.app/login · run Phase 0 in [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md)

---

## 5. QA tenant provisioning

```bash
node scripts/dev-tenant-reset.mjs --provision
```

Accounts documented in [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) § Permanent VPC golden path.

**Transfer:** Decide whether to retain owner QA emails or re-provision acquirer-controlled test users.

---

## 6. Architecture knowledge transfer

| Topic | Doc | Session suggestion |
|-------|-----|------------------|
| Cell routing | [`ARCHITECTURE.md`](../ARCHITECTURE.md) §1.2 | 2h eng walkthrough |
| Persona routes | [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) | 1h PM + eng |
| Comms / SafeSport | [`COMMS_HUB.md`](../vision/COMMS_HUB.md) | 1h compliance + eng |
| RL pipeline | [`RL_ADAPTIVE_WORKOUTS.md`](../RL_ADAPTIVE_WORKOUTS.md) | 1h ML + eng |
| Sprint history | [`ROADMAP.md`](../../ROADMAP.md) | Read-only archive |

---

## 7. CI / quality gates

| Gate | Command |
|------|---------|
| Functional MVP guards | `npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts` |
| Typecheck | `npm run check` |
| Production bundle | `npm run build` |
| Functions deploy guards | `npm run test:functions-deploy` |
| E2E (optional) | `npm run test:e2e` |

Overnight agent: `overnight/vitest-ci` may add CI wiring — check [`SLICE_LOG.md`](./SLICE_LOG.md).

---

## 8. Third-party accounts to re-home

- [ ] Stripe Connect (club payouts)
- [ ] Firebase / Google Cloud
- [ ] Apple Developer / Google Play (when Capacitor ships)
- [ ] Checkr (background checks)
- [ ] Domain registrar (`sstracker.app`)
- [ ] FCM — no separate account; tied to Firebase

---

## 9. Deferred tracks (do not block transfer)

| Track | Owner decision |
|-------|----------------|
| Avatar PNG / Gemini ingest | Post-launch — [`avatar-builder-deferred.mdc`](../../.cursor/rules/avatar-builder-deferred.mdc) |
| Platform visual redesign | Read-only research folder |
| NGB federation API | GTM-dependent — agent 14 |
| Club website CMS | **Not building** |

---

## 10. Post-transfer validation (30-day)

| Week | Milestone |
|------|-----------|
| 1 | Acquirer deploy to dev + Phase 0–2 QA green |
| 2 | Parent VPC + coach intent + player Train loop signed off |
| 3 | Production project deploy + WebAuthn origin verified |
| 4 | Security review + secret rotation complete |

Demo validation: [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)

---

## 11. Support contacts

Document acquirer-internal owners for:

- Firebase / GCP billing
- Compliance (COPPA / SafeSport counsel)
- On-call for production incidents

*(No external support SLA exists pre-acquisition.)*
