<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';
	import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
	import { IntentEngine } from './IntentEngine.svelte.js';
	import IntentArena from './IntentArena.svelte';
	import IntentHUD from './IntentHUD.svelte';

	let {
		titleLead = 'INTENT',
		titleAccent = 'ENGINE',
		subtitle = '[ TACTICAL ASSIGNMENT TERMINAL ]',
		showDrillLibraryLink = false,
	} = $props();

	const engine = new IntentEngine();

	const ALLOWED_ROLES = ['coach', 'director', 'global_admin', 'super_admin'];
	const role = $derived(authStore.role);

	$effect(() => {
		if (!browser) return;
		if (!authStore.isLoading && !ALLOWED_ROLES.includes(role)) {
			untrack(() => goto('/home'));
		}
	});

	const teamScope = new CoachTeamScope();
	$effect(() => {
		teamScope.syncSelectedTeam();
	});

	const myTeams = $derived(teamScope.myTeams);
	const currentTeam = $derived(teamScope.currentTeam);

	const tenantId = $derived(teamScope.teamClubId || authStore.tenantId);
	const clubId = $derived(teamScope.teamClubId || authStore.tenantId);
	const sportId = $derived(sportsConfigStore.currentSportConfig?.sportId ?? 'soccer');

	$effect(() => {
		if (!browser || !teamScope.selectedTeamId || !tenantId) return;
		engine.connect(teamScope.selectedTeamId, tenantId, clubId, sportId);
		return () => engine.destroy();
	});
</script>

<div class="tw-relative tw-min-h-screen tw-w-full tw-bg-[#020202] tw-font-mono">
	<header
		class="tw-bg-[#020202] tw-border-b tw-border-[#14b8a6]/10 tw-px-5 tw-py-4 tw-flex tw-items-center tw-justify-between tw-gap-4 tw-flex-wrap"
	>
		<div class="tw-flex tw-flex-col tw-gap-0.5">
			<h1 class="tw-text-2xl tw-font-black tw-tracking-tight tw-text-white">
				<span class="tw-text-[#14b8a6]">{titleLead}</span>
				{#if titleAccent}
					{' '}{titleAccent}
				{/if}
			</h1>
			<p class="tw-text-[10px] tw-tracking-widest tw-text-white/30 tw-uppercase">
				{subtitle}
			</p>
		</div>

		<div class="tw-flex tw-items-center tw-gap-3 tw-flex-wrap">
			{#if showDrillLibraryLink}
				<a
					href={resolve('/(app)/coach/drills', {})}
					class="tw-text-[10px] tw-tracking-widest tw-uppercase tw-text-[#14b8a6]/70 tw-no-underline tw-border tw-border-[#14b8a6]/25 tw-rounded tw-px-2.5 tw-py-1 hover:tw-border-[#14b8a6]/50 hover:tw-text-[#14b8a6]"
				>
					Drill library →
				</a>
			{/if}

			{#if currentTeam}
				<span class="tw-text-[11px] tw-text-white/40 tw-font-mono tw-tracking-wide">
					&#x25B6; {currentTeam.name}
				</span>
			{/if}

			{#if myTeams.length > 1}
				<select
					bind:value={teamScope.selectedTeamId}
					class="tw-bg-[#020202] tw-border tw-border-[#14b8a6]/20 tw-text-white/80 tw-rounded-lg tw-px-3 tw-py-2 tw-font-mono tw-text-xs tw-outline-none tw-cursor-pointer hover:tw-border-[#14b8a6]/40 tw-transition-colors"
				>
					{#each myTeams as team (team.id)}
						<option value={team.id}>{team.name}</option>
					{/each}
				</select>
			{/if}
		</div>
	</header>

	<main class="tw-px-5 tw-py-6">
		<div
			class="tw-mx-auto tw-grid tw-w-full tw-max-w-6xl tw-grid-cols-1 tw-gap-6 xl:tw-grid-cols-12"
		>
			<section class="tw-min-w-0 xl:tw-col-span-5" aria-label="Deploy intent">
				<IntentHUD
					attributes={engine.attributes}
					roster={engine.roster}
					bind:draftAttributeId={engine.draftAttributeId}
					bind:draftRequiredXp={engine.draftRequiredXp}
					bind:draftDurationDays={engine.draftDurationDays}
					bind:draftScope={engine.draftScope}
					bind:draftTargetUids={engine.draftTargetUids}
					bind:draftHighPriority={engine.draftHighPriority}
					bind:draftPrescriptionSets={engine.draftPrescriptionSets}
					bind:draftPrescriptionRepsPerSet={engine.draftPrescriptionRepsPerSet}
					bind:draftPrescriptionBilateral={engine.draftPrescriptionBilateral}
					bind:draftPrescriptionDurationMin={engine.draftPrescriptionDurationMin}
					bind:draftPrescriptionTargetRpe={engine.draftPrescriptionTargetRpe}
					bind:draftCadenceSessionsPerWindow={engine.draftCadenceSessionsPerWindow}
					bind:draftDrillId={engine.draftDrillId}
					bind:draftDrillTitle={engine.draftDrillTitle}
					availableDrills={engine.availableDrills}
					isLoadingDrills={engine.isLoadingDrills}
					deployPhase={engine.deployPhase}
					deployError={engine.deployError}
					rosterError={engine.rosterError}
					isLoadingRoster={engine.isLoadingRoster}
					assignableRosterCount={engine.assignableRosterCount}
					nameOnlyRosterCount={engine.nameOnlyRosterCount}
					canDeploy={engine.canDeploy}
					bind:draftBundleDrills={engine.draftBundleDrills}
					bind:draftRequiresParentVerification={engine.draftRequiresParentVerification}
					onDeploy={() => engine.deployIntent()}
					onToggleUid={(uid) => engine.toggleDraftUid(uid)}
					onSelectAll={() => engine.selectAllRosterUids()}
					onClearSelection={() => engine.clearRosterSelection()}
					onAttributeChange={() => engine.onAttributeChanged()}
					onAddBundleDrill={() => engine.addBundleDrill()}
					onRemoveBundleDrill={(i) => engine.removeBundleDrill(i)}
					onUpdateBundleDrill={(i, patch) => engine.updateBundleDrill(i, patch)}
				/>
			</section>

			<section class="tw-min-w-0 xl:tw-col-span-7" aria-label="Active tactical intents">
				<h2
					class="tw-mb-4 tw-mt-0 tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#14b8a6]/70 tw-uppercase"
				>
					Active intents
				</h2>
				<IntentArena
					intents={engine.enrichedIntents}
					isLoading={engine.isLoadingIntents}
					isRefreshing={engine.isRefreshing}
					cancellingIntentIds={engine.cancellingIntentIds}
					mutationError={engine.mutationError}
					onCancel={(id) => engine.cancelIntent(id)}
					onExtend={(id, days) => engine.extendIntent(id, days)}
					onRefresh={() => engine.refreshIntents()}
				/>
			</section>
		</div>
	</main>
</div>
