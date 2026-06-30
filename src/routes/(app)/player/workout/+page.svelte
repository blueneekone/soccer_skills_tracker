<script lang="ts">
  import { browser } from '$app/environment';
  import { goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import { httpsCallable } from 'firebase/functions';
  import { db, functions } from '$lib/firebase.js';
  import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
  import { authStore } from '$lib/stores/auth.svelte.js';
  import { playerEngine, writePlayerOsWorkout } from '$lib/stores/playerEngine.svelte.js';
  import { commitWorkoutCompletion } from '$lib/services/writes.svelte';
  import { dopamineOnCommit, dopamineOnCallable } from '$lib/services/dopamine.svelte.js';
  import { calculateTrainingSessionEarnedXp } from '$lib/gamification/level.js';
  import { intensityApiFromStep } from '$lib/player/workoutLog.js';
  import { resolveAppPath } from '$lib/components/_shared/resolveAppPath.js';
  import {
    formatAttributeLabel,
    loadQuestProgress,
    markQuestCompletedAfterWorkoutLog,
    saveQuestProgress,
    WORKOUT_HQ_RETURN_PATH,
  } from '$lib/player/dashboard/activeBounties.js';
  import {
    armedCadenceBlockedToday,
    CADENCE_LIMIT_ERROR,
    subscribePlayerCadenceCompletions,
    type CadenceCompletionRow,
  } from '$lib/player/dashboard/cadenceCompletions.js';
  import {
    attributeIdToWorkoutFocus,
    buildPolicyHintsFromResult,
    clearMissionHandoff,
    formatSuggestedDrillLine,
    isMissionHandoffStale,
    resolveAdaptiveDrill,
    resolveHandoffDurationMinutes,
    resolveHandoffTargetRpe,
    resolveDrillById,
    resolveMissionHandoffDisplayCadence,
    type MissionHandoff,
    type WorkoutFocus,
  } from '$lib/player/workout/coachMissionFlow.js';
  import { resolveTrainBenchmarkContext } from '$lib/player/workout/trainBenchmarkContext.js';
  import { resolveWorkoutMountHandoff } from '$lib/player/workout/applyWorkoutMountHandoff.js';
  import { listTrainMissionStripItems, continueCoachIntentOnTrain } from '$lib/player/workout/trainMissionPicker.js';
  import type { PrescriptionDrillEntry } from '$lib/types/intent.js';
  import { resolveTeamDrillById as resolveTeamLibraryDrill } from '$lib/coach/teamDrillLibrary.js';
  import { isCoachDirectedHandoff } from '$lib/player/workout/workoutSessionConstants.js';
  import { WORKOUT_FOCUS_AREAS } from '$lib/player/workout/focusDrillCatalog.js';
  import {
    useWorkoutDrillCatalog,
    useWorkoutSkillTreePrefill,
  } from '$lib/player/workout/workoutPageDrillHooks.svelte.js';
  import { ensureRlPolicyCached, readRlPolicyCache } from '$lib/player/workout/rlPolicyCache.js';
  import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';
  import {
    computeWorkoutTotalReps,
    formatPrescriptionVolumeLine,
  } from '$lib/player/workout/workoutPrescription.js';
  import { useTrainReadinessStrip } from '$lib/player/workout/useTrainReadinessStrip.svelte.js';
  import PlayerWorkoutPageView from '$lib/player/workout/PlayerWorkoutPageView.svelte';
  import {
    handleBenchmarkSuccessPayload,
    runLogBundleStep,
    runLogWorkout,
    runSendCompletionProof,
    validateProofMediaFile,
  } from '$lib/player/workout/workoutPageSubmit.js';
  import '$lib/styles/player-dashboard-hud.css';
  import '$lib/styles/player-terminal.css';
  import '$lib/styles/player-train-theater.css';

  const logTrainingSession = httpsCallable(functions, 'logTrainingSession');
  const submitCompletionProof = httpsCallable(functions, 'submitCompletionProof');

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

  let selectedFocus = $state<WorkoutFocus>('technical');
  let selectedDrill = $state(/** @type {string | null} */ (null));
  let intensity = $state(5);
  let duration = $state(30);
  let sessionNotes = $state('');
  const intensityGaugePct = $derived(
    ((Math.max(1, Math.min(10, intensity)) - 1) / 9) * 100,
  );

  let logSubmitting = $state(false);
  let workoutSets = $state(1);
  let workoutRepsPerSet = $state(0);
  let workoutBilateral = $state(false);

  let overlayOpen = $state(false);
  let overlayVariant = $state<'success' | 'error' | 'confirm'>('error');
  let overlayTitle = $state('');
  let overlayMessage = $state('');
  let pendingHqReturn = $state(false);

  function closeOverlay() {
    overlayOpen = false;
    if (pendingHqReturn) {
      pendingHqReturn = false;
      void goto(resolveAppPath(WORKOUT_HQ_RETURN_PATH));
    }
  }

  function showDiegeticError(title: string, message: string) {
    overlayVariant = 'error';
    overlayTitle = title;
    overlayMessage = message;
    overlayOpen = true;
  }

  function showDiegeticSuccess(title: string, message: string, opts: { returnToHq?: boolean } = {}) {
    overlayVariant = 'success';
    overlayTitle = title;
    overlayMessage = opts.returnToHq
      ? `${message} · Return to HQ to see updated XP.`
      : message;
    pendingHqReturn = opts.returnToHq === true;
    overlayOpen = true;
  }

  let activeMissionId = $state(/** @type {string | null} */ (null));
  let armedHandoff = $state(/** @type {MissionHandoff | null} */ (null));
  let incomingMissions = $state(/** @type {Array<Record<string, unknown> & { id: string }>} */ ([]));
  let incomingMissionsReady = $state(false);
  let missionSyncRefreshing = $state(false);
  let missionRefreshNonce = $state(0);
  let mountHandoffApplied = $state(false);
  let cadenceCompletions = $state<CadenceCompletionRow[]>([]);

  let pendingProofIntentId = $state(/** @type {string | null} */ (null));
  let proofNote = $state('');
  let proofSubmitting = $state(false);
  let proofSubmitted = $state(false);
  let proofMediaFile = $state(/** @type {File | null} */ (null));
  let proofUploadProgress = $state(/** @type {number | null} */ (null));
  let proofMediaError = $state('');

  const trainReadiness = useTrainReadinessStrip(
    () => authStore.user?.uid,
    () => authStore.role,
  );

  function onProofFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    proofMediaError = '';
    proofMediaFile = null;
    if (!file) return;
    const err = validateProofMediaFile(file);
    if (err) {
      proofMediaError = err;
      return;
    }
    proofMediaFile = file;
  }

  async function sendCompletionProof() {
    if (!pendingProofIntentId || proofSubmitting) return;
    proofSubmitting = true;
    proofMediaError = '';
    try {
      await runSendCompletionProof({
        pendingProofIntentId,
        proofNote,
        proofMediaFile,
        playerUid: authStore.user?.uid ?? '',
        householdId:
          typeof authStore.userProfile?.householdId === 'string'
            ? authStore.userProfile.householdId.trim()
            : '',
        submitCompletionProof,
        onUploadProgress: (pct) => {
          proofUploadProgress = pct;
        },
        onMediaError: (msg) => {
          proofMediaError = msg;
          proofMediaFile = null;
        },
      });
      proofSubmitted = true;
      pendingProofIntentId = null;
      proofNote = '';
      proofMediaFile = null;
    } catch (e) {
      console.error('[B4a/B4c] submitCompletionProof', e);
    } finally {
      proofSubmitting = false;
      proofUploadProgress = null;
    }
  }

  function dismissProofAffordance() {
    pendingProofIntentId = null;
    proofNote = '';
    proofSubmitted = false;
    proofMediaFile = null;
    proofMediaError = '';
    proofUploadProgress = null;
  }

  let bundleStepIdx = $state(0);
  const isBundleMode = $derived(
    !!(armedHandoff?.drills?.length && armedHandoff.drills.length > 0),
  );
  const bundleDrills = $derived(
    /** @type {PrescriptionDrillEntry[]} */ (armedHandoff?.drills ?? []),
  );
  const currentBundleDrill = $derived(
    isBundleMode ? (bundleDrills[bundleStepIdx] ?? null) : null,
  );
  const isFinalBundleStep = $derived(
    isBundleMode && bundleStepIdx === bundleDrills.length - 1,
  );

  function armParentProofAfterLog(missionId: string | null, needsProof: boolean) {
    if (missionId && needsProof) {
      pendingProofIntentId = missionId;
      proofSubmitted = false;
    }
  }

  async function applyMissionHandoff(handoff: MissionHandoff) {
    if (isMissionHandoffStale(handoff)) {
      clearMissionHandoff();
      return;
    }
    activeMissionId = handoff.missionId;
    let resolvedDrillTitle = handoff.drillTitle ?? '';
    let resolvedDrillId = handoff.drillId ?? handoff.missionId;
    const teamId =
      typeof authStore.userProfile?.teamId === 'string' ? authStore.userProfile.teamId : '';
    const clubId =
      typeof authStore.userProfile?.clubId === 'string'
        ? authStore.userProfile.clubId
      : typeof authStore.tenantId === 'string'
        ? authStore.tenantId
      : '';
    const pickDrill = (title: string, id: string) => {
      selectedDrill = title;
      resolvedDrillTitle = title;
      resolvedDrillId = id;
    };
    if (handoff.focusArea) {
      selectedFocus = handoff.focusArea;
    } else if (handoff.targetAttributeId) {
      selectedFocus = attributeIdToWorkoutFocus(handoff.targetAttributeId);
    }
    if (handoff.prescription?.teamDrillId || handoff.prescription?.clubDrillId) {
      const drillId =
        handoff.prescription.teamDrillId ?? handoff.prescription.clubDrillId ?? '';
      const row = teamId
        ? await resolveTeamLibraryDrill(db, teamId, drillId, clubId || undefined)
      : null;
      if (row?.title) pickDrill(row.title, drillId);
    } else if (handoff.prescription?.drillId) {
      const drill = await resolveDrillById(db, handoff.prescription.drillId);
      if (drill?.title) pickDrill(drill.title, drill.id);
    } else if (handoff.drillTitle) {
      pickDrill(handoff.drillTitle, resolvedDrillId);
    } else if (handoff.targetAttributeId) {
      const drill = await resolveAdaptiveDrill(db, {
        teamId,
        clubId,
        targetAttributeId: handoff.targetAttributeId,
        prescription: handoff.prescription,
        recentFrustration: String(profile?.recentFrustration ?? 'low'),
        sportId: sportsConfigStore.currentSportConfig?.sportId ?? 'soccer',
      });
      if (drill?.title) pickDrill(drill.title, drill.id);
    }
    armedHandoff = { ...handoff, drillId: resolvedDrillId, drillTitle: resolvedDrillTitle || handoff.drillTitle };
    if (handoff.prescription) {
      workoutSets = handoff.prescription.sets;
      workoutRepsPerSet = handoff.prescription.repsPerSet ?? 0;
      workoutBilateral = handoff.prescription.bilateral === true;
    }
    duration = resolveHandoffDurationMinutes(handoff);
    intensity = resolveHandoffTargetRpe(handoff);
  }

  function applyRlPolicyToArmedSession(result: unknown) {
    if (!armedHandoff || !result) return;
    if (isCoachDirectedHandoff(armedHandoff.source)) return;
    const hints = buildPolicyHintsFromResult(result);
    if (!hints) return;
    const merged = { ...armedHandoff, policyHints: hints };
    armedHandoff = merged;
    duration = resolveHandoffDurationMinutes(merged);
    intensity = resolveHandoffTargetRpe(merged);
  }

  function clearArmedMission() {
    activeMissionId = null;
    armedHandoff = null;
    sessionNotes = '';
    bundleStepIdx = 0;
    clearMissionHandoff();
  }

  $effect(() => {
    void armedHandoff?.missionId;
    bundleStepIdx = 0;
  });

  const isCoachDirectedSession = $derived.by(() => {
    if (!armedHandoff?.armExplicit || !activeMissionId) return false;
    if (armedHandoff.missionId !== activeMissionId) return false;
    return isBundleMode || isCoachDirectedHandoff(armedHandoff.source);
  });

  const lockedCoachDrillLabel = $derived.by(() => {
    if (selectedDrill) return selectedDrill;
    if (armedHandoff?.prescription?.drillTitle) return armedHandoff.prescription.drillTitle;
    if (armedHandoff?.drillTitle) return armedHandoff.drillTitle;
    return 'Coach-assigned drill';
  });

  function recordQuestProgressAfterLog(handoff: MissionHandoff | null) {
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
    if (!browser || mountHandoffApplied) return;

    const handoff = resolveWorkoutMountHandoff(
      (page.state as Record<string, unknown> | undefined)?.missionHandoff,
    );
    mountHandoffApplied = true;
    if (!handoff) return;

    untrack(() => {
      void applyMissionHandoff(handoff);
    });
    if ((page.state as Record<string, unknown> | undefined)?.missionHandoff) {
      replaceState(page.url, { ...page.state, missionHandoff: undefined });
    }
  });

  $effect(() => {
    if (!browser) return;
    if (authStore.role !== 'player') return;
    const missionId = activeMissionId;
    if (!missionId) return;
    if (isCoachDirectedHandoff(armedHandoff?.source)) return;
    const sportId = sportsConfigStore.currentSportConfig?.sportId ?? 'soccer';
    let cancelled = false;

    void (async () => {
      const cached = readRlPolicyCache(sportId);
      if (cached) {
        if (!cancelled && armedHandoff) applyRlPolicyToArmedSession(cached);
        return;
      }
      const result = await ensureRlPolicyCached({
        sportId,
        fetchPolicy: async (sid) => {
          const res = await httpsCallable(functions, 'getAdaptiveWorkoutPolicy')({ sportId: sid });
          return res.data;
        },
      });
      if (!cancelled && result && armedHandoff) applyRlPolicyToArmedSession(result);
    })();

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (!armedHandoff || armedHandoff.source !== 'coach_intent') return;
    if (!incomingMissionsReady) return;
    if (!incomingMissions.some((m) => m.id === armedHandoff.missionId)) {
      clearArmedMission();
    }
  });

  $effect(() => {
    if (!browser) return;
    void missionRefreshNonce;
    const uid = authStore.user?.uid ?? '';
    const teamId = typeof authStore.userProfile?.teamId === 'string'
      ? authStore.userProfile.teamId
      : '';
    if (authStore.role !== 'player' || !uid || !teamId) {
      incomingMissions = [];
      incomingMissionsReady = false;
      return;
    }
    incomingMissionsReady = false;
    const qy = query(
      collection(db, 'team_assignments'),
      where('teamId', '==', teamId),
      where('status', '==', 'active'),
      orderBy('priority', 'asc'),
    );
    const applyRows = (snap) => {
      incomingMissions = snap.docs
        .map((d) => {
          const x = d.data() || {};
          return /** @type {Record<string, unknown> & { id: string }} */ ({ id: d.id, ...x });
        })
        .filter((m) => {
          if (!m.scope || m.scope === 'team') return true;
          return Array.isArray(m.targetUids) && m.targetUids.includes(uid);
        });
      incomingMissionsReady = true;
    };
    const unsub = onSnapshot(
      qy,
      applyRows,
      (e) => {
        console.error('[Player OS] team_assignments', e);
      },
    );
    if (missionRefreshNonce > 0) {
      void getDocs(qy)
        .then(applyRows)
        .finally(() => {
          missionSyncRefreshing = false;
        });
    }
    return () => {
      unsub();
    };
  });

  function refreshMissionSync() {
    if (missionSyncRefreshing) return;
    missionSyncRefreshing = true;
    missionRefreshNonce += 1;
  }

  const focusAreas = WORKOUT_FOCUS_AREAS;

  const drillCatalog = useWorkoutDrillCatalog(() => selectedFocus, () => String(profile?.teamId ?? '').trim(), db);
  useWorkoutSkillTreePrefill(() => page.url.searchParams, () => isCoachDirectedSession, db, {
    setFocus: (focus) => { selectedFocus = focus; },
    setDrill: (title) => { selectedDrill = title; },
  });

  function selectFocus(id: WorkoutFocus) {
    if (isCoachDirectedSession) return;
    if (id !== selectedFocus) {
      selectedDrill = null;
      clearArmedMission();
    }
    selectedFocus = id;
  }

  const hasCoachIntents = $derived(incomingMissions.length > 0);

  const trainMissionStripItems = $derived(
    !activeMissionId && incomingMissionsReady
      ? listTrainMissionStripItems(incomingMissions)
    : [],
  );

  function continueTrainMission(missionId: string) {
    void continueCoachIntentOnTrain(incomingMissions, missionId, applyMissionHandoff);
  }

  const armedMissionTitle = $derived.by(() => {
    if (!activeMissionId) return '';
    if (armedHandoff?.source === 'adaptive_homework') {
      return armedHandoff.drillTitle?.trim() || 'Adaptive suggestion';
    }
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

  const armedPrescription = $derived(armedHandoff?.prescription ?? null);

  const benchmarkTrain = $derived(resolveTrainBenchmarkContext(armedHandoff));
  const isBenchmarkSession = $derived(benchmarkTrain.isBenchmarkSession);
  const armedBenchmarkDrill = $derived(benchmarkTrain.armedBenchmarkDrill);
  const armedBenchmarkTarget = $derived(benchmarkTrain.armedBenchmarkTarget);

  const armedDisplayCadence = $derived(resolveMissionHandoffDisplayCadence(armedHandoff, armedGoalXp));
  const armedCadenceBlocked = $derived(armedCadenceBlockedToday(armedDisplayCadence, armedHandoff?.targetAttributeId, activeMissionId, cadenceCompletions));

  $effect(() => {
    if (!browser || authStore.isLoading || authStore.role !== 'player') return;
    const uid = authStore.user?.uid ?? '';
    if (!uid || !activeMissionId || armedHandoff?.source !== 'coach_intent') {
      cadenceCompletions = [];
      return;
    }
    return subscribePlayerCadenceCompletions(db, uid, (rows) => {
      cadenceCompletions = rows;
    });
  });

  const coachPrescriptionLine = $derived.by(() => {
    if (!armedPrescription) return '';
    return formatPrescriptionVolumeLine(
      armedPrescription.sets,
      armedPrescription.repsPerSet,
      armedPrescription.bilateral,
    );
  });

  const totalWorkoutReps = $derived.by(() =>
    computeWorkoutTotalReps(workoutSets, workoutRepsPerSet || undefined, workoutBilateral),
  );

  const estimatedLogXp = $derived.by(() => {
    return calculateTrainingSessionEarnedXp({
      duration: Math.max(0, Math.floor(Number(duration) || 0)),
      reps: totalWorkoutReps,
      intensity: intensityApiFromStep(intensity),
    });
  });

  $effect(() => {
    if (!authStore.isLoading && authStore.role === 'parent') {
      untrack(() => goto('/parent/log-workout', { replaceState: true }));
    }
  });

  const diegetic = {
    showError: showDiegeticError,
    showSuccess: showDiegeticSuccess,
  };

  const submitDeps = {
    logTrainingSession,
    writePlayerOsWorkout,
    commitWorkoutCompletion,
    dopamineOnCommit,
    dopamineOnCallable,
    bumpXp: (delta: number) => playerEngine.bumpBy(delta),
    refreshProfile: () => authStore.refresh({ silent: true }),
    recordQuestProgressAfterLog,
    clearArmedMission,
    armParentProofAfterLog,
  };

  function showCadenceLimitError() {
    showDiegeticError(CADENCE_LIMIT_ERROR.title, CADENCE_LIMIT_ERROR.text);
  }

  function onBenchmarkSuccess(payload: {
    message: string;
    levelUp: { from: number; to: number; earned: number } | null;
  }) {
    handleBenchmarkSuccessPayload(payload, diegetic);
  }

  async function logBundleStep() {
    const drill = currentBundleDrill;
    if (!drill || logSubmitting) return;
    if (armedCadenceBlocked) return showCadenceLimitError();
    const user = authStore.user;
    if (!user) return;

    await runLogBundleStep({
      ...submitDeps,
      ...diegetic,
      currentBundleDrill: drill,
      bundleDrills,
      bundleStepIdx,
      isFinalBundleStep,
      lockedCoachDrillLabel,
      focusLabel,
      duration,
      intensity,
      sessionNotes,
      activeMissionId,
      armedHandoff,
      armedDisplayCadence,
      totalXpHud,
      profile,
      authUser: { uid: user.uid, email: user.email },
      physioForTransmit: () => trainReadiness.physioForTransmit(),
      setLogSubmitting: (v) => { logSubmitting = v; },
      setSessionNotes: (v) => { sessionNotes = v; },
      incrementBundleStep: () => { bundleStepIdx += 1; },
    });
  }

  async function logWorkout() {
    if (armedCadenceBlocked) return showCadenceLimitError();
    const user = authStore.user;
    if (!user) return;

    await runLogWorkout({
      ...submitDeps,
      ...diegetic,
      selectedFocus,
      selectedDrill,
      isCoachDirectedSession,
      lockedCoachDrillLabel,
      logSubmitting,
      role: authStore.role,
      focusLabel,
      duration,
      intensity,
      totalWorkoutReps,
      sessionNotes,
      activeMissionId,
      armedHandoff,
      armedDisplayCadence,
      totalXpHud,
      profile,
      authUser: { uid: user.uid, email: user.email },
      physioForTransmit: () => trainReadiness.physioForTransmit(),
      setLogSubmitting: (v) => { logSubmitting = v; },
      setSessionNotes: (v) => { sessionNotes = v; },
    });
  }

  function selectDrill(drill: string) {
    clearArmedMission();
    selectedDrill = drill;
  }
</script>
<div class="pd-page-root player-dossier-root">
<PlayerWorkoutPageView
  {hasCoachIntents}
  {activeMissionId}
  {trainMissionStripItems}
  {missionSyncRefreshing}
  {armedMissionTitle}
  {armedGoalXp}
  {armedDrillLine}
  {coachPrescriptionLine}
  {armedPrescription}
  {armedDisplayCadence}
  {armedCadenceBlocked}
  {armedHandoff}
  {isBundleMode}
  {bundleDrills}
  {bundleStepIdx}
  {currentBundleDrill}
  {isFinalBundleStep}
  {logSubmitting}
  {estimatedLogXp}
  missionBounty={missionBounty}
  {isBenchmarkSession}
  {armedBenchmarkDrill}
  {armedBenchmarkTarget}
  {totalXpHud}
  {profile}
  {cadenceCompletions}
  {logTrainingSession}
  {writePlayerOsWorkout}
  {commitWorkoutCompletion}
  {dopamineOnCommit}
  {dopamineOnCallable}
  bumpXp={(delta) => playerEngine.bumpBy(delta)}
  authUser={authStore.user ? { uid: authStore.user.uid, email: authStore.user.email } : null}
  {isCoachDirectedSession}
  {focusAreas}
  {selectedFocus}
  {focusLabel}
  {drillCatalog}
  {selectedDrill}
  {lockedCoachDrillLabel}
  bind:duration
  bind:intensity
  {intensityGaugePct}
  {totalWorkoutReps}
  showReadinessStrip={trainReadiness.showReadinessStrip}
  bind:readinessSleepHours={trainReadiness.readinessSleepHours}
  bind:readinessSoreness={trainReadiness.readinessSoreness}
  bind:readinessMood={trainReadiness.readinessMood}
  bind:readinessRestingFeel={trainReadiness.readinessRestingFeel}
  {pendingProofIntentId}
  {proofSubmitted}
  {proofSubmitting}
  {proofMediaFile}
  {proofUploadProgress}
  {proofMediaError}
  {overlayOpen}
  {overlayVariant}
  {overlayTitle}
  {overlayMessage}
  {pendingHqReturn}
  bind:sessionNotes
  bind:proofNote
  bind:workoutSets
  bind:workoutRepsPerSet
  bind:workoutBilateral
  onRefreshMissionSync={refreshMissionSync}
  onClearArmedMission={clearArmedMission}
  onContinueTrainMission={continueTrainMission}
  onSelectFocus={selectFocus}
  onSelectDrill={selectDrill}
  onLogBundleStep={logBundleStep}
  onLogWorkout={logWorkout}
  onCadenceBlocked={showCadenceLimitError}
  onQuestProgress={recordQuestProgressAfterLog}
  onParentProof={armParentProofAfterLog}
  onRefreshProfile={() => authStore.refresh({ silent: true })}
  {onBenchmarkSuccess}
  onBenchmarkError={(message) => showDiegeticError('Execution failed', message)}
  {onProofFileChange}
  onSendCompletionProof={sendCompletionProof}
  onDismissProofAffordance={dismissProofAffordance}
  onCloseOverlay={closeOverlay}
/>
</div>
