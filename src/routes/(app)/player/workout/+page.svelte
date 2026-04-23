<script>
  // Mock Data (This will be wired to your Firestore database later)
  let level = 12;
  let currentXp = 850;
  let nextLevelXp = 1000;
  let streak = 4;
  
  // Interactive State
  let selectedFocus = $state(null);
  let intensity = $state(5);

  const focusAreas = [
    { id: 'technical', label: 'Technical', icon: 'ph-soccer-ball' },
    { id: 'physical', label: 'Physical', icon: 'ph-barbell' },
    { id: 'tactical', label: 'Tactical', icon: 'ph-strategy' },
    { id: 'recovery', label: 'Recovery', icon: 'ph-heartbeat' }
  ];

  function logWorkout() {
    if (!selectedFocus) return;
    // In the future, this will trigger a confetti animation and save to the DB!
    alert(`Epic! Logged ${selectedFocus} at intensity ${intensity}. +150 XP Earned!`);
  }
</script>

<div class="max-w-2xl mx-auto w-full space-y-8 p-4 md:p-6 text-white pb-24">
  
  <div class="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl shadow-lg backdrop-blur-sm">
    <div class="flex flex-col">
      <span class="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Current Level</span>
      <span class="text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Lv. {level}</span>
    </div>
    
    <div class="flex-1 px-6">
      <div class="flex justify-between text-xs font-bold text-white/50 mb-2 tracking-wide">
        <span>{currentXp} XP</span>
        <span>{nextLevelXp} XP</span>
      </div>
      <div class="h-2.5 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
        <div 
          class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out" 
          style="width: {(currentXp / nextLevelXp) * 100}%"
        ></div>
      </div>
    </div>
    
    <div class="flex flex-col items-end">
      <span class="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Day Streak</span>
      <span class="text-2xl font-black text-orange-400 flex items-center gap-1">
        <i class="ph-fill ph-fire"></i> {streak}
      </span>
    </div>
  </div>

  <div class="space-y-4">
    <h2 class="text-xl font-bold tracking-tight text-white/90">1. Select Focus</h2>
    <div class="grid grid-cols-2 gap-4">
      {#each focusAreas as focus}
        <button
          class="relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all duration-200 {selectedFocus === focus.id ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'bg-[#09090b] border-white/10 hover:bg-white/5 hover:border-white/20'}"
          onclick={() => selectedFocus = focus.id}
        >
          <i class="ph {focus.icon} text-4xl transition-colors duration-200 {selectedFocus === focus.id ? 'text-indigo-400' : 'text-white/40'}"></i>
          <span class="font-semibold tracking-wide {selectedFocus === focus.id ? 'text-white' : 'text-white/60'}">{focus.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="space-y-6 p-6 bg-[#09090b] border border-white/10 rounded-2xl shadow-lg">
    <div class="flex justify-between items-center mb-2">
      <h2 class="text-xl font-bold tracking-tight text-white/90">2. Intensity (RPE)</h2>
      <span class="text-3xl font-black text-white">{intensity} <span class="text-base font-medium text-white/40">/ 10</span></span>
    </div>
    
    <input
      type="range"
      min="1"
      max="10"
      bind:value={intensity}
      class="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
    />
    
    <div class="flex justify-between text-xs font-semibold text-white/40 px-1 uppercase tracking-wider">
      <span>Light</span>
      <span>Match Pace</span>
      <span>Absolute Limit</span>
    </div>
  </div>

  <button
    class="w-full py-5 rounded-2xl font-black text-lg tracking-wide transition-all duration-200 flex items-center justify-center gap-2 {selectedFocus ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 shadow-[0_0_30px_rgba(99,102,241,0.3)] text-white scale-100 hover:scale-[1.02]' : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed scale-100'}"
    disabled={!selectedFocus}
    onclick={logWorkout}
  >
    {#if selectedFocus}
      <i class="ph-bold ph-lightning"></i> Log Workout & Claim +150 XP
    {:else}
      Select a focus to continue
    {/if}
  </button>
  
</div>