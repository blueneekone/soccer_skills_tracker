<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { sportsConfigStore } from '$lib/services/sportsConfigs.svelte.js';
	import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
	import { IntentEngine } from './IntentEngine.svelte.js';
	import IntentArena from './IntentArena.svelte';
	import ForgeDeployPanel from './ForgeDeployPanel.svelte';
	import { BENCHMARK_DRILLS } from '$lib/player/benchmark/benchmarkDrillCatalog.js';
	import '$lib/styles/coach-forge-workbench.css';

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
	const effectiveTeamId = $derived(teamScope.selectedTeamId || authStore.teamId || authStore.user?.teamId || '');
	const tenantId = $derived(teamScope.teamClubId || authStore.clubId || authStore.tenantId || authStore.userProfile?.clubId || authStore.teamId || 'default');
	const clubId = $derived(teamScope.teamClubId || authStore.clubId || authStore.tenantId || authStore.userProfile?.clubId || authStore.teamId || 'default');
	const sportId = $derived(sportsConfigStore.currentSportConfig?.sportId ?? 'soccer');

	const benchmarkDrillOptions = $derived(
		BENCHMARK_DRILLS.map((d) => ({
			id: d.id,
			label: d.label,
			category: d.category,
			baseXP: d.baseXP,
		})),
	);

	$effect(() => {
		if (!browser || !effectiveTeamId) return;
		engine.connect(effectiveTeamId, tenantId, clubId, sportId);
		return () => engine.destroy();
	});
</script>

<div class="tw-flex tw-flex-col tw-gap-6 tw-w-full tw-text-slate-200 tw-font-mono coach-forge-workbench">
	<!-- Executive Header & Control Bar (Matching Drill Designer & Library) -->
	<div class="tw-bg-[#080d1a]/60 tw-backdrop-blur-md tw-border tw-border-slate-800/80 tw-rounded-2xl tw-p-6 tw-flex tw-flex-col md:tw-flex-row md:tw-items-center tw-justify-between tw-gap-5 tw-shadow-2xl">
		<div class="tw-flex tw-items-center tw-gap-4">
			<div class="tw-h-12 tw-w-12 tw-rounded-xl tw-bg-slate-800/60 tw-border tw-border-slate-700/80 tw-flex tw-items-center tw-justify-center tw-text-slate-200 tw-font-mono tw-font-bold tw-text-xl tw-shadow-inner">
				🎯
			</div>
			<div>
				<h2 class="tw-text-slate-100 tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-3">
					<span>{titleLead} {titleAccent}</span>
					<span class="tw-bg-slate-800 tw-text-slate-300 tw-border tw-border-slate-700 tw-font-mono tw-text-[10px] tw-px-2.5 tw-py-1 tw-rounded-md tw-tracking-widest tw-uppercase">
						ACTIVE ROSTER
					</span>
				</h2>
				<p class="tw-text-sm tw-text-slate-400 tw-mt-1">
					Deploy training missions, prescribe volume & XP benchmarks, and monitor active assignments across your squad.
				</p>
			</div>
		</div>

		<div class="tw-flex tw-items-center tw-gap-3 tw-bg-[#030712]/50 tw-p-2 tw-rounded-xl tw-border tw-border-slate-800/60">
			{#if showDrillLibraryLink}
				<a
					href={resolve('/(app)/coach/forge', {})}
					class="tw-text-xs tw-font-mono tw-font-semibold tw-text-slate-300 hover:tw-text-white tw-no-underline tw-border tw-border-slate-700 tw-bg-slate-800/80 tw-rounded-lg tw-px-3 tw-py-1.5 hover:tw-bg-slate-700 tw-transition-all"
				>
					Drill Library →
				</a>
			{/if}

			{#if currentTeam}
				<span class="tw-font-mono tw-text-xs tw-text-slate-300 tw-px-2.5 tw-py-1 tw-flex tw-items-center tw-gap-1.5">
					<span class="tw-text-slate-500">▶</span> {currentTeam.name}
				</span>
			{/if}

			{#if myTeams.length > 1}
				<select
					bind:value={teamScope.selectedTeamId}
					class="tw-bg-[#0f172a] tw-border tw-border-slate-700 tw-text-slate-200 tw-font-mono tw-text-xs tw-rounded-lg tw-px-3 tw-py-2 focus:tw-border-slate-500 focus:tw-outline-none tw-cursor-pointer hover:tw-border-slate-500 tw-transition-all"
				>
					{#each myTeams as team (team.id)}
						<option value={team.id}>{team.name}</option>
					{/each}
				</select>
			{/if}
		</div>
	</div>

	<!-- 12-Column Workbench Grid -->
	<div class="tw-w-full">
		<div class="coach-forge-workbench__grid">
			<section class="coach-forge-workbench__deploy" aria-label="Deploy intent">
				<ForgeDeployPanel
					attributes={engine.attributes}
					roster={engine.roster}
					bind:draftAttributeId={engine.draftAttributeId}
					bind:draftRequiredXp={engine.draftRequiredXp}
					bind:draftDurationDays={engine.draftDurationDays}
					bind:draftScope={engine.draftScope}
					bind:draftTargetUids={engine.draftTargetUids}
					bind:draftPriorityMission={engine.draftPriorityMission}
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
					bind:draftMissionKind={engine.draftMissionKind}
					bind:draftBenchmarkDrillId={engine.draftBenchmarkDrillId}
					bind:draftBenchmarkTargetValue={engine.draftBenchmarkTargetValue}
					benchmarkDrills={benchmarkDrillOptions}
					onMissionKindChange={() => engine.onMissionKindChanged()}
					onBenchmarkDrillChange={() => engine.onBenchmarkDrillChanged()}
					onDeploy={() => engine.deployIntent()}
					onToggleUid={(uid) => engine.toggleDraftUid(uid)}
					onSelectAll={() => engine.selectAllRosterUids()}
					onClearSelection={() => engine.clearRosterSelection()}
					onAttributeChange={() => engine.onAttributeChanged()}
					onAddBundleDrill={() => engine.addBundleDrill()}
					onRemoveBundleDrill={(i) => engine.removeBundleDrill(i)}
					onUpdateBundleDrill={(i, patch) => engine.updateBundleDrill(i, patch)}
					onRefreshRoster={() => engine.refreshRoster()}
				/>
			</section>

			<section class="coach-forge-workbench__arena" aria-label="Active intents">
				<IntentArena
					intents={engine.enrichedIntents}
					isLoading={engine.isLoadingIntents}
					isRefreshing={engine.isRefreshing}
					cancellingIntentIds={engine.cancellingIntentIds}
					mutationError={engine.mutationError}
					mutationSuccess={engine.mutationSuccess}
					onCancel={(id) => engine.cancelIntent(id)}
					onExtend={(id, days) => engine.extendIntent(id, days)}
					onRefresh={async () => {
						await engine.refreshIntents();
						await engine.refreshRoster();
					}}
				/>
			</section>
		</div>
	</div>
</div>
