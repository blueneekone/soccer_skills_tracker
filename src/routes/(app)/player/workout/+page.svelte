<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { untrack } from 'svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { httpsCallable } from 'firebase/functions';
  import { db, functions } from '$lib/firebase.js';
  import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
  import { authStore } from '$lib/stores/auth.svelte.js';
  import { playerEngine, writePlayerOsWorkout } from '$lib/stores/playerEngine.svelte.js';
  import { commitWorkoutCompletion } from '$lib/services/writes.svelte';
  import { dopamineOnCommit, dopamineOnCallable } from '$lib/services/dopamine.svelte.js';
  import { calculateTrainingSessionEarnedXp, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
  import {
    buildWorkoutDrillType,
    executePlayerWorkoutLog,
    expectedWorkoutXp,
    intensityApiFromStep,
    validatePlayerWorkoutLog,
    workoutLogErrorMessage,
  } from '$lib/player/workoutLog.js';
  import { formatAttributeLabel, loadQuestProgress, markQuestCompletedAfterWorkoutLog, saveQuestProgress } from '$lib/player/dashboard/activeBounties.js';
  import {
    attributeIdToWorkoutFocus,
    clearMissionHandoff,
    COACH_INTENT_HINT,
    formatSuggestedDrillLine,
    isMissionHandoffStale,
    readMissionHandoff,
    resolveHeuristicDrill,
    type MissionHandoff,
  } from '$lib/player/workout/coachMissionFlow.js';
  import PlayerDiegeticOverlay from '$lib/components/player/PlayerDiegeticOverlay.svelte';
  import IntelModal from '$lib/components/ui/IntelModal.svelte';
  import PlayerOsPageStrap from '$lib/components/player/PlayerOsPageStrap.svelte';
  import '$lib/styles/player-dashboard-hud.css';
  import '$lib/styles/player-terminal.css';

  const TELEMETRY_INTEL = {
    title: 'TELEMETRY LOGGING',
    instructions: [
      '1. Select your drill or exercise.',
      '2. Input your exact reps, sets, or time.',
      '3. Honest data feeds the algorithm. Your stats will update your Operative ID Card on the main dashboard.',
    ],
  };

  const logTrainingSession = httpsCallable(functions, 'logTrainingSession');

  const profile = $derived(authStore.userProfile);
  const profileXp = $derived(Math.max(0, Math.floor(Number(profile?.totalXp ?? profile?.xp) || 0)));
  const totalXpHud = $derived(
    playerEngine.hydrated
      ? Math.max(playerEngine.totalXp, profileXp)
      : profileXp,
  );

  $effect(() => {
    if (!browser) return;
    const u = authStore.user;
    if (authStore.role === 'player' && u?.uid) {
      playerEngine.attach(u.uid);
      return () => playerEngine.detach();
    }
    playerEngine.detach();
  });

  /** @type {'technical' | 'physical' | 'tactical' | 'recovery'} */
  let selectedFocus = $state('technical');
  let selectedDrill = $state(/** @type {string | null} */ (null));
  let intensity = $state(5);
  let duration = $state(30);
  const durationGaugePct = $derived(
    ((Math.max(1, Math.min(1440, duration)) - 1) / (1440 - 1)) * 100,
  );
  const intensityGaugePct = $derived(
    ((Math.max(1, Math.min(10, intensity)) - 1) / 9) * 100,
  );

  let logSubmitting = $state(false);

  /** Diegetic overlay state machine (Wave D — replaces legacy commit modals). */
  let overlayOpen = $state(false);
  let overlayVariant = $state(/** @type {'success' | 'error' | 'confirm'} */ ('error'));
  let overlayTitle = $state('');
  let overlayMessage = $state('');

  function closeOverlay() {
    overlayOpen = false;
  }

  function showDiegeticError(title: string, message: string) {
    overlayVariant = 'error';
    overlayTitle = title;
    overlayMessage = message;
    overlayOpen = true;
  }

  function showDiegeticSuccess(title: string, message: string) {
    overlayVariant = 'success';
    overlayTitle = title;
    overlayMessage = message;
    overlayOpen = true;
  }

  /** @type {string | null} */
  let activeMissionId = $state(null);
  /** @type {MissionHandoff | null} */
  let armedHandoff = $state(null);
  /** @type {Array<Record<string, unknown> & { id: string }>} */
  let incomingMissions = $state([]);

  /**
   * @param {MissionHandoff} handoff
   */
  async function applyMissionHandoff(handoff) {
    if (isMissionHandoffStale(handoff)) {
      clearMissionHandoff();
      return;
    }
    activeMissionId = handoff.missionId;
    armedHandoff = handoff;
    if (handoff.focusArea) {
      selectedFocus = handoff.focusArea;
    } else if (handoff.targetAttributeId) {
      selectedFocus = attributeIdToWorkoutFocus(handoff.targetAttributeId);
    }
    if (handoff.drillTitle) {
      selectedDrill = handoff.drillTitle;
    } else if (handoff.targetAttributeId) {
      const frustration = String(profile?.recentFrustration ?? 'low');
      const drill = await resolveHeuristicDrill(db, handoff.targetAttributeId, frustration);
      if (drill?.title) selectedDrill = drill.title;
    }
    if (handoff.durationMinutes != null && handoff.durationMinutes > 0) {
      duration = handoff.durationMinutes;
    }
    if (handoff.targetRpe != null && handoff.targetRpe > 0) {
      intensity = handoff.targetRpe;
    }
  }

  function clearArmedMission() {
    activeMissionId = null;
    armedHandoff = null;
    clearMissionHandoff();
  }

  function recordQuestProgressAfterLog(handoff) {
    let progress = loadQuestProgress();
    if (handoff?.missionId) {
      const source =
        handoff.source === 'coach_homework' ? 'coach_homework'
        : handoff.source === 'coach_intent' ? 'coach_intent'
        : handoff.missionId === 'daily-training-log' ? 'daily_habit'
        : null;
      if (source) {
        progress = markQuestCompletedAfterWorkoutLog(handoff.missionId, source, progress);
      }
    }
    if (
      progress.acceptedIds.includes('daily-training-log') &&
      !progress.completedIds.includes('daily-training-log')
    ) {
      progress = markQuestCompletedAfterWorkoutLog('daily-training-log', 'daily_habit', progress);
    }
    saveQuestProgress(progress);
  }

  $effect(() => {
    if (!browser) return;
    const handoff = readMissionHandoff();
    if (!handoff?.missionId) return;
    if (isMissionHandoffStale(handoff)) {
      clearMissionHandoff();
      return;
    }
    untrack(() => {
      void applyMissionHandoff(handoff);
    });
  });

  // Drop armed state if coach intent was cancelled server-side.
  $effect(() => {
    if (!armedHandoff || armedHandoff.source !== 'coach_intent') return;
    if (!incomingMissions.some((m) => m.id === armedHandoff.missionId)) {
      clearArmedMission();
    }
  });

  // Epic 8: subscribe to active team_assignments for HQ link + armed mission goal XP.
  $effect(() => {
    if (!browser) return;
    const uid = authStore.user?.uid ?? '';
    const teamId = typeof authStore.userProfile?.teamId === 'string'
      ? authStore.userProfile.teamId
      : '';
    if (authStore.role !== 'player' || !uid || !teamId) {
      incomingMissions = [];
      return;
    }
    const qy = query(
      collection(db, 'team_assignments'),
      where('teamId', '==', teamId),
      where('status', '==', 'active'),
      orderBy('priority', 'asc'),
    );
    const unsub = onSnapshot(
      qy,
      (snap) => {
        incomingMissions = snap.docs
          .map((d) => {
            const x = d.data() || {};
            return /** @type {Record<string, unknown> & { id: string }} */ ({ id: d.id, ...x });
          })
          .filter((m) => {
            if (!m.scope || m.scope === 'team') return true;
            return Array.isArray(m.targetUids) && m.targetUids.includes(uid);
          });
      },
      (e) => {
        console.error('[Player OS] team_assignments', e);
      },
    );
    return () => {
      unsub();
    };
  });

  const focusAreas = [
    { id: /** @type {const} */ ('technical'), label: 'Technical', op: 'OP-TECH' },
    { id: /** @type {const} */ ('physical'), label: 'Physical', op: 'OP-PHY' },
    { id: /** @type {const} */ ('tactical'), label: 'Tactical', op: 'OP-TAC' },
    { id: /** @type {const} */ ('recovery'), label: 'Recovery', op: 'OP-RCV' },
  ];

  const drillsByFocus = {
    technical: ['Juggling', 'First Touch', 'Shooting', 'Wall Passing', 'Cone Dribbling'],
    physical: ['100m Sprints', 'Beep Test', '5k Run', 'Agility Ladder', 'Weight Training'],
    tactical: ['Film Study', 'Set Pieces', 'Scrimmage', 'Positional Drills', 'Box-to-Box'],
    recovery: ['Stretching', 'Yoga', 'Foam Rolling', 'Light Jog', 'Ice Bath'],
  };

  const availableDrills = $derived(
    selectedFocus ? drillsByFocus[selectedFocus] : [],
  );

  /**
   * @param {'technical' | 'physical' | 'tactical' | 'recovery'} id
   */
  function selectFocus(id) {
    if (id !== selectedFocus) {
      selectedDrill = null;
      clearArmedMission();
    }
    selectedFocus = id;
  }

  const hasCoachIntents = $derived(incomingMissions.length > 0);

  const armedMissionTitle = $derived.by(() => {
    if (!activeMissionId) return '';
    if (armedHandoff?.targetAttributeId) {
      return formatAttributeLabel(armedHandoff.targetAttributeId);
    }
    const row = incomingMissions.find((r) => r.id === activeMissionId);
    const attr = row?.targetAttributeId;
    return typeof attr === 'string' ? formatAttributeLabel(attr) : 'Coach mission';
  });

  const armedDrillLine = $derived.by(() => {
    if (!selectedDrill) return '';
    return formatSuggestedDrillLine(selectedDrill, {
      durationMinutes: duration,
      targetRpe: intensity,
    });
  });

  const armedGoalXp = $derived.by(() => {
    if (armedHandoff?.requiredXp != null && armedHandoff.requiredXp > 0) {
      return armedHandoff.requiredXp;
    }
    const row = incomingMissions.find((r) => r.id === activeMissionId);
    return row != null ? Math.max(0, Math.floor(Number(row.requiredXp) || 0)) : null;
  });

  const focusLabel = $derived(
    (focusAreas.find((f) => f.id === selectedFocus) ?? { label: 'Session' }).label,
  );

  const missionBounty = $derived.by(() => armedGoalXp);

  const estimatedLogXp = $derived.by(() => {
    return calculateTrainingSessionEarnedXp({
      duration: Math.max(0, Math.floor(Number(duration) || 0)),
      reps: 0,
      intensity: intensityApiFromStep(intensity),
    });
  });

  $effect(() => {
    if (!authStore.isLoading && authStore.role === 'parent') {
      untrack(() => goto('/parent/log-workout', { replaceState: true }));
    }
  });

  async function logWorkout() {
    const gate = validatePlayerWorkoutLog({
      selectedFocus,
      selectedDrill,
      logSubmitting,
      role: authStore.role,
      profile,
    });
    if (!gate.ok) {
      if (gate.title) {
        showDiegeticError(gate.title, gate.text);
      }
      return;
    }
    if (!selectedDrill) return;

    const drillType = buildWorkoutDrillType(focusLabel, selectedDrill);
    const dMin = Math.max(0, Math.floor(Number(duration) || 0));
    const intensityCall = intensityApiFromStep(intensity);
    const expectedXp = expectedWorkoutXp(dMin, intensity);
    const oldLevel = getLevelProgressFromTotalXp(totalXpHud).level;
    const user = authStore.user;
    if (!user) return;

    logSubmitting = true;
    playerEngine.bumpBy(expectedXp);
    try {
      const result = await executePlayerWorkoutLog({
        drillType,
        durationMin: dMin,
        intensityCall,
        focusLabel,
        selectedDrill,
        activeMissionId,
        missionSource: armedHandoff?.source ?? null,
        totalXpHud,
        oldLevel,
        intensityStep: intensity,
        authUser: { uid: user.uid, email: user.email },
        profile,
        logTrainingSession,
        writePlayerOsWorkout,
        commitWorkoutCompletion,
        dopamineOnCommit,
      });
      if (result.clearMission) {
        recordQuestProgressAfterLog(armedHandoff);
        clearArmedMission();
      } else {
        recordQuestProgressAfterLog(null);
      }
      if (result.levelUpFrom != null && result.levelUpTo != null) {
        window.dispatchEvent(
          new CustomEvent('phoenix:level-up', {
            detail: { from: result.levelUpFrom, to: result.levelUpTo, earnedXp: result.earned },
          }),
        );
      }
      void dopamineOnCallable(Promise.resolve(result), { kind: 'drill' });
      showDiegeticSuccess(
        'Command executed',
        `+${result.earned} XP · Level ${result.level ?? '—'}${result.missionCloseNote}`,
      );
      await authStore.refresh({ silent: true });
    } catch (e) {
      playerEngine.bumpBy(-expectedXp);
      console.error(e);
      showDiegeticError('Execution failed', workoutLogErrorMessage(e));
    } finally {
      logSubmitting = false;
    }
  }
</script>

<div class="pd-page-root player-dossier-root player-hud-root pw-page tw-min-w-0 tw-overflow-x-hidden" data-region="player-workout-log">
  <div class="pd-content-wrap pd-route-stack">
  <PlayerOsPageStrap eyebrow="Train / Log session" title="Workout logger" />

  {#if hasCoachIntents && !activeMissionId}
    <p class="pw-hq-link pw-mono">
      <a href={resolve('/player/dashboard')}>Coach missions on HQ →</a>
      <span class="pw-dim"> · accept a mission, then start session here</span>
    </p>
  {/if}

  <div class="pw-theater pd-os-deck pd-os-deck--hero bento-span-12">
    {#if activeMissionId}
      <div class="pw-mission-armed pd-os-deck__well" aria-live="polite">
        <div class="pw-mission-armed__head">
          <span class="pw-eyebrow">Armed mission</span>
          <button type="button" class="pw-mission-armed__clear pw-mono" onclick={clearArmedMission}>
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
      </div>
    {/if}

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
                <span class="pw-action">{missionBounty} XP</span>
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
        {:else if activeMissionId}
          ◉ ARMED: {armedMissionTitle.toUpperCase()}<span class="pw-dim"> · EXECUTION SYNCS TO FILE ON TRANSMIT</span>
        {:else}
          ◉ READY TO TRANSMIT
        {/if}
      </p>
    </div>

    <div class="pw-theater__body tw-min-w-0 bento-span-12">
      <div class="pw-theater__grid">
        <div class="pw-theater__configure pd-os-deck__well">
          <div class="pw-configure-step">
            <span class="pw-eyebrow pd-panel-eyebrow">1 · Focus area</span>
            <div class="pw-focus" role="group" aria-label="Focus area">
              {#each focusAreas as focus}
                <button
                  type="button"
                  class="pw-focus__btn"
                  class:pw-focus__btn--on={selectedFocus === focus.id}
                  onclick={() => selectFocus(focus.id)}
                >
                  <span class="pw-mono pw-focus__op">{focus.op}</span>
                  <span class="pw-focus__lab">{focus.label}</span>
                </button>
              {/each}
            </div>
          </div>

          <div class="pw-configure-step">
            <span class="pw-eyebrow pd-panel-eyebrow">2 · Sub-drill (dynamic)</span>
            <div class="pw-subdrill" role="list">
              {#each availableDrills as drill}
                <button
                  type="button"
                  class="pw-chip"
                  class:pw-chip--on={selectedDrill === drill}
                  onclick={() => {
                    clearArmedMission();
                    selectedDrill = drill;
                  }}
                >
                  {drill}
                </button>
              {/each}
            </div>
            {#if selectedDrill && !availableDrills.includes(selectedDrill)}
              <p class="pw-ghostline">
                <span class="pw-eyebrow">Off-catalog transmit</span>
                <span class="pw-mono pw-data">{selectedDrill}</span>
              </p>
            {/if}
          </div>
        </div>

        <div class="pw-theater__execute pd-os-deck__well">
          <span class="pw-eyebrow pd-panel-eyebrow">Execute</span>
          <div class="pw-gauges">
            <div class="pw-gauge">
              <div class="pw-gauge__head">
                <span class="pw-eyebrow">Time on task (min)</span>
                <span class="pw-mono pw-data">{duration}</span>
              </div>
              <div
                class="pw-gauge__bar"
                style:--gauge={`${durationGaugePct}%`}
                aria-label="Duration"
              >
                <div class="pw-gauge__bar-fill"></div>
              </div>
              <input
                class="pw-range"
                type="range"
                min="1"
                max="1440"
                step="1"
                bind:value={duration}
                aria-label="Duration in minutes"
              />
            </div>
            <div class="pw-gauge pw-gauge--rpe">
              <div class="pw-gauge__head">
                <span class="pw-eyebrow">RPE (intensity 1–10)</span>
                <span class="pw-mono pw-action">{intensity} / 10</span>
              </div>
              <div
                class="pw-gauge__bar pw-gauge__bar--rpe"
                style:--gauge={`${intensityGaugePct}%`}
                aria-label="RPE"
              >
                <div class="pw-gauge__bar-fill"></div>
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
        </div>
      </div>
    </div>

    <div class="pw-theater__transmit">
      <button
        type="button"
        class="pw-exec pw-exec--transmit"
        disabled={!selectedDrill || logSubmitting}
        onclick={logWorkout}
      >
        {#if logSubmitting}
          <span class="pw-mono">Logging…</span>
        {:else}
          <Icon name="game.zap" />
          <span>Log session</span>
        {/if}
      </button>
      {#if !selectedDrill}
        <p class="pw-mono pw-locked">Awaiting sub-drill selection</p>
      {/if}
    </div>
  </div>
  </div>

  <PlayerDiegeticOverlay
    open={overlayOpen}
    variant={overlayVariant}
    title={overlayTitle}
    message={overlayMessage}
    onConfirm={closeOverlay}
    onCancel={closeOverlay}
  />
</div>
