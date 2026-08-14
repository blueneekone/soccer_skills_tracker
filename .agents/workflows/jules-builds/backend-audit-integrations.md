# JULES BACKEND PIPELINE: INTEGRATIONS & MEDIA (COACH & PUBLIC)
## Codebase Target: `functions-integrations/`
## Domain: Media Processing (Sharp / Gemini), Roster PDF Ingestion, Tomorrow.io Weather Locks, Podcasts, StackSports

### Critical Architectural Constraints:
1. **Lazy Loading of Heavy Binaries (`sharp`):** `sharp` must NEVER be required in global scope. It must only load dynamically inside `processMedia` when media execution begins to protect cold-start latencies.
2. **Weather Safety Lockouts:** Field weather evaluation must correctly update `facility_weather_locks` when Lightning / Heat / AQI thresholds trigger.
3. **80-Line Function Limit:** PDF parser algorithms and RSS feed parsers must be extracted to `src/domains/` utilities.
4. **Boot Safety:** All external API tokens (`TOMORROW_IO_API_KEY`, `GEMINI_API_KEY`, `STACK_SPORTS_CLIENT_SECRET`) must use `defineSecret` parameters.

### Target Handlers to Audit in `functions-integrations/`:
- `processMedia`, `getUploadToken`, `deleteAllPlayerMedia`
- `ingestRoster`, `coachRosterIngest`
- `getWeatherConditions`, `evaluateFieldWeatherLock`, `refreshClubWeatherLock`, `facilityWeatherWebhook`
- `getSoccerNews`, `searchPodcasts`, `getPodcastEpisodes`
- `syncStackSportsDataFn`, `stackSportsAuthInit`, `stackSportsAuthCallback`

### Verification Steps:
1. Run `node scripts/smoke-require-codebase.cjs integrations getWeatherConditions` — must confirm `sharp` is NOT loaded globally.
2. Run `node scripts/smoke-require-codebase.cjs integrations --simulate-cloud` — must return OK.
3. Verify zero unhandled promise rejections.

### Commit:
Commit with message: `audit(backend-integrations): enforce lazy sharp loading, weather threshold safety, and clean roster parsing`
