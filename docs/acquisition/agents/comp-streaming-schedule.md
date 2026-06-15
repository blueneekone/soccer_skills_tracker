# Agent — comp-streaming-schedule

**Slice ID:** comp-streaming-schedule  
**Branch:** `competitive/comp-streaming-schedule`

**Owns:**
- `src/lib/live-stream/**` (`LiveStreamWatch.svelte` if exists)
- `src/routes/(app)/coach/**` schedule / match-day surfaces
- `team_workouts` `liveStreamUrl` field usage

## Task — Register D-03, D-04 enhancement (NOT TeamSnap CDN)

- Director/coach: set `liveStreamUrl` on scheduled events + match sessions from one panel
- Parent/player: stream link prominent on event detail + match-day
- Validate YouTube/Vimeo/Mux URL patterns (existing `liveStreamLaunch.test.ts` extend)
- NOTABLE_GAPS: CDN production = limitation; embed path complete

## AutomatedVerify

```bash
npm test -- src/lib/live-stream/__tests__/liveStreamLaunch.test.ts
npm run check
npm run build
```

## ManualQaId

QA-207, QA-224

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. Each commit: npm test (slice), npm run check, npm run build. Permanent rejects R-01–R-03. Manual testing = OWNER_QA_CHECKLIST only.
