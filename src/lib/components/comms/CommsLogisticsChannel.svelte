<script lang="ts">
	import { page } from '$app/state';
	import CommsLogisticsThread from '$lib/components/comms/CommsLogisticsThread.svelte';
	import { defaultTeamLogisticsSubchannels } from '$lib/comms/channelTypes.js';

	let {
		teamId = '',
		embedMode = false,
		activeSub = $bindable('game-day'),
	}: {
		teamId?: string;
		clubId?: string;
		embedMode?: boolean;
		activeSub?: string;
	} = $props();

	const subChannels = defaultTeamLogisticsSubchannels();

	const urlSub = $derived(
		page.url.searchParams.get('sub') ||
			subChannels.find((c) => c.id === page.url.searchParams.get('sub'))?.id ||
			'game-day',
	);

	const validSub = $derived(
		subChannels.some((c) => c.id === (embedMode ? activeSub : urlSub))
			? embedMode
				? activeSub
				: urlSub
			: 'game-day',
	);

	function selectSub(id: string) {
		if (embedMode) {
			activeSub = id;
		}
	}
</script>

<section class="comms-logistics" class:comms-logistics--embed={embedMode} aria-labelledby="comms-logistics-heading">
	<nav class="comms-logistics__subs" aria-label="Logistics topics">
		{#each subChannels as ch (ch.id)}
			{#if embedMode}
				<button
					type="button"
					class="comms-logistics__sub"
					class:comms-logistics__sub--active={validSub === ch.id}
					aria-current={validSub === ch.id ? 'page' : undefined}
					onclick={() => selectSub(ch.id)}
				>
					{ch.label}
				</button>
			{:else}
				<a
					class="comms-logistics__sub"
					class:comms-logistics__sub--active={validSub === ch.id}
					href="/messages?channel=team_logistics&teamId={encodeURIComponent(teamId)}&sub={ch.id}"
				>
					{ch.label}
				</a>
			{/if}
		{/each}
	</nav>

	<CommsLogisticsThread {teamId} channelId={validSub} {embedMode} />
</section>

<style>
	.comms-logistics {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	.comms-logistics__subs {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.comms-logistics__sub {
		padding: 8px 12px;
		border: 1px solid var(--pd-grey-trim, #334155);
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		color: #94a3b8;
		background: rgba(15, 23, 42, 0.35);
		cursor: pointer;
	}

	/* Team Ops embed — underline rail (no pill chrome) */
	.comms-logistics--embed .comms-logistics__subs {
		flex-wrap: nowrap;
		gap: 0;
		border-bottom: 1px solid var(--pd-grey-trim, #334155);
		overflow-x: auto;
	}

	.comms-logistics--embed .comms-logistics__sub {
		flex-shrink: 0;
		border: none;
		border-bottom: 2px solid transparent;
		border-radius: 0;
		color: #94a3b8;
		background: transparent;
		font-size: 12px;
		font-weight: 700;
	}

	.comms-logistics__sub--active {
		border-color: var(--pd-data-cyan, #14b8a6);
		color: #e2e8f0;
		background: rgba(20, 184, 166, 0.12);
	}

	.comms-logistics--embed .comms-logistics__sub--active {
		border-bottom-color: var(--pd-data-cyan, #14b8a6);
		border-color: transparent;
		color: #e2e8f0;
		background: transparent;
	}
</style>
