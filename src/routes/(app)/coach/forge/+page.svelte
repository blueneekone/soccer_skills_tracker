<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { CoachIntentEngineView } from '$lib/coach/intent/index.js';
	import DrillDesignerTab from '$lib/components/coach/DrillDesignerTab.svelte';
	import CoachDrillsView from '$lib/coach/drills/CoachDrillsView.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';

	const teamScope = new CoachTeamScope();
	$effect(() => {
		teamScope.syncSelectedTeam();
	});

	let activeTab = $state<'intent' | 'designer' | 'library'>('intent');

	$effect(() => {
		if (!browser) return;
		const t = page.url.searchParams.get('tab') || page.url.searchParams.get('view');
		if (t === 'designer' || t === 'library' || t === 'intent') {
			activeTab = t as any;
		}
	});

	const effectiveTeamId = $derived(teamScope.selectedTeamId || authStore.teamId || authStore.user?.teamId || '');

	function setTab(tab: 'intent' | 'designer' | 'library') {
		activeTab = tab;
		if (browser) {
			const url = new URL(window.location.href);
			url.searchParams.set('tab', tab);
			window.history.replaceState({}, '', url.toString());
		}
	}
</script>

<svelte:head>
	<title>Coach · The Forge & Drill Studio · SSTRACKER</title>
</svelte:head>

<div class="tw-min-h-screen tw-bg-[#020617] tw-text-slate-100 tw-font-sans">
	<!-- Top Tactical Bar with 3 Master Tabs -->
	<header class="tw-bg-[#0f172a] tw-border-b tw-border-[#334155] tw-px-6 tw-py-3 tw-flex tw-items-center tw-justify-between tw-gap-4 tw-flex-wrap tw-sticky tw-top-0 tw-z-40 tw-shadow-lg">
		<div class="tw-flex tw-items-center tw-gap-3">
			<span class="tw-font-mono tw-font-black tw-text-base tw-tracking-widest tw-text-white tw-flex tw-items-center tw-gap-2">
				<span class="tw-text-[#14b8a6]">THE FORGE</span>
				<span class="tw-text-[#94a3b8] tw-text-xs tw-font-normal tw-hidden sm:tw-inline">· TACTICAL STUDIO</span>
			</span>
		</div>

		<!-- Tab Switcher -->
		<nav class="tw-flex tw-items-center tw-gap-1.5 tw-bg-[#020617] tw-p-1 tw-rounded-xl tw-border tw-border-[#334155]">
			<button
				type="button"
				class="tw-px-3.5 tw-py-1.5 tw-rounded-lg tw-font-mono tw-text-xs tw-font-bold tw-transition-all {activeTab === 'intent' ? 'tw-bg-[#14b8a6] tw-text-black tw-shadow-[0_0_12px_rgba(20,184,166,0.4)]' : 'tw-text-slate-400 hover:tw-text-white hover:tw-bg-slate-800/60'}"
				onclick={() => setTab('intent')}
			>
				🎯 INTENT ENGINE
			</button>
			<button
				type="button"
				class="tw-px-3.5 tw-py-1.5 tw-rounded-lg tw-font-mono tw-text-xs tw-font-bold tw-transition-all {activeTab === 'designer' ? 'tw-bg-[#daff0a] tw-text-black tw-shadow-[0_0_12px_rgba(218,255,10,0.4)]' : 'tw-text-slate-400 hover:tw-text-white hover:tw-bg-slate-800/60'}"
				onclick={() => setTab('designer')}
			>
				📐 DRILL DESIGNER
			</button>
			<button
				type="button"
				class="tw-px-3.5 tw-py-1.5 tw-rounded-lg tw-font-mono tw-text-xs tw-font-bold tw-transition-all {activeTab === 'library' ? 'tw-bg-[#fbbf24] tw-text-black tw-shadow-[0_0_12px_rgba(251,191,36,0.4)]' : 'tw-text-slate-400 hover:tw-text-white hover:tw-bg-slate-800/60'}"
				onclick={() => setTab('library')}
			>
				📚 DRILL LIBRARY
			</button>
		</nav>
	</header>

	<!-- Content Arena according to Active Tab -->
	<main class="tw-w-full">
		{#if activeTab === 'intent'}
			<CoachIntentEngineView showDrillLibraryLink={false} />
		{:else if activeTab === 'designer'}
			<div class="tw-p-4 md:tw-p-6 tw-max-w-[1600px] tw-mx-auto">
				<DrillDesignerTab
					teamId={effectiveTeamId}
					onDrillSaved={() => {
						setTab('library');
					}}
				/>
			</div>
		{:else}
			<div class="tw-w-full">
				<CoachDrillsView />
			</div>
		{/if}
	</main>
</div>
