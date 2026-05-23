<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import type { IconName } from '$lib/icons/registry.js';
  import { httpsCallable } from 'firebase/functions';
  import { db, functions } from '$lib/firebase.js';
  import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
  import { authStore } from '$lib/stores/auth.svelte.js';
  import { playerEngine, writePlayerOsWorkout } from '$lib/stores/playerEngine.svelte.js';
  import { commitWorkoutCompletion } from '$lib/services/writes.svelte';
  import { dopamineOnCommit } from '$lib/services/dopamine.svelte.js';
  import { calculateTrainingSessionEarnedXp, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
  import {
    buildWorkoutDrillType,
    executePlayerWorkoutLog,
    expectedWorkoutXp,
    intensityApiFromStep,
    validatePlayerWorkoutLog,
    workoutLogErrorMessage,
  } from '$lib/player/workoutLog.js';
  import Swal from 'sweetalert2';
  import IntelModal from '$lib/components/ui/IntelModal.svelte';
  import HudStatCell from '$lib/components/player/dashboard/HudStatCell.svelte';
  import PlayerOsPageStrap from '$lib/components/player/PlayerOsPageStrap.svelte';
  import '$lib/styles/player-dashboard-hud.css';

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

  const levelProgress = $derived(getLevelProgressFromTotalXp(totalXpHud));
  const level = $derived(levelProgress.level);
  const currentXp = $derived(levelProgress.xpIntoLevel);
  const nextLevelXp = $derived(levelProgress.xpToNext);
  const profileStreak = $derived(Math.max(0, Math.floor(Number(profile?.currentStreak) || 0)));
  const streak = $derived(
    playerEngine.hydrated
      ? Math.max(playerEngine.streakDays, profileStreak)
      : profileStreak,
  );

  const xpLoadPct = $derived(
    nextLevelXp > 0
      ? Math.min(100, (currentXp / nextLevelXp) * 100)
      : 100,
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

  let xpTrackEl = $state(/** @type {HTMLDivElement | null} */ (null));
  $effect(() => {
    if (xpTrackEl) {
      xpTrackEl.style.setProperty('--fill', `${xpLoadPct}%`);
    }
  });

  let durGaugeEl = $state(/** @type {HTMLDivElement | null} */ (null));
  let rpeGaugeEl = $state(/** @type {HTMLDivElement | null} */ (null));

  /** @param {number} d */
  const durationPct = (d) => ((Math.max(1, Math.min(1440, d)) - 1) / (1440 - 1)) * 100;
  /** @param {number} r */
  const rpePct = (r) => ((Math.max(1, Math.min(10, r)) - 1) / 9) * 100;

  $effect(() => {
    if (durGaugeEl) durGaugeEl.style.setProperty('--gauge', `${durationPct(duration)}%`);
  });
  $effect(() => {
    if (rpeGaugeEl) rpeGaugeEl.style.setProperty('--gauge', `${rpePct(intensity)}%`);
  });

  /** @type {'technical' | 'physical' | 'tactical' | 'recovery'} */
  let selectedFocus = $state('technical');
  let selectedDrill = $state(/** @type {string | null} */ (null));
  let intensity = $state(5);
  let duration = $state(30);
  let logSubmitting = $state(false);
  /** @type {string | null} */
  let activeQuestId = $state(null);
  /** @type {string | null} */
  let activeMissionId = $state(null);
  /** @type {Array<Record<string, unknown> & { id: string }>} */
  let incomingMissions = $state([]);
  /** @type {string} */
  let missionsErr = $state('');

  const FOCUS_LABEL_TO_ID = /** @type {const} */ ({
    Technical: 'technical',
    Physical: 'physical',
    Tactical: 'tactical',
    Recovery: 'recovery',
  });

  /**
   * @param {unknown} area
   * @returns {'technical' | 'physical' | 'tactical' | 'recovery'}
   */
  function focusIdFromArea(area) {
    const s = String(area || '').trim();
    if (s in FOCUS_LABEL_TO_ID) {
      // @ts-ignore index
      return FOCUS_LABEL_TO_ID[/** @type {keyof typeof FOCUS_LABEL_TO_ID} */ (s)];
    }
    const low = s.toLowerCase();
    for (const [label, id] of Object.entries(FOCUS_LABEL_TO_ID)) {
      if (label.toLowerCase() === low) {
        return id;
      }
    }
    if (low.includes('physical')) return 'physical';
    if (low.includes('tactical')) return 'tactical';
    if (low.includes('recover')) return 'recovery';
    return 'technical';
  }

  /**
   * @param {unknown} ts
   */
  function fmtDue(ts) {
    if (!ts || typeof ts !== 'object') return '—';
    const t = /** @type {{ toDate?: () => Date }} */ (ts);
    if (typeof t.toDate !== 'function') return '—';
    try {
      const d = t.toDate();
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  }

  // Epic 8: subscribe to active team_assignments intents this player is in scope for.
  // Replaces the orphaned assigned_missions collection (mission-deploy removed).
  $effect(() => {
    if (!browser) return;
    const uid = authStore.user?.uid ?? '';
    const teamId = typeof authStore.userProfile?.teamId === 'string'
      ? authStore.userProfile.teamId
      : '';
    if (authStore.role !== 'player' || !uid || !teamId) {
      incomingMissions = [];
      missionsErr = '';
      return;
    }
    missionsErr = '';
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
        missionsErr = e instanceof Error ? e.message : 'Intent feed offline.';
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
      activeQuestId = null;
      activeMissionId = null;
    }
    selectedFocus = id;
  }

  /**
   * @param {Record<string, unknown> & { id: string }} m
   */
  function applyMission(m) {
    activeQuestId = null;
    activeMissionId = m.id;
    selectedFocus = focusIdFromArea(m.focusArea);
    selectedDrill = String(m.specificDrill || '') || null;
    // Policy-prescribed duration/RPE override (Phase 3, Epic 4 — RL S9).
    // When a mission is created from a policy recommendation, `policyDurationMinutes`
    // and `policyTargetRpe` take priority over the assignment defaults.
    const policyDur = Number(m.policyDurationMinutes);
    const policyRpe = Number(m.policyTargetRpe);
    const baseDur = Number.isFinite(policyDur) && policyDur > 0 ? policyDur : Number(m.targetDurationMinutes) || 30;
    const baseRpe = Number.isFinite(policyRpe) && policyRpe > 0 ? policyRpe : Number(m.targetRpe) || 5;
    duration = Math.max(1, Math.min(1440, Math.floor(baseDur)));
    intensity = Math.max(1, Math.min(10, Math.floor(baseRpe)));
  }

  /**
   * @typedef {{ id: string, op: string, title: string, threat: string, focus: 'technical' | 'physical' | 'tactical' | 'recovery', drill: string, duration: number, intensity: number, protocol: string }} QuestDef
   */

  /** @type {QuestDef[]} */
  const dailyQuests = [
    {
      id: 'q1',
      op: 'Q-7A',
      title: 'Volume Chain',
      threat: 'L3',
      focus: 'technical',
      drill: 'Juggling',
      duration: 40,
      intensity: 7,
      protocol: 'Execute 100 Juggles — sustain touches, log on completion',
    },
    {
      id: 'q2',
      op: 'Q-2F',
      title: 'Tactical High-Load',
      threat: 'L4',
      focus: 'tactical',
      drill: 'Set Pieces',
      duration: 55,
      intensity: 9,
      protocol: 'Log a High-Intensity Tactical Session (film or pitch)',
    },
    {
      id: 'q3',
      op: 'Q-3C',
      title: 'Metabolic Overdrive',
      threat: 'L2',
      focus: 'physical',
      drill: 'Agility Ladder',
      duration: 25,
      intensity: 8,
      protocol: 'Sprint ladder: 5 rounds, full RPE report',
    },
  ];

  /** @param {QuestDef} q */
  function applyQuest(q) {
    activeQuestId = q.id;
    activeMissionId = null;
    selectedFocus = q.focus;
    selectedDrill = q.drill;
    duration = q.duration;
    intensity = q.intensity;
  }

  const focusLabel = $derived(
    (focusAreas.find((f) => f.id === selectedFocus) ?? { label: 'Session' }).label,
  );

  const missionBounty = $derived.by(() => {
    if (!activeMissionId) return null;
    const row = incomingMissions.find((r) => r.id === activeMissionId);
    return row != null ? Math.max(0, Math.floor(Number(row.xpBounty) || 0)) : null;
  });

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
        await Swal.fire({ title: gate.title, text: gate.text, icon: gate.icon });
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
      if (result.clearMission) activeMissionId = null;
      if (result.levelUpFrom != null && result.levelUpTo != null) {
        window.dispatchEvent(
          new CustomEvent('phoenix:level-up', {
            detail: { from: result.levelUpFrom, to: result.levelUpTo, earnedXp: result.earned },
          }),
        );
      }
      await Swal.fire({
        title: 'Command executed',
        text: `+${result.earned} XP · Level ${result.level ?? '—'}${result.missionCloseNote}`,
        icon: 'success',
        confirmButtonColor: '#14b8a6',
        confirmButtonText: 'Acknowledge',
        customClass: { popup: 'card' },
      });
      await authStore.refresh({ silent: true });
    } catch (e) {
      playerEngine.bumpBy(-expectedXp);
      console.error(e);
      await Swal.fire({ title: 'Execution failed', text: workoutLogErrorMessage(e), icon: 'error' });
    } finally {
      logSubmitting = false;
    }
  }
</script>

<div class="pd-page-root player-dossier-root pw-page tw-min-w-0 tw-overflow-x-hidden" data-region="player-workout-log">
  <div class="pd-content-wrap">
  <PlayerOsPageStrap eyebrow="Train / Log session" title="Workout logger">
    {#snippet status()}
      <span class="pd-label">LVL {String(level).padStart(2, '0')}</span>
    {/snippet}
  </PlayerOsPageStrap>

  <section class="pd-stat-row pd-page-panel" aria-label="Session telemetry">
    <HudStatCell label="Level" value={`LVL ${String(level).padStart(2, '0')}`} />
    <div class="pw-hud__cell pw-hud__cell--load">
      <div class="pw-hud__row">
        <span class="pd-label">XP to next rank</span>
        <span class="pw-mono pw-data">{currentXp}<span class="pw-dim"> / </span>{nextLevelXp > 0 ? nextLevelXp : 'MAX'}</span>
      </div>
      <div class="pw-loadbar" bind:this={xpTrackEl} role="progressbar" aria-valuenow={Math.round(xpLoadPct)} aria-valuemin="0" aria-valuemax="100" aria-label="XP progress">
        <div class="pw-loadbar__fill"></div>
      </div>
    </div>
    <HudStatCell label="Day streak" value={`${streak}D`} variant="streak" />
  </section>

  <div class="pw-grid bento-grid bento-grid--12col bento-grid--liquid">
    <!-- Active threats / daily quests -->
    <aside class="pw-panel pd-page-panel pw-panel--premium pw-panel--threat bento-span-4 tw-min-w-0" aria-labelledby="pw-threats-heading">
      <div class="pw-panel__head">
        <span class="pw-eyebrow">Active threats / daily quests</span>
        <h2 id="pw-threats-heading" class="pw-title">Ingest queue</h2>
      </div>
      <p class="pw-hint">Select a quest to pre-fill the execution terminal. Manual overrides allowed.</p>
      {#if missionsErr}
        <p class="pw-err" role="alert">{missionsErr}</p>
      {/if}
      {#if incomingMissions.length > 0}
        <p class="pw-tx-eyebrow">ACTIVE TACTICAL INTENTS</p>
        <ul class="pw-txlist" aria-label="Coach tactical intents">
          {#each incomingMissions as m (m.id)}
            <li>
              <div class="pw-tx">
                <div class="pw-tx__grid">
                  <span class="pw-mono pw-tx__k">TARGET</span>
                  <span class="pw-mono pw-tx__v">{String(m.targetAttributeId || '—').toUpperCase()}</span>
                  <span class="pw-mono pw-tx__k">SCOPE</span>
                  <span class="pw-mono pw-tx__v">{m.scope === 'players' ? 'SELECTED' : 'SQUAD'}</span>
                  <span class="pw-mono pw-tx__k">GOAL</span>
                  <span class="pw-mono pw-tx__v pw-green">{m.requiredXp} XP</span>
                  <span class="pw-mono pw-tx__k">DUE</span>
                  <span class="pw-mono pw-tx__v">{fmtDue(m.expiresAt)}</span>
                </div>
                <p class="pw-tx__hint">Open dashboard for AI-recommended drill</p>
              </div>
            </li>
          {/each}
        </ul>
        <p class="pw-divider" aria-hidden="true"></p>
      {/if}
      <p class="pw-subq-eyebrow">Station drills (synthetic)</p>
      <ul class="pw-questlist">
        {#each dailyQuests as q (q.id)}
          <li>
            <button
              type="button"
              class="pw-quest"
              class:pw-quest--active={activeQuestId === q.id}
              onclick={() => applyQuest(q)}
            >
              <div class="pw-quest__top">
                <span class="pw-mono pw-quest__code">{q.op}</span>
                <span class="pw-quest__threat" class:pw-quest__threat--L2={q.threat === 'L2'} class:pw-quest__threat--L3={q.threat === 'L3'} class:pw-quest__threat--L4={q.threat === 'L4'}>
                  {q.threat}
                </span>
              </div>
              <span class="pw-quest__title">{q.title}</span>
              <p class="pw-quest__proto">{q.protocol}</p>
            </button>
          </li>
        {/each}
      </ul>
    </aside>

    <!-- Execution terminal -->
    <section class="pw-panel pd-page-panel pw-panel--premium pw-panel--term bento-span-8 tw-min-w-0" aria-labelledby="pw-exec-heading">
      <div class="pw-panel__head pw-panel__head--row">
        <div>
          <span class="pw-eyebrow">Execution terminal</span>
          <h2 id="pw-exec-heading" class="pw-title">Workout logger</h2>
        </div>
        <div class="tw-flex tw-shrink-0 tw-items-center tw-gap-2">
          <IntelModal dossierMode title={TELEMETRY_INTEL.title} instructions={TELEMETRY_INTEL.instructions} />
          <div class="pw-mono pw-est">
            <span class="pw-dim">EST. YIELD (MODEL)</span>
            <span class="pw-green">+{estimatedLogXp} XP</span>
            {#if missionBounty != null}
              <span class="pw-dim pw-est__bounty">DIRECTIVE CAP</span>
              <span class="pw-mono pw-action">{missionBounty} XP</span>
            {/if}
          </div>
        </div>
      </div>
      {#if activeMissionId}
        <p class="pw-mono pw-armed" role="status">
          ARMED: MISSION
          {String(incomingMissions.find((r) => r.id === activeMissionId)?.batchId || '—').slice(0, 8)}<span
            class="pw-dim"
            >· EXECUTION SYNCS TO FILE ON TRANSMIT</span
          >
        </p>
      {/if}

      <div class="pw-section pd-panel-section">
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

      <div class="pw-section pd-panel-section">
        <span class="pw-eyebrow pd-panel-eyebrow">2 · Sub-drill (dynamic)</span>
        <div class="pw-subdrill" role="list">
          {#each availableDrills as drill}
            <button
              type="button"
              class="pw-chip"
              class:pw-chip--on={selectedDrill === drill}
              onclick={() => {
                activeQuestId = null;
                activeMissionId = null;
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

      <div class="pw-gauges">
        <div class="pw-gauge">
          <div class="pw-gauge__head">
            <span class="pw-eyebrow">Time on task (min)</span>
            <span class="pw-mono pw-data">{duration}</span>
          </div>
          <div class="pw-gauge__bar" bind:this={durGaugeEl} aria-label="Duration">
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
        <div class="pw-gauge">
          <div class="pw-gauge__head">
            <span class="pw-eyebrow">RPE (intensity 1–10)</span>
            <span class="pw-mono pw-orange">{intensity} / 10</span>
          </div>
          <div class="pw-gauge__bar pw-gauge__bar--rpe" bind:this={rpeGaugeEl} aria-label="RPE">
            <div class="pw-gauge__bar-fill"></div>
          </div>
          <input
            class="pw-range"
            type="range"
            min="1"
            max="10"
            step="1"
            bind:value={intensity}
            aria-label="RPE intensity"
          />
        </div>
      </div>

      <div class="pw-execrow">
        <button
          type="button"
          class="pw-exec qa-btn qa-btn--ready"
          disabled={!selectedDrill || logSubmitting}
          onclick={logWorkout}
        >
          {#if logSubmitting}
            <span class="pw-mono">Logging…</span>
          {:else}
            <Icon name="game.zap" />
            <span>Log session</span>
            <span class="pw-mono pw-exec__xp">+{estimatedLogXp} XP</span>
          {/if}
        </button>
        {#if !selectedDrill}
          <p class="pw-mono pw-locked">Awaiting sub-drill selection</p>
        {/if}
      </div>
    </section>
  </div>
  </div>
</div>

<style>
  /* Sprint 2.11 — Player Dossier workout log (replaces SIEM #0B0F19 canvas) */
  .pw-page {
    min-height: 0;
    height: auto;
    overflow: visible;
    box-sizing: border-box;
    background: var(--pd-bg);
    color: var(--pd-text);
  }

  @media (min-width: 768px) {
    .pw-page {
      min-height: calc(100vh - 5rem);
    }
  }

  .pw-eyebrow,
  .pd-label {
    display: block;
    font-family: var(--pd-font-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    font-weight: 800;
    color: var(--pd-text-muted);
  }

  .pw-title {
    margin: 0.25rem 0 0;
    font-size: 1.125rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .pw-mono {
    font-family: var(--pd-font-mono);
    font-feature-settings: 'tnum' 1;
  }

  .pw-dim {
    color: var(--pd-text-muted);
  }

  .pw-data {
    color: var(--pd-accent-data);
  }

  .pw-action {
    color: var(--pd-accent-action);
  }

  .pw-green {
    color: var(--pd-accent-data);
  }

  .pw-orange {
    color: #f59e0b;
  }

  .pw-hint {
    margin: 0.5rem 0 1.25rem;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.7rem;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.38);
  }

  .pw-err {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.65rem;
    color: #f87171;
    border: 1px solid rgba(248, 113, 113, 0.35);
    padding: 0.5rem 0.65rem;
    margin: 0 0 0.75rem;
    background: rgb(20 8 8);
  }

  .pw-tx-eyebrow {
    font-family: var(--pd-font-mono);
    font-size: 0.55rem;
    font-weight: 800;
    letter-spacing: 0.28em;
    color: var(--pd-accent-data);
    margin: 0 0 0.6rem;
    text-transform: uppercase;
  }

  .pw-txlist {
    list-style: none;
    margin: 0 0 0.5rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .pw-tx {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.65rem 0.7rem 0.75rem;
    background: var(--pd-bg);
    color: var(--pd-text);
    border: 1px solid color-mix(in srgb, var(--pd-accent-data) 30%, var(--pd-line));
    transition: border-color 0.15s ease;
  }

  .pw-tx__hint {
    margin: 0.45rem 0 0;
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.3);
  }

  .pw-tx:hover {
    border-color: color-mix(in srgb, var(--pd-accent-data) 55%, var(--pd-line));
  }

  .pw-tx--active {
    border-color: var(--pd-accent-data);
  }

  .pw-tx__grid {
    display: grid;
    grid-template-columns: minmax(2.2rem, auto) 1fr;
    gap: 0.2rem 0.6rem;
    font-size: 0.65rem;
    align-items: baseline;
  }

  .pw-tx__k {
    color: rgba(255, 255, 255, 0.35);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.55rem;
  }

  .pw-tx__v {
    color: rgba(255, 255, 255, 0.92);
  }

  .pw-tx__drill {
    line-height: 1.3;
    word-break: break-word;
  }

  .pw-divider {
    height: 1px;
    margin: 0.85rem 0 1rem;
    background: linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.2), transparent);
    border: 0;
  }

  .pw-subq-eyebrow {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(255, 255, 255, 0.32);
    margin: 0 0 0.65rem;
  }

  .pw-armed {
    font-family: var(--pd-font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.12em;
    color: var(--pd-accent-data);
    border: 1px solid color-mix(in srgb, var(--pd-accent-data) 22%, var(--pd-line));
    background: var(--pd-bg);
    padding: 0.45rem 0.6rem;
    margin: 0 0 0.9rem;
  }

  .pw-ghostline {
    margin: 0.4rem 0 0.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .pw-est__bounty {
    font-size: 0.6rem;
    margin-top: 0.2rem;
  }

  .pw-hud__cell--load {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .pw-hud__row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
  }

  .pw-loadbar {
    --fill: 0%;
    position: relative;
    height: 0.5rem;
    width: 100%;
    background: var(--pd-bg);
    border: 1px solid var(--pd-line);
    overflow: hidden;
  }

  .pw-loadbar__fill {
    height: 100%;
    width: var(--fill);
    background: var(--pd-accent-action);
    transition: width 0.4s ease;
  }

  .pw-grid {
    align-items: start;
    overflow: visible;
  }

  .pw-panel {
    padding: 1.25rem;
    min-width: 0;
    overflow: visible;
  }

  @media (min-width: 768px) {
    .pw-panel {
      min-height: 18rem;
    }
  }

  /* Sticky + optional internal scroll only on md+; mobile uses document scroll. */
  .pw-panel--threat {
    position: static;
    top: auto;
    max-height: none;
    overflow: visible;
  }

  @media (min-width: 768px) {
    /* Sprint 2.20a: removed max-height + overflow-y: auto — Foundation §4 Train must-feel forbids inner panel scroll */
    .pw-panel--threat {
      position: sticky;
      top: 0.5rem;
      align-self: start;
    }
  }

  .pw-panel__head {
    margin-bottom: 0.25rem;
  }

  .pw-panel__head--row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .pw-est {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.2rem;
    font-size: 0.8rem;
  }

  .pw-questlist {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .pw-quest {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.85rem 0.9rem;
    background: var(--pd-bg);
    border: 1px solid var(--pd-line);
    color: var(--pd-text);
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .pw-quest:hover {
    border-color: color-mix(in srgb, var(--pd-accent-data) 40%, var(--pd-line));
  }

  .pw-quest--active {
    border-color: var(--pd-accent-data);
  }

  .pw-quest__top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.4rem;
  }

  .pw-quest__code {
    font-size: 0.65rem;
    color: var(--pd-accent-data);
  }

  .pw-quest__threat {
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
    border: 1px solid var(--pd-line);
  }

  .pw-quest__threat--L2 {
    color: var(--pd-accent-data);
    border-color: color-mix(in srgb, var(--pd-accent-data) 40%, var(--pd-line));
  }

  .pw-quest__threat--L3 {
    color: #f59e0b;
    border-color: rgba(245, 158, 11, 0.4);
  }

  .pw-quest__threat--L4 {
    color: #f87171;
    border-color: rgba(248, 113, 113, 0.5);
  }

  .pw-quest__title {
    display: block;
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.35rem;
  }

  .pw-quest__proto {
    margin: 0;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.65rem;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.38);
  }

  .pw-section {
    margin-bottom: 1.25rem;
  }

  .pw-focus {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  @media (min-width: 640px) {
    .pw-focus {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .pw-focus__btn {
    padding: 0.6rem 0.5rem;
    background: var(--pd-bg);
    border: 1px solid var(--pd-line);
    color: var(--pd-text-muted);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    min-height: 44px;
    transition: border-color 0.15s ease, color 0.15s ease;
  }

  .pw-focus__btn:hover {
    border-color: color-mix(in srgb, var(--pd-accent-data) 35%, var(--pd-line));
    color: var(--pd-text);
  }

  .pw-focus__btn--on {
    border-color: var(--pd-accent-data);
    color: var(--pd-text);
  }

  .pw-focus__op {
    font-family: var(--pd-font-mono);
    font-size: 0.55rem;
    color: var(--pd-accent-data);
  }

  .pw-focus__lab {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .pw-subdrill {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .pw-chip {
    padding: 0.4rem 0.7rem;
    background: var(--pd-bg);
    border: 1px solid var(--pd-line);
    color: var(--pd-text-muted);
    font-family: var(--pd-font-mono);
    font-size: 0.7rem;
    cursor: pointer;
    min-height: 44px;
    transition: border-color 0.15s ease, color 0.15s ease;
  }

  .pw-chip:hover {
    color: var(--pd-text);
    border-color: color-mix(in srgb, var(--pd-accent-data) 30%, var(--pd-line));
  }

  .pw-chip--on {
    border-color: var(--pd-accent-data);
    color: var(--pd-text);
  }

  .pw-gauges {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  @media (max-width: 640px) {
    .pw-gauges {
      grid-template-columns: 1fr;
    }
  }

  .pw-gauge {
    min-width: 0;
  }

  .pw-gauge__head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.4rem;
  }

  .pw-gauge__bar {
    --gauge: 0%;
    height: 0.35rem;
    width: 100%;
    background: var(--pd-bg);
    border: 1px solid var(--pd-line);
    margin-bottom: 0.2rem;
    overflow: hidden;
  }

  .pw-gauge__bar--rpe {
    border-color: rgba(245, 158, 11, 0.25);
  }

  .pw-gauge__bar-fill {
    height: 100%;
    width: var(--gauge);
    transition: width 0.2s ease;
  }

  .pw-gauge:first-child .pw-gauge__bar-fill {
    background: var(--pd-accent-data);
  }

  .pw-gauge:last-child .pw-gauge__bar-fill {
    background: #f59e0b;
  }

  .pw-range {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 1.25rem;
    background: transparent;
    cursor: pointer;
    margin: 0;
  }

  .pw-range:focus {
    outline: 1px solid color-mix(in srgb, var(--pd-accent-data) 55%, transparent);
    outline-offset: 2px;
  }

  .pw-range::-webkit-slider-runnable-track {
    height: 4px;
    background: var(--pd-bg);
    border: 1px solid var(--pd-line);
  }

  .pw-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -6px;
    background: var(--pd-bg);
    border: 2px solid var(--pd-accent-data);
  }

  .pw-gauge:last-child .pw-range::-webkit-slider-thumb {
    border-color: #f59e0b;
  }

  .pw-range::-moz-range-track {
    height: 4px;
    background: var(--pd-bg);
    border: 1px solid var(--pd-line);
  }

  .pw-range::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: var(--pd-bg);
    border: 2px solid var(--pd-accent-data);
  }

  .pw-gauge:last-child .pw-range::-moz-range-thumb {
    border-color: #f59e0b;
  }

  .pw-execrow {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .pw-exec {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 3.5rem;
    width: 100%;
    font-family: var(--pd-font-mono);
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .pw-exec:disabled {
    cursor: not-allowed;
    opacity: 0.38;
  }

  .pw-exec__xp {
    color: var(--pd-accent-action);
  }

  .qa-btn--ready {
    border: 1px solid color-mix(in srgb, var(--pd-accent-data) 60%, var(--pd-line));
    background: var(--pd-bg);
    color: var(--pd-text);
    box-shadow: 0 0 18px color-mix(in srgb, var(--pd-accent-data) 25%, transparent);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .qa-btn--ready:hover:not(:disabled) {
    border-color: var(--pd-accent-data);
    box-shadow: 0 0 24px color-mix(in srgb, var(--pd-accent-data) 35%, transparent);
  }

  .pw-locked {
    font-size: 0.65rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.35);
    margin: 0;
  }
</style>
