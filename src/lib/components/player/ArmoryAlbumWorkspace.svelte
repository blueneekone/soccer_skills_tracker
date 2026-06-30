<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import StickerVariantShell from '$lib/components/gamification/StickerVariantShell.svelte';
	import {
		SEASON_ONE_ALBUM_CAP,
		formatVariantLabel,
		getSeasonOneCardsForSet,
		seasonOneSets,
	} from '$lib/gamification/seasonOneData.js';
	import {
		ALBUM_SET_BONUS_REWARDS,
		isAlbumSetComplete,
		type AlbumSetId,
	} from '$lib/gamification/albumSetBonuses.js';

	let {
		ownedSeasonOneCardIds = /** @type {Set<string>} */ (new Set()),
		selectedAlbumSetId = $bindable(seasonOneSets[0]?.id ?? 'street_kings'),
	} = $props();

	const selectedAlbumCards = $derived(getSeasonOneCardsForSet(selectedAlbumSetId));
	const selectedAlbumSetMeta = $derived(seasonOneSets.find((s) => s.id === selectedAlbumSetId));
	const seasonOneOwnedCount = $derived(ownedSeasonOneCardIds.size);
	const selectedSetOwnedCount = $derived(
		selectedAlbumCards.filter((c) => ownedSeasonOneCardIds.has(c.id)).length,
	);
</script>

<section class="album tw-space-y-6" aria-labelledby="album-season-heading">
	<div class="album-hud pd-glass-panel tw-rounded-2xl tw-p-4 sm:tw-p-5">
		<div class="tw-flex tw-flex-wrap tw-items-end tw-justify-between bento-gap-md">
			<div>
				<p id="album-season-heading" class="qa-eyebrow tw-mb-1">Season 1 · Sticker album</p>
				<p class="tw-m-0 tw-font-black tw-text-xl tw-tracking-wide tw-text-slate-100 sm:tw-text-2xl">
					Completion:
					<span class="qa-mono tw-text-cyan-300">{seasonOneOwnedCount}</span>
					<span class="tw-text-slate-500 tw-font-bold"> / </span>
					<span class="qa-mono tw-text-slate-400">{SEASON_ONE_ALBUM_CAP}</span>
				</p>
				<p class="tw-m-0 tw-mt-2 tw-max-w-xl tw-text-sm tw-leading-relaxed tw-text-slate-400">
					Collect stickers from packs and events. Album cap grows across Season 1 drops — scaffold shows
					three founding sets.
				</p>
			</div>
			<div class="tw-min-w-[12rem] tw-flex-1 sm:tw-max-w-sm">
				<div class="album-progress-track tw-h-2 tw-overflow-hidden tw-rounded-full">
					<div
						class="album-progress-fill tw-h-full tw-rounded-full tw-transition-[width] tw-duration-500"
						style={`width: ${Math.min(100, (seasonOneOwnedCount / SEASON_ONE_ALBUM_CAP) * 100)}%`}
					></div>
				</div>
				<p class="qa-mono tw-mt-2 tw-text-right tw-text-[0.65rem] tw-text-slate-500">
					{Math.round(Math.min(100, (seasonOneOwnedCount / SEASON_ONE_ALBUM_CAP) * 100))}% vault sync
				</p>
			</div>
		</div>
	</div>

	<div>
		<p class="qa-eyebrow tw-mb-3">Sticker sets</p>
		<div class="bento-grid bento-grid--12col bento-grid--liquid">
			{#each seasonOneSets as set (set.id)}
				{@const setCards = getSeasonOneCardsForSet(set.id)}
				{@const ownedHere = setCards.filter((c) => ownedSeasonOneCardIds.has(c.id)).length}
				{@const setComplete = isAlbumSetComplete(set.id, ownedSeasonOneCardIds)}
				{@const setPerk =
					setComplete && set.id in ALBUM_SET_BONUS_REWARDS ?
						ALBUM_SET_BONUS_REWARDS[set.id as AlbumSetId]
					:	null}
				<button
					type="button"
					class="album-folder tw-col-span-12 xl:tw-col-span-4 tw-min-w-0 tw-group tw-relative tw-flex tw-flex-col tw-items-stretch tw-rounded-2xl tw-border tw-p-4 tw-text-left tw-transition tw-duration-200 focus:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-cyan-400/60 {setComplete ?
						'album-folder--complete'
					:	''} {selectedAlbumSetId ===
					set.id ?
						'tw-border-cyan-400/35 tw-ring-1 tw-ring-cyan-400/20 tw-shadow-[0_0_28px_rgba(20, 184, 166,0.12)]'
					:	'tw-border-white/5 hover:tw-border-white/15'}"
					onclick={() => (selectedAlbumSetId = set.id)}
					aria-pressed={selectedAlbumSetId === set.id}
				>
					<span class="album-folder__stack bento-mb-md tw-self-center" aria-hidden="true">
						<span class="album-folder__sheet album-folder__sheet--back"></span>
						<span class="album-folder__sheet album-folder__sheet--mid"></span>
						<span class="album-folder__sheet album-folder__sheet--front"></span>
					</span>
					<span class="tw-font-black tw-text-base tw-tracking-wide tw-text-slate-100">{set.title}</span>
					<span class="tw-mt-1 tw-text-xs tw-leading-snug tw-text-slate-400">{set.tagline}</span>
					<span class="qa-mono tw-mt-3 tw-text-[0.7rem] tw-text-cyan-300/90">
						{ownedHere}
						<span class="tw-text-slate-600">/</span>
						{setCards.length}
						<span class="tw-text-slate-500"> in set</span>
					</span>
					{#if setComplete && setPerk}
						<p class="album-folder__complete qa-mono tw-mt-2 tw-m-0 tw-text-[0.62rem] tw-font-bold tw-tracking-wider">
							SET COMPLETE · {setPerk.chipLabel} banner
						</p>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<div class="album-set-panel pd-glass-panel tw-rounded-2xl tw-p-4 sm:tw-p-5">
		<div class="tw-mb-5 tw-flex tw-flex-wrap tw-items-baseline tw-justify-between tw-gap-3">
			<div>
				<h2 class="tw-m-0 tw-text-lg tw-font-black tw-tracking-wide tw-text-white sm:tw-text-xl">
					{selectedAlbumSetMeta?.title ?? 'Set'}
				</h2>
				<p class="tw-m-0 tw-mt-1 tw-max-w-prose tw-text-sm tw-text-slate-400">
					{selectedAlbumSetMeta?.tagline ?? ''}
				</p>
				{#if isAlbumSetComplete(selectedAlbumSetId, ownedSeasonOneCardIds)}
					{@const perk = ALBUM_SET_BONUS_REWARDS[selectedAlbumSetId as AlbumSetId]}
					<p class="album-set-panel__complete qa-mono tw-m-0 tw-mt-2 tw-text-[0.65rem] tw-font-bold tw-tracking-wider">
						SET COMPLETE · {perk?.chipLabel ?? 'Folder'} dossier banner unlocked
					</p>
				{/if}
			</div>
			<p class="qa-mono tw-m-0 tw-text-xs tw-text-slate-500">
				Set progress:
				<span class="tw-text-cyan-300">{selectedSetOwnedCount}</span>
				/{selectedAlbumCards.length}
			</p>
		</div>

		<div
			class="tw-grid tw-grid-cols-2 tw-gap-3 sm:tw-grid-cols-3 md:tw-grid-cols-4 lg:tw-grid-cols-5"
			aria-label="Sticker slots for selected set"
		>
			{#each selectedAlbumCards as card (card.id)}
				{@const rarityRing =
					card.rarity === 'Legendary' ?
						'tw-ring-2 tw-ring-amber-400/50 tw-shadow-[0_0_32px_rgba(251,191,36,0.25)]'
					: card.rarity === 'Epic' ?
						'tw-ring-2 tw-ring-fuchsia-500/35 tw-shadow-[0_0_28px_rgba(217,70,239,0.22)]'
					: card.rarity === 'Rare' ?
						'tw-ring-2 tw-ring-sky-400/40 tw-shadow-[0_0_24px_rgba(56,189,248,0.2)]'
					:	'tw-ring-1 tw-ring-slate-500/30'}
				{#if ownedSeasonOneCardIds.has(card.id)}
					<StickerVariantShell
						variant={card.variant}
						class="album-slot-card tw-rounded-xl tw-overflow-hidden tw-border tw-border-white/10 {rarityRing}"
					>
						{#snippet children()}
							<article
								class="album-slot-owned tw-relative tw-flex tw-h-full tw-min-h-0 tw-flex-col tw-overflow-hidden tw-rounded-[inherit]"
							>
								<div class="tw-aspect-[280/380] tw-w-full tw-shrink-0 tw-overflow-hidden" style="background: var(--pd-panel, #05050a);">
									<img src={card.imagePath} alt="" class="tw-h-full tw-w-full tw-object-cover" draggable="false" />
								</div>
								<div class="tw-border-t tw-border-white/5 tw-bg-black/40 tw-p-2">
									<p class="tw-m-0 tw-truncate tw-text-xs tw-font-bold tw-text-slate-100">{card.name}</p>
									<p class="qa-mono tw-m-0 tw-mt-1 tw-text-[0.6rem] tw-uppercase tw-tracking-wider tw-text-cyan-300/85">
										{card.rarity}
										<span class="tw-text-slate-500"> · </span>
										<span class="tw-text-emerald-300/90">{formatVariantLabel(card.variant)}</span>
									</p>
								</div>
							</article>
						{/snippet}
					</StickerVariantShell>
				{:else}
					<div
						class="album-slot-empty tw-flex tw-aspect-[280/380] tw-min-h-[8.5rem] tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border-2 tw-border-dashed tw-border-slate-600/70 tw-bg-slate-950/80 tw-text-center tw-p-2"
						aria-label={`Locked slot · ${card.name} · ${formatVariantLabel(card.variant)}`}
					>
						<Icon name="sys.lock" class="tw-text-2xl tw-text-slate-600" />
						<p class="qa-mono tw-m-0 tw-text-[0.55rem] tw-font-bold tw-tracking-wider tw-text-slate-600">LOCKED</p>
						<p class="qa-mono tw-m-0 tw-max-w-full tw-px-1 tw-text-[0.5rem] tw-leading-tight tw-text-slate-500">
							{card.name}
							<span class="tw-text-slate-600"> · </span>
							{formatVariantLabel(card.variant)}
						</p>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</section>

<style>
	.qa-eyebrow {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(0, 212, 255, 0.55);
	}

	.qa-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
		font-feature-settings: 'tnum' 1;
	}

	.album-folder {
		min-height: 14rem;
		border-color: var(--pd-line, rgba(255, 255, 255, 0.1));
		background: var(--pd-panel, #05050a);
	}

	.album-folder--complete {
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 35%, var(--pd-line, rgba(255, 255, 255, 0.1)));
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--pd-accent-action, #fbbf24) 18%, transparent),
			0 0 20px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 10%, transparent);
	}

	.album-folder__complete {
		color: color-mix(in srgb, var(--pd-accent-action, #fbbf24) 88%, var(--pd-accent-data, #14b8a6));
	}

	.album-set-panel__complete {
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 90%, var(--pd-accent-action, #fbbf24));
	}

	.album-folder__stack {
		position: relative;
		flex-shrink: 0;
		width: min(100%, 8.5rem);
		aspect-ratio: 280 / 380;
		height: auto;
	}

	.album-folder__sheet {
		position: absolute;
		left: 50%;
		width: 81%;
		aspect-ratio: 280 / 380;
		height: auto;
		border-radius: 0.55rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		transform: translateX(-50%);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.album-folder__sheet--back {
		top: 0.35rem;
		background: linear-gradient(145deg, color-mix(in srgb, var(--pd-panel, #05050a) 95%, #fff) 0%, var(--pd-panel, #05050a) 100%);
		transform: translateX(-50%) rotate(-6deg);
		opacity: 0.65;
	}

	.album-folder__sheet--mid {
		top: 5%;
		background: linear-gradient(145deg, color-mix(in srgb, var(--pd-panel, #05050a) 88%, #fff) 0%, var(--pd-panel, #05050a) 100%);
		transform: translateX(-50%) rotate(3deg);
		opacity: 0.82;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
	}

	.album-folder__sheet--front {
		top: 0;
		background: linear-gradient(
			155deg,
			color-mix(in srgb, var(--pd-accent-data, #14b8a6) 8%, var(--pd-panel, #05050a)) 0%,
			var(--pd-panel, #05050a) 48%,
			var(--pd-bg, #000) 100%
		);
		transform: translateX(-50%) rotate(0deg);
		box-shadow:
			0 10px 28px rgba(0, 0, 0, 0.45),
			inset 0 0 0 1px var(--pd-line, rgba(255, 255, 255, 0.1));
	}

	.album-folder:hover .album-folder__sheet--front {
		box-shadow:
			0 12px 32px rgba(0, 0, 0, 0.5),
			0 0 24px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 12%, transparent),
			inset 0 0 0 1px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 22%, var(--pd-line, rgba(255, 255, 255, 0.1)));
	}
</style>
