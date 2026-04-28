# Deployment calendar (Epic 5.3) — Firestore shape

Minimal collection for **practice / match deployment** windows in Director Field Ops. Aligns with tactical field scheduling; weather integration (Epic 5.4) may attach advisory fields later.

## Collection: `deployment_calendar_entries`

| Field | Type | Required | Notes |
|------|------|-----------|--------|
| `clubId` | `string` | yes | Tenant scope; must match JWT `clubId` for director/registrar reads. |
| `title` | `string` | yes | Human label (e.g. “U15 vs Eastside — home”). |
| `kind` | `string` | no | e.g. `practice` \| `match` \| `travel` \| `scrimmage`. |
| `startsAt` | `timestamp` | yes | Start of deployment window (used for ordering / list UI). |
| `endsAt` | `timestamp` | no | Optional end. |
| `facilityId` | `string` | no | Reference to `fields/{id}` or facility vault id when stable. |
| `teamIds` | `array<string>` | no | Teams involved. |
| `visibility` | `string` | no | Default `club`; future: `staff_only`. |
| `createdAt` | `timestamp` | server | Audit. |
| `updatedAt` | `timestamp` | server | Audit. |

## Indexes

Composite index for list query:

- `clubId` ASC, `startsAt` DESC

## Security

`firestore.rules`: read for `clubId == tokenClub()` when role is director or registrar; writes `false` until a callable (e.g. `directorUpsertDeploymentCalendarEntry`) is implemented.

## Client

`src/lib/components/director/os/DeploymentCalendarPanel.svelte` subscribes read-only to this collection.
