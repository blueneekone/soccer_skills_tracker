<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import type { MouseEventHandler } from 'svelte/elements';

	type DeployPhase = 'idle' | 'saving' | 'success' | 'error';

	let {
		attributes = [] as Array<{ id: string; name: string; hexColor: string }>,
		roster = [] as Array<{
			uid: string;
			rosterKey: string;
			playerName: string;
			email: string;
			assignable?: boolean;
			nameOnly?: boolean;
		}>,
		draftAttributeId = $bindable(''),
		draftRequiredXp = $bindable(150),
		draftDurationDays = $bindable(7),
		draftScope = $bindable<'team' | 'players'>('team'),
		draftTargetUids = $bindable<string[]>([]),
		draftPriorityMission = $bindable(false),
		draftPrescriptionSets = $bindable(3),
		draftPrescriptionRepsPerSet = $bindable(10),
		draftPrescriptionBilateral = $bindable(false),
		draftPrescriptionDurationMin = $bindable(0),
		draftPrescriptionTargetRpe = $bindable(0),
		draftCadenceSessionsPerWindow = $bindable(0),
		draftDrillId = $bindable(''),
		draftDrillTitle = $bindable(''),
		availableDrills = [] as Array<{ id: string; title: string; scope?: string }>,
		isLoadingDrills = false,
		draftBundleDrills = $bindable([] as Array<{ drillId: string; drillTitle: string; sets: number; repsPerSet: number }>),
		draftRequiresParentVerification = $bindable(false),
		deployPhase = 'idle' as DeployPhase,
		deployError = '',
		rosterError = '',
		isLoadingRoster = false,
		assignableRosterCount = 0,
		nameOnlyRosterCount = 0,
		canDeploy = false,
		onDeploy = (() => {}) as MouseEventHandler<HTMLButtonElement>,
		onToggleUid = (_uid: string) => {},
		onSelectAll = (() => {}) as MouseEventHandler<HTMLButtonElement>,
		onClearSelection = (() => {}) as MouseEventHandler<HTMLButtonElement>,
		onAttributeChange = () => {},
		onAddBundleDrill = () => {},
		onRemoveBundleDrill = (_index: number) => {},
		onUpdateBundleDrill = (_index: number, _patch: Partial<{ drillId: string; drillTitle: string; sets: number; repsPerSet: number }>) => {},
		onRefreshRoster = (() => {}) as () => void | Promise<void>,
		draftMissionKind = $bindable('standard' as 'standard' | 'benchmark'),
		draftBenchmarkDrillId = $bindable(''),
		draftBenchmarkTargetValue = $bindable(0),
		benchmarkDrills = [] as Array<{ id: string; label: string; category: string; baseXP: number }>,
		onMissionKindChange = () => {},
		onBenchmarkDrillChange = () => {},
	} = $props();

	function getPlayerInitials(name: string) {
		if (!name) return 'PL';
		const parts = String(name).trim().split(/\s+/);
		if (parts.length >= 2) {
			return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
		}
		return String(name).slice(0, 2).toUpperCase() || 'PL';
	}

	const deployBtnLabel = $derived(
		deployPhase === 'saving'
			? 'TRANSMITTING INTENT…'
			: deployPhase === 'success'
				? '✓ INTENT DEPLOYED TO SQUAD'
				: deployPhase === 'error'
					? 'RETRY DEPLOY'
					: '⚡ DEPLOY TACTICAL INTENT',
	);

	const selectedAssignableCount = $derived(
		draftTargetUids.filter((key) =>
			roster.some((r) => r.rosterKey === key && r.assignable !== false),
		).length,
	);

	let prevRequiredXp = draftRequiredXp;
	$effect(() => {
		if (
			draftRequiredXp >= 300 &&
			prevRequiredXp < 300 &&
			draftCadenceSessionsPerWindow === 0
		) {
			draftCadenceSessionsPerWindow = 5;
		}
		prevRequiredXp = draftRequiredXp;
	});

	const cadenceDisplayLabel = $derived(
		draftCadenceSessionsPerWindow > 0
			? `${draftCadenceSessionsPerWindow}× / week`
			: draftRequiredXp >= 300
				? '5× / week (default)'
				: 'Open cadence',
	);

	const deployBlockReason = $derived.by(() => {
		if (canDeploy || deployPhase !== 'idle') return '';
		if (draftMissionKind === 'benchmark' && !draftBenchmarkDrillId) {
			return 'Select a benchmark combine drill to deploy.';
		}
		if (!draftAttributeId) return 'Select a target attribute to deploy.';
		if (draftRequiredXp < 1) return 'Set XP bounty to at least 1.';
		if (draftDurationDays < 1) return 'Set duration to at least 1 day.';
		if (draftScope === 'team' && assignableRosterCount === 0) {
			return 'No assignable operatives on squad.';
		}
		if (draftScope === 'players' && selectedAssignableCount === 0) {
			return 'Select at least one assignable operative.';
		}
		return '';
	});
</script>

<section
	class="coach-forge-deploy-panel tw-w-full tw-p-6 tw-flex tw-flex-col tw-gap-6 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none tw-shadow-2xl tw-font-mono"
	aria-label="Deploy intent workbench"
>
	<!-- Header / Kicker -->
	<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-4">
		<div class="tw-flex tw-items-center tw-gap-3">
			<span class="tw-w-2.5 tw-h-2.5 tw-bg-[#14b8a6] tw-shadow-[0_0_10px_#14b8a6]"></span>
			<div>
				<h2 class="tw-text-sm tw-font-black tw-tracking-widest tw-text-white tw-uppercase tw-m-0">
					TACTICAL INTENT DISPATCH
				</h2>
				<span class="tw-text-[11px] tw-text-slate-400 tw-tracking-wider tw-uppercase">
					AUTOREGULATED HOMEWORK & COMBINE BLUEPRINT
				</span>
			</div>
		</div>
		<span class="tw-text-[10px] tw-font-bold tw-text-[#daff0a] tw-bg-[#daff0a]/10 tw-border tw-border-[#daff0a]/40 tw-px-2.5 tw-py-1">
			ACTIVE FORGE
		</span>
	</div>

	<!-- 1. Mission Kind Segmented Bar -->
	<div class="tw-space-y-2">
		<div class="tw-flex tw-items-center tw-justify-between">
			<span class="tw-text-xs tw-font-bold tw-text-slate-300 tw-uppercase tw-tracking-wider">
				1. MISSION ARCHITECTURE
			</span>
			<span class="tw-text-[11px] tw-text-slate-400">
				{draftMissionKind === 'standard' ? 'Daily Homework Routine' : 'Scouting Combine Test'}
			</span>
		</div>
		<div class="tw-grid tw-grid-cols-2 tw-gap-2">
			<button
				type="button"
				class="tw-py-3 tw-px-4 tw-border tw-text-xs tw-font-bold tw-tracking-wider tw-uppercase tw-transition-all {draftMissionKind === 'standard' ? 'tw-bg-[#14b8a6]/20 tw-border-[#14b8a6] tw-text-[#14b8a6] tw-shadow-[0_0_12px_rgba(20,184,166,0.25)]' : 'tw-bg-[#020617] tw-border-[#334155] tw-text-slate-400 hover:tw-border-slate-300'}"
				onclick={() => {
					draftMissionKind = 'standard';
					onMissionKindChange();
				}}
			>
				🏋 HOMEWORK INTENT
			</button>
			<button
				type="button"
				class="tw-py-3 tw-px-4 tw-border tw-text-xs tw-font-bold tw-tracking-wider tw-uppercase tw-transition-all {draftMissionKind === 'benchmark' ? 'tw-bg-[#daff0a]/20 tw-border-[#daff0a] tw-text-[#daff0a] tw-shadow-[0_0_12px_rgba(218,255,10,0.25)]' : 'tw-bg-[#020617] tw-border-[#334155] tw-text-slate-400 hover:tw-border-slate-300'}"
				onclick={() => {
					draftMissionKind = 'benchmark';
					onMissionKindChange();
				}}
			>
				⚡ COMBINE BENCHMARK
			</button>
		</div>
	</div>

	<!-- Benchmark Drill Picker (if benchmark mode) -->
	{#if draftMissionKind === 'benchmark'}
		<div class="tw-p-4 tw-bg-[#020617] tw-border tw-border-[#334155] tw-space-y-3">
			<label for="forge-benchmark" class="tw-block tw-text-xs tw-font-bold tw-text-[#daff0a] tw-uppercase tw-tracking-wider">
				Select Benchmark Combine Drill
			</label>
			<select
				id="forge-benchmark"
				bind:value={draftBenchmarkDrillId}
				onchange={() => onBenchmarkDrillChange()}
				class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-white tw-px-3.5 tw-py-2.5 tw-text-xs focus:tw-border-[#daff0a] tw-outline-none"
			>
				{#each benchmarkDrills as drill (drill.id)}
					<option value={drill.id}>
						[{drill.category}] {drill.label} · {drill.baseXP} Base XP
					</option>
				{/each}
			</select>
			<div>
				<label for="forge-benchmark-target" class="tw-block tw-text-[11px] tw-text-slate-400 tw-uppercase tw-mb-1">
					Target Numerical Goal (Optional)
				</label>
				<input
					id="forge-benchmark-target"
					type="number"
					step="any"
					min="0"
					placeholder="e.g. 25 reps or 12.4 seconds"
					bind:value={draftBenchmarkTargetValue}
					class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-white tw-px-3.5 tw-py-2 tw-text-xs focus:tw-border-[#daff0a] tw-outline-none placeholder:tw-text-slate-600"
				/>
			</div>
		</div>
	{/if}

	<!-- 2. Target Attribute Selector (Standard Mode) -->
	{#if draftMissionKind === 'standard'}
		<div class="tw-space-y-2">
			<div class="tw-flex tw-items-center tw-justify-between">
				<span class="tw-text-xs tw-font-bold tw-text-slate-300 tw-uppercase tw-tracking-wider">
					2. TARGET SKILL ATTRIBUTE
				</span>
				{#if draftAttributeId}
					{@const currentAttr = attributes.find(a => a.id === draftAttributeId)}
					<span class="tw-text-[11px] tw-font-bold" style="color: {currentAttr?.hexColor || '#14b8a6'}">
						{currentAttr?.name}
					</span>
				{/if}
			</div>

			<div class="tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 tw-gap-2">
				{#each attributes as attr (attr.id)}
					{@const isSelected = draftAttributeId === attr.id}
					<button
						type="button"
						class="tw-flex tw-items-center tw-gap-2.5 tw-p-3 tw-border tw-text-left tw-transition-all {isSelected ? 'tw-bg-[#0f172a] tw-border-white tw-shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'tw-bg-[#020617] tw-border-[#334155] hover:tw-border-slate-400'}"
						onclick={() => {
							draftAttributeId = attr.id;
							onAttributeChange();
						}}
					>
						<span
							class="tw-w-3 tw-h-3 tw-rounded-full tw-shrink-0"
							style="background: {attr.hexColor || '#14b8a6'}; box-shadow: 0 0 6px {attr.hexColor || '#14b8a6'};"
						></span>
						<span class="tw-text-xs tw-font-bold tw-text-white tw-truncate">{attr.name}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- 3. Drill Selection & Prescription -->
		<div class="tw-space-y-3 tw-p-4 tw-bg-[#020617] tw-border tw-border-[#334155]">
			<div class="tw-flex tw-items-center tw-justify-between">
				<span class="tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-tracking-wider">
					3. DRILL PRESCRIPTION & REPETITIONS
				</span>
				{#if isLoadingDrills}
					<span class="tw-text-[10px] tw-text-slate-400 tw-animate-pulse">Loading drills…</span>
				{/if}
			</div>

			<div>
				<label for="forge-drill" class="tw-block tw-text-[11px] tw-text-slate-400 tw-uppercase tw-mb-1">
					Select Drill from Team Library
				</label>
				<select
					id="forge-drill"
					bind:value={draftDrillId}
					disabled={isLoadingDrills}
					class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-white tw-px-3.5 tw-py-2.5 tw-text-xs focus:tw-border-[#14b8a6] tw-outline-none"
				>
					<option value="">— Open intent (RL suggests drill) —</option>
					{#each availableDrills as drill (drill.id)}
						<option value={drill.id}>
							{drill.scope === 'club' ? `[CLUB] ${drill.title}` : drill.title}
						</option>
					{/each}
				</select>
			</div>

			{#if !draftDrillId}
				<div>
					<label for="forge-drill-title" class="tw-block tw-text-[11px] tw-text-slate-400 tw-uppercase tw-mb-1">
						Or Custom Drill Title
					</label>
					<input
						id="forge-drill-title"
						type="text"
						maxlength="200"
						placeholder="e.g. Wall Pass Precision & First Touch"
						bind:value={draftDrillTitle}
						class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-white tw-px-3.5 tw-py-2 tw-text-xs focus:tw-border-[#14b8a6] tw-outline-none placeholder:tw-text-slate-600"
					/>
				</div>
			{/if}

			<!-- Sets & Reps Counters -->
			<div class="tw-grid tw-grid-cols-2 sm:tw-grid-cols-4 tw-gap-3 tw-pt-2">
				<div class="tw-space-y-1">
					<label for="forge-sets" class="tw-block tw-text-[10px] tw-text-slate-400 tw-uppercase">Sets</label>
					<div class="tw-flex tw-items-center">
						<button
							type="button"
							class="tw-px-3 tw-py-1.5 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-slate-300 hover:tw-text-white"
							onclick={() => draftPrescriptionSets = Math.max(1, draftPrescriptionSets - 1)}
						>-</button>
						<input
							id="forge-sets"
							type="number"
							min="1"
							max="99"
							bind:value={draftPrescriptionSets}
							class="tw-w-full tw-bg-[#0f172a] tw-border-y tw-border-[#334155] tw-text-center tw-text-[#daff0a] tw-font-bold tw-text-sm tw-py-1.5 tw-outline-none"
						/>
						<button
							type="button"
							class="tw-px-3 tw-py-1.5 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-slate-300 hover:tw-text-white"
							onclick={() => draftPrescriptionSets = draftPrescriptionSets + 1}
						>+</button>
					</div>
				</div>

				<div class="tw-space-y-1">
					<label for="forge-reps" class="tw-block tw-text-[10px] tw-text-slate-400 tw-uppercase">Reps / Set</label>
					<div class="tw-flex tw-items-center">
						<button
							type="button"
							class="tw-px-3 tw-py-1.5 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-slate-300 hover:tw-text-white"
							onclick={() => draftPrescriptionRepsPerSet = Math.max(0, draftPrescriptionRepsPerSet - 5)}
						>-</button>
						<input
							id="forge-reps"
							type="number"
							min="0"
							max="999"
							bind:value={draftPrescriptionRepsPerSet}
							class="tw-w-full tw-bg-[#0f172a] tw-border-y tw-border-[#334155] tw-text-center tw-text-[#daff0a] tw-font-bold tw-text-sm tw-py-1.5 tw-outline-none"
						/>
						<button
							type="button"
							class="tw-px-3 tw-py-1.5 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-slate-300 hover:tw-text-white"
							onclick={() => draftPrescriptionRepsPerSet = draftPrescriptionRepsPerSet + 5}
						>+</button>
					</div>
				</div>

				<div class="tw-space-y-1">
					<label for="forge-min" class="tw-block tw-text-[10px] tw-text-slate-400 tw-uppercase">Target Min</label>
					<input
						id="forge-min"
						type="number"
						min="0"
						max="120"
						placeholder="0"
						bind:value={draftPrescriptionDurationMin}
						class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-center tw-text-[#daff0a] tw-font-bold tw-text-sm tw-py-1.5 tw-outline-none"
					/>
				</div>

				<div class="tw-space-y-1">
					<label for="forge-rpe" class="tw-block tw-text-[10px] tw-text-slate-400 tw-uppercase">Target RPE (1-10)</label>
					<input
						id="forge-rpe"
						type="number"
						min="0"
						max="10"
						placeholder="—"
						bind:value={draftPrescriptionTargetRpe}
						class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-center tw-text-[#daff0a] tw-font-bold tw-text-sm tw-py-1.5 tw-outline-none"
					/>
				</div>
			</div>

			<!-- Bilateral Checkbox -->
			<label class="tw-flex tw-items-center tw-gap-2.5 tw-cursor-pointer tw-pt-1">
				<input
					type="checkbox"
					bind:checked={draftPrescriptionBilateral}
					class="tw-accent-[#14b8a6] tw-w-4 tw-h-4"
				/>
				<span class="tw-text-xs tw-text-slate-300 tw-font-bold tw-uppercase">
					Bilateral Execution (Both Left & Right Foot Required)
				</span>
			</label>
		</div>
	{/if}

	<!-- 4. XP Bounty & Duration -->
	<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4 tw-p-4 tw-bg-[#020617] tw-border tw-border-[#334155]">
		<div class="tw-space-y-2">
			<div class="tw-flex tw-items-center tw-justify-between">
				<label for="forge-xp" class="tw-text-xs tw-font-bold tw-text-slate-300 tw-uppercase">
					XP BOUNTY REWARD
				</label>
				<span class="tw-text-base tw-font-black tw-text-[#daff0a]">
					+{draftRequiredXp} XP
				</span>
			</div>
			<input
				id="forge-xp"
				type="range"
				min="50"
				max="2000"
				step="25"
				bind:value={draftRequiredXp}
				class="tw-w-full tw-accent-[#daff0a] tw-h-2 tw-bg-[#0f172a] tw-cursor-pointer"
			/>
		</div>

		<div class="tw-space-y-2">
			<div class="tw-flex tw-items-center tw-justify-between">
				<label for="forge-dur" class="tw-text-xs tw-font-bold tw-text-slate-300 tw-uppercase">
					MISSION TIMELINE
				</label>
				<span class="tw-text-base tw-font-black tw-text-[#14b8a6]">
					{draftDurationDays} DAYS
				</span>
			</div>
			<input
				id="forge-dur"
				type="range"
				min="1"
				max="90"
				step="1"
				bind:value={draftDurationDays}
				class="tw-w-full tw-accent-[#14b8a6] tw-h-2 tw-bg-[#0f172a] tw-cursor-pointer"
			/>
		</div>
	</div>

	<!-- 5. Scope & Operative Target Tray -->
	<div class="tw-space-y-3">
		<div class="tw-flex tw-items-center tw-justify-between">
			<span class="tw-text-xs tw-font-bold tw-text-slate-300 tw-uppercase tw-tracking-wider">
				5. TARGET OPERATIVES ({roster.length} ATHLETES)
			</span>
			<div class="tw-flex tw-gap-2">
				<button
					type="button"
					class="tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-border tw-transition-all {draftScope === 'team' ? 'tw-bg-[#14b8a6] tw-text-black tw-border-[#14b8a6]' : 'tw-bg-[#020617] tw-border-[#334155] tw-text-slate-400'}"
					onclick={() => draftScope = 'team'}
				>
					ENTIRE SQUAD
				</button>
				<button
					type="button"
					class="tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-border tw-transition-all {draftScope === 'players' ? 'tw-bg-[#14b8a6] tw-text-black tw-border-[#14b8a6]' : 'tw-bg-[#020617] tw-border-[#334155] tw-text-slate-400'}"
					onclick={() => draftScope = 'players'}
				>
					SPECIFIC ATHLETES
				</button>
			</div>
		</div>

		{#if draftScope === 'players'}
			<div class="tw-flex tw-items-center tw-justify-between tw-bg-[#020617] tw-p-2.5 tw-border tw-border-[#334155]">
				<div class="tw-flex tw-gap-2">
					<button
						type="button"
						class="tw-px-3 tw-py-1 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-xs tw-text-[#14b8a6] hover:tw-border-[#14b8a6]"
						onclick={onSelectAll}
					>
						SELECT ALL
					</button>
					<button
						type="button"
						class="tw-px-3 tw-py-1 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-xs tw-text-slate-400 hover:tw-text-white"
						onclick={onClearSelection}
					>
						CLEAR
					</button>
				</div>
				<span class="tw-text-xs tw-font-bold tw-text-[#daff0a]">
					{draftTargetUids.length} OF {roster.length} SELECTED
				</span>
			</div>
		{/if}

		<!-- Operative Cards Grid -->
		<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-2 tw-max-h-[300px] tw-overflow-y-auto tw-p-2 tw-bg-[#020617] tw-border tw-border-[#334155]">
			{#if isLoadingRoster}
				<div class="tw-col-span-3 tw-p-6 tw-text-center tw-text-xs tw-text-slate-400 tw-animate-pulse">
					Loading squad roster from database…
				</div>
			{:else if roster.length === 0}
				<div class="tw-col-span-3 tw-p-6 tw-text-center">
					<p class="tw-text-xs tw-text-[#fbbf24] tw-font-bold tw-mb-2">NO ATHLETES DETECTED ON SQUAD</p>
					<button
						type="button"
						class="tw-px-3 tw-py-1.5 tw-bg-[#14b8a6] tw-text-black tw-text-xs tw-font-bold"
						onclick={() => onRefreshRoster()}
					>
						REFRESH SQUAD ROSTER
					</button>
				</div>
			{:else}
				{#each roster as player (player.rosterKey)}
					{@const isSelected = draftScope === 'team' || draftTargetUids.includes(player.rosterKey)}
					{@const initials = getPlayerInitials(player.playerName)}
					<button
						type="button"
						class="tw-flex tw-items-center tw-justify-between tw-p-2.5 tw-border tw-text-left tw-transition-all {isSelected ? 'tw-bg-[#0f172a] tw-border-[#14b8a6]' : 'tw-bg-[#000000] tw-border-[#334155] hover:tw-border-slate-400'} {draftScope === 'team' ? 'tw-cursor-default' : 'tw-cursor-pointer'}"
						onclick={() => {
							if (draftScope === 'players') onToggleUid(player.rosterKey);
						}}
					>
						<div class="tw-flex tw-items-center tw-gap-2.5 tw-min-w-0">
							<span class="tw-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-border tw-text-xs tw-font-black {isSelected ? 'tw-border-[#14b8a6] tw-bg-[#14b8a6]/20 tw-text-[#14b8a6]' : 'tw-border-[#334155] tw-bg-[#020617] tw-text-slate-400'}">
								{initials}
							</span>
							<div class="tw-truncate">
								<div class="tw-text-xs tw-font-bold tw-text-white tw-truncate">{player.playerName}</div>
								<div class="tw-text-[10px] tw-text-slate-400 tw-truncate">{player.email || 'Linked Account'}</div>
							</div>
						</div>
						<div class="tw-flex tw-items-center tw-shrink-0">
							{#if isSelected}
								<span class="tw-text-xs tw-text-[#14b8a6] tw-font-bold">✓</span>
							{:else}
								<span class="tw-text-xs tw-text-slate-600">○</span>
							{/if}
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</div>

	<!-- 6. Operational Flags -->
	<div class="tw-flex tw-items-center tw-justify-between tw-p-3 tw-bg-[#020617] tw-border tw-border-[#334155] tw-flex-wrap tw-gap-3">
		<label class="tw-flex tw-items-center tw-gap-2.5 tw-cursor-pointer">
			<input
				type="checkbox"
				bind:checked={draftPriorityMission}
				class="tw-accent-[#fbbf24] tw-w-4 tw-h-4"
			/>
			<span class="tw-text-xs tw-text-slate-200 tw-font-bold tw-uppercase">
				⭐ Priority Mission (Ranks Top in Player Train Feed)
			</span>
		</label>

		<label class="tw-flex tw-items-center tw-gap-2.5 tw-cursor-pointer">
			<input
				type="checkbox"
				bind:checked={draftRequiresParentVerification}
				class="tw-accent-[#14b8a6] tw-w-4 tw-h-4"
			/>
			<span class="tw-text-xs tw-text-slate-200 tw-font-bold tw-uppercase">
				🛡 Request Parent Verification Proof
			</span>
		</label>
	</div>

	<!-- Error / Block Reason Banner -->
	{#if deployPhase === 'error' && deployError}
		<div class="tw-p-3 tw-bg-red-950/60 tw-border tw-border-red-500 tw-text-red-300 tw-text-xs tw-font-bold tw-uppercase" role="alert">
			[ ERR ] {deployError}
		</div>
	{:else if !canDeploy && deployBlockReason}
		<div class="tw-p-3 tw-bg-[#020617] tw-border tw-border-amber-500/40 tw-text-amber-300 tw-text-xs tw-font-bold tw-uppercase" role="status">
			ℹ {deployBlockReason}
		</div>
	{/if}

	<!-- 7. Primary Call-To-Action (Mandated Action Gold #fbbf24) -->
	<button
		type="button"
		class="tw-w-full tw-py-4 tw-px-6 tw-bg-[#fbbf24] hover:tw-bg-[#f59e0b] tw-text-black tw-font-mono tw-text-sm tw-font-black tw-uppercase tw-tracking-widest tw-transition-all active:tw-scale-[0.99] disabled:tw-opacity-40 disabled:tw-cursor-not-allowed tw-shadow-[0_0_20px_rgba(251,191,36,0.3)]"
		disabled={!canDeploy || deployPhase === 'saving'}
		onclick={onDeploy}
	>
		{deployBtnLabel}
	</button>
</section>
