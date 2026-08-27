<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { CoachIntentEngineView } from '$lib/coach/intent/index.js';
	import CoachDrillDesignerStudio from '$lib/components/coach/drill/CoachDrillDesignerStudio.svelte';
	import CoachDrillLibraryArena from '$lib/components/coach/drill/CoachDrillLibraryArena.svelte';
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
	const currentTeam = $derived(teamScope.currentTeam);

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
	<title>Coach · Tactical Forge & Playbook Studio · SSTRACKER</title>
</svelte:head>

<div class="tw-min-h-screen tw-bg-[#020617] tw-text-slate-100 tw-font-sans">
	<!-- Executive Header with Segmented Command Switcher (Multi-Billion-Dollar Design) -->
	<header class="tw-bg-[#080d1a]/95 tw-backdrop-blur-xl tw-border-b tw-border-slate-800/80 tw-px-6 tw-py-3 tw-flex tw-items-center tw-justify-between tw-gap-4 tw-flex-wrap tw-sticky tw-top-0 tw-z-40 tw-shadow-2xl">
		<!-- Left: Identity & Squad Anchor -->
		<div class="tw-flex tw-items-center tw-gap-3">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_10px_#14b8a6]"></span>
				<span class="tw-font-mono tw-font-black tw-text-base tw-tracking-widest tw-text-white">
					THE FORGE
				</span>
			</div>
			<span class="tw-text-slate-600 tw-text-xs">|</span>
			<span class="tw-font-mono tw-text-[11px] tw-text-slate-400 tw-tracking-wider tw-hidden sm:tw-inline">
				TACTICAL STUDIO
			</span>
			{#if currentTeam}
				<span class="tw-bg-[#0f172a] tw-border tw-border-slate-700/60 tw-text-[#14b8a6] tw-font-mono tw-text-[11px] tw-px-2.5 tw-py-1 tw-rounded-lg tw-hidden md:tw-inline-flex tw-items-center tw-gap-1.5">
					<span>▶</span> {currentTeam.name}
				</span>
			{/if}
		</div>

		<!-- Center: Refined Segmented Controller -->
		<nav class="tw-flex tw-items-center tw-bg-[#030712] tw-border tw-border-slate-800 tw-p-1 tw-rounded-xl tw-shadow-inner tw-gap-1">
			<button
				type="button"
				class="tw-px-4 tw-py-2 tw-rounded-lg tw-font-mono tw-text-xs tw-font-bold tw-transition-all duration-200 {activeTab === 'intent' ? 'tw-bg-[#14b8a6] tw-text-black tw-shadow-[0_0_15px_rgba(20,184,166,0.35)]' : 'tw-text-slate-400 hover:tw-text-white hover:tw-bg-slate-800/50'}"
				onclick={() => setTab('intent')}
			>
				🎯 INTENT ENGINE
			</button>
			<button
				type="button"
				class="tw-px-4 tw-py-2 tw-rounded-lg tw-font-mono tw-text-xs tw-font-bold tw-transition-all duration-200 {activeTab === 'designer' ? 'tw-bg-[#daff0a] tw-text-black tw-shadow-[0_0_15px_rgba(218,255,10,0.35)]' : 'tw-text-slate-400 hover:tw-text-white hover:tw-bg-slate-800/50'}"
				onclick={() => setTab('designer')}
			>
				📐 DRILL DESIGNER
			</button>
			<button
				type="button"
				class="tw-px-4 tw-py-2 tw-rounded-lg tw-font-mono tw-text-xs tw-font-bold tw-transition-all duration-200 {activeTab === 'library' ? 'tw-bg-[#fbbf24] tw-text-black tw-shadow-[0_0_15px_rgba(251,191,36,0.35)]' : 'tw-text-slate-400 hover:tw-text-white hover:tw-bg-slate-800/50'}"
				onclick={() => setTab('library')}
			>
				📚 DRILL LIBRARY
			</button>
		</nav>

		<!-- Right: Quick Bridge to War Room -->
		<div class="tw-flex tw-items-center tw-gap-2">
			<a
				href="/coach/tactical"
				class="tw-bg-[#0f172a] hover:tw-bg-slate-800 tw-border tw-border-slate-700 hover:tw-border-[#14b8a6] tw-text-slate-200 hover:tw-text-white tw-font-mono tw-text-xs tw-font-semibold tw-px-3.5 tw-py-2 tw-rounded-xl active:tw-scale-[0.98] tw-transition-all tw-no-underline tw-flex tw-items-center tw-gap-1.5"
				title="Open War Room Tactical Whiteboard"
			>
				<span>⚡ Open War Room</span>
				<span class="tw-text-[#14b8a6]">→</span>
			</a>
		</div>
	</header>

	<!-- Content Arena according to Active Tab -->
	<main class="tw-w-full">
		{#if activeTab === 'intent'}
			<CoachIntentEngineView showDrillLibraryLink={false} />
		{:else if activeTab === 'designer'}
			<div class="tw-p-4 md:tw-p-6 tw-max-w-[1600px] tw-mx-auto">
				<CoachDrillDesignerStudio
					teamId={effectiveTeamId}
					onDrillSaved={() => {
						setTab('library');
					}}
					onDeployToIntent={() => {
						setTab('intent');
					}}
				/>
			</div>
		{:else}
			<div class="tw-p-4 md:tw-p-6 tw-max-w-[1600px] tw-mx-auto">
				<CoachDrillLibraryArena
					teamId={effectiveTeamId}
					onOpenInDesigner={() => {
						setTab('designer');
					}}
					onDeployToIntent={() => {
						setTab('intent');
					}}
					onNewDrill={() => {
						setTab('designer');
					}}
				/>
			</div>
		{/if}
	</main>
</div>
