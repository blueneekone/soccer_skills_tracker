<script lang="ts">
  import { browser } from '$app/environment';
  import { goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { httpsCallable } from 'firebase/functions';
  import { db, functions, storage } from '$lib/firebase.js';
  import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
  import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
  import { authStore } from '$lib/stores/auth.svelte.js';
  import { playerEngine, writePlayerOsWorkout } from '$lib/stores/playerEngine.svelte.js';
  import { commitWorkoutCompletion } from '$lib/services/writes.svelte';
  import { dopamineOnCommit, dopamineOnCallable } from '$lib/services/dopamine.svelte.js';
  import { calculateTrainingSessionEarnedXp, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
  import { buildWorkoutDrillType, executePlayerWorkoutLog, expectedWorkoutXp, intensityApiFromStep, validatePlayerWorkoutLog, workoutLogErrorMessage } from '$lib/player/workoutLog.js';
  import { formatAttributeLabel, loadQuestProgress, markQuestCompletedAfterWorkoutLog, saveQuestProgress, WORKOUT_HQ_RETURN_PATH } from '$lib/player/dashboard/activeBounties.js';
  import {
    armedCadenceBlockedToday,
    CADENCE_LIMIT_ERROR,
    subscribePlayerCadenceCompletions,
    type CadenceCompletionRow,
  } from '$lib/player/dashboard/cadenceCompletions.js';
  import { resolveAppPath } from '$lib/components/_shared/resolveAppPath.js';
  import { attributeIdToWorkoutFocus, buildPolicyHintsFromResult, clearMissionHandoff, COACH_INTENT_HINT, formatSuggestedDrillLine, isMissionHandoffStale, resolveAdaptiveDrill, resolveHandoffDurationMinutes, resolveHandoffTargetRpe, resolveDrillById, type MissionHandoff, type WorkoutFocus } from '$lib/player/workout/coachMissionFlow.js';
  import { resolveWorkoutMountHandoff } from '$lib/player/workout/applyWorkoutMountHandoff.js';
  import { listTrainMissionStripItems, continueCoachIntentOnTrain } from '$lib/player/workout/trainMissionPicker.js';
  import TrainMissionStrip from '$lib/player/workout/TrainMissionStrip.svelte';
  import type { PrescriptionDrillEntry } from '$lib/types/intent.js';
  import { resolveTeamDrillById as resolveTeamLibraryDrill } from '$lib/coach/teamDrillLibrary.js';
  import { clampFreeLogDurationMinutes, coachCadenceLogSuccessSuffix, FREE_LOG_DURATION_MAX_MINUTES, isCoachDirectedHandoff, SESSION_NOTES_MAX_LENGTH } from '$lib/player/workout/workoutSessionConstants.js';
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
  import PlayerDiegeticOverlay from '$lib/components/player/PlayerDiegeticOverlay.svelte';
  import IntelModal from '$lib/components/ui/IntelModal.svelte';
  import PlayerOsPageStrap from '$lib/components/player/PlayerOsPageStrap.svelte';
  import TrainReadinessStrip from '$lib/player/workout/TrainReadinessStrip.svelte';
  import { useTrainReadinessStrip } from '$lib/player/workout/useTrainReadinessStrip.svelte.js';
  import '$lib/styles/player-dashboard-hud.css';
  import '$lib/styles/player-terminal.css';
  import '$lib/styles/player-train-theater.css';

  const TELEMETRY_INTEL = {
    title: 'TELEMETRY LOGGING',
    instructions: [
      '1. Select your drill or exercise (free log) — coach missions lock the prescription.',
      '2. Set duration (up to 120 min) and RPE for self-directed sessions.',
      '3. Add session notes on coach assignments, then transmit to log XP.',
    ],
  };

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

  /** @type {'technical' | 'physical' | 'tactical' | 'recovery'} */
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

  /** Diegetic overlay state machine (Wave D — replaces legacy commit modals). */
  let overlayOpen = $state(false);
  let overlayVariant = $state<'success' | 'error' | 'confirm'>('error');
  let overlayTitle = $state('');
  let overlayMessage = $state('');
  /** GP-ACQ-04b — navigate to HQ after success overlay when session logged. */
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

  /** @type {string | null} */
  let activeMissionId = $state(null);
  /** @type {MissionHandoff | null} */
  let armedHandoff = $state(null);
  /** @type {Array<Record<string, unknown> & { id: string }>} */
  let incomingMissions = $state([]);
  let incomingMissionsReady = $state(false);
  let missionSyncRefreshing = $state(false);
  let missionRefreshNonce = $state(0);
  /** Set once per mount — explicit nav/storage handoff only. */
  let mountHandoffApplied = $state(false);
  /** Drill completions for cadence anti-cheat on armed coach missions. */
  let cadenceCompletions = $state<CadenceCompletionRow[]>([]);

  // B4a/B4c — advisory parent-proof state (inner Execute band; never gates XP).
  /** intentId captured after a successful log when requiresParentVerification is set. */
  let pendingProofIntentId = $state(/** @type {string | null} */ (null));
  let proofNote = $state('');
  let proofSubmitting = $state(false);
  let proofSubmitted = $state(false);

  // B4c — optional media proof (COPPA-safe; optional/skippable; never gates XP).
  /** The selected media file to attach (image or short video). Optional — may be null. */
  let proofMediaFile = $state(/** @type {File | null} */ (null));
  /** Upload progress 0–100 while uploading, null when idle. */
  let proofUploadProgress = $state(/** @type {number | null} */ (null));
  /** Any upload/validation error shown to the player. */
  let proofMediaError = $state('');

  const trainReadiness = useTrainReadinessStrip(
    () => authStore.user?.uid,
    () => authStore.role,
  );

  const PROOF_IMAGE_MAX = 10 * 1024 * 1024;  // 10 MB
  const PROOF_VIDEO_MAX = 50 * 1024 * 1024;  // 50 MB

  function onProofFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    proofMediaError = '';
    proofMediaFile = null;
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      proofMediaError = 'Only images and video files are supported.';
      return;
    }
    if (file.type.startsWith('image/') && file.size > PROOF_IMAGE_MAX) {
      proofMediaError = 'Image must be under 10 MB.';
      return;
    }
    if (file.type.startsWith('video/') && file.size > PROOF_VIDEO_MAX) {
      proofMediaError = 'Video must be under 50 MB.';
      return;
    }
    proofMediaFile = file;
  }

  async function sendCompletionProof() {
    if (!pendingProofIntentId || proofSubmitting) return;
    const trimmed = proofNote.trim().slice(0, 500);
    proofSubmitting = true;
    proofMediaError = '';
    let mediaStoragePath: string | null = null;

    try {
      // B4c — upload media if a file was chosen (optional; skip entirely if none).
      if (proofMediaFile) {
        const playerUid = authStore.user?.uid ?? '';
        const householdId =
          typeof authStore.userProfile?.householdId === 'string'
            ? authStore.userProfile.householdId.trim()
            : '';

        if (!playerUid || !householdId) {
          proofMediaError = 'Profile incomplete — media attachment skipped.';
          proofMediaFile = null;
        } else {
          const mediaId = crypto.randomUUID();
          const ext = proofMediaFile.name.split('.').pop() ?? 'bin';
          const storagePath = `households/${householdId}/proof_media/${playerUid}/${mediaId}.${ext}`;
          const fileRef = storageRef(storage, storagePath);
          const uploadTask = uploadBytesResumable(fileRef, proofMediaFile);
          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snap) => {
                proofUploadProgress = Math.round(
                  (snap.bytesTransferred / snap.totalBytes) * 100,
                );
              },
              (err) => {
                proofMediaError = 'Media upload failed — proof will be sent as note-only.';
                console.error('[B4c] upload error', err);
                reject(err);
              },
              () => resolve(),
            );
          }).catch(() => {
            // Upload failed — continue as note-only (advisory, non-blocking).
            proofMediaFile = null;
          });

          if (proofMediaFile) {
            mediaStoragePath = storagePath;
          }
        }
      }

      await submitCompletionProof({
        intentId: pendingProofIntentId,
        proofNote: trimmed || null,
        mediaStoragePath,
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

  // B3 bundle stepper state (inner Execute band — no new frame, no overflow:auto).
  /** 0-based index of the current bundle step. Reset when armed mission changes. */
  let bundleStepIdx = $state(0);
  /** True when the armed mission has a multi-drill prescription bundle. */
  const isBundleMode = $derived(
    !!(armedHandoff?.drills?.length && armedHandoff.drills.length > 0),
  );
  /** Ordered bundle drill entries from handoff (empty array when not in bundle mode). */
  const bundleDrills = $derived(
    /** @type {PrescriptionDrillEntry[]} */ (armedHandoff?.drills ?? []),
  );
  /** The drill entry for the current bundle step, or null when not in bundle mode. */
  const currentBundleDrill = $derived(
    isBundleMode ? (bundleDrills[bundleStepIdx] ?? null) : null,
  );
  /** True when the current bundle step is the final step. */
  const isFinalBundleStep = $derived(
    isBundleMode && bundleStepIdx === bundleDrills.length - 1,
  );

  function armParentProofAfterLog(missionId: string | null, needsProof: boolean) {
    if (missionId && needsProof) {
      pendingProofIntentId = missionId;
      proofSubmitted = false;
    }
  }

  async function applyMissionHandoff(handoff) {
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
      typeof authStore.userProfile?.clubId === 'string' ?
        authStore.userProfile.clubId
      : typeof authStore.tenantId === 'string' ?
        authStore.tenantId
      : '';
    const pickDrill = (title, id) => { selectedDrill = title; resolvedDrillTitle = title; resolvedDrillId = id; };
    if (handoff.focusArea) {
      selectedFocus = handoff.focusArea;
    } else if (handoff.targetAttributeId) {
      selectedFocus = attributeIdToWorkoutFocus(handoff.targetAttributeId);
    }
    if (handoff.prescription?.teamDrillId || handoff.prescription?.clubDrillId) {
      const drillId =
        handoff.prescription.teamDrillId ?? handoff.prescription.clubDrillId ?? '';
      const row = teamId ?
        await resolveTeamLibraryDrill(db, teamId, drillId, clubId || undefined)
      :	null;
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

  /** Merge cached/fetched RL policy into armed handoff — free log only (never override coach prescription). */
  function applyRlPolicyToArmedSession(result) {
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

  // Reset bundle step index whenever the armed mission changes.
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

  /**
   * @param {'technical' | 'physical' | 'tactical' | 'recovery'} id
   */
  function selectFocus(id) {
    if (isCoachDirectedSession) return;
    if (id !== selectedFocus) {
      selectedDrill = null;
      clearArmedMission();
    }
    selectedFocus = id;
  }

  const hasCoachIntents = $derived(incomingMissions.length > 0);

  const trainMissionStripItems = $derived(
    !activeMissionId && incomingMissionsReady ?
      listTrainMissionStripItems(incomingMissions)
    :	[],
  );

  function continueTrainMission(missionId: string) {
    void continueCoachIntentOnTrain(incomingMissions, missionId, applyMissionHandoff);
  }

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

  const armedPrescription = $derived(armedHandoff?.prescription ?? null);

  const armedCadenceBlocked = $derived(
    armedCadenceBlockedToday(
      armedPrescription?.cadence,
      armedHandoff?.targetAttributeId,
      activeMissionId,
      cadenceCompletions,
    ),
  );

  $effect(() => {
    if (!browser || authStore.isLoading || authStore.role !== 'player') return;
    const uid = authStore.user?.uid ?? '';
    if (!uid || !armedPrescription?.cadence) {
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

  /**
   * B3: Log a single bundle step via the EXISTING executePlayerWorkoutLog primitive.
   * Intermediate steps pass activeMissionId=null to prevent premature mission clear.
   * The final step passes the real activeMissionId/source so clearMission fires normally.
   * XP accrues on every step via attributeId (coach_intent path on logTrainingSession).
   *
   * Wired: logTrainingSession callable (XP + drill_completions), persistPlayerOsWorkout.
   * Simplified: per-step dopamine animation runs once on final step only (no spam).
   */
  function showCadenceLimitError() {
    showDiegeticError(CADENCE_LIMIT_ERROR.title, CADENCE_LIMIT_ERROR.text);
  }

  async function logBundleStep() {
    const drill = currentBundleDrill;
    if (!drill || logSubmitting) return;
    if (armedCadenceBlocked) return showCadenceLimitError();
    const drillName = drill.drillTitle || lockedCoachDrillLabel || 'Bundle drill';
    const drillType = buildWorkoutDrillType(focusLabel, drillName);
    const stepSets = drill.sets ?? 1;
    const stepReps = drill.repsPerSet ?? 0;
    const stepBilateral = drill.bilateral === true;
    const stepTotalReps = stepBilateral ? stepSets * stepReps * 2 : stepSets * stepReps;
    const stepDuration = Math.max(
      1,
      drill.targetDurationMin ?? Math.max(1, Math.floor(duration / Math.max(1, bundleDrills.length))),
    );
    const stepRpe = drill.targetRpe ?? intensity;
    const intensityCall = intensityApiFromStep(stepRpe);
    const expectedXp = expectedWorkoutXp(stepDuration, stepRpe, stepTotalReps);
    const user = authStore.user;
    if (!user) return;

    const isLastStep = isFinalBundleStep;
    // Intermediate steps: pass null mission so clearMission stays false.
    const stepMissionId = isLastStep ? activeMissionId : null;
    const stepMissionSource = isLastStep ? (armedHandoff?.source ?? null) : null;
    const oldLevel = getLevelProgressFromTotalXp(totalXpHud).level;

    logSubmitting = true;
    playerEngine.bumpBy(expectedXp);
    try {
      const result = await executePlayerWorkoutLog({
        drillType,
        durationMin: stepDuration,
        totalReps: stepTotalReps,
        intensityCall,
        focusLabel,
        selectedDrill: drillName,
        activeMissionId: stepMissionId,
        missionSource: stepMissionSource,
        targetAttributeId: armedHandoff?.targetAttributeId ?? undefined,
        totalXpHud,
        oldLevel,
        intensityStep: stepRpe,
        sessionNotes: isLastStep ? sessionNotes : '',
        physio: isLastStep ? trainReadiness.physioForTransmit() : undefined,
        authUser: { uid: user.uid, email: user.email },
        profile,
        logTrainingSession,
        writePlayerOsWorkout,
        commitWorkoutCompletion,
        dopamineOnCommit,
      });

      if (isLastStep) {
        const proofIntentId = activeMissionId;
        const needsProof = armedHandoff?.requiresParentVerification === true;
        const cadenceWeekNote = coachCadenceLogSuccessSuffix(armedHandoff?.source ?? null, armedPrescription?.cadence);
        if (result.clearMission) {
          recordQuestProgressAfterLog(armedHandoff);
          clearArmedMission();
        } else {
          recordQuestProgressAfterLog(null);
        }
        armParentProofAfterLog(proofIntentId, needsProof);
        if (result.levelUpFrom != null && result.levelUpTo != null) {
          window.dispatchEvent(
            new CustomEvent('phoenix:level-up', {
              detail: { from: result.levelUpFrom, to: result.levelUpTo, earnedXp: result.earned },
            }),
          );
        }
        void dopamineOnCallable(Promise.resolve(result), { kind: 'drill' });
        showDiegeticSuccess(
          'Bundle complete',
          `All ${bundleDrills.length} drills logged · +${result.earned} XP · Level ${result.level ?? '—'}${cadenceWeekNote}`,
          { returnToHq: true },
        );
        sessionNotes = '';
        await authStore.refresh({ silent: true });
      } else {
        bundleStepIdx += 1;
        showDiegeticSuccess(
          `Drill ${bundleStepIdx} logged`,
          `+${result.earned} XP · Next: ${bundleDrills[bundleStepIdx]?.drillTitle ?? 'Drill ' + (bundleStepIdx + 1)}`,
        );
      }
    } catch (e) {
      playerEngine.bumpBy(-expectedXp);
      console.error(e);
      showDiegeticError('Step failed', workoutLogErrorMessage(e));
    } finally {
      logSubmitting = false;
    }
  }

  async function logWorkout() {
    if (armedCadenceBlocked) return showCadenceLimitError();
    const gate = validatePlayerWorkoutLog({
      selectedFocus,
      selectedDrill: isCoachDirectedSession ? lockedCoachDrillLabel : selectedDrill,
      logSubmitting,
      role: authStore.role,
      profile,
    });
    if (gate.ok === false) {
      showDiegeticError(gate.title, gate.text);
      return;
    }
    if (!selectedDrill && !isCoachDirectedSession) return;

    const drillName = isCoachDirectedSession ? lockedCoachDrillLabel : selectedDrill;
    if (!drillName) return;

    const drillType = buildWorkoutDrillType(focusLabel, drillName);
    const dMin = isCoachDirectedSession
      ? Math.max(1, Math.min(FREE_LOG_DURATION_MAX_MINUTES, Math.floor(Number(duration) || 0)))
      : clampFreeLogDurationMinutes(duration);
    const intensityCall = intensityApiFromStep(intensity);
    const expectedXp = expectedWorkoutXp(dMin, intensity, totalWorkoutReps);
    const oldLevel = getLevelProgressFromTotalXp(totalXpHud).level;
    const user = authStore.user;
    if (!user) return;

    const proofIntentId = activeMissionId;
    const needsProof = armedHandoff?.requiresParentVerification === true,
      cadenceWeekNote = coachCadenceLogSuccessSuffix(armedHandoff?.source ?? null, armedPrescription?.cadence);
    logSubmitting = true;
    playerEngine.bumpBy(expectedXp);
    try {
      const result = await executePlayerWorkoutLog({
        drillType,
        durationMin: dMin,
        totalReps: totalWorkoutReps,
        intensityCall,
        focusLabel,
        selectedDrill: drillName,
        activeMissionId,
        missionSource: armedHandoff?.source ?? null,
        targetAttributeId: armedHandoff?.targetAttributeId ?? undefined,
        totalXpHud,
        oldLevel,
        // Raw RPE 1–10 → logTrainingSession.subjectiveRpe (RL telemetry); intensityCall stays for XP.
        intensityStep: intensity,
        sessionNotes,
        physio: trainReadiness.physioForTransmit(),
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
        `+${result.earned} XP · Level ${result.level ?? '—'}${result.missionCloseNote}${cadenceWeekNote}`,
        { returnToHq: true },
      );
      armParentProofAfterLog(proofIntentId, needsProof);
      sessionNotes = '';
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

  {#if hasCoachIntents && !activeMissionId && trainMissionStripItems.length === 0}
    <p class="pw-hq-link pw-mono">
      <a href="/player/dashboard">Coach missions on HQ →</a>
      <span class="pw-dim"> · accept a mission, then start session here</span>
      <button
        type="button"
        class="pw-mission-armed__clear pw-mono"
        disabled={missionSyncRefreshing}
        onclick={refreshMissionSync}
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
        onclick={refreshMissionSync}
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
        {#if armedPrescription?.cadence}
          <p class="pw-mission-armed__drill pw-mono pw-dim" aria-label="Cadence requirement">
            Cadence: {armedPrescription.cadence.sessionsPerWindow} session{armedPrescription.cadence.sessionsPerWindow !== 1 ? 's' : ''} / {armedPrescription.cadence.windowDays === 7 ? 'week' : `${armedPrescription.cadence.windowDays} days`}{#if armedCadenceBlocked}<span class="pw-dim"> · next session tomorrow</span>{/if}
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

    <TrainMissionStrip missions={trainMissionStripItems} onContinue={continueTrainMission} />

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
                    onclick={() => selectFocus(focus.id)}
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
                    onclick={() => {
                      clearArmedMission();
                      selectedDrill = drill;
                    }}
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
            <!-- B3 bundle stepper — inner Execute band, no new frame (instrument: Execute) -->
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
                {#if totalWorkoutReps > 0}
                  <div class="tw-col-span-2">
                    <dt class="pw-dim tw-text-xs">Total reps</dt>
                    <dd class="pw-green">{totalWorkoutReps}</dd>
                  </div>
                {/if}
              </dl>
            </div>
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
            {#if armedPrescription}
              <div class="pw-configure-step" role="group" aria-label="Session volume">
                <span class="pw-eyebrow pd-panel-eyebrow">Volume (sets × reps)</span>
                <p class="pw-ghostline pw-mono pw-dim">Coach target · adjust if you did more or less</p>
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
            {/if}
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
      </div>
    </div>

    {#if trainReadiness.showReadinessStrip}
      <TrainReadinessStrip
        bind:sleepHoursLastNight={trainReadiness.readinessSleepHours}
        bind:soreness={trainReadiness.readinessSoreness}
        bind:mood={trainReadiness.readinessMood}
        bind:restingFeel={trainReadiness.readinessRestingFeel}
      />
    {/if}

    <div class="pw-theater__transmit">
      {#if isBundleMode}
        <button
          type="button"
          class="pw-exec pw-exec--alt"
          disabled={logSubmitting || !currentBundleDrill || armedCadenceBlocked}
          onclick={logBundleStep}
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
          onclick={logWorkout}
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
  </div>
  </div>

  {#if pendingProofIntentId && !proofSubmitted}
    <!-- B4a/B4c — advisory proof affordance (Execute band inner addition; never gates XP) -->
    <div class="pw-theater pd-os-deck pd-os-deck--hero bento-span-12" aria-live="polite">
      <div class="pd-os-deck__well pw-mission-armed" style="border-color:rgba(20,184,166,0.2);">
        <div class="pw-mission-armed__head">
          <span class="pw-eyebrow pw-mono">Parent verification</span>
          <button type="button" class="pw-mission-armed__clear pw-mono" onclick={dismissProofAffordance}>
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

        <!-- B4c — optional media attachment (COPPA-safe; parent-only visibility; never gates XP) -->
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
            onclick={sendCompletionProof}
          >
            {proofSubmitting ? (proofUploadProgress !== null ? `Uploading ${proofUploadProgress}%…` : 'Sending…') : 'Send proof'}
          </button>
          <button
            type="button"
            class="pw-mission-armed__clear pw-mono"
            style="font-size:11px;"
            disabled={proofSubmitting}
            onclick={dismissProofAffordance}
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
    onConfirm={closeOverlay}
    onCancel={closeOverlay}
  />
</div>
