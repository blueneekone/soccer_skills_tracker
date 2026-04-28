# FCM & messaging inventory (Epic 5.5)

Summary of **`admin.messaging().sendMulticast`** usages in `functions/index.js` (grep `sendMulticast`, April 2026).

| Approx. lines | Trigger | Audience | Purpose |
|---------------|---------|---------|---------|
| ~7642 | `missions/{missionId}` assignment ingest (`onMissionAssigned`) | Athlete (`playerId`) | Push: new training mission → open Armory. |
| ~7705 | `assignments/{assignmentId}` create (`onAssignmentCreated`) | Athlete | Push: drill library assignment. |
| ~7784 | `trials/{scoreId}` create (`onTrialScoreAdded`) | Parents (resolved from team + player name) | Push: trial score logged for youth. |
| ~7851 | `trial_scores/{scoreId}` write (`onTrialScoreWritten`, verified status) | Athlete (`playerId`) | Push: video trial verified on global profile. |

## Device tokens

- Collection **`device_tokens`** (see `functions/index.js` ~7447+) — registry for FCM; `collectFcmTokensForUids` helpers forMulticast batches (chunk size 500).

## Triad / minors / SafeSport

- **Coach → player** messaging is mediated by callables (`sendCoachPlayerMessage` / channel repair) — not all paths use multicast; parental CC on minors is enforced in callable logic and reflected in **`in_app_messages`** / **`messaging_audit`** (see grep in `functions/index.js` ~3558+).

## Firestore rules pointers

- **`in_app_messages`**: director club scope, coach team scope, parent CC lists — `firestore.rules` match ~1512+
- **`messaging_audit`**: director read when `teamId` maps to tenant club — ~1532+
- Policies for **minor-only DMs** and **VPC** intersect with **`playerVpcAllowed()`** (~47+) for training-adjacent reads elsewhere.

Gap vs full “broadcast product”: multicast entries above are **event-driven**, not arbitrary director broadcast composer — roadmap item may imply additional UX + callable surface.
