<script lang="ts">
	import { page } from '$app/state';
	import CommsLogisticsThread from '$lib/components/comms/CommsLogisticsThread.svelte';
	import { defaultTeamLogisticsSubchannels } from '$lib/comms/channelTypes.js';

	let {
		teamId = '',
	}: {
		teamId?: string;
		clubId?: string;
	} = $props();

	const subChannels = defaultTeamLogisticsSubchannels();
	const activeSub = $derived(
		page.url.searchParams.get('sub') ||
			subChannels.find((c) => c.id === page.url.searchParams.get('sub'))?.id ||
			'game-day',
	);
	const validSub = $derived(
		subChannels.some((c) => c.id === activeSub) ? activeSub : 'game-day',
	);
</script>

<section class="comms-logistics" aria-labelledby="comms-logistics-heading">
	<nav class="comms-logistics__subs" aria-label="Logistics topics">
		{#each subChannels as ch (ch.id)}
			<a
				class="comms-logistics__sub"
				class:comms-logistics__sub--active={validSub === ch.id}
				href="/messages?channel=team_logistics&teamId={encodeURIComponent(teamId)}&sub={ch.id}"
			>
				{ch.label}
			</a>
		{/each}
	</nav>

	<CommsLogisticsThread {teamId} channelId={validSub} />
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
		gap: 6px;
	}

	.comms-logistics__sub {
		padding: 8px 12px;
		border: 1px solid var(--pd-grey-trim, #334155);
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		color: #94a3b8;
		background: rgba(15, 23, 42, 0.35);
		border-radius: 999px;
	}

	.comms-logistics__sub--active {
		border-color: var(--pd-data-cyan, #14b8a6);
		color: #e2e8f0;
		background: rgba(20, 184, 166, 0.12);
	}
</style>
