<script lang="ts">
	import { page } from '$app/state';
	import MessagesTab from '$lib/components/coach/MessagesTab.svelte';
	import { defaultTeamLogisticsSubchannels } from '$lib/comms/channelTypes.js';

	let {
		teamId = '',
		clubId = '',
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
	<header class="comms-logistics__banner">
		<h2 id="comms-logistics-heading" class="comms-logistics__title">Team logistics</h2>
		<p class="comms-logistics__note">
			Monitored channel — minors use HQ and calendar for schedule context. Staff compose here;
			parents read only.
		</p>
	</header>

	<nav class="comms-logistics__subs" aria-label="Logistics sub-channels">
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

	{#if teamId}
		<MessagesTab {teamId} {clubId} initialChannel={validSub} />
	{:else}
		<p class="comms-logistics__hint">Select a team to view logistics threads.</p>
	{/if}
</section>

<style>
	.comms-logistics {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	.comms-logistics__banner {
		padding: 12px 14px;
		border: 1px solid #334155;
		background: rgba(15, 23, 42, 0.45);
	}

	.comms-logistics__title {
		margin: 0 0 4px;
		font-size: 14px;
		font-weight: 800;
		color: #e2e8f0;
	}

	.comms-logistics__note {
		margin: 0;
		font-size: 12px;
		line-height: 1.45;
		color: #94a3b8;
	}

	.comms-logistics__subs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.comms-logistics__sub {
		padding: 8px 12px;
		border: 1px solid #334155;
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		color: #94a3b8;
		background: rgba(15, 23, 42, 0.35);
	}

	.comms-logistics__sub--active {
		border-color: #14b8a6;
		color: #e2e8f0;
		background: rgba(20, 184, 166, 0.12);
	}

	.comms-logistics__hint {
		margin: 0;
		font-size: 13px;
		color: #94a3b8;
	}
</style>
