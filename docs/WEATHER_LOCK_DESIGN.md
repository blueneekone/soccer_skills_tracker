# Field weather / lightning lock (Epic 5.4) — design placeholder

**Status:** No live API calls in repo without secrets. This document defines the intended **Tomorrow.io** (or compatible) flow and facility geometry.

## Goals

- Evaluate **dangerous weather / lightning** near a booked facility.
- Set a **LOCKED** (or advisory) flag on field usage within a club-configured radius.
- Directors see status in Field Ops; optional hard block on **new** bookings when lock is active.

## Data inputs

1. **Facility position** — from `clubs/{clubId}` or `fields/{fieldId}` (see existing field vault / `directorUpsertField` in `functions/index.js`): prefer `lat`, `lng` on the field or club doc when present.
2. **Tomorrow.io** (example) — timeline or forecast API returning storm cells / lightning indices for the region.
3. **Haversine** — distance in km between `(facilityLat, facilityLng)` and alert polygon centroid or user radius.

```text
distance_km = 2 * R * asin( sqrt( sin²(Δφ/2) + cos φ1 cos φ2 sin²(Δλ/2) ) ),  R ≈ 6371
```

## Cloud Functions (planned)

- **`evaluateFieldWeatherLock`** (callable or scheduled): load active `team_workouts` / field bookings for next N hours, resolve lat/lng, call weather provider, write optional `field_weather_status/{fieldId}` or embed snapshot on calendar entries.
- **Schedule:** e.g. every 5–15 minutes during season; reduce off-season.

## Environment / secrets (do not commit)

| Variable | Purpose |
|---------|---------|
| `TOMORROW_IO_API_KEY` | Provider API key (Secret Manager) |
| `WEATHER_LOCK_RADIUS_KM` | Default radius for “in range” (e.g. `20`) |
| `WEATHER_LOCK_ENABLED` | Feature flag |

## References in repo

- Field metadata: `FieldOpsModule.svelte`, `FacilityMapVault.svelte`, `exports.directorUpsertField` in `functions/index.js`.
- No `Tomorrow.io` string in code at time of writing — implementation remains future work.
