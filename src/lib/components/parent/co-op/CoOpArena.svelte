<script lang="ts">
	import type { CoOpEngine } from '$lib/states/CoOpEngine.svelte.js';
	import type { BountyDoc } from '$lib/types/bounty.js';
	import { BOOST_PRESETS } from '$lib/types/bounty.js';

	let { engine }: { engine: CoOpEngine } = $props();

	let availableSources = $state<Array<{ id: string; label: string; method: string }>>([]);
	let loadingSources = $state(false);
	let selectedSourceId = $state('');
	let linkingSource = $state(false);
	let linkError = $state('');

	async function fetchSources() {
		loadingSources = true;
		try {
			availableSources = await engine.listFundingSources();
		} finally {
			loadingSources = false;
		}
	}

	async function handleLinkSource() {
		if (!selectedSourceId || linkingSource) return;
		linkingSource = true;
		linkError = '';
		try {
			await engine.linkFundingSource(selectedSourceId);
			availableSources = [];
			selectedSourceId = '';
		} catch (e) {
			linkError = e instanceof Error ? e.message : 'LINK FAILED.';
		} finally {
			linkingSource = false;
		}
	}

	function statusChipClass(status: BountyDoc['status']): string {
		switch (status) {
			case 'active':
				return 'parent-bounty-chip parent-bounty-chip--nav';
			case 'verified':
			case 'paid':
				return 'parent-bounty-chip parent-bounty-chip--verified';
			case 'failed':
				return 'parent-bounty-chip parent-bounty-chip--pending';
			case 'expired':
			case 'voided':
				return 'parent-bounty-chip parent-bounty-chip--muted';
			default:
				return 'parent-bounty-chip parent-bounty-chip--muted';
		}
	}

	function criterionLabel(type: BountyDoc['criterion']['type']): string {
		switch (type) {
			case 'reps_count':
				return 'REPS';
			case 'workout_volume_kj':
				return 'VOLUME';
			case 'streak_length':
				return 'STREAK';
			case 'gpa_threshold':
				return 'GPA';
			case 'mastery_node_unlock':
				return 'MASTERY';
			case 'cv_verified_drill':
				return 'CV-DRILL';
			default:
				return 'UNKNOWN';
		}
	}

	function formatExpiry(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			});
		} catch {
			return iso;
		}
	}

	const displayBounties = $derived([...engine.activeBounties, ...engine.verifiedBounties]);
</script>

<div class="parent-bounty-funding-panel">
	<div class="parent-bounty-funding-panel__grid">
		<section class="parent-bounty-board" aria-label="Bounty board">
			<header class="parent-bounty-module-head">
				<div class="parent-bounty-module-head__row">
					<span class="parent-bounty-module-head__prefix">//</span>
					<span class="parent-bounty-module-head__title">Bounty board</span>
					<span class="parent-bounty-module-head__meta">{displayBounties.length} active</span>
				</div>
			</header>

			<div class="parent-bounty-board__list">
				{#if displayBounties.length === 0}
					<div class="parent-bounty-empty">
						<span class="parent-bounty-empty__label">No active bounties — deploy one</span>
					</div>
				{:else}
					{#each displayBounties as bounty (bounty.id)}
						{@const progress = engine.bountyProgress(bounty)}
						{@const isActive = bounty.status === 'active'}
						<article class="parent-bounty-z2-panel parent-bounty-row">
							<div class="parent-bounty-row__top">
								<div class="parent-bounty-row__body">
									<span class="parent-bounty-row__title">{bounty.title}</span>
									<span class="parent-bounty-row__target">→ {bounty.playerEmail}</span>
								</div>
								<div class="parent-bounty-row__badges">
									<span class="parent-bounty-chip parent-bounty-chip--type">
										{criterionLabel(bounty.criterion.type)}
									</span>
									<span class={statusChipClass(bounty.status)}>{bounty.status}</span>
								</div>
							</div>

							{#if bounty.progressTarget && bounty.progressTarget > 0}
								<div class="parent-bounty-field-group">
									<div class="parent-bounty-progress">
										<div
											class="parent-bounty-progress__fill"
											style="width: {progress}%"
										></div>
									</div>
									<div class="parent-bounty-progress__meta">
										<span>
											{bounty.progressCurrent ?? 0} / {bounty.progressTarget}
											{bounty.progressUnit ?? ''}
										</span>
										<span>{progress}%</span>
									</div>
								</div>
							{/if}

							<div class="parent-bounty-row__foot">
								<span class="parent-bounty-reward">
									${((bounty.rewardCents ?? 0) / 100).toFixed(2)}
								</span>
								<span class="parent-bounty-reward__unit">USD</span>
								<span class="parent-bounty-expiry">Exp: {formatExpiry(bounty.expiresAt)}</span>
								{#if isActive}
									<button
										type="button"
										class="parent-bounty-btn-void"
										onclick={() => engine.voidBounty(bounty.id!)}
										disabled={engine.mutating}
									>
										Void
									</button>
								{/if}
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</section>

		<section class="parent-bounty-side-stack" aria-label="Boost console">
			<header class="parent-bounty-module-head">
				<div class="parent-bounty-module-head__row">
					<span class="parent-bounty-module-head__prefix">//</span>
					<span class="parent-bounty-module-head__title">Boost console</span>
				</div>
			</header>

			<div class="parent-bounty-side-list">
				{#if engine.householdChildren.length === 0}
					<p class="parent-bounty-empty__label">No children linked</p>
				{:else}
					{#each engine.householdChildren as child (child.email)}
						<article class="parent-bounty-z2-panel parent-bounty-child-row">
							<div class="parent-bounty-child-row__head">
								<div>
									<div class="parent-bounty-child-row__name">{child.displayName}</div>
									<div class="parent-bounty-child-row__email">{child.email}</div>
								</div>
								<div>
									<div class="parent-bounty-child-row__stat">
										{child.totalXP.toLocaleString()} XP
									</div>
									<div class="parent-bounty-child-row__stat">{child.currentStreak}d streak</div>
								</div>
							</div>

							{#if child.boostAppliedToday}
								<div class="parent-bounty-boost-active">Boost active today</div>
							{/if}

							<div class="parent-bounty-boost-grid">
								{#each BOOST_PRESETS as preset (preset.id)}
									<button
										type="button"
										class="parent-bounty-btn-audit parent-bounty-btn-audit--sm"
										onclick={() => engine.activateBoost(child.email, preset.id)}
										disabled={engine.mutating}
									>
										{preset.label}
									</button>
								{/each}
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</section>

		<section id="parent-funding-source" class="tw-flex tw-flex-col" aria-label="Funding source">
			<header class="parent-bounty-module-head">
				<div class="parent-bounty-module-head__row">
					<span class="parent-bounty-module-head__prefix">//</span>
					<span class="parent-bounty-module-head__title">Funding source</span>
				</div>
			</header>

			<div class="parent-bounty-funding-body">
				{#if engine.hasFundingSource}
					<div class="parent-bounty-funding-linked">
						<span class="parent-bounty-funding-linked__status">Linked</span>
						{#if engine.fundingSource?.label}
							<span class="parent-bounty-funding-linked__label">
								{engine.fundingSource.label}
							</span>
						{/if}
						{#if engine.fundingSource?.method}
							<span class="parent-bounty-funding-linked__method">
								Method: {engine.fundingSource.method}
							</span>
						{/if}
					</div>
				{:else if availableSources.length === 0 && !loadingSources}
					<div class="parent-bounty-empty">
						<span class="parent-bounty-empty__label">No funding source linked</span>
						<button
							type="button"
							class="parent-bounty-btn-audit"
							onclick={fetchSources}
							disabled={loadingSources}
						>
							Link funding source
						</button>
					</div>
				{:else if loadingSources}
					<p class="parent-bounty-empty__label">Fetching sources…</p>
				{:else}
					<div class="parent-bounty-field-group">
						<label for="source-select" class="parent-bounty-field-label">
							Select funding source
						</label>
						<select id="source-select" bind:value={selectedSourceId} class="parent-bounty-field">
							<option value="" disabled>— Select —</option>
							{#each availableSources as src (src.id)}
								<option value={src.id}>{src.label} ({src.method})</option>
							{/each}
						</select>
						{#if linkError}
							<p class="parent-bounty-alert parent-bounty-alert--error" role="alert">
								{linkError}
							</p>
						{/if}
						<button
							type="button"
							class="parent-bounty-btn-deploy parent-bounty-btn-deploy--block"
							onclick={handleLinkSource}
							disabled={!selectedSourceId || linkingSource || engine.mutating}
						>
							{#if linkingSource}
								Linking…
							{:else}
								Confirm link
							{/if}
						</button>
					</div>
				{/if}
			</div>
		</section>
	</div>
</div>
