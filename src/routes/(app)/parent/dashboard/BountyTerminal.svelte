<script lang="ts">
	import type { CoOpEngine } from '$lib/states/CoOpEngine.svelte.js';
	import type { BountyCriterion } from '$lib/types/bounty.js';

	type CriterionType =
		| 'reps_count'
		| 'workout_volume_kj'
		| 'streak_length'
		| 'gpa_threshold'
		| 'mastery_node_unlock';

	const CRITERION_OPTIONS: { id: CriterionType; label: string }[] = [
		{ id: 'reps_count', label: 'REP COUNT' },
		{ id: 'workout_volume_kj', label: 'WORKOUT VOLUME (KJ)' },
		{ id: 'streak_length', label: 'STREAK LENGTH' },
		{ id: 'gpa_threshold', label: 'GPA THRESHOLD' },
		{ id: 'mastery_node_unlock', label: 'MASTERY NODE UNLOCK' },
	];

	let { engine }: { engine: CoOpEngine } = $props();

	let selectedPlayerEmail = $state('');
	let criterionType = $state<CriterionType>('reps_count');
	let title = $state('');
	let rewardDollars = $state<number>(5);
	let expiresAt = $state('');

	// Criterion-specific fields
	let targetReps = $state<number>(100);
	let targetKj = $state<number>(50);
	let targetDays = $state<number>(7);
	let minimumGpa = $state<number>(3.0);
	let nodeId = $state('');
	let nodeLabel = $state('');
	let requiredStatus = $state<'unlocked' | 'mastered'>('unlocked');

	let submitting = $state(false);
	let submitSuccess = $state(false);
	let submitError = $state('');

	function buildCriterion(): BountyCriterion {
		switch (criterionType) {
			case 'reps_count':
				return { type: 'reps_count', targetReps };
			case 'workout_volume_kj':
				return { type: 'workout_volume_kj', targetKj };
			case 'streak_length':
				return { type: 'streak_length', targetDays };
			case 'gpa_threshold':
				return { type: 'gpa_threshold', minimumGpa };
			case 'mastery_node_unlock':
				return { type: 'mastery_node_unlock', nodeId, nodeLabel, requiredStatus };
		}
	}

	function isFormValid(): boolean {
		// No funding source → server rejects createBountyEscrow; block deploy up front
		// (the funding-source warning banner directs the parent to link one).
		if (!engine.hasFundingSource) return false;
		if (!selectedPlayerEmail) return false;
		if (!title.trim()) return false;
		if (!rewardDollars || rewardDollars < 1) return false;
		if (!expiresAt) return false;
		if (criterionType === 'mastery_node_unlock' && (!nodeId.trim() || !nodeLabel.trim()))
			return false;
		return true;
	}

	async function handleSubmit() {
		if (!isFormValid() || submitting) return;
		submitting = true;
		submitError = '';
		submitSuccess = false;
		try {
			await engine.createBounty({
				playerEmail: selectedPlayerEmail,
				title: title.trim(),
				criterion: buildCriterion(),
				rewardCents: Math.round(rewardDollars * 100),
				expiresAt: new Date(expiresAt).toISOString(),
			});
			submitSuccess = true;
			title = '';
			rewardDollars = 5;
			expiresAt = '';
			targetReps = 100;
			targetKj = 50;
			targetDays = 7;
			minimumGpa = 3.0;
			nodeId = '';
			nodeLabel = '';
		} catch (e) {
			submitError = e instanceof Error ? e.message : 'BOUNTY CREATION FAILED.';
		} finally {
			submitting = false;
		}
	}

	const minExpiryDate = $derived.by(() => {
		const d = new Date();
		d.setDate(d.getDate() + 1);
		return d.toISOString().slice(0, 10);
	});
</script>

<div
	class="tw-w-full tw-backdrop-blur-[40px] tw-bg-[#040f16]/85 tw-border tw-border-[#14b8a6]/20 tw-rounded-xl tw-p-6 tw-flex tw-flex-col tw-gap-5"
>
	<!-- HEADER -->
	<div class="tw-flex tw-flex-col tw-gap-1">
		<div class="tw-flex tw-items-center tw-gap-2">
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/50 tw-uppercase">
				//
			</span>
			<h2 class="tw-font-mono tw-text-[13px] tw-tracking-widest tw-text-[#14b8a6] tw-uppercase">
				BOUNTY TERMINAL
			</h2>
		</div>
		<p class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase">
			[ DEPLOY ESCROW BOUNTY ]
		</p>
	</div>

	<!-- DIVIDER -->
	<div class="tw-w-full tw-h-px tw-bg-[#14b8a6]/10"></div>

	<!-- FUNDING SOURCE WARNING -->
	{#if !engine.hasFundingSource}
		<div
			class="tw-rounded-lg tw-bg-[#ffcc00]/10 tw-border tw-border-[#ffcc00]/30 tw-px-4 tw-py-3 tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between"
		>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#ffcc00] tw-uppercase">
				Link a funding source before deploying bounties.
			</span>
			<a
				href="#parent-funding-source"
				class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#ffcc00] tw-uppercase tw-underline tw-underline-offset-2"
			>
				Open funding panel
			</a>
		</div>
	{/if}

	<!-- PLAYER SELECTOR -->
	<div class="tw-flex tw-flex-col tw-gap-2">
		<label
			for="player-select"
			class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
		>
			TARGET PLAYER
		</label>
		{#if engine.householdChildren.length === 0}
			<div
				class="tw-rounded-lg tw-bg-[#020202] tw-border tw-border-[#14b8a6]/10 tw-px-4 tw-py-3"
			>
				<span
					class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/30 tw-uppercase"
				>
					[ NO CHILDREN LINKED TO HOUSEHOLD ]
				</span>
			</div>
		{:else}
			<select
				id="player-select"
				bind:value={selectedPlayerEmail}
				class="tw-w-full tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-uppercase tw-bg-[#020202] tw-border tw-border-[#14b8a6]/20 tw-rounded-lg tw-px-4 tw-py-3 tw-outline-none focus:tw-border-[#14b8a6]/60 focus:tw-shadow-[0_0_10px_rgba(20, 184, 166,0.2)] tw-transition-all tw-duration-150 tw-appearance-none tw-cursor-pointer"
			>
				<option value="" disabled>— SELECT PLAYER —</option>
				{#each engine.householdChildren as child (child.email)}
					<option value={child.email}>{child.displayName} ({child.email})</option>
				{/each}
			</select>
		{/if}
	</div>

	<!-- TITLE -->
	<div class="tw-flex tw-flex-col tw-gap-2">
		<label
			for="bounty-title"
			class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
		>
			BOUNTY TITLE <span class="tw-text-[#14b8a6]/25">— MAX 100 CHARS</span>
		</label>
		<input
			id="bounty-title"
			type="text"
			bind:value={title}
			maxlength={100}
			placeholder="e.g. 500 REPS THIS WEEK"
			class="tw-w-full tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-uppercase tw-bg-[#020202] tw-border tw-border-[#14b8a6]/20 tw-rounded-lg tw-px-4 tw-py-3 tw-outline-none focus:tw-border-[#14b8a6]/60 focus:tw-shadow-[0_0_10px_rgba(20, 184, 166,0.2)] tw-transition-all tw-duration-150 placeholder:tw-text-[#14b8a6]/20"
		/>
		<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/25 tw-text-right">
			{title.length}/100
		</span>
	</div>

	<!-- CRITERION TYPE -->
	<div class="tw-flex tw-flex-col tw-gap-3">
		<p class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase">
			COMPLETION CRITERION
		</p>
		<div class="tw-flex tw-flex-col tw-gap-2">
			{#each CRITERION_OPTIONS as opt (opt.id)}
				{@const isActive = criterionType === opt.id}
				<label
					class="tw-flex tw-items-center tw-gap-3 tw-rounded-lg tw-px-4 tw-py-3 tw-border tw-cursor-pointer tw-transition-all tw-duration-150
					{isActive
						? 'tw-border-[#14b8a6]/60 tw-bg-[#14b8a6]/8 tw-shadow-[0_0_12px_rgba(20, 184, 166,0.2),inset_0_0_6px_rgba(20, 184, 166,0.08)]'
						: 'tw-border-[#14b8a6]/10 tw-bg-transparent hover:tw-border-[#14b8a6]/30'}"
				>
					<input
						type="radio"
						name="criterion-type"
						value={opt.id}
						bind:group={criterionType}
						class="tw-accent-[#14b8a6] tw-w-3 tw-h-3"
					/>
					<span
						class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-uppercase
						{isActive ? 'tw-text-[#14b8a6]' : 'tw-text-[#e0e0e0]/60'}"
					>
						{opt.label}
					</span>
				</label>
			{/each}
		</div>
	</div>

	<!-- DYNAMIC CRITERION FIELDS -->
	<div class="tw-flex tw-flex-col tw-gap-3 tw-rounded-lg tw-bg-[#020202] tw-border tw-border-[#14b8a6]/10 tw-p-4">
		<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/30 tw-uppercase">
			// CRITERION PARAMETERS
		</p>

		{#if criterionType === 'reps_count'}
			<div class="tw-flex tw-flex-col tw-gap-2">
				<label
					for="target-reps"
					class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
				>
					TARGET REPS
				</label>
				<input
					id="target-reps"
					type="number"
					bind:value={targetReps}
					min={1}
					step={1}
					class="tw-w-full tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-bg-[#040f16] tw-border tw-border-[#14b8a6]/20 tw-rounded-lg tw-px-4 tw-py-3 tw-outline-none focus:tw-border-[#14b8a6]/60 tw-transition-all tw-duration-150"
				/>
			</div>

		{:else if criterionType === 'workout_volume_kj'}
			<div class="tw-flex tw-flex-col tw-gap-2">
				<label
					for="target-kj"
					class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
				>
					TARGET KILOJOULES
				</label>
				<input
					id="target-kj"
					type="number"
					bind:value={targetKj}
					min={1}
					step={0.1}
					class="tw-w-full tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-bg-[#040f16] tw-border tw-border-[#14b8a6]/20 tw-rounded-lg tw-px-4 tw-py-3 tw-outline-none focus:tw-border-[#14b8a6]/60 tw-transition-all tw-duration-150"
				/>
			</div>

		{:else if criterionType === 'streak_length'}
			<div class="tw-flex tw-flex-col tw-gap-2">
				<label
					for="target-days"
					class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
				>
					TARGET STREAK (DAYS)
				</label>
				<input
					id="target-days"
					type="number"
					bind:value={targetDays}
					min={1}
					step={1}
					class="tw-w-full tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-bg-[#040f16] tw-border tw-border-[#14b8a6]/20 tw-rounded-lg tw-px-4 tw-py-3 tw-outline-none focus:tw-border-[#14b8a6]/60 tw-transition-all tw-duration-150"
				/>
			</div>

		{:else if criterionType === 'gpa_threshold'}
			<div class="tw-flex tw-flex-col tw-gap-2">
				<label
					for="minimum-gpa"
					class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
				>
					MINIMUM GPA (0.0 – 4.0)
				</label>
				<input
					id="minimum-gpa"
					type="number"
					bind:value={minimumGpa}
					min={0}
					max={4.0}
					step={0.1}
					class="tw-w-full tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-bg-[#040f16] tw-border tw-border-[#14b8a6]/20 tw-rounded-lg tw-px-4 tw-py-3 tw-outline-none focus:tw-border-[#14b8a6]/60 tw-transition-all tw-duration-150"
				/>
			</div>

		{:else if criterionType === 'mastery_node_unlock'}
			<div class="tw-flex tw-flex-col tw-gap-3">
				<div class="tw-flex tw-flex-col tw-gap-2">
					<label
						for="node-id"
						class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
					>
						NODE ID
					</label>
					<input
						id="node-id"
						type="text"
						bind:value={nodeId}
						placeholder="skill_tree_node_id"
						class="tw-w-full tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-bg-[#040f16] tw-border tw-border-[#14b8a6]/20 tw-rounded-lg tw-px-4 tw-py-3 tw-outline-none focus:tw-border-[#14b8a6]/60 tw-transition-all tw-duration-150 placeholder:tw-text-[#14b8a6]/20"
					/>
				</div>
				<div class="tw-flex tw-flex-col tw-gap-2">
					<label
						for="node-label"
						class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
					>
						NODE LABEL
					</label>
					<input
						id="node-label"
						type="text"
						bind:value={nodeLabel}
						placeholder="e.g. Advanced Dribbling"
						class="tw-w-full tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-bg-[#040f16] tw-border tw-border-[#14b8a6]/20 tw-rounded-lg tw-px-4 tw-py-3 tw-outline-none focus:tw-border-[#14b8a6]/60 tw-transition-all tw-duration-150 placeholder:tw-text-[#14b8a6]/20"
					/>
				</div>
				<div class="tw-flex tw-flex-col tw-gap-2">
					<label
						for="required-status"
						class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
					>
						REQUIRED STATUS
					</label>
					<select
						id="required-status"
						bind:value={requiredStatus}
						class="tw-w-full tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-uppercase tw-bg-[#040f16] tw-border tw-border-[#14b8a6]/20 tw-rounded-lg tw-px-4 tw-py-3 tw-outline-none focus:tw-border-[#14b8a6]/60 tw-transition-all tw-duration-150 tw-appearance-none tw-cursor-pointer"
					>
						<option value="unlocked">UNLOCKED</option>
						<option value="mastered">MASTERED</option>
					</select>
				</div>
			</div>
		{/if}
	</div>

	<!-- REWARD AMOUNT -->
	<div class="tw-flex tw-flex-col tw-gap-2">
		<label
			for="reward-dollars"
			class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
		>
			REWARD AMOUNT (USD) — MIN $1
		</label>
		<div class="tw-relative">
			<span
				class="tw-absolute tw-left-4 tw-top-1/2 -tw-translate-y-1/2 tw-font-mono tw-text-[11px] tw-text-[#14b8a6]/50"
			>
				$
			</span>
			<input
				id="reward-dollars"
				type="number"
				bind:value={rewardDollars}
				min={1}
				step={1}
				class="tw-w-full tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-bg-[#020202] tw-border tw-border-[#14b8a6]/20 tw-rounded-lg tw-pl-8 tw-pr-4 tw-py-3 tw-outline-none focus:tw-border-[#14b8a6]/60 focus:tw-shadow-[0_0_10px_rgba(20, 184, 166,0.2)] tw-transition-all tw-duration-150"
			/>
		</div>
	</div>

	<!-- EXPIRY DATE -->
	<div class="tw-flex tw-flex-col tw-gap-2">
		<label
			for="expires-at"
			class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase"
		>
			BOUNTY EXPIRY DATE
		</label>
		<input
			id="expires-at"
			type="date"
			bind:value={expiresAt}
			min={minExpiryDate}
			class="tw-w-full tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-bg-[#020202] tw-border tw-border-[#14b8a6]/20 tw-rounded-lg tw-px-4 tw-py-3 tw-outline-none focus:tw-border-[#14b8a6]/60 focus:tw-shadow-[0_0_10px_rgba(20, 184, 166,0.2)] tw-transition-all tw-duration-150 tw-cursor-pointer"
		/>
	</div>

	<!-- SUCCESS / ERROR STATES -->
	{#if submitSuccess}
		<div
			class="tw-rounded-lg tw-bg-[#00ff66]/10 tw-border tw-border-[#00ff66]/30 tw-px-4 tw-py-3 tw-text-center"
		>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00ff66] tw-uppercase">
				[ BOUNTY STAKED TO ESCROW — AWAITING PLAYER COMPLETION ]
			</span>
		</div>
	{/if}
	{#if submitError}
		<div
			class="tw-rounded-lg tw-bg-[#ff0055]/10 tw-border tw-border-[#ff0055]/30 tw-px-4 tw-py-3 tw-text-center"
		>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#ff0055] tw-uppercase">
				[ {submitError} ]
			</span>
		</div>
	{/if}

	<!-- SUBMIT -->
	<button
		onclick={handleSubmit}
		disabled={!isFormValid() || submitting || engine.mutating}
		class="tw-w-full tw-font-mono tw-text-[10px] tw-tracking-widest tw-uppercase tw-border tw-border-[#ffcc00]/40 tw-text-[#ffcc00] tw-bg-[#ffcc00]/5 tw-rounded-lg tw-px-6 tw-py-3.5 tw-transition-all tw-duration-200
		{!isFormValid() || submitting || engine.mutating
			? 'tw-opacity-40 tw-cursor-not-allowed'
			: 'hover:tw-bg-[#ffcc00]/10 hover:tw-shadow-[0_0_12px_rgba(255,204,0,0.3)] hover:tw-border-[#ffcc00]/70'}"
	>
		{#if submitting || engine.mutating}
			[ DEPLOYING BOUNTY... ]
		{:else}
			[ DEPLOY ESCROW BOUNTY ]
		{/if}
	</button>
</div>
