# Cell Routing — Implementation Guide

**Phase 1, Epic 1** — Cell-Based Routing.

This is the developer-facing companion to [`CELLS.md`](./CELLS.md). For the architectural overview, start there.

## TL;DR

```
JWT claim:  cellId  ──┐
                      │ resolved by
                      ▼
Server:  getRequestDb(request)  ──→  Firestore for that cell
                      │
Client:  getActiveDb()          ──→  Firestore for that cell
                      │
Gateway: /v1/* HTTP entrypoint  ──→  forwards to cell-aware handler
```

Everything else — provisioning, migration, observability — orbits these three accessors.

## End-to-end request flow

```
Browser
  │
  │ HTTPS / Bearer ID-token
  ▼
Firebase Hosting   (/v1/** rewrite)
  │
  ▼
apiGateway (Cloud Function)
  ├─ verifyIdToken()         → request.auth.token.cellId
  ├─ idempotency cache       → gateway_idempotency/{uid}_{key}
  ├─ rate limit              → gateway_rate_buckets/{uid|cell}
  └─ route dispatch
       │
       ▼
Handler (registered via register())
  ├─ ctx.cellDb     = getAdminDb(ctx.cellId)
  ├─ ctx.registryDb = getRegistryDb()    // always default cell
  └─ run business logic
       │
       ▼
Firestore — the cell-specific database
```

## Modules

### Client

| File | Responsibility |
| ---- | -------------- |
| `src/lib/types/cells.ts` | Shared types + constants (`DEFAULT_CELL_ID`, `resolveCellId`) |
| `src/lib/firebase.js` | `getDb(cellId)`, `getActiveDb()`, `registerActiveCellResolver()` |
| `src/lib/stores/auth.svelte.js` | Exposes `authStore.cellId`; registers resolver on construction |
| `src/lib/auth/profile.js` | Reads `cellId` from JWT claims into `resolveUserProfile` |
| `src/lib/services/apiClient.svelte.ts` | Calls `/v1/*` gateway with auth + idempotency |
| `src/lib/services/writes.svelte.ts` | Cell-aware write facade — uses `getActiveDb()` per batch |
| `src/lib/services/offlineSync.svelte.ts` | `waitForPendingWrites` against active cell |
| `src/lib/services/cellHealth.svelte.ts` | Director OS health dashboard subscriptions |

### Server

| File | Responsibility |
| ---- | -------------- |
| `functions/cellConstants.js` | CommonJS mirror of types/cells (`DEFAULT_CELL_ID`, `resolveCellId`) |
| `functions/cellRouter.js` | `getAdminDb`, `getRegistryDb`, `getRequestDb`, `getTenantDb` |
| `functions/cellBootstrap.js` | Registry seed + `registerDedicatedCell` + `activateCell` |
| `functions/cellProvisioning.js` | `provisionTenantCell`, `peekTenantCell` (pointer flip + token rotation) |
| `functions/cellMigration.js` | Phased migration state machine |
| `functions/cellObservability.js` | Promotion queue + schedulers |
| `functions/cellSeed.js` | Synthetic NGB seed for end-to-end testing |
| `functions/apiGateway.js` | `/v1/*` HTTP entry point with idempotency + rate-limit |
| `functions/tenantUtils.js` | `getCallerCellId(request)` helper |
| `functions/src/domains/adminOps.js` | `syncUserClaims` trigger — stamps `cellId` into JWT |

## How to add a new gateway route

1. Pick a domain handler file in `functions/` or `functions/src/domains/`.
2. At module load, register the route:

```js
const {register} = require('../../apiGateway');
const {getRegistryDb} = require('../../cellRouter');

register('POST', /^drill_completions$/, async (ctx) => {
  // ctx.cellDb is already targeted at the caller's cellId.
  // ctx.body / ctx.query / ctx.headers carry the request payload.
  // The gateway has already verified auth, idempotency, and rate limits.

  await ctx.cellDb.collection('drill_completions').add({
    playerUid: ctx.uid,
    xpAwarded: Number(ctx.body.xp),
    loggedAt: ctx.registryDb.constructor.FieldValue.serverTimestamp(),
  });

  return {status: 200, body: {ok: true}};
});
```

3. Make sure your module is `require()`'d from `functions/index.js` so the `register()` call runs at function cold start.
4. Client-side call:

```ts
import { api } from '$lib/services/apiClient.svelte';
await api.post('drill_completions', { xp: 50 });
```

## Adding a new dedicated cell

```bash
# 1. SRE: create the physical Firestore database
gcloud firestore databases create \
  --database=cell-use1-001 \
  --location=us-east1 \
  --type=firestore-native

# 2. SRE: deploy security rules + indexes to the new database
firebase deploy --only firestore:rules,firestore:indexes --database=cell-use1-001

# 3. Admin: register the cell in the routing table (status='provisioning')
firebase functions:shell
> registerDedicatedCell({ cellId: 'cell-use1-001', quotaProfile: 'dedicated-standard' })

# 4. SRE: smoke-test the new cell with `gcloud firestore documents`
# 5. Admin: flip to 'active'
> activateCell({ cellId: 'cell-use1-001' })
```

Add the new cell to `firebase.json` so `firebase deploy --only firestore` deploys rules to it on every release:

```json
{
  "firestore": [
    { "database": "(default)",      "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
    { "database": "cell-use1-001",  "rules": "firestore.rules", "indexes": "firestore.indexes.json" }
  ]
}
```

## Migrating a tenant onto a new cell

| Step | Callable | Effect |
| ---- | -------- | ------ |
| 1. ANNOUNCE + FREEZE | `startTenantMigration({ tenantId, toCellId })` | Sets `organizations.writeFrozen = true` |
| 2. EXPORT | `gcloud firestore export` (manual) | Then `markExportComplete({ migrationId, exportGcsPath })` |
| 3. IMPORT | `gcloud firestore import` (manual) | Then `markImportComplete({ migrationId })` |
| 4. VERIFY | `verifyTenantOnCell({ migrationId, collections })` | Counts source vs target docs |
| 5. CUTOVER | `executeCutover({ migrationId })` | Flips `cellId`, revokes refresh tokens |
| 6. (rollback) | `rollbackTenantMigration({ migrationId })` | Emergency reversal |

`syncUserClaims` re-stamps the JWT on the next user-doc write, but `executeCutover` ALSO calls `revokeRefreshTokens` so every active session mints a fresh token within ~60s of cutover.

## Idempotency contract

Every mutating gateway request (POST/PUT/PATCH/DELETE) MUST include:

```
X-Idempotency-Key: <uuid v4>
```

The `apiClient.svelte.ts` helper auto-mints one. Replays with the same key skip the handler and return the cached response.

## Rate limiting

Token bucket per:

- **uid**: 60 requests/minute, refill 1/sec, cap 60
- **cellId**: 600 requests/minute, refill 10/sec, cap 600

Buckets live in `gateway_rate_buckets/{scope}_{id}` on the registry cell.

## Synthetic verification

```js
seedSyntheticTenant({ tenantId: 'synth-ngb-001', playerCount: 200, completionsPerPlayer: 5 })
```

Then run a full migration cycle through the new cell. Once verified:

```js
purgeSyntheticTenant({ tenantId: 'synth-ngb-001' })
```

The purge function refuses tenants whose ID doesn't start with `synth-`, so production data is structurally unreachable.

## Future work

- **Cloud Monitoring integration**: today `evaluateCellPromotions` only checks roster size. Wire it to the Firestore reads-per-tenant metric to enable the sustained-reads promotion trigger.
- **Managed token bucket**: swap the Firestore-backed rate-limit cache for Cloud Armor or Redis when throughput exceeds 10k req/s.
- **Per-cell index drift detector**: `firebase deploy` should verify every registered cell has identical indexes; a CI check would catch drift before it bites.
- **Automated gcloud export/import**: the migration tooling currently outsources steps 2 & 3 to manual gcloud. Wrap them in admin callables once the GCS service-account permissions model is signed off.
