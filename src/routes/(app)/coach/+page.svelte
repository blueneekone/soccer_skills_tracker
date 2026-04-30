<script>
    import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
    import CoachTeamXpVelocityChart from '$lib/components/shell/CoachTeamXpVelocityChart.svelte';
    import CoachSquadReadinessCard from '$lib/components/coach/CoachSquadReadinessCard.svelte';
</script>

<div class="tw-flex tw-flex-col md:tw-flex-row tw-justify-between tw-items-start md:tw-items-center tw-mb-8 tw-gap-4 tw-mt-2">
    <div>
        <h1 class="tw-text-3xl tw-font-bold tw-tracking-tight tw-text-white">Daily Intelligence</h1>
        <p class="tw-text-slate-400 tw-mt-1">Review player telemetry and prepare for upcoming missions.</p>
    </div>
    
    <a href="/coach/tactical" class="tw-relative tw-group tw-inline-flex tw-items-center tw-justify-center tw-px-8 tw-py-4 tw-font-bold tw-text-white tw-transition-all tw-duration-300 tw-bg-red-600 tw-rounded-xl hover:tw-bg-red-500 tw-shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:tw-shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:tw--translate-y-1 tw-z-10 tw-cursor-pointer">
        INITIATE MATCH DAY MODE
        <svg xmlns="http://www.w3.org/2000/svg" class="tw-w-5 tw-h-5 tw-ml-2 group-hover:tw-translate-x-1 tw-transition-transform" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
    </a>
</div>

<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-3 tw-gap-6">
    
    <div class="lg:tw-col-span-1 tw-flex tw-flex-col tw-gap-6">
        <ActionInbox />
    </div>

    <div class="lg:tw-col-span-2 tw-flex tw-flex-col tw-gap-6">
        
        <div class="tw-bg-slate-900/60 tw-backdrop-blur-md tw-border tw-border-white/5 tw-rounded-2xl tw-p-6 tw-shadow-2xl tw-relative tw-z-10">
            <h2 class="tw-text-xs tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest tw-mb-4">Squad XP Velocity</h2>
            <CoachTeamXpVelocityChart />
        </div>

        <div class="tw-bg-slate-900/60 tw-backdrop-blur-md tw-border tw-border-white/5 tw-rounded-2xl tw-p-6 tw-shadow-2xl tw-relative tw-z-10">
            <CoachSquadReadinessCard />
        </div>

    </div>
</div>