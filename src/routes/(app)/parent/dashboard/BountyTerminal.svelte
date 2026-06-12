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

<div class="parent-bounty-terminal">
	<header>
		<h2 class="parent-bounty-terminal__title">Bounty terminal</h2>
		<p class="parent-bounty-terminal__subtitle">Deploy escrow bounty</p>
	</header>

	<hr class="parent-bounty-divider" />

	{#if !engine.hasFundingSource}
		<div class="parent-bounty-alert parent-bounty-alert--pending">
			<span>Link a funding source before deploying bounties.</span>
			<a href="#parent-funding-source" class="parent-bounty-btn-audit parent-bounty-btn-audit--sm">
				Open funding panel
			</a>
		</div>
	{/if}

	<div class="parent-bounty-field-group">
		<label for="player-select" class="parent-bounty-field-label">Target player</label>
		{#if engine.householdChildren.length === 0}
			<p class="parent-bounty-empty__label">No children linked to household</p>
		{:else}
			<select id="player-select" bind:value={selectedPlayerEmail} class="parent-bounty-field">
				<option value="" disabled>— Select player —</option>
				{#each engine.householdChildren as child (child.email)}
					<option value={child.email}>{child.displayName} ({child.email})</option>
				{/each}
			</select>
		{/if}
	</div>

	<div class="parent-bounty-field-group">
		<label for="bounty-title" class="parent-bounty-field-label">
			Bounty title — max 100 chars
		</label>
		<input
			id="bounty-title"
			type="text"
			bind:value={title}
			maxlength={100}
			placeholder="e.g. 500 reps this week"
			class="parent-bounty-field"
		/>
		<span class="parent-bounty-char-count">{title.length}/100</span>
	</div>

	<div class="parent-bounty-field-group">
		<p class="parent-bounty-field-label">Completion criterion</p>
		<div class="parent-bounty-criterion-list">
			{#each CRITERION_OPTIONS as opt (opt.id)}
				{@const isActive = criterionType === opt.id}
				<label class="parent-bounty-criterion {isActive ? 'parent-bounty-criterion--active' : ''}">
					<input type="radio" name="criterion-type" value={opt.id} bind:group={criterionType} />
					<span class="parent-bounty-criterion__label">{opt.label}</span>
				</label>
			{/each}
		</div>
	</div>

	<div class="parent-bounty-params">
		<p class="parent-bounty-params__eyebrow">Criterion parameters</p>

		{#if criterionType === 'reps_count'}
			<div class="parent-bounty-field-group">
				<label for="target-reps" class="parent-bounty-field-label">Target reps</label>
				<input
					id="target-reps"
					type="number"
					bind:value={targetReps}
					min={1}
					step={1}
					class="parent-bounty-field"
				/>
			</div>
		{:else if criterionType === 'workout_volume_kj'}
			<div class="parent-bounty-field-group">
				<label for="target-kj" class="parent-bounty-field-label">Target kilojoules</label>
				<input
					id="target-kj"
					type="number"
					bind:value={targetKj}
					min={1}
					step={0.1}
					class="parent-bounty-field"
				/>
			</div>
		{:else if criterionType === 'streak_length'}
			<div class="parent-bounty-field-group">
				<label for="target-days" class="parent-bounty-field-label">Target streak (days)</label>
				<input
					id="target-days"
					type="number"
					bind:value={targetDays}
					min={1}
					step={1}
					class="parent-bounty-field"
				/>
			</div>
		{:else if criterionType === 'gpa_threshold'}
			<div class="parent-bounty-field-group">
				<label for="minimum-gpa" class="parent-bounty-field-label">Minimum GPA (0.0 – 4.0)</label>
				<input
					id="minimum-gpa"
					type="number"
					bind:value={minimumGpa}
					min={0}
					max={4.0}
					step={0.1}
					class="parent-bounty-field"
				/>
			</div>
		{:else if criterionType === 'mastery_node_unlock'}
			<div class="parent-bounty-field-group">
				<label for="node-id" class="parent-bounty-field-label">Node ID</label>
				<input
					id="node-id"
					type="text"
					bind:value={nodeId}
					placeholder="skill_tree_node_id"
					class="parent-bounty-field"
				/>
			</div>
			<div class="parent-bounty-field-group">
				<label for="node-label" class="parent-bounty-field-label">Node label</label>
				<input
					id="node-label"
					type="text"
					bind:value={nodeLabel}
					placeholder="e.g. Advanced dribbling"
					class="parent-bounty-field"
				/>
			</div>
			<div class="parent-bounty-field-group">
				<label for="required-status" class="parent-bounty-field-label">Required status</label>
				<select id="required-status" bind:value={requiredStatus} class="parent-bounty-field">
					<option value="unlocked">Unlocked</option>
					<option value="mastered">Mastered</option>
				</select>
			</div>
		{/if}
	</div>

	<div class="parent-bounty-field-group">
		<label for="reward-dollars" class="parent-bounty-field-label">Reward amount (USD) — min $1</label>
		<div class="parent-bounty-field-wrap">
			<span class="parent-bounty-field-wrap__prefix">$</span>
			<input
				id="reward-dollars"
				type="number"
				bind:value={rewardDollars}
				min={1}
				step={1}
				class="parent-bounty-field parent-bounty-field--currency"
			/>
		</div>
	</div>

	<div class="parent-bounty-field-group">
		<label for="expires-at" class="parent-bounty-field-label">Bounty expiry date</label>
		<input
			id="expires-at"
			type="date"
			bind:value={expiresAt}
			min={minExpiryDate}
			class="parent-bounty-field"
		/>
	</div>

	{#if submitSuccess}
		<div class="parent-bounty-alert parent-bounty-alert--verified" role="status">
			Bounty staked to escrow — awaiting player completion
		</div>
	{/if}
	{#if submitError}
		<div class="parent-bounty-alert parent-bounty-alert--error" role="alert">
			{submitError}
		</div>
	{/if}

	<button
		type="button"
		onclick={handleSubmit}
		disabled={!isFormValid() || submitting || engine.mutating}
		class="parent-bounty-btn-deploy parent-bounty-btn-deploy--block"
	>
		{#if submitting || engine.mutating}
			Deploying bounty…
		{:else}
			Deploy bounty
		{/if}
	</button>
</div>
