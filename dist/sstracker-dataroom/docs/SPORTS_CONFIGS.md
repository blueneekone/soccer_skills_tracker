# Sports Configuration System

**Phase 3, Epic 4 — Sports_Configs Dynamic Trees**

`sports_configs/{sportId}` is the **single source of truth** for every sport-specific attribute, icon, palette, and label in the platform.  All consumer components read through `sportsConfigStore.svelte.js`; the three legacy hardcoded modules survive only as offline fallbacks.

---

## Table of Contents

1. [SportsConfigDoc schema reference](#sportsconfigdoc-schema-reference)
2. [schemaVersion semantics](#schemaversion-semantics)
3. [Read-repair sequence](#read-repair-sequence)
4. [Adapter layer map](#adapter-layer-map)
5. [Adding a new sport](#adding-a-new-sport)
6. [Audit & compliance](#audit--compliance)
7. [Firestore rules summary](#firestore-rules-summary)

---

## SportsConfigDoc schema reference

Document path: `sports_configs/{sportId}`  
Document ID = `sportId` (stable snake\_case, e.g. `soccer`, `basketball`).

```jsonc
{
  "sportId": "soccer",              // string  — document ID, denormalised
  "displayName": "Vanguard Soccer", // string  — human-readable platform name
  "schemaVersion": 1,               // number  — positive int; monotonically increasing
  "status": "active",               // "active" | "archived" | "draft"

  "attributes": [                   // array[6] — order is significant (radar axis order)
    {
      "id": "pace",                 // string  — stable machine key (snake_case)
      "name": "Pace & Agility",     // string  — full display name
      "shortLabel": "PAC",          // string  — ≤5 chars, for chart axis ticks
      "hexColor": "#00ff66",        // string  — 6-digit hex, neon accent
      "playerStatKey": "pace"       // string  — key on player_stats/{uid}
    }
    // … 5 more entries
  ],

  "palette": {
    "fg": "#22c55e",                       // icon fill (WCAG AA on #09090B)
    "glow": "rgba(34, 197, 94, 0.22)",    // radial-gradient chip background
    "ring": "rgba(34, 197, 94, 0.45)"     // 1px chip border
  },

  "iconClass": "ph-soccer-ball",          // Phosphor icon suffix (omit leading "ph ")
  "aliases": ["soccer", "futbol", ...],   // legacy normalisation strings (lowercased)

  "rpgProjection": {                      // 5-vertex RPG radar projection
    "ball_mastery": ["dribbling", "ball_mastery", "passing"],
    "striking":     ["shooting", "striking"],
    "pace":         ["pace", "speed", "athletics"],
    "scanning":     ["passing", "scanning", "vision"],
    "grit":         ["physical", "grit", "defending"]
  },

  "updatedByUid": "abc123",              // UID of last super_admin writer
  "updatedAt":    "<serverTimestamp>",
  "createdAt":    "<serverTimestamp>"
}
```

### Field invariants

| Field | Invariant |
|---|---|
| `attributes` | Always exactly **6** entries. Changing `id` or `playerStatKey` bumps `schemaVersion`. |
| `schemaVersion` | Auto-incremented by `upsertSportsConfig`; starts at 1 for new docs. |
| `status` | Only `active` docs are visible to consumer reads. `archived` = soft-delete. `draft` = future reserved. |
| `aliases[]` | Lowercase, trimmed strings used by `resolveActiveConfig` for fuzzy matching. |
| `rpgProjection` | Must have all 5 slots: `ball_mastery`, `striking`, `pace`, `scanning`, `grit`. Each is a priority-ordered array of `playerStatKey` strings. |

---

## schemaVersion semantics

`schemaVersion` is the **cache-bust trigger** for consumers that memoise derived state (radar values, palette gradients).

### When does it bump?

`upsertSportsConfig` compares the incoming payload against the existing Firestore doc and auto-increments `schemaVersion` **when and only when**:

- Any `attributes[i].id` changes (a slot is renamed or reordered), **OR**
- Any `attributes[i].playerStatKey` changes (the Firestore stat key changes)

### When does it NOT bump?

Display-only changes leave `schemaVersion` unchanged:

- `attributes[i].name` (display label)
- `attributes[i].shortLabel` (axis label)
- `attributes[i].hexColor` (accent colour)
- `palette.*` (chip colours)
- `iconClass`
- `displayName`
- `aliases`

### What do consumers do on a version bump?

Consumers that cache derived state (e.g. AttributeRadar radar polygon coordinates, palette gradients baked into CSS variables) should memoise on `schemaVersion`.  When the version changes, clear the derived cache and recompute.

The `sportsConfigStore` itself does not cache — it always reflects the latest Firestore snapshot.  Consumers with expensive derivations are responsible for their own memoisation.

---

## Read-repair sequence

```
Consumer
  │
  ├─ calls resolveActiveConfig(sportRaw) / getConfig(sportId)
  │
  ├─ sportsConfigStore._configs Map has entry?
  │     YES → return Firestore-backed SportsConfigDoc ✓
  │     NO  →
  │           ├─ return LEGACY_SPORT_CONFIGS[sportId] ?? LEGACY_SPORT_CONFIGS.generic
  │           │   (bundled offline fallback — always valid)
  │           │
  │           └─ if store is _ready (first snapshot received):
  │                 async setDoc(sports_configs/{sportId}, fallback, { merge: true })
  │                 (fire-and-forget; errors swallowed — offline is fine)
  │
  └─ Component renders immediately with fallback data
         ↓ (Firestore write completes in background)
  Next onSnapshot tick delivers the real doc → store updates → component re-renders
```

**Key invariant**: No read ever throws.  Every public getter returns a valid `SportsConfigDoc`.

---

## Adapter layer map

| Legacy module | Legacy export | New behaviour |
|---|---|---|
| `src/lib/utils/sport-attributes.js` | `getAttributeSchemaForSport(sportRaw)` | Reads `sportsConfigStore.resolveActiveConfig(sportRaw)`, maps `attributes[]` to `{ keys, labels, canonicalKey }`. Falls back to `SPORT_ATTRIBUTE_SCHEMAS`. |
| `src/lib/utils/sport-icon.js` | `clubSportIconClass(sport)` | Reads `sportsConfigStore.resolveActiveConfig(sport)?.iconClass`. Falls back to `SPORT_ICON_SUFFIX`. |
| `src/lib/utils/sport-icon.js` | `clubSportAccent(sport)` | Reads `sportsConfigStore.resolveActiveConfig(sport)?.palette`. Falls back to `SPORT_ACCENT`. |
| `src/lib/utils/sport-icon.js` | `normalizeClubSport(sport)` | Reads store alias index first; falls back to substring matching. |
| `src/lib/config/sports.js` | `DEFAULT_SPORT_CONFIG` | Points to the hardcoded soccer fallback (`_FALLBACK_SOCCER_RPG`). Deprecated — use `getRpgSportConfig(sportId)`. |
| `src/lib/config/sports.js` | `getRpgSportConfig(sportId)` | **New**. Reads `sportsConfigStore.resolveActiveConfig(sportId)` and projects through `rpgProjection` to a 5-attribute `SportConfig`. |
| `src/lib/config/sports.js` | `mapToDefaultAttributes(statsRaw, derived, sportId)` | Now accepts optional `sportId` and resolves the RPG projection from the store. Falls back to soccer priority lists. |

All 13 consumer files keep their existing imports — only the underlying resolution changes.

---

## Adding a new sport

### Via the in-app CRUD UI (recommended)

1. Navigate to `/admin/sports-configs` (super_admin access required).
2. Click **+ New Sport** in the left rail.
3. Fill in `sportId` (snake_case, e.g. `cricket`), `displayName`, and all 6 attributes.
4. Set the chip palette (`fg`, `glow`, `ring`) and Phosphor `iconClass`.
5. Add `aliases` (comma-separated, lowercase) for legacy club `sport` field values that should resolve to this sport.
6. Set the 5 RPG projection slots (comma-separated `playerStatKey` priority lists).
7. Click **Save**.  The callable auto-sets `schemaVersion: 1` and `status: active`.
8. All consumer components update within seconds via Firestore onSnapshot.

### Via CLI (Admin SDK — cold-boot / CI)

```bash
# Add the sport to BASE_SPORTS_CONFIGS in functions/src/seeders/sportsSeeder.js
# then call the seeder callable:
firebase functions:shell
> seedBaseSportsConfigs({})
```

Or use the Firebase Admin SDK directly:

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

await db.collection('sports_configs').doc('cricket').set({
  sportId: 'cricket',
  displayName: 'Vanguard Cricket',
  schemaVersion: 1,
  status: 'active',
  attributes: [/* 6 entries */],
  palette: { fg: '…', glow: '…', ring: '…' },
  iconClass: 'ph-cricket',
  aliases: ['cricket'],
  rpgProjection: {
    ball_mastery: ['batting', 'technique'],
    striking:     ['bowling', 'pace'],
    pace:         ['speed', 'athletics'],
    scanning:     ['fielding', 'vision'],
    grit:         ['stamina', 'grit'],
  },
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
}, { merge: true });
```

### Adding to the offline fallback (optional)

If the new sport must work completely offline without a Firestore connection, add a matching entry to `LEGACY_SPORT_CONFIGS` in `src/lib/stores/sportsConfigStore.svelte.js`.

---

## Audit & compliance

### auditClubSportConfig (onDocumentWritten)

Fires whenever `clubs/{clubId}` is written.  When the `sport` field changes, the trigger resolves it to a `sportId` and checks whether the corresponding `sports_configs/{sportId}` doc exists and is active.

- If the config is **missing or archived**, stamps `sportConfigMissing: true` on the club doc.
- The admin CRUD UI at `/admin/sports-configs` reads the latest `sport_audit_report/{yyyy-ww}` doc and displays a yellow banner listing all affected clubs.

### pruneOrphanedSports (onSchedule — Sunday 03:00 UTC)

Weekly scan of all `clubs` documents.  For each club, normalises `sport` → `sportId` and checks `sports_configs`.

- Stamps `sportConfigMissing` on any clubs that have changed since the last run.
- Writes a `sport_audit_report/{yyyy-ww}` summary document (e.g. `2026-20`).

### sport_audit_report schema

```jsonc
{
  "reportId": "2026-20",
  "generatedAt": "<serverTimestamp>",
  "totalClubs": 142,
  "orphanCount": 3,
  "orphans": [
    { "clubId": "abc", "sport": "rugby", "resolvedKey": "generic", "orphan": true }
  ],
  "activeSportIds": ["soccer", "basketball", "baseball", "football", "volleyball", "hockey", "lacrosse", "generic"]
}
```

Read access: `super_admin` only. Write access: blocked (Admin SDK only, written by the scheduled function).

---

## Firestore rules summary

```
match /sports_configs/{sportId} {
  allow read:          if authed();
  allow create, update: if authed() && isSuper()
                        && request.resource.data.schemaVersion is int
                        && request.resource.data.sportId == sportId
                        && request.resource.data.attributes.size() == 6
                        && /* each attribute has hexColor string */;
  allow delete:        if false;  // soft-delete only via archiveSportsConfig
}

match /sport_audit_report/{reportId} {
  allow read:  if authed() && isSuper();
  allow write: if false;  // written by pruneOrphanedSports scheduled CF only
}
```
