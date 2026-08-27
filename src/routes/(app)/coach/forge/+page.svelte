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
	<!-- Unified Master Forge Interface Header -->
	<header class="tw-bg-[#080d1a] tw-border-b tw-border-slate-800/80 tw-sticky tw-top-0 tw-z-40 tw-shadow-2xl">
		<!-- Top Command Bar: Identity, Squad Anchor, and War Room Shortcut -->
		<div class="tw-max-w-[1600px] tw-mx-auto tw-px-4 md:tw-px-8 tw-py-3.5 tw-flex tw-items-center tw-justify-between tw-gap-4">
			<!-- Left: Identity & Squad Anchor -->
			<div class="tw-flex tw-items-center tw-gap-3">
				<div class="tw-flex tw-items-center tw-gap-2">
					<div class="tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-emerald-400 tw-shadow-[0_0_10px_rgba(52,211,153,0.6)]"></div>
					<span class="tw-font-mono tw-font-black tw-text-base tw-tracking-widest tw-text-white">
						THE FORGE
					</span>
				</div>
				<div class="tw-h-4 tw-w-px tw-bg-slate-700 tw-hidden sm:tw-block"></div>
				<span class="tw-font-mono tw-text-xs tw-text-slate-400 tw-tracking-wider tw-uppercase tw-hidden sm:tw-inline">
					Tactical Studio
				</span>
				{#if currentTeam}
					<div class="tw-h-4 tw-w-px tw-bg-slate-700 tw-hidden md:tw-block"></div>
					<span class="tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-text-slate-300 tw-font-mono tw-text-[11px] tw-px-2.5 tw-py-0.5 tw-rounded-md tw-hidden md:tw-inline-flex tw-items-center tw-gap-1.5">
						<span class="tw-text-slate-500">▶</span> {currentTeam.name}
					</span>
				{/if}
			</div>

			<!-- Right: Quick Bridge to War Room -->
			<a
				href="/coach/tactical"
				class="tw-bg-[#0f172a] hover:tw-bg-slate-800 tw-border tw-border-slate-800 hover:tw-border-slate-700 tw-text-slate-300 hover:tw-text-white tw-font-mono tw-text-xs tw-font-medium tw-px-3.5 tw-py-1.5 tw-rounded-lg active:tw-scale-[0.98] tw-transition-all tw-no-underline tw-inline-flex tw-items-center tw-gap-2"
				title="Open War Room Tactical Whiteboard"
			>
				<span class="tw-text-slate-400">⚡</span>
				<span>Open War Room</span>
				<span class="tw-text-slate-600">→</span>
			</a>
		</div>

		<!-- Built-in Section Navigation (Dark Colors Only — Seamless In-Page Section Switching) -->
		<div class="tw-border-t tw-border-slate-800/60 tw-bg-[#040814]">
			<div class="tw-max-w-[1600px] tw-mx-auto tw-px-4 md:tw-px-8">
				<nav class="tw-flex tw-items-center tw-gap-2 -tw-mb-px tw-overflow-x-auto tw-py-1.5">
					<button
						type="button"
						class="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-rounded-lg tw-font-mono tw-text-xs tw-font-semibold tw-transition-all tw-whitespace-nowrap {activeTab === 'intent' ? 'tw-bg-[#1e293b] tw-text-white tw-border tw-border-slate-700/90 tw-shadow-sm' : 'tw-text-slate-400 hover:tw-text-slate-200 hover:tw-bg-slate-900/60 tw-border tw-border-transparent'}"
						onclick={() => setTab('intent')}
					>
						<span class="{activeTab === 'intent' ? 'tw-opacity-100' : 'tw-opacity-50'}">🎯</span>
						<span>Intent Engine</span>
					</button>
					<button
						type="button"
						class="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-rounded-lg tw-font-mono tw-text-xs tw-font-semibold tw-transition-all tw-whitespace-nowrap {activeTab === 'designer' ? 'tw-bg-[#1e293b] tw-text-white tw-border tw-border-slate-700/90 tw-shadow-sm' : 'tw-text-slate-400 hover:tw-text-slate-200 hover:tw-bg-slate-900/60 tw-border tw-border-transparent'}"
						onclick={() => setTab('designer')}
					>
						<span class="{activeTab === 'designer' ? 'tw-opacity-100' : 'tw-opacity-50'}">📐</span>
						<span>Drill Designer</span>
					</button>
					<button
						type="button"
						class="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-rounded-lg tw-font-mono tw-text-xs tw-font-semibold tw-transition-all tw-whitespace-nowrap {activeTab === 'library' ? 'tw-bg-[#1e293b] tw-text-white tw-border tw-border-slate-700/90 tw-shadow-sm' : 'tw-text-slate-400 hover:tw-text-slate-200 hover:tw-bg-slate-900/60 tw-border tw-border-transparent'}"
						onclick={() => setTab('library')}
					>
						<span class="{activeTab === 'library' ? 'tw-opacity-100' : 'tw-opacity-50'}">📚</span>
						<span>Drill Library</span>
					</button>
				</nav>
			</div>
		</div>
	</header>

	<!-- Content Arena according to Active Tab -->
	<main class="tw-p-4 md:tw-p-6 tw-max-w-[1600px] tw-mx-auto tw-w-full">
		{#if activeTab === 'intent'}
			<CoachIntentEngineView showDrillLibraryLink={true} />
		{:else if activeTab === 'designer'}
			<CoachDrillDesignerStudio
				teamId={effectiveTeamId}
				onDrillSaved={() => {
					setTab('library');
				}}
				onDeployToIntent={() => {
					setTab('intent');
				}}
			/>
		{:else}
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
		{/if}
	</main>
</div>
