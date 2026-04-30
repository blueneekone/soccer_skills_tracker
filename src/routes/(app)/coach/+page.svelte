<script>
    import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
    import CoachTeamXpVelocityChart from '$lib/components/shell/CoachTeamXpVelocityChart.svelte';
    import CoachSquadReadinessCard from '$lib/components/coach/CoachSquadReadinessCard.svelte';
</script>

<div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 mt-2">
    <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">Daily Intelligence</h1>
        <p class="text-slate-400 mt-1">Review player telemetry and prepare for upcoming missions.</p>
    </div>
    
    <a href="/coach/tactical" class="relative group inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-300 bg-red-600 rounded-xl hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:-translate-y-1 z-10 cursor-pointer">
        INITIATE MATCH DAY MODE
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
    </a>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    
    <div class="lg:col-span-1 flex flex-col gap-6">
        <ActionInbox />
    </div>

    <div class="lg:col-span-2 flex flex-col gap-6">
        
        <div class="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl relative z-10">
            <h2 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Squad XP Velocity</h2>
            <CoachTeamXpVelocityChart />
        </div>

        <div class="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl relative z-10">
            <CoachSquadReadinessCard />
        </div>

    </div>
</div>