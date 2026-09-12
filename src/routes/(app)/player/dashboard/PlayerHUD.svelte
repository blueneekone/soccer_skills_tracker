<script lang="ts">
	import type { PlayerDashboardEngine } from './PlayerDashboardEngine.svelte.js';
	import HqWorldContextStrip from '$lib/components/player/dashboard/HqWorldContextStrip.svelte';

	let { engine }: { engine: PlayerDashboardEngine } = $props();
</script>

<header class="pd-strap pd-strap--premium bento-span-12" aria-label="Operative headquarters">
	<div class="pd-strap__grid">
		<div class="pd-strap__id">
			<p class="pd-eyebrow">Command / HQ</p>
			<h1 class="pd-strap__title">{engine.callsign || 'Operative HQ'}</h1>
		</div>
		<div class="pd-strap__status" role="status">
			<p class="pd-label pd-mono">
				{engine.rankProgress.rank} · LVL {String(engine.osLevel).padStart(2, '0')}
			</p>
		</div>
	</div>
	<div class="pd-strap__context">
		<HqWorldContextStrip
			inline
			nextEventLabel={engine.nextEventLabel}
			badges={engine.hqStatusBadges}
		/>
	</div>
</header>

<div class="pd-hq-glance-band bento-span-12" aria-label="Operative glance stats">
	<div class="pd-hq-glance-band__cell">
		<span class="pd-hq-glance-band__label">LVL</span>
		<span class="pd-hq-glance-band__value">{String(engine.osLevel).padStart(2, '0')}</span>
	</div>
	<div class="pd-hq-glance-band__cell">
		<span class="pd-hq-glance-band__label">Rank</span>
		<span class="pd-hq-glance-band__value">{engine.rankProgress.rank}</span>
	</div>
	<div class="pd-hq-glance-band__cell">
		<span class="pd-hq-glance-band__label">Streak</span>
		<span class="pd-hq-glance-band__value">{engine.streak}d</span>
	</div>
	<div class="pd-hq-glance-band__cell">
		<span class="pd-hq-glance-band__label">Bounties</span>
		<span class="pd-hq-glance-band__value">{engine.coachBountyCount}</span>
	</div>
</div>
