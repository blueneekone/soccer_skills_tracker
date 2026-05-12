# Cells — Vanguard Multi-Database Architecture

**Phase 1, Epic 1** — Cell-Based Routing for ultra-large state governing bodies.

## What is a cell?

A **cell** is one Firebase Multi-Database Firestore instance. Today every tenant lives on the reserved `(default)` cell. An ultra-large NGB (state association, federation, > ~5k roster) gets promoted to a **dedicated cell** so its bulk writes can never throttle another tenant's reads.

The routing decision is driven by `organizations/{tenantId}.cellId`, mirrored into the JWT custom claim `cellId` by `syncUserClaims`.

## Cell catalog

| Cell ID            | Database          | Region    | Quota profile         | Tenant count |
| ------------------ | ----------------- | --------- | --------------------- | ------------ |
| `(default)`        | The shared cell   | `us-east1` | `shared`             | All tenants (today) |
| `cell-use1-001`    | Reserved          | `us-east1` | `dedicated-standard` | — |
| `cell-use1-002`    | Reserved          | `us-east1` | `dedicated-standard` | — |

(Live counts come from `cells/*.tenantCount`; the Director OS migration dashboard renders the source of truth.)

## Naming convention

```
(default)              — Firebase's reserved name for the original database
cell-{region}-{nnn}    — A dedicated cell, e.g. cell-use1-001
                         region: `use1` = us-east1, `usc1` = us-central1
```

Region codes use the gcloud short form so cell IDs stay legible in monitoring dashboards.

## Cell lifecycle

```
┌─────────────┐   register     ┌──────────────┐  activate   ┌─────────┐
│ (not exist) │ ─────────────> │ provisioning │ ──────────> │ active  │
└─────────────┘                └──────────────┘             └─────────┘
                                                                │
                                                                │ admin
                                                                ▼
                                                          ┌──────────┐
                                                          │ draining │
                                                          └────┬─────┘
                                                               │ tenantCount → 0
                                                               ▼
                                                          ┌──────────┐
                                                          │ retired  │
                                                          └──────────┘
```

- `provisioning`: SRE has registered the cell via `registerDedicatedCell` but has not yet verified the physical database is reachable. **Routing layer rejects assignments.**
- `active`: Verified. Accepts new tenant assignments subject to capacity policy.
- `draining`: No new assignments. Existing tenants are being migrated out.
- `retired`: Empty cell queued for deletion.

## Quota profiles

| Profile               | Use                                         | Database type                |
| --------------------- | ------------------------------------------- | ---------------------------- |
| `shared`              | The (default) cell only — long tail of small tenants | Standard single-region |
| `dedicated-standard`  | Default promotion target for any cell-out   | Single-region, no SLA upgrade |
| `dedicated-large`     | Top-five NGBs (> 50k roster)                | Multi-region or reserved capacity |

## Promotion policy

Stored in `cells/_policy`. Defaults seeded by `bootstrapCellRegistry`:

```js
{
  rosterPromoteThreshold: 5000,        // > N players → flag for promotion
  readsPerDayPromoteThreshold: 50000,  // sustained reads → flag
  readSustainedDays: 7,                // for this many days
  sharedCellSoftCap: 5000,             // when (default) tenantCount > this → ops alert
  defaultPromotionProfile: 'dedicated-standard'
}
```

The `evaluateCellPromotions` scheduler runs hourly and writes flagged tenants to `cell_promotion_queue/{tenantId}`. The Director OS dashboard renders this queue.

## Document layout

### `cells/{cellId}`
```ts
{
  id: string,              // same as databaseId
  databaseId: string,
  region: 'us-east1',
  status: 'provisioning' | 'active' | 'draining' | 'retired',
  quotaProfile: 'shared' | 'dedicated-standard' | 'dedicated-large',
  tenantCount: number,     // increment()-driven
  createdAt: Timestamp,
  lastTenantMigratedAt?: Timestamp
}
```

### `cells/_policy`
See "Promotion policy" above.

### `cells/_migrations/records/{migrationId}`
Migration audit trail. Status transitions: `planned` → `frozen` → `exported` → `imported` → `verified` → `cutover` → (`rolled-back`).

### `cell_promotion_queue/{tenantId}`
```ts
{
  tenantId: string,
  trigger: 'roster_size' | 'sustained_reads' | 'manual',
  rosterSize?: number,
  rollingDailyReads?: number,
  flaggedAt: Timestamp,
  acknowledgedAt?: Timestamp,
  acknowledgedBy?: string,
  migratedAt?: Timestamp,
  targetCellId?: string,
  status: 'pending' | 'acknowledged' | 'migrated'
}
```

## Where the registry lives

The registry collections (`cells/`, `cell_promotion_queue/`, `cells/_migrations/`) ALWAYS live on the `(default)` cell. Hosting them on a dedicated cell would create a chicken-and-egg lookup: we'd need to know the cellId before we could read the cellId.

Server code accesses the registry via `getRegistryDb()` (see `functions/cellRouter.js`). Client code accesses it via `getDb(DEFAULT_CELL_ID)`.

## Security

Cell routing data is **control-plane**. Direct client writes are denied by Firestore rules (`firestore.rules` Phase 1 Epic 1 block). All mutations flow through Cloud Function callables:

- `bootstrapCellRegistry`, `registerDedicatedCell`, `activateCell` — Session A
- `provisionTenantCell`, `peekTenantCell` — Session B
- `startTenantMigration`, `executeCutover`, `rollbackTenantMigration` — Session G
- `flagTenantForPromotion`, `acknowledgePromotionFlag` — Session I
- `seedSyntheticTenant`, `purgeSyntheticTenant` — Session J (sandbox)

Every mutation requires `global_admin` or `super_admin` JWT role.
