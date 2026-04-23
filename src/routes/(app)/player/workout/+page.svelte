<script>
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import { httpsCallable } from 'firebase/functions';
  import { functions } from '$lib/firebase.js';
  import { authStore } from '$lib/stores/auth.svelte.js';
  import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
  import Swal from 'sweetalert2';
  import confetti from 'canvas-confetti';

  const logTrainingSession = httpsCallable(functions, 'logTrainingSession');

  /** @param {number} step */
  function intensityMultiplierFromStep(step) {
    if (step <= 3) return 1.0;
    if (step <= 7) return 1.15;
    return 1.35;
  }

  /** @param {number} step */
  function intensityApiFromStep(step) {
    if (step <= 3) return /** @type {const} */ ('low');
    if (step <= 7) return /** @type {const} */ ('medium');
    return /** @type {const} */ ('high');
  }

  const profile = $derived(authStore.userProfile);
  const totalXpHud = $derived(
    Math.max(0, Math.floor(Number(profile?.totalXp ?? profile?.xp) || 0)),
  );

  /** Display level, XP into this level, XP needed to complete this level (bar) */
  let level = $state(1);
  let currentXp = $state(0);
  let nextLevelXp = $state(100);
  let streak = $state(0);

  $effect(() => {
    const lp = getLevelProgressFromTotalXp(totalXpHud);
    level = lp.level;
    currentXp = lp.xpIntoLevel;
    nextLevelXp = lp.xpToNext;
  });

  $effect(() => {
    streak = Math.max(0, Math.floor(Number(profile?.currentStreak) || 0));
  });

  let selectedFocus = $state(/** @type {'technical' | 'physical' | 'match' | 'recovery' | null} */ ('technical'));
  let selectedDrill = $state(/** @type {string | null} */ (null));
  let intensity = $state(5);
  let duration = $state(30);
  let logSubmitting = $state(false);

  const focusAreas = [
    { id: /** @type {const} */ ('technical'), label: 'Technical', icon: 'ph-soccer-ball' },
    { id: /** @type {const} */ ('physical'), label: 'Physical', icon: 'ph-barbell' },
    { id: /** @type {const} */ ('match'), label: 'Match', icon: 'ph-flag' },
    { id: /** @type {const} */ ('recovery'), label: 'Recovery', icon: 'ph-heartbeat' },
  ];

  const drillsByFocus = {
    technical: ['Juggling', 'Wall Passing', 'Cone Dribbling', 'Shooting', 'First Touch'],
    physical: ['100m Sprints', 'Beep Test', '5k Run', 'Agility Ladder', 'Weight Training'],
    match: ['Film Study', 'Positional Awareness', 'Set Pieces', 'Scrimmage', 'Coach Assignment'],
    recovery: ['Stretching', 'Ice Bath', 'Yoga', 'Light Jog', 'Foam Rolling'],
  };

  const availableDrills = $derived(
    selectedFocus ? drillsByFocus[selectedFocus] : [],
  );

  $effect(() => {
    // Only selectedFocus is a dependency: reset drill when user picks a new focus
    if (selectedFocus) untrack(() => (selectedDrill = null));
  });

  const focusLabel = $derived(
    (focusAreas.find((f) => f.id === selectedFocus) ?? { label: 'Session' }).label,
  );

  const estimatedLogXp = $derived.by(() => {
    const m = intensityMultiplierFromStep(intensity);
    const base = duration * 10;
    return Math.max(0, Math.floor(base * m));
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
    logSubmitting = true;
    try {
      const res = await logTrainingSession({
        drillType,
        duration: Math.max(0, Math.floor(Number(duration) || 0)),
        reps: 0,
        intensity: intensityApiFromStep(intensity),
      });
      const payload = res.data;
      const earned = payload && typeof payload.earnedXP === 'number' ? payload.earnedXP : 0;
      const newTotal = payload && typeof payload.totalXp === 'number' ? payload.totalXp : totalXpHud + earned;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          'elite_xp_pulse',
          JSON.stringify({ fromTotal: Math.max(0, newTotal - earned), toTotal: newTotal }),
        );
      }
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#22d3ee', '#fbbf24'],
      });
      await Swal.fire({
        title: 'Workout Logged!',
        text: `+${earned} XP · Level ${payload?.level ?? '—'}`,
        icon: 'success',
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Continue',
        customClass: { popup: 'card' },
      });
      await authStore.refresh({ silent: true });
    } catch (e) {
      console.error(e);
      const msg = e && typeof e === 'object' && 'message' in e ? String(/** @type {*} */(e).message) : 'Could not log workout.';
      await Swal.fire({ title: 'Error', text: msg, icon: 'error' });
    } finally {
      logSubmitting = false;
    }
  }
</script>

<div class="w-full h-full min-h-[calc(100vh-80px)] bg-[#09090b] text-white p-6 md:p-10">
  <div class="max-w-4xl mx-auto space-y-10">
    
    <div class="flex flex-col md:flex-row items-center justify-between p-6 md:p-8 bg-white/5 border border-white/10 rounded-2xl shadow-xl">
      <div class="flex flex-col mb-6 md:mb-0">
        <span class="text-sm font-semibold text-white/50 uppercase tracking-widest mb-1">Current Level</span>
        <span class="text-4xl md:text-5xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Lv. {level}</span>
      </div>
      
      <div class="flex-1 w-full px-0 md:px-10 mb-6 md:mb-0">
        <div class="flex justify-between text-sm font-bold text-white/50 mb-3 tracking-wide">
          <span>{currentXp} XP</span>
          <span>{nextLevelXp > 0 ? nextLevelXp : 'MAX'} XP</span>
        </div>
        <div class="h-3 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-inner">
          <div
            class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            style="width: {nextLevelXp > 0
              ? Math.min(100, (currentXp / nextLevelXp) * 100)
              : 100}%"
          ></div>
        </div>
      </div>
      
      <div class="flex flex-col items-end">
        <span class="text-sm font-semibold text-white/50 uppercase tracking-widest mb-1">Day Streak</span>
        <span class="text-3xl md:text-4xl font-black text-orange-400 flex items-center gap-2">
          <i class="ph-fill ph-fire"></i> {streak}
        </span>
      </div>
    </div>

    <div class="space-y-5">
      <h2 class="text-2xl font-bold tracking-tight text-white/90">Select Focus Area</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        {#each focusAreas as focus}
          <button
            class="relative flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border transition-all duration-200 {selectedFocus === focus.id ? 'bg-indigo-500/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}"
            onclick={() => (selectedFocus = focus.id)}
          >
            <i class="ph {focus.icon} text-4xl {selectedFocus === focus.id ? 'text-indigo-400' : 'text-white/40'}"></i>
            <span class="font-bold tracking-wide {selectedFocus === focus.id ? 'text-white' : 'text-white/60'}">{focus.label}</span>
          </button>
        {/each}
      </div>
    </div>

    {#if selectedFocus}
      <div class="space-y-5">
        <h2 class="text-2xl font-bold tracking-tight text-white/90">Select Specific Drill</h2>
        <div class="flex flex-wrap gap-3">
          {#each availableDrills as drill}
            <button
              class="px-6 py-3 rounded-full border text-sm md:text-base font-bold transition-all {selectedDrill === drill ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/90'}"
              onclick={() => (selectedDrill = drill)}
            >
              {drill}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if selectedDrill}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-white/5 border border-white/10 rounded-2xl">
        <div>
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-white/90">Duration</h2>
            <span class="text-3xl font-black text-indigo-400">{duration} <span class="text-sm font-medium text-white/40">mins</span></span>
          </div>
          <input type="range" min="5" max="120" step="5" bind:value={duration} class="w-full h-3 bg-black/50 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
        </div>

        <div>
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-white/90">Intensity (RPE)</h2>
            <span class="text-3xl font-black text-orange-400">{intensity} <span class="text-sm font-medium text-white/40">/ 10</span></span>
          </div>
          <input type="range" min="1" max="10" bind:value={intensity} class="w-full h-3 bg-black/50 rounded-lg appearance-none cursor-pointer accent-orange-500" />
          <div class="flex justify-between text-xs font-bold text-white/30 px-1 mt-3 uppercase tracking-widest">
            <span>Light</span>
            <span>Match Pace</span>
            <span>Max Effort</span>
          </div>
        </div>
      </div>
    {/if}

    <button
      class="w-full py-6 rounded-2xl font-black text-2xl tracking-wide transition-all duration-200 flex items-center justify-center gap-3 {selectedFocus && selectedDrill && !logSubmitting ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 shadow-[0_0_40px_rgba(99,102,241,0.4)] text-white hover:scale-[1.01]' : 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed'}"
      disabled={!selectedFocus || !selectedDrill || logSubmitting}
      onclick={logWorkout}
    >
      {#if logSubmitting}
        <span>Logging…</span>
      {:else if selectedFocus && selectedDrill}
        <i class="ph-bold ph-lightning text-3xl"></i> LOG WORKOUT & CLAIM +{estimatedLogXp} XP
      {:else}
        Select a drill to continue
      {/if}
    </button>
  </div>
</div>
