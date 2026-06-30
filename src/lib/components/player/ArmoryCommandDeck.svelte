<script lang="ts">
	import { resolveAppPath } from '$lib/components/_shared/resolveAppPath.js';
	import OperativeLoadoutPreview from '$lib/components/player/OperativeLoadoutPreview.svelte';

	type QuartermasterItem = {
		id: string;
		title: string;
		cost: number;
	};

	let {
		operativeAvatar = undefined,
		operativeLoadout = undefined,
		ownedCosmetics = [],
		operativeLevel = 1,
		tacticalCredits = 0,
		rankLabel = '',
		albumOwnedCount = 0,
		albumCap = 200,
		lineItems = /** @type {readonly QuartermasterItem[]} */ ([]),
	} = $props();

	const affordableItem = $derived(
		lineItems.find((item) => item.cost <= tacticalCredits) ?? null,
	);

	const albumProgressPct = $derived(
		albumCap > 0 ? Math.min(100, (albumOwnedCount / albumCap) * 100) : 0,
	);

	const studioHref = `${resolveAppPath('/player/armory')}?tab=studio`;
	const albumHref = `${resolveAppPath('/player/armory')}?tab=album`;
	const quartermasterHref = `${resolveAppPath('/player/armory')}?tab=quartermaster`;
	const hqHref = resolveAppPath('/player/dashboard');
	const trainHref = resolveAppPath('/player/workout');

	const loadoutSub = $derived(
		rankLabel ?
			`${rankLabel} · LVL ${String(operativeLevel).padStart(2, '0')}`
		:	`LVL ${String(operativeLevel).padStart(2, '0')}`,
	);
</script>

<section
	class="armory-deck bento-span-12 pd-page-panel"
	aria-label="Armory command deck"
	data-region="armory-command-deck"
>
	<div class="armory-deck__grid bento-grid bento-grid--12col bento-grid--liquid">
		<article class="armory-deck__cell tw-col-span-12 xl:tw-col-span-4 tw-min-w-0">
			<div class="armory-deck__cell-body">
				<OperativeLoadoutPreview
					{operativeAvatar}
					{operativeLoadout}
					{ownedCosmetics}
					size={88}
					class="armory-deck__portrait"
				/>
				<div class="armory-deck__copy">
					<p class="armory-deck__eyebrow">Loadout</p>
					<h2 class="armory-deck__title">Operative studio</h2>
					<p class="armory-deck__sub">{loadoutSub}</p>
				</div>
			</div>
			<a href={studioHref} class="armory-deck__link">Open studio</a>
		</article>

		<article class="armory-deck__cell tw-col-span-12 xl:tw-col-span-4 tw-min-w-0">
			<div class="armory-deck__copy">
				<p class="armory-deck__eyebrow">Sticker album</p>
				<h2 class="armory-deck__title">
					<span class="armory-deck__mono">{albumOwnedCount}</span>
					<span class="armory-deck__title-sep">/</span>
					<span class="armory-deck__mono armory-deck__mono--muted">{albumCap}</span>
					<span class="armory-deck__title-suffix"> collected</span>
				</h2>
				<div class="armory-deck__progress album-progress-track" aria-hidden="true">
					<div class="album-progress-fill" style={`width: ${albumProgressPct}%`}></div>
				</div>
				<p class="armory-deck__sub">
					{Math.round(albumProgressPct)}% vault sync
				</p>
			</div>
			<a href={albumHref} class="armory-deck__link">View album</a>
		</article>

		<article class="armory-deck__cell tw-col-span-12 xl:tw-col-span-4 tw-min-w-0">
			{#if affordableItem}
				<div class="armory-deck__copy">
					<p class="armory-deck__eyebrow">Next action</p>
					<h2 class="armory-deck__title">{affordableItem.title}</h2>
					<p class="armory-deck__sub">
						<span class="armory-deck__mono">{affordableItem.cost.toLocaleString()} TC</span>
						· affordable now
					</p>
				</div>
				<a href={quartermasterHref} class="armory-deck__link">Affordable now</a>
			{:else}
				<div class="armory-deck__copy">
					<p class="armory-deck__eyebrow">Earn credits</p>
					<h2 class="armory-deck__title">Insufficient TC</h2>
					<p class="armory-deck__sub armory-deck__sub--links">
						Earn credits via
						<a href={hqHref} class="armory-deck__inline-link">HQ missions</a>
						or
						<a href={trainHref} class="armory-deck__inline-link">training sessions</a>.
					</p>
				</div>
				<a href={quartermasterHref} class="armory-deck__link">Browse store</a>
			{/if}
		</article>
	</div>
</section>
