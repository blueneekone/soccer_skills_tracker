<script>
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import { httpsCallable } from 'firebase/functions';
  import { db, functions } from '$lib/firebase.js';
  import { collection, onSnapshot, query, where } from 'firebase/firestore';
  import { authStore } from '$lib/stores/auth.svelte.js';
  import { playerEngine, writePlayerOsWorkout } from '$lib/stores/playerEngine.svelte.js';
  import { commitWorkoutCompletion } from '$lib/services/writes.svelte';
  import { dopamineOnCommit } from '$lib/services/dopamine.svelte.js';
  import { calculateTrainingSessionEarnedXp, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
  import Swal from 'sweetalert2';
  import IntelModal from '$lib/components/ui/IntelModal.svelte';

  const TELEMETRY_INTEL = {
    title: 'TELEMETRY LOGGING',
    instructions: [
      '1. Select your drill or exercise.',
      '2. Input your exact reps, sets, or time.',
      '3. Honest data feeds the algorithm. Your stats will update your Operative ID Card on the main dashboard.',
    ],
  };

  const logTrainingSession = httpsCallable(functions, 'logTrainingSession');

  /** @param {number} step */
  function intensityApiFromStep(step) {
    if (step <= 3) return /** @type {const} */ ('low');
    if (step <= 7) return /** @type {const} */ ('medium');
    return /** @type {const} */ ('high');
  }

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

  $effect(() => {
    if (!browser) return;
    const em = (authStore.user?.email || '').toLowerCase().trim();
    if (authStore.role !== 'player' || !em) {
      incomingMissions = [];
      missionsErr = '';
      return;
    }
    missionsErr = '';
    const qy = query(
      collection(db, 'assigned_missions'),
      where('targetPlayerKey', '==', em),
      where('status', '==', 'pending'),
    );
    const unsub = onSnapshot(
      qy,
      (snap) => {
        incomingMissions = snap.docs.map((d) => {
          const x = d.data() || {};
          return /** @type {Record<string, unknown> & { id: string }} */ ({
            id: d.id,
            ...x,
          });
        });
      },
      (e) => {
        missionsErr = e instanceof Error ? e.message : 'Mission link offline.';
        console.error('[Player OS] assigned_missions', e);
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
    if (!selectedFocus || !selectedDrill || logSubmitting) return;
    if (authStore.role !== 'player') {
      return Swal.fire({ title: 'Players only', text: 'Use the parent workout log for your player.', icon: 'info' });
    }
    if (!profile?.teamId || !profile?.playerName) {
      return Swal.fire({ title: 'Profile incomplete', text: 'Team and player name are required.', icon: 'warning' });
    }
    const drillType = `[${focusLabel}] ${selectedDrill} (Player workout)`.slice(0, 200);
    const dMin = Math.max(0, Math.floor(Number(duration) || 0));
    const intensityCall = intensityApiFromStep(intensity);
    const expectedXp = calculateTrainingSessionEarnedXp({
      duration: dMin,
      reps: 0,
      intensity: intensityCall,
    });
    const oldLevel = getLevelProgressFromTotalXp(totalXpHud).level;
    logSubmitting = true;
    playerEngine.bumpBy(expectedXp);
    try {
      const res = await logTrainingSession({
        drillType,
        duration: dMin,
        reps: 0,
        intensity: intensityCall,
      });
      const payload = res.data;
      const earned = payload && typeof payload.earnedXP === 'number' ? payload.earnedXP : 0;
      const newTotal = payload && typeof payload.totalXp === 'number' ? payload.totalXp : totalXpHud + earned;
      const em = authStore.user?.email;
      if (em && profile?.teamId) {
        try {
          await writePlayerOsWorkout({
            emailKey: em.toLowerCase(),
            userUid: authStore.user.uid,
            teamId: String(profile.teamId),
            focus: focusLabel,
            drill: String(selectedDrill),
            duration: Math.max(0, Math.floor(Number(duration) || 0)),
            intensityRpe: intensity,
            earnedXp: earned,
          });
        } catch (we) {
          console.error('[Player OS] users/', em.toLowerCase(), '/workouts', we);
        }
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          'elite_xp_pulse',
          JSON.stringify({ fromTotal: Math.max(0, newTotal - earned), toTotal: newTotal }),
        );
      }
      let missionCloseNote = '';
      // Mission close + xpHistory timeline entry in a single atomic batch.
      // `incrementXp: false` — the `logTrainingSession` Cloud Function above
      // already credited `earned` XP server-side; double-incrementing here
      // would inflate `armory.totalXP`.  We still record the history entry
      // so the Vanguard Card timeline shows the workout event.
      const playerUid = authStore.user?.uid;
      const userKey = (authStore.user?.email ?? '').toLowerCase();
      if (playerUid && userKey) {
        try {
          await dopamineOnCommit(
            commitWorkoutCompletion({
              playerUid,
              userKey,
              missionId: activeMissionId ?? undefined,
              xpAwarded: earned,
              reason: `Workout — ${focusLabel} · ${selectedDrill}`,
              incrementXp: false,
            }),
            { kind: 'drill' },
          );
          if (activeMissionId) activeMissionId = null;
          if (typeof payload?.level === 'number' && payload.level > oldLevel) {
            window.dispatchEvent(
              new CustomEvent('phoenix:level-up', {
                detail: { from: oldLevel, to: payload.level, earnedXp: earned },
              }),
            );
          }
        } catch (me) {
          console.error('[Player OS] workout completion batch failed', me);
          if (activeMissionId) {
            missionCloseNote = ' | Directive not cleared in Firestore (retry or ask staff).';
          }
        }
      }
      await Swal.fire({
        title: 'Command executed',
        text: `+${earned} XP · Level ${payload?.level ?? '—'}${missionCloseNote}`,
        icon: 'success',
        confirmButtonColor: '#00d4ff',
        confirmButtonText: 'Acknowledge',
        customClass: { popup: 'card' },
      });
      await authStore.refresh({ silent: true });
    } catch (e) {
      playerEngine.bumpBy(-expectedXp);
      console.error(e);
      const msg = e && typeof e === 'object' && 'message' in e ? String(/** @type {*} */(e).message) : 'Could not log workout.';
      await Swal.fire({ title: 'Execution failed', text: msg, icon: 'error' });
    } finally {
      logSubmitting = false;
    }
  }
</script>

<div class="pw-cmd" data-region="phoenix-siem-workout">
  <!-- Telemetry HUD -->
  <header class="pw-hud" aria-label="Command telemetry">
    <div class="pw-hud__cell pw-hud__cell--level">
      <span class="pw-eyebrow">Clearance / Level</span>
      <p class="pw-mono pw-hud__level" aria-live="polite">LVL.{String(level).padStart(2, '0')}</p>
    </div>
    <div class="pw-hud__cell pw-hud__cell--load">
      <div class="pw-hud__row">
        <span class="pw-eyebrow">System load (XP to next rank)</span>
        <span class="pw-mono pw-cyber">{currentXp}<span class="pw-dim"> / </span>{nextLevelXp > 0 ? nextLevelXp : 'MAX'}</span>
      </div>
      <div class="pw-loadbar" bind:this={xpTrackEl} role="progressbar" aria-valuenow={Math.round(xpLoadPct)} aria-valuemin="0" aria-valuemax="100" aria-label="XP progress">
        <div class="pw-loadbar__fill"></div>
        <div class="pw-loadbar__scan" aria-hidden="true"></div>
      </div>
    </div>
    <div class="pw-hud__cell pw-hud__cell--streak">
      <span class="pw-eyebrow">Uptime (day streak)</span>
      <p class="pw-mono pw-hud__streak">
        <i class="ph-fill ph-lightning pw-ico pw-ico--orange" aria-hidden="true"></i>
        <span>{streak}D</span>
      </p>
    </div>
  </header>

  <div class="pw-grid">
    <!-- Active threats / daily quests -->
    <aside class="pw-panel pw-panel--threat" aria-labelledby="pw-threats-heading">
      <div class="pw-panel__head">
        <span class="pw-eyebrow">Active threats / daily quests</span>
        <h2 id="pw-threats-heading" class="pw-title">Ingest queue</h2>
      </div>
      <p class="pw-hint">Select a quest to pre-fill the execution terminal. Manual overrides allowed.</p>
      {#if missionsErr}
        <p class="pw-err" role="alert">{missionsErr}</p>
      {/if}
      {#if incomingMissions.length > 0}
        <p class="pw-tx-eyebrow">INCOMING TRANSMISSION</p>
        <ul class="pw-txlist" aria-label="Coach-assigned missions">
          {#each incomingMissions as m (m.id)}
            <li>
              <button
                type="button"
                class="pw-tx"
                class:pw-tx--active={activeMissionId === m.id}
                onclick={() => applyMission(m)}
              >
                <div class="pw-tx__grid">
                  <span class="pw-mono pw-tx__k">BATCH</span>
                  <span class="pw-mono pw-tx__v">{String(m.batchId || '—').slice(0, 8)}<span class="pw-dim">…</span></span>
                  <span class="pw-mono pw-tx__k">FOCUS</span>
                  <span class="pw-mono pw-tx__v">{m.focusArea}</span>
                  <span class="pw-mono pw-tx__k">DRILL</span>
                  <span class="pw-mono pw-tx__v pw-tx__drill">{m.specificDrill}</span>
                  <span class="pw-mono pw-tx__k">DUR</span>
                  <span class="pw-mono pw-tx__v">{m.targetDurationMinutes} MIN</span>
                  <span class="pw-mono pw-tx__k">RPE</span>
                  <span class="pw-mono pw-tx__v">{m.targetRpe} / 10</span>
                  <span class="pw-mono pw-tx__k">YIELD</span>
                  <span class="pw-mono pw-tx__v pw-green">{m.xpBounty} XP</span>
                  <span class="pw-mono pw-tx__k">DUE</span>
                  <span class="pw-mono pw-tx__v">{fmtDue(m.dueDate)}</span>
                </div>
              </button>
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
    <section class="pw-panel pw-panel--term" aria-labelledby="pw-exec-heading">
      <div class="pw-panel__head pw-panel__head--row">
        <div>
          <span class="pw-eyebrow">Execution terminal</span>
          <h2 id="pw-exec-heading" class="pw-title">Workout logger</h2>
        </div>
        <div class="tw-flex tw-shrink-0 tw-items-center tw-gap-2">
          <IntelModal title={TELEMETRY_INTEL.title} instructions={TELEMETRY_INTEL.instructions} />
          <div class="pw-mono pw-est">
            <span class="pw-dim">EST. YIELD (MODEL)</span>
            <span class="pw-green">+{estimatedLogXp} XP</span>
            {#if missionBounty != null}
              <span class="pw-dim pw-est__bounty">DIRECTIVE CAP</span>
              <span class="pw-mono" style="color: var(--toxic)">{missionBounty} XP</span>
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

      <div class="pw-section">
        <span class="pw-eyebrow">1 · Focus area</span>
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

      <div class="pw-section">
        <span class="pw-eyebrow">2 · Sub-drill (dynamic)</span>
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
            <span class="pw-mono pw-cyber">{selectedDrill}</span>
          </p>
        {/if}
      </div>

      <div class="pw-gauges">
        <div class="pw-gauge">
          <div class="pw-gauge__head">
            <span class="pw-eyebrow">Time on task (min)</span>
            <span class="pw-mono pw-cyber">{duration}</span>
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
          class="pw-exec"
          disabled={!selectedDrill || logSubmitting}
          onclick={logWorkout}
        >
          {#if logSubmitting}
            <span class="pw-mono">TRANSMITTING…</span>
          {:else}
            <i class="ph ph-lightning" aria-hidden="true"></i>
            <span>EXECUTE & CLAIM XP</span>
            <span class="pw-mono pw-exec__xp">+{estimatedLogXp}</span>
          {/if}
        </button>
        {#if !selectedDrill}
          <p class="pw-mono pw-locked">Awaiting sub-drill selection</p>
        {/if}
      </div>
    </section>
  </div>
</div>

<style>
  /* Mobile: grow with content — single scroll on .ps-canvas (no nested scroll trap). */
  .pw-cmd {
    min-height: 0;
    height: auto;
    overflow: visible;
    box-sizing: border-box;
    background: #000000;
    color: #fafafa;
    padding: var(--bento-pad);
    --cyber: #00d4ff;
    --toxic: #39ff14;
    --threat: #ff6b00;
    --border: rgba(255, 255, 255, 0.1);
  }

  @media (min-width: 768px) {
    .pw-cmd {
      min-height: calc(100vh - 5rem);
    }
  }

  .pw-eyebrow {
    display: block;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(255, 255, 255, 0.45);
  }

  .pw-title {
    margin: 0.25rem 0 0;
    font-size: 1.125rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .pw-mono {
    font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
    font-feature-settings: 'tnum' 1;
  }

  .pw-dim {
    color: rgba(255, 255, 255, 0.4);
  }

  .pw-cyber {
    color: var(--cyber);
  }

  .pw-green {
    color: var(--toxic);
  }

  .pw-orange {
    color: var(--threat);
  }

  .pw-hint {
    margin: 0.5rem 0 1.25rem;
    font-size: 0.75rem;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.45);
  }

  .pw-err {
    font-size: 0.7rem;
    color: #f87171;
    border: 1px solid rgba(248, 113, 113, 0.4);
    padding: 0.5rem 0.65rem;
    margin: 0 0 0.75rem;
    background: #0a0000;
  }

  .pw-tx-eyebrow {
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.28em;
    color: #39ff14;
    margin: 0 0 0.6rem;
    text-shadow: 0 0 12px rgba(57, 255, 20, 0.45);
    animation: pw-pulse-ops 2.2s ease-in-out infinite;
  }

  @keyframes pw-pulse-ops {
    0%,
    100% {
      opacity: 0.85;
    }
    50% {
      opacity: 1;
    }
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
    background: #000;
    color: #e5e5e5;
    border: 1px solid rgba(0, 212, 255, 0.45);
    cursor: pointer;
    box-shadow:
      0 0 0 1px rgba(57, 255, 20, 0.15),
      0 0 20px rgba(0, 212, 255, 0.12);
    animation: pw-tx-breathe 2.4s ease-in-out infinite;
    transition: border-color 0.15s ease, box-shadow 0.2s ease;
  }

  @keyframes pw-tx-breathe {
    0%,
    100% {
      box-shadow:
        0 0 0 1px rgba(0, 212, 255, 0.2),
        0 0 16px rgba(0, 212, 255, 0.1);
    }
    50% {
      box-shadow:
        0 0 0 1px rgba(57, 255, 20, 0.35),
        0 0 24px rgba(0, 212, 255, 0.28);
    }
  }

  .pw-tx:hover {
    border-color: rgba(57, 255, 20, 0.55);
  }

  .pw-tx--active {
    border-color: #39ff14;
    box-shadow: 0 0 0 1px rgba(57, 255, 20, 0.5), 0 0 28px rgba(57, 255, 20, 0.25);
    animation: none;
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
    background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.4), transparent);
    border: 0;
  }

  .pw-subq-eyebrow {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(255, 255, 255, 0.35);
    margin: 0 0 0.65rem;
  }

  .pw-armed {
    font-size: 0.6rem;
    letter-spacing: 0.12em;
    color: #39ff14;
    border: 1px solid rgba(57, 255, 20, 0.25);
    background: #000;
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

  .pw-hud {
    display: grid;
    grid-template-columns: minmax(7rem, 9rem) minmax(0, 1fr) minmax(5.5rem, 8rem);
    gap: var(--bento-gap-sm);
    align-items: stretch;
    min-height: 6.5rem;
    padding: 1rem 1.25rem;
    margin-bottom: var(--bento-gap-md);
    border: 1px solid var(--border);
    background: #05050a;
  }

  .pw-hud__cell {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .pw-hud__cell--load {
    min-width: 0;
  }

  .pw-hud__cell--level {
    border-right: 1px solid var(--border);
    padding-right: 1rem;
  }

  .pw-hud__level {
    margin: 0;
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: 800;
    color: var(--cyber);
    line-height: 1;
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
    background: #000;
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .pw-loadbar__fill {
    height: 100%;
    width: var(--fill);
    background: linear-gradient(90deg, #0a3a45 0%, var(--cyber) 55%, var(--toxic) 100%);
    box-shadow: 0 0 12px rgba(0, 212, 255, 0.5);
  }

  .pw-loadbar__scan {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
    animation: pw-scan 2.5s linear infinite;
    pointer-events: none;
  }

  @keyframes pw-scan {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(200%);
    }
  }

  .pw-hud__cell--streak {
    text-align: right;
    border-left: 1px solid var(--border);
    padding-left: 1rem;
  }

  .pw-hud__streak {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.35rem;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--threat);
  }

  .pw-ico--orange {
    color: var(--threat);
    filter: drop-shadow(0 0 6px rgba(255, 107, 0, 0.8));
  }

  @media (max-width: 900px) {
    .pw-hud {
      grid-template-columns: 1fr;
      min-height: 0;
    }
    .pw-hud__cell--level,
    .pw-hud__cell--streak {
      border: none;
      padding: 0;
      text-align: left;
    }
    .pw-hud__streak {
      justify-content: flex-start;
    }
  }

  .pw-grid {
    display: grid;
    grid-template-columns: minmax(17rem, 22rem) minmax(0, 1fr);
    gap: var(--bento-gap-md);
    align-items: start;
    overflow: visible;
  }

  @media (max-width: 1024px) {
    .pw-grid {
      grid-template-columns: 1fr;
    }
  }

  .pw-panel {
    border: 1px solid var(--border);
    background: #05050a;
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
    .pw-panel--threat {
      position: sticky;
      top: 0.5rem;
      align-self: start;
      max-height: calc(100vh - 6.5rem);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
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
    background: #000;
    border: 1px solid var(--border);
    color: #e5e5e5;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .pw-quest:hover {
    border-color: rgba(0, 212, 255, 0.4);
    box-shadow: 0 0 18px rgba(0, 212, 255, 0.12);
  }

  .pw-quest--active {
    border-color: var(--toxic);
    box-shadow: 0 0 20px rgba(57, 255, 20, 0.2);
  }

  .pw-quest__top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.4rem;
  }

  .pw-quest__code {
    font-size: 0.65rem;
    color: var(--cyber);
  }

  .pw-quest__threat {
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
    border: 1px solid var(--border);
  }

  .pw-quest__threat--L2 {
    color: var(--toxic);
    border-color: rgba(57, 255, 20, 0.4);
  }

  .pw-quest__threat--L3 {
    color: var(--threat);
    border-color: rgba(255, 107, 0, 0.4);
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
    font-size: 0.7rem;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.45);
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
    background: #000;
    border: 1px solid var(--border);
    color: #ccc;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    transition: border-color 0.12s, box-shadow 0.12s;
  }

  .pw-focus__btn:hover {
    border-color: rgba(0, 212, 255, 0.35);
  }

  .pw-focus__btn--on {
    border-color: var(--cyber);
    box-shadow: 0 0 16px rgba(0, 212, 255, 0.2);
  }

  .pw-focus__op {
    font-size: 0.6rem;
    color: var(--cyber);
  }

  .pw-focus__lab {
    font-size: 0.7rem;
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
    background: #000;
    border: 1px solid var(--border);
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.75rem;
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s, box-shadow 0.12s;
  }

  .pw-chip:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }

  .pw-chip--on {
    border-color: var(--toxic);
    color: #fff;
    box-shadow: 0 0 12px rgba(57, 255, 20, 0.18);
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
    background: #000;
    border: 1px solid var(--border);
    margin-bottom: 0.2rem;
  }

  .pw-gauge__bar--rpe {
    border-color: rgba(255, 107, 0, 0.3);
  }

  .pw-gauge__bar-fill {
    height: 100%;
    width: var(--gauge);
  }

  .pw-gauge:first-child .pw-gauge__bar-fill {
    background: linear-gradient(90deg, #0a1e22, var(--cyber));
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.4);
  }

  .pw-gauge:last-child .pw-gauge__bar-fill {
    background: linear-gradient(90deg, #2a1a0a, var(--threat));
    box-shadow: 0 0 8px rgba(255, 107, 0, 0.4);
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
    outline: 1px solid var(--cyber);
    outline-offset: 2px;
  }

  .pw-range::-webkit-slider-runnable-track {
    height: 4px;
    background: #111;
    border: 1px solid var(--border);
  }

  .pw-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -6px;
    background: #000;
    border: 2px solid var(--cyber);
    box-shadow: 0 0 8px var(--cyber);
  }

  .pw-gauge:last-child .pw-range::-webkit-slider-thumb {
    border-color: var(--threat);
    box-shadow: 0 0 8px var(--threat);
  }

  .pw-range::-moz-range-track {
    height: 4px;
    background: #111;
    border: 1px solid var(--border);
  }

  .pw-range::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: #000;
    border: 2px solid var(--cyber);
    box-shadow: 0 0 8px var(--cyber);
  }

  .pw-gauge:last-child .pw-range::-moz-range-thumb {
    border-color: var(--threat);
    box-shadow: 0 0 8px var(--threat);
  }

  .pw-execrow {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .pw-exec {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 3.5rem;
    padding: 0.75rem 1rem;
    background: #000;
    border: 1px solid rgba(0, 212, 255, 0.4);
    color: #fff;
    font-size: 0.85rem;
    font-weight: 800;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      box-shadow 0.2s ease,
      border-color 0.2s ease;
  }

  .pw-exec:hover:not(:disabled) {
    border-color: var(--toxic);
    box-shadow: 0 0 32px rgba(57, 255, 20, 0.35), 0 0 18px rgba(0, 212, 255, 0.3);
  }

  .pw-exec:disabled {
    cursor: not-allowed;
    opacity: 0.4;
    box-shadow: none;
  }

  .pw-exec__xp {
    color: var(--toxic);
  }

  .pw-locked {
    font-size: 0.65rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.35);
    margin: 0;
  }
</style>
