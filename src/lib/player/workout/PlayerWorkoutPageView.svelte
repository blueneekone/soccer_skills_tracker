<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte';
  import PlayerDiegeticOverlay from '$lib/components/player/PlayerDiegeticOverlay.svelte';
  import IntelModal from '$lib/components/ui/IntelModal.svelte';
  import PlayerOsPageStrap from '$lib/components/player/PlayerOsPageStrap.svelte';
  import BenchmarkTrainSession from '$lib/player/workout/BenchmarkTrainSession.svelte';
  import TrainMissionStrip from '$lib/player/workout/TrainMissionStrip.svelte';
  import TrainReadinessStrip from '$lib/player/workout/TrainReadinessStrip.svelte';
  import { COACH_INTENT_HINT } from '$lib/player/workout/coachMissionFlow.js';
  import { FREE_LOG_DURATION_MAX_MINUTES, SESSION_NOTES_MAX_LENGTH } from '$lib/player/workout/workoutSessionConstants.js';
  import type { MissionHandoff } from '$lib/player/workout/coachMissionFlow.js';
  import type { PrescriptionDrillEntry } from '$lib/types/intent.js';
  import type { WorkoutFocus } from '$lib/player/workout/coachMissionFlow.js';
  import type { CadenceCompletionRow } from '$lib/player/dashboard/cadenceCompletions.js';

  const TELEMETRY_INTEL = {
    title: 'TELEMETRY LOGGING',
    instructions: [
      '1. Select your drill or exercise (free log) — coach missions lock the prescription.',
      '2. Set sets, reps, and bilateral for rep-based volume; duration and RPE for self-directed sessions.',
      '3. Add session notes on coach assignments, then transmit to log XP.',
    ],
  };

  type FocusArea = { id: WorkoutFocus; op: string; label: string };

  type DrillCatalog = {
    drillsLoading: boolean;
    availableDrills: string[];
  };

  import type { TrainMissionStripItem } from '$lib/player/workout/trainMissionPicker.js';
  import type { BenchmarkDrill } from '$lib/player/benchmark/benchmarkDrillCatalog.js';

  type Props = {
    hasCoachIntents: boolean;
    activeMissionId: string | null;
    trainMissionStripItems: TrainMissionStripItem[];
    missionSyncRefreshing: boolean;
    armedMissionTitle: string;
    armedGoalXp: number | null;
    armedDrillLine: string;
    coachPrescriptionLine: string;
    armedPrescription: MissionHandoff['prescription'] | null;
    armedDisplayCadence: { sessionsPerWindow: number; windowDays: number } | null;
    armedCadenceBlocked: boolean;
    armedHandoff: MissionHandoff | null;
    isBundleMode: boolean;
    bundleDrills: PrescriptionDrillEntry[];
    bundleStepIdx: number;
    currentBundleDrill: PrescriptionDrillEntry | null;
    isFinalBundleStep: boolean;
    logSubmitting: boolean;
    estimatedLogXp: number;
    missionBounty: number | null;
    isBenchmarkSession: boolean;
    armedBenchmarkDrill: BenchmarkDrill | undefined;
    armedBenchmarkTarget: number | null;
    totalXpHud: number;
    profile: Record<string, unknown> | null | undefined;
    cadenceCompletions: CadenceCompletionRow[];
    logTrainingSession: import('firebase/functions').HttpsCallable<unknown, unknown>;
    writePlayerOsWorkout: typeof import('$lib/stores/playerEngine.svelte.js').writePlayerOsWorkout;
    commitWorkoutCompletion: typeof import('$lib/services/writes.svelte').commitWorkoutCompletion;
    dopamineOnCommit: typeof import('$lib/services/dopamine.svelte.js').dopamineOnCommit;
    dopamineOnCallable: typeof import('$lib/services/dopamine.svelte.js').dopamineOnCallable;
    bumpXp: (delta: number) => void;
    authUser: { uid: string; email: string | null } | null;
    isCoachDirectedSession: boolean;
    focusAreas: FocusArea[];
    selectedFocus: WorkoutFocus;
    focusLabel: string;
    drillCatalog: DrillCatalog;
    selectedDrill: string | null;
    lockedCoachDrillLabel: string;
    duration: number;
    intensity: number;
    intensityGaugePct: number;
    totalWorkoutReps: number;
    showReadinessStrip: boolean;
    readinessSleepHours: number;
    readinessSoreness: number;
    readinessMood: number;
    readinessRestingFeel: number;
    pendingProofIntentId: string | null;
    proofSubmitted: boolean;
    proofSubmitting: boolean;
    proofMediaFile: File | null;
    proofUploadProgress: number | null;
    proofMediaError: string;
    overlayOpen: boolean;
    overlayVariant: 'success' | 'error' | 'confirm';
    overlayTitle: string;
    overlayMessage: string;
    pendingHqReturn: boolean;
    sessionNotes: string;
    proofNote: string;
    workoutSets: number;
    workoutRepsPerSet: number;
    workoutBilateral: boolean;
    onRefreshMissionSync: () => void;
    onClearArmedMission: () => void;
    onContinueTrainMission: (missionId: string) => void;
    onSelectFocus: (id: WorkoutFocus) => void;
    onSelectDrill: (drill: string) => void;
    onLogBundleStep: () => void;
    onLogWorkout: () => void;
    onCadenceBlocked: () => void;
    onQuestProgress: (handoff: MissionHandoff | null) => void;
    onParentProof: (missionId: string | null, needsProof: boolean) => void;
    onRefreshProfile: () => Promise<void>;
    onBenchmarkSuccess: (payload: {
      message: string;
      levelUp: { from: number; to: number; earned: number } | null;
    }) => void;
    onBenchmarkError: (message: string) => void;
    onProofFileChange: (e: Event) => void;
    onSendCompletionProof: () => void;
    onDismissProofAffordance: () => void;
    onCloseOverlay: () => void;
  };

  let {
    hasCoachIntents,
    activeMissionId,
    trainMissionStripItems,
    missionSyncRefreshing,
    armedMissionTitle,
    armedGoalXp,
    armedDrillLine,
    coachPrescriptionLine,
    armedPrescription,
    armedDisplayCadence,
    armedCadenceBlocked,
    armedHandoff,
    isBundleMode,
    bundleDrills,
    bundleStepIdx,
    currentBundleDrill,
    isFinalBundleStep,
    logSubmitting,
    estimatedLogXp,
    missionBounty,
    isBenchmarkSession,
    armedBenchmarkDrill,
    armedBenchmarkTarget,
    totalXpHud,
    profile,
    cadenceCompletions,
    logTrainingSession,
    writePlayerOsWorkout,
    commitWorkoutCompletion,
    dopamineOnCommit,
    dopamineOnCallable,
    bumpXp,
    authUser,
    isCoachDirectedSession,
    focusAreas,
    selectedFocus,
    focusLabel,
    drillCatalog,
    selectedDrill,
    lockedCoachDrillLabel,
    duration = $bindable(),
    intensity = $bindable(),
    intensityGaugePct,
    totalWorkoutReps,
    showReadinessStrip,
    readinessSleepHours = $bindable(),
    readinessSoreness = $bindable(),
    readinessMood = $bindable(),
    readinessRestingFeel = $bindable(),
    pendingProofIntentId,
    proofSubmitted,
    proofSubmitting,
    proofMediaFile,
    proofUploadProgress,
    proofMediaError,
    overlayOpen,
    overlayVariant,
    overlayTitle,
    overlayMessage,
    pendingHqReturn,
    sessionNotes = $bindable(),
    proofNote = $bindable(),
    workoutSets = $bindable(),
    workoutRepsPerSet = $bindable(),
    workoutBilateral = $bindable(),
    onRefreshMissionSync,
    onClearArmedMission,
    onContinueTrainMission,
    onSelectFocus,
    onSelectDrill,
    onLogBundleStep,
    onLogWorkout,
    onCadenceBlocked,
    onQuestProgress,
    onParentProof,
    onRefreshProfile,
    onBenchmarkSuccess,
    onBenchmarkError,
    onProofFileChange,
    onSendCompletionProof,
    onDismissProofAffordance,
    onCloseOverlay,
  }: Props = $props();
</script>

<div class="pd-page-root player-dossier-root player-hud-root pw-page tw-min-w-0 tw-overflow-x-hidden" data-region="player-workout-log">
  <div class="pd-content-wrap pd-route-stack">
  <PlayerOsPageStrap eyebrow="Train / Log session" title="Workout logger" />

  {#if hasCoachIntents && !activeMissionId && trainMissionStripItems.length === 0}
    <p class="pw-hq-link pw-mono">
      <a href="/player/dashboard">Coach missions on HQ →</a>
      <span class="pw-dim"> · accept a mission, then start session here</span>
      <button
        type="button"
        class="pw-mission-armed__clear pw-mono"
        disabled={missionSyncRefreshing}
        onclick={onRefreshMissionSync}
      >
        {missionSyncRefreshing ? 'Syncing…' : 'Refresh missions'}
      </button>
    </p>
  {/if}

  {#if activeMissionId}
    <p class="pw-hq-link pw-mono">
      <button
        type="button"
        class="pw-mission-armed__clear pw-mono"
        disabled={missionSyncRefreshing}
        onclick={onRefreshMissionSync}
      >
        {missionSyncRefreshing ? 'Syncing…' : 'Refresh mission status'}
      </button>
      <span class="pw-dim"> · clears armed session if coach cancelled</span>
    </p>
  {/if}

  <div class="pw-theater pd-os-deck pd-os-deck--hero bento-span-12">
    <div class="pw-theater__z4-scan" aria-hidden="true"></div>
    {#if activeMissionId}
      <div class="pw-mission-armed pd-os-deck__well" aria-live="polite">
        <div class="pw-mission-armed__head">
          <span class="pw-eyebrow">Armed mission</span>
          <button type="button" class="pw-mission-armed__clear pw-mono" onclick={onClearArmedMission}>
            Free log instead
          </button>
        </div>
        <p class="pw-mission-armed__hint">{COACH_INTENT_HINT}</p>
        <h2 class="pw-mission-armed__title">
          {armedMissionTitle}
          {#if armedGoalXp != null && armedGoalXp > 0}
            <span class="pw-mission-armed__xp pw-green"> · {armedGoalXp.toLocaleString()} XP goal</span>
          {/if}
        </h2>
        {#if armedDrillLine}
          <p class="pw-mission-armed__drill pw-mono">{armedDrillLine}</p>
        {/if}
        {#if coachPrescriptionLine}
          <p class="pw-mission-armed__drill pw-mono pw-dim">
            Coach prescription: {coachPrescriptionLine}
          </p>
        {/if}
        {#if armedPrescription?.cues}
          <p class="pw-mission-armed__drill pw-mono pw-dim">Coaching cues: {armedPrescription.cues}</p>
        {/if}
        {#if armedPrescription?.videoUrl}
          <a class="pw-link pw-mono pw-dim" href={armedPrescription.videoUrl} target="_blank" rel="noopener noreferrer">Watch demo</a>
        {/if}
        {#if armedDisplayCadence}
          <p class="pw-mission-armed__drill pw-mono pw-dim" aria-label="Cadence requirement">
            Cadence: {armedDisplayCadence.sessionsPerWindow} session{armedDisplayCadence.sessionsPerWindow !== 1 ? 's' : ''} / {armedDisplayCadence.windowDays === 7 ? 'week' : `${armedDisplayCadence.windowDays} days`}{#if armedCadenceBlocked}<span class="pw-dim"> · next session tomorrow</span>{/if}
          </p>
        {/if}
        {#if armedHandoff?.requiresParentVerification === true}
          <p class="pw-mission-armed__drill pw-mono pw-dim" aria-label="Parent verification advisory">
            After transmit, optional proof for parent — XP not gated.
          </p>
        {/if}
        {#if isBundleMode}
          <p class="pw-mission-armed__drill pw-mono" aria-label="Bundle drill sequence">
            Bundle · {bundleDrills.length} drills in sequence
          </p>
        {/if}
      </div>
    {/if}

    <TrainMissionStrip missions={trainMissionStripItems} onContinue={onContinueTrainMission} />

    <div class="pw-exec__command" aria-labelledby="pw-exec-heading">
      <div class="pw-panel__head pw-panel__head--row">
        <div class="pw-exec__head-copy">
          <h2 id="pw-exec-heading" class="pw-title">Configure session</h2>
          <span class="pw-eyebrow">Execution terminal</span>
        </div>
        <div class="tw-flex tw-shrink-0 tw-items-center tw-gap-2">
          <IntelModal dossierMode title={TELEMETRY_INTEL.title} instructions={TELEMETRY_INTEL.instructions} />
          <div class="pw-exec__status" role="status">
            <p class="pd-label pd-mono pw-est">
              <span class="pw-dim">EST. YIELD</span>
              <span class="pw-green">+{estimatedLogXp} XP</span>
              {#if missionBounty != null}
                <span class="pw-dim">· CAP</span>
                <span class="pw-telem">{missionBounty} XP</span>
              {/if}
            </p>
          </div>
        </div>
      </div>
      <p
        class="pw-terminal-state pw-mono"
        class:pw-terminal-state--armed={!!activeMissionId && !logSubmitting}
        class:pw-terminal-state--transmitting={logSubmitting}
        role="status"
      >
        {#if logSubmitting}
          ◉ TRANSMITTING…
        {:else if armedCadenceBlocked}
          ◉ CADENCE HOLD<span class="pw-dim"> · NEXT SESSION TOMORROW</span>
        {:else if activeMissionId}
          ◉ ARMED: {armedMissionTitle.toUpperCase()}<span class="pw-dim"> · EXECUTION SYNCS TO FILE ON TRANSMIT</span>
        {:else}
          ◉ READY TO TRANSMIT
        {/if}
      </p>
    </div>

    <div class="pw-theater__body tw-min-w-0 bento-span-12">
      <div class="pw-theater__grid">
        {#if isBenchmarkSession && armedBenchmarkDrill}
          <BenchmarkTrainSession
            drill={armedBenchmarkDrill}
            handoff={armedHandoff}
            {activeMissionId}
            coachTargetValue={armedBenchmarkTarget}
            {totalXpHud}
            {profile}
            {cadenceCompletions}
            {logTrainingSession}
            {writePlayerOsWorkout}
            {commitWorkoutCompletion}
            {dopamineOnCommit}
            {dopamineOnCallable}
            bumpXp={bumpXp}
            {authUser}
            onCadenceBlocked={onCadenceBlocked}
            onQuestProgress={onQuestProgress}
            onClearMission={onClearArmedMission}
            onParentProof={onParentProof}
            onRefreshProfile={onRefreshProfile}
            onSuccess={onBenchmarkSuccess}
            onError={(message) => onBenchmarkError(message)}
          />
        {:else}
        <div class="pw-theater__configure pd-os-deck__well">
          <div class="pw-configure-step">
            <span class="pw-eyebrow pd-panel-eyebrow">1 · Focus area</span>
            {#if isCoachDirectedSession}
              <p class="pw-mono pw-data pw-ghostline">
                {focusLabel}
                <span class="pw-dim"> · locked by coach</span>
              </p>
            {:else}
              <div class="pw-focus" role="group" aria-label="Focus area">
                {#each focusAreas as focus}
                  <button
                    type="button"
                    class="pw-focus__btn"
                    class:pw-focus__btn--on={selectedFocus === focus.id}
                    onclick={() => onSelectFocus(focus.id)}
                  >
                    <span class="pw-mono pw-focus__op">{focus.op}</span>
                    <span class="pw-focus__lab">{focus.label}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <div class="pw-configure-step">
            <span class="pw-eyebrow pd-panel-eyebrow">2 · Sub-drill</span>
            {#if drillCatalog.drillsLoading}
              <p class="pw-mono tw-text-xs tw-text-zinc-500">Loading drill catalog…</p>
            {/if}
            {#if isCoachDirectedSession}
              <p class="pw-mono pw-data pw-ghostline">
                {lockedCoachDrillLabel}
                <span class="pw-dim"> · assigned by coach</span>
              </p>
            {:else}
              <div class="pw-subdrill" role="list">
                {#each drillCatalog.availableDrills as drill}
                  <button
                    type="button"
                    class="pw-chip"
                    class:pw-chip--on={selectedDrill === drill}
                    onclick={() => onSelectDrill(drill)}
                  >
                    {drill}
                  </button>
                {/each}
              </div>
              {#if selectedDrill && !drillCatalog.availableDrills.includes(selectedDrill)}
                <p class="pw-ghostline">
                  <span class="pw-eyebrow">Off-catalog transmit</span>
                  <span class="pw-mono pw-data">{selectedDrill}</span>
                </p>
              {/if}
            {/if}
          </div>
        </div>

        <div class="pw-theater__execute pd-os-deck__well">
          <span class="pw-eyebrow pd-panel-eyebrow">Execute</span>
          {#if isBundleMode && currentBundleDrill}
            <div class="pw-configure-step" role="region" aria-label="Bundle drill stepper">
              <span class="pw-eyebrow pd-panel-eyebrow">
                Drill {bundleStepIdx + 1} of {bundleDrills.length}
              </span>
              <p class="pw-mission-armed__title pw-mono">
                {currentBundleDrill.drillTitle || 'Bundle drill'}
              </p>
              {#if currentBundleDrill.cues}
                <p class="pw-mono pw-data pw-dim">Cues: {currentBundleDrill.cues}</p>
              {/if}
              {#if currentBundleDrill.videoUrl}
                <a class="pw-link pw-mono pw-dim" href={currentBundleDrill.videoUrl} target="_blank" rel="noopener noreferrer">Watch demo</a>
              {/if}
              <dl class="pw-mono pw-data tw-grid tw-grid-cols-2 tw-gap-2 tw-text-sm">
                <div>
                  <dt class="pw-dim tw-text-xs">Sets</dt>
                  <dd>{currentBundleDrill.sets}</dd>
                </div>
                {#if currentBundleDrill.repsPerSet}
                  <div>
                    <dt class="pw-dim tw-text-xs">Reps / set</dt>
                    <dd>{currentBundleDrill.repsPerSet}{currentBundleDrill.bilateral ? ' · both sides' : ''}</dd>
                  </div>
                {/if}
                {#if currentBundleDrill.targetRpe}
                  <div>
                    <dt class="pw-dim tw-text-xs">Target RPE</dt>
                    <dd>{currentBundleDrill.targetRpe} / 10</dd>
                  </div>
                {/if}
                {#if currentBundleDrill.targetDurationMin}
                  <div>
                    <dt class="pw-dim tw-text-xs">Duration</dt>
                    <dd>{currentBundleDrill.targetDurationMin} min</dd>
                  </div>
                {/if}
              </dl>
              {#if isFinalBundleStep}
                <div class="pw-configure-step">
                  <label for="pw-bundle-notes" class="pw-eyebrow pd-panel-eyebrow">
                    Session notes (optional)
                  </label>
                  <textarea
                    id="pw-bundle-notes"
                    class="pw-field tw-min-h-[72px]"
                    maxlength={SESSION_NOTES_MAX_LENGTH}
                    placeholder="How did it feel? Anything your coach should know?"
                    bind:value={sessionNotes}
                  ></textarea>
                  <p class="pw-dim pw-mono tw-text-xs">{sessionNotes.length}/{SESSION_NOTES_MAX_LENGTH}</p>
                </div>
              {/if}
            </div>
          {:else if isCoachDirectedSession}
            <div class="pw-configure-step" role="group" aria-label="Coach prescription">
              <span class="pw-eyebrow pd-panel-eyebrow">Coach prescription</span>
              {#if coachPrescriptionLine}
                <p class="pw-mono pw-data">{coachPrescriptionLine}</p>
              {/if}
              {#if armedPrescription?.cues}
                <p class="pw-mono pw-data pw-dim">Coaching cues: {armedPrescription.cues}</p>
              {/if}
              {#if armedPrescription?.videoUrl}
                <a class="pw-link pw-mono pw-dim" href={armedPrescription.videoUrl} target="_blank" rel="noopener noreferrer">Watch demo</a>
              {/if}
              <dl class="pw-mono pw-data tw-grid tw-grid-cols-2 tw-gap-2 tw-text-sm">
                <div>
                  <dt class="pw-dim tw-text-xs">Duration</dt>
                  <dd>{duration} min</dd>
                </div>
                <div>
                  <dt class="pw-dim tw-text-xs">Target RPE</dt>
                  <dd>{intensity} / 10</dd>
                </div>
              </dl>
            </div>
            {@render volumeControls()}
            <div class="pw-configure-step">
              <label for="pw-session-notes" class="pw-eyebrow pd-panel-eyebrow">
                Session notes (optional)
              </label>
              <textarea
                id="pw-session-notes"
                class="pw-field tw-min-h-[72px]"
                maxlength={SESSION_NOTES_MAX_LENGTH}
                placeholder="How did it feel? Anything your coach should know?"
                bind:value={sessionNotes}
              ></textarea>
              <p class="pw-dim pw-mono tw-text-xs">{sessionNotes.length}/{SESSION_NOTES_MAX_LENGTH}</p>
            </div>
          {:else}
            {@render volumeControls(!!armedPrescription)}
            <div class="pw-gauges">
              <div class="pw-gauge">
                <div class="pw-gauge__head">
                  <span class="pw-eyebrow">Time on task (min)</span>
                  <span class="pw-mono pw-data">{duration}</span>
                </div>
                <input
                  class="pw-field"
                  type="number"
                  min="1"
                  max={FREE_LOG_DURATION_MAX_MINUTES}
                  step="1"
                  bind:value={duration}
                  aria-label="Duration in minutes"
                />
                <p class="pw-dim pw-mono tw-text-xs">Max {FREE_LOG_DURATION_MAX_MINUTES} min per session</p>
              </div>
              <div class="pw-gauge pw-gauge--rpe">
                <div class="pw-gauge__head">
                  <span class="pw-eyebrow">RPE (intensity 1–10)</span>
                  <span class="pw-mono pw-telem">{intensity} / 10</span>
                </div>
                <div
                  class="pw-loadbar pw-loadbar--rpe"
                  style:--fill={`${intensityGaugePct}%`}
                  role="progressbar"
                  aria-valuenow={intensity}
                  aria-valuemin="1"
                  aria-valuemax="10"
                  aria-label="RPE intensity"
                >
                  <div class="pw-loadbar__fill"></div>
                  <div class="pw-loadbar__scan" aria-hidden="true"></div>
                </div>
                <input
                  class="pw-range pw-range--rpe"
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  bind:value={intensity}
                  aria-label="RPE intensity"
                />
              </div>
            </div>
          {/if}
        </div>
        {/if}
      </div>
    </div>

    {#if showReadinessStrip}
      <TrainReadinessStrip
        bind:sleepHoursLastNight={readinessSleepHours}
        bind:soreness={readinessSoreness}
        bind:mood={readinessMood}
        bind:restingFeel={readinessRestingFeel}
      />
    {/if}

    {#if !isBenchmarkSession}
    <div class="pw-theater__transmit">
      {#if isBundleMode}
        <button
          type="button"
          class="pw-exec pw-exec--alt"
          disabled={logSubmitting || !currentBundleDrill || armedCadenceBlocked}
          onclick={onLogBundleStep}
        >
          {#if logSubmitting}
            <span class="pw-mono">Logging…</span>
          {:else if isFinalBundleStep}
            <Icon name="game.zap" />
            <span>Complete bundle</span>
          {:else}
            <Icon name="game.zap" />
            <span>Complete &amp; next drill</span>
          {/if}
        </button>
        <p class="pw-mono pw-dim tw-text-xs">
          Step {bundleStepIdx + 1} of {bundleDrills.length}
          {isFinalBundleStep ? ' · Final step — completes bundle' : ''}
        </p>
      {:else}
        <button
          type="button"
          class="pw-exec pw-exec--transmit pw-exec-commit"
          disabled={(!selectedDrill && !isCoachDirectedSession) || logSubmitting || armedCadenceBlocked}
          onclick={onLogWorkout}
        >
          {#if logSubmitting}
            <span class="pw-mono">Logging…</span>
          {:else if armedCadenceBlocked}
            <span class="pw-mono">Next session tomorrow</span>
          {:else}
            <Icon name="game.zap" />
            <span>EXEC_COMMIT</span>
          {/if}
        </button>
        {#if !selectedDrill && !isCoachDirectedSession}
          <p class="pw-mono pw-locked">Awaiting sub-drill selection</p>
        {/if}
      {/if}
    </div>
    {/if}
  </div>
  </div>

  {#if pendingProofIntentId && !proofSubmitted}
    <div class="pw-theater pd-os-deck pd-os-deck--hero bento-span-12" aria-live="polite">
      <div class="pd-os-deck__well pw-mission-armed" style="border-color:rgba(20,184,166,0.2);">
        <div class="pw-mission-armed__head">
          <span class="pw-eyebrow pw-mono">Parent verification</span>
          <button type="button" class="pw-mission-armed__clear pw-mono" onclick={onDismissProofAffordance}>
            Skip
          </button>
        </div>
        <p class="pw-mission-armed__hint pw-mono" style="font-size:11px;">
          Your coach requested proof for this session. Add an optional note and submit — or skip entirely. XP is already awarded.
        </p>
        <textarea
          class="pw-session-notes pw-mono"
          rows="3"
          maxlength="500"
          placeholder="Optional note for your parent…"
          bind:value={proofNote}
          disabled={proofSubmitting}
          style="width:100%; resize:vertical; font-size:11px; background:rgba(20,184,166,0.04); border:1px solid rgba(20,184,166,0.15); border-radius:6px; padding:6px 8px; color:#e2e8f0;"
        ></textarea>

        <label class="pw-mono" style="display:block; margin-top:8px; font-size:10px; color:rgba(20,184,166,0.6); letter-spacing:0.08em;">
          ATTACH PHOTO OR SHORT VIDEO <span style="opacity:0.5;">(optional)</span>
          <input
            type="file"
            accept="image/*,video/*"
            disabled={proofSubmitting}
            onchange={onProofFileChange}
            style="display:block; margin-top:4px; font-size:10px; color:#e2e8f0;"
          />
        </label>
        {#if proofMediaFile}
          <p class="pw-mono" style="font-size:10px; color:rgba(20,184,166,0.7); margin-top:4px;">
            {proofMediaFile.name} selected
            {#if proofUploadProgress !== null}
              · uploading {proofUploadProgress}%
            {/if}
          </p>
        {/if}
        {#if proofMediaError}
          <p class="pw-mono" style="font-size:10px; color:rgba(255,80,60,0.8); margin-top:4px;" role="alert">{proofMediaError}</p>
        {/if}

        <div class="tw-flex tw-gap-2 tw-mt-2">
          <button
            type="button"
            class="pw-exec pw-exec--alt"
            style="flex:1; font-size:11px;"
            disabled={proofSubmitting}
            onclick={onSendCompletionProof}
          >
            {proofSubmitting ? (proofUploadProgress !== null ? `Uploading ${proofUploadProgress}%…` : 'Sending…') : 'Send proof'}
          </button>
          <button
            type="button"
            class="pw-mission-armed__clear pw-mono"
            style="font-size:11px;"
            disabled={proofSubmitting}
            onclick={onDismissProofAffordance}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if proofSubmitted}
    <p class="pw-mono pw-dim" style="font-size:11px; padding:8px 0;" aria-live="polite">
      Proof sent to parent.
    </p>
  {/if}

  <PlayerDiegeticOverlay
    open={overlayOpen}
    variant={overlayVariant}
    title={overlayTitle}
    message={overlayMessage}
    confirmLabel={pendingHqReturn ? 'Return to HQ' : 'Acknowledge'}
    onConfirm={onCloseOverlay}
    onCancel={onCloseOverlay}
  />
</div>

{#snippet volumeControls(showCoachTargetHint = false)}
  <div class="pw-configure-step" role="group" aria-label="Session volume">
    <span class="pw-eyebrow pd-panel-eyebrow">Volume (sets × reps)</span>
    {#if showCoachTargetHint}
      <p class="pw-ghostline pw-mono pw-dim">Coach target · adjust if you did more or less</p>
    {/if}
    <div class="pw-gauges" style="grid-template-columns: 1fr 1fr;">
      <div class="pw-gauge">
        <div class="pw-gauge__head">
          <span class="pw-eyebrow">Sets</span>
          <span class="pw-mono pw-data">{workoutSets}</span>
        </div>
        <input
          class="pw-range"
          type="range"
          min="1"
          max="20"
          step="1"
          bind:value={workoutSets}
          aria-label="Sets completed"
        />
      </div>
      <div class="pw-gauge">
        <div class="pw-gauge__head">
          <span class="pw-eyebrow">Reps / set</span>
          <span class="pw-mono pw-data">{workoutRepsPerSet}</span>
        </div>
        <input
          class="pw-range"
          type="range"
          min="0"
          max="50"
          step="1"
          bind:value={workoutRepsPerSet}
          aria-label="Reps per set"
        />
      </div>
    </div>
    <label class="pw-mono tw-flex tw-items-center tw-gap-2 tw-text-sm">
      <input type="checkbox" bind:checked={workoutBilateral} class="tw-accent-teal-400" />
      Both sides (doubles rep count for XP)
    </label>
    <p class="pw-mono pw-data">
      Total reps for log: <span class="pw-green">{totalWorkoutReps}</span>
    </p>
  </div>
{/snippet}
