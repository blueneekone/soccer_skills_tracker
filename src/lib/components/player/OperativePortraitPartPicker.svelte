<script lang="ts">
	import {
		PORTRAIT_PART_SLOTS,
		OPERATIVE_PORTRAIT_V2_VERSION,
		BODY_SCALE_CHIP_LABELS,
		defaultPortraitV2,
		defaultOwnedPortraitParts,
		getPortraitPartsForSlot,
		normalizePortraitParts,
		parseOperativePortrait,
		resolveBodyScaleFromAgeBand,
		type BodyScale,
		type PortraitPartSlot,
		type PortraitPartCatalogEntry,
	} from '$lib/avatars/portraitV2Schema.js';
	import {
		getPortraitPartCatalog,
		renderPortraitPartLayer,
	} from '$lib/avatars/renderLayeredPortrait.js';
	import {
		DEFAULT_PORTRAIT_FILTERS,
		PORTRAIT_PRESENTATIONS,
		PORTRAIT_TONES,
		PRESENTATION_CHIP_LABELS,
		TONE_CHIP_LABELS,
		matchesPortraitCatalogFilters,
		type PortraitFilterState,
		type PortraitPresentation,
		type PortraitTone,
	} from '$lib/avatars/portraitRepresentation.js';

	const THUMB_SIZE = 72;

	const SLOT_LABELS: Record<PortraitPartSlot, string> = {
		face: 'Face',
		hair: 'Hair',
		kit: 'Kit',
	};

	let {
		operativeAvatar = $bindable(undefined),
		selectedSlot = $bindable<PortraitPartSlot>('face'),
		ownedPortraitParts = defaultOwnedPortraitParts(),
		bodyScale = undefined,
		disabled = false,
		hideTabRail = false,
	}: {
		operativeAvatar?: unknown;
		selectedSlot?: PortraitPartSlot;
		ownedPortraitParts?: string[];
		bodyScale?: BodyScale;
		disabled?: boolean;
		hideTabRail?: boolean;
	} = $props();
	let legacyUpgraded = $state(false);
	let portraitFilters = $state<PortraitFilterState>({ ...DEFAULT_PORTRAIT_FILTERS });

	const catalog = getPortraitPartCatalog() as PortraitPartCatalogEntry[];
	const ownedSet = $derived(new Set(ownedPortraitParts));

	const showToneFilters = $derived(selectedSlot === 'face');
	const showPresentationFilters = $derived(selectedSlot === 'face' || selectedSlot === 'hair');

	$effect(() => {
		const parsed = parseOperativePortrait(operativeAvatar);
		if (parsed?.v === 1) {
			operativeAvatar = defaultPortraitV2(bodyScale);
			legacyUpgraded = true;
		}
	});

	const portraitV2 = $derived.by(() => {
		const parsed = parseOperativePortrait(operativeAvatar);
		if (parsed?.v === OPERATIVE_PORTRAIT_V2_VERSION) return parsed;
		return defaultPortraitV2(bodyScale);
	});

	const effectiveBodyScale = $derived(
		portraitV2.bodyScale ?? bodyScale ?? resolveBodyScaleFromAgeBand(undefined),
	);

	const equippedPartId = $derived(portraitV2.parts[selectedSlot] ?? null);

	const catalogForSlot = $derived(getPortraitPartsForSlot(selectedSlot, catalog, effectiveBodyScale));
	const filteredCatalog = $derived(
		catalogForSlot.filter((entry) =>
			matchesPortraitCatalogFilters(entry, portraitFilters, selectedSlot),
		),
	);
	const ownedForSlot = $derived(filteredCatalog.filter((entry) => ownedSet.has(entry.id)));
	const lockedForSlot = $derived(filteredCatalog.filter((entry) => !ownedSet.has(entry.id)));

	function setToneFilter(tone: PortraitTone | 'all') {
		portraitFilters = { ...portraitFilters, tone };
	}

	function setPresentationFilter(presentation: PortraitPresentation | 'all') {
		portraitFilters = { ...portraitFilters, presentation };
	}

	function thumbSvg(partId: string): string {
		const layer = renderPortraitPartLayer(partId, THUMB_SIZE);
		if (!layer) return '';
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${THUMB_SIZE} ${THUMB_SIZE}" width="${THUMB_SIZE}" height="${THUMB_SIZE}" class="opp-thumb-svg" aria-hidden="true">${layer}</svg>`;
	}

	function selectPart(partId: string) {
		if (disabled || !ownedSet.has(partId)) return;
		const parsed = parseOperativePortrait(operativeAvatar);
		const base = parsed?.v === OPERATIVE_PORTRAIT_V2_VERSION ? parsed : defaultPortraitV2(effectiveBodyScale);
		const parts = normalizePortraitParts(
			{ ...base.parts, [selectedSlot]: partId },
			catalog,
			ownedPortraitParts,
			effectiveBodyScale,
		);
		operativeAvatar = {
			v: OPERATIVE_PORTRAIT_V2_VERSION,
			parts,
			...(effectiveBodyScale ? { bodyScale: effectiveBodyScale } : {}),
		};
	}
</script>

<div class="opp-root" aria-label="Operative portrait part picker">
	{#if legacyUpgraded}
		<p class="opp-legacy-banner qa-mono">
			Legacy portrait upgraded to layered v2 — catalog part picker replaces seed editor in Studio.
		</p>
	{/if}

	{#if !hideTabRail}
		<div class="opp-slot-tabs" role="tablist" aria-label="Portrait part slots">
			{#each PORTRAIT_PART_SLOTS as slot (slot)}
				<button
					type="button"
					class="opp-slot-tab"
					class:opp-slot-tab--active={selectedSlot === slot}
					role="tab"
					aria-selected={selectedSlot === slot}
					{disabled}
					onclick={() => (selectedSlot = slot)}
				>
					{SLOT_LABELS[slot]}
				</button>
			{/each}
		</div>
	{/if}

	<p class="opp-equipped qa-mono">
		Equipped ·
		<span class="opp-equipped__value">
			{catalogForSlot.find((row) => row.id === equippedPartId)?.label ?? 'Default'}
		</span>
	</p>

	{#if showToneFilters}
		<div class="opp-filter-row" role="group" aria-label="Skin tone filter">
			<span class="opp-filter-label qa-mono">Tone</span>
			<div class="opp-filter-chips">
				<button
					type="button"
					class="opp-filter-chip"
					class:opp-filter-chip--active={portraitFilters.tone === 'all'}
					{disabled}
					onclick={() => setToneFilter('all')}
				>
					All
				</button>
				{#each PORTRAIT_TONES as tone (tone)}
					<button
						type="button"
						class="opp-filter-chip"
						class:opp-filter-chip--active={portraitFilters.tone === tone}
						{disabled}
						onclick={() => setToneFilter(tone)}
					>
						{TONE_CHIP_LABELS[tone]}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if showPresentationFilters}
		<div class="opp-filter-row" role="group" aria-label="Style presentation filter">
			<span class="opp-filter-label qa-mono">Style</span>
			<div class="opp-filter-chips">
				<button
					type="button"
					class="opp-filter-chip"
					class:opp-filter-chip--active={portraitFilters.presentation === 'all'}
					{disabled}
					onclick={() => setPresentationFilter('all')}
				>
					All
				</button>
				{#each PORTRAIT_PRESENTATIONS as presentation (presentation)}
					<button
						type="button"
						class="opp-filter-chip"
						class:opp-filter-chip--active={portraitFilters.presentation === presentation}
						{disabled}
						onclick={() => setPresentationFilter(presentation)}
					>
						{PRESENTATION_CHIP_LABELS[presentation]}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div class="opp-grid" role="tabpanel" aria-label="{SLOT_LABELS[selectedSlot]} parts">
		{#each ownedForSlot as entry (entry.id)}
			<button
				type="button"
				class="opp-cell"
				class:opp-cell--equipped={equippedPartId === entry.id}
				{disabled}
				aria-pressed={equippedPartId === entry.id}
				aria-label="{entry.label}{equippedPartId === entry.id ? ' — equipped' : ''}"
				onclick={() => selectPart(entry.id)}
			>
				<span class="opp-cell__thumb" aria-hidden="true">
					{@html thumbSvg(entry.id)}
				</span>
				<span class="opp-cell__label">{entry.label}</span>
				<span class="opp-cell__status qa-mono">
					{equippedPartId === entry.id ? 'Equipped' : 'Owned'}
				</span>
			</button>
		{/each}
		{#each lockedForSlot as entry (entry.id)}
			<article class="opp-cell opp-cell--locked" aria-label="{entry.label} — locked">
				<span class="opp-cell__thumb opp-cell__thumb--locked" aria-hidden="true">
					{@html thumbSvg(entry.id)}
				</span>
				<span class="opp-cell__label">{entry.label}</span>
				<span class="opp-cell__status qa-mono">Locked · earn via training milestones</span>
			</article>
		{/each}
	</div>

	<p class="opp-hint qa-mono">
		Only catalog part ids saved — no photo upload, no 3D meshes.
	</p>
</div>

<style>
	.opp-root {
		min-width: 0;
	}
	.opp-legacy-banner {
		margin: 0 0 0.85rem;
		padding: 0.55rem 0.75rem;
		font-size: 0.58rem;
		line-height: 1.45;
		letter-spacing: 0.08em;
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 85%, #fff);
		border: 1px dashed color-mix(in srgb, var(--pd-accent-data, #14b8a6) 35%, var(--pd-line));
		background: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 6%, transparent);
	}
	.opp-slot-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.85rem;
	}
	.opp-slot-tab {
		flex: 1 1 auto;
		min-width: 4.5rem;
		padding: 0.55rem 0.75rem;
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		cursor: pointer;
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
		border-radius: 0.2rem;
		color: rgba(255, 255, 255, 0.45);
		background: transparent;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.opp-slot-tab:hover:not(:disabled) {
		color: rgba(236, 254, 255, 0.85);
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 35%, var(--pd-line));
	}
	.opp-slot-tab--active {
		color: #ecfeff;
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 55%, var(--pd-line));
		background: linear-gradient(
			165deg,
			color-mix(in srgb, var(--pd-accent-data, #14b8a6) 12%, transparent) 0%,
			rgba(0, 0, 0, 0.35) 100%
		);
	}
	.opp-slot-tab:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.opp-equipped {
		margin: 0 0 0.75rem;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
	}
	.opp-equipped__value {
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 85%, #fff);
	}
	.opp-filter-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem 0.65rem;
		margin-bottom: 0.65rem;
	}
	.opp-filter-label {
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.45));
		min-width: 2.75rem;
	}
	.opp-filter-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.opp-filter-chip {
		padding: 0.35rem 0.55rem;
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		cursor: pointer;
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.12));
		border-radius: 999px;
		color: rgba(255, 255, 255, 0.55);
		background: rgba(0, 0, 0, 0.25);
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.opp-filter-chip:hover:not(:disabled) {
		color: rgba(236, 254, 255, 0.9);
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 35%, var(--pd-line));
	}
	.opp-filter-chip--active {
		color: #ecfeff;
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 55%, var(--pd-line));
		background: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 14%, transparent);
	}
	.opp-filter-chip:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.opp-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
		gap: 0.55rem;
		margin-bottom: 0.85rem;
	}
	.opp-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		padding: 0.55rem 0.45rem 0.6rem;
		min-width: 0;
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
		background: rgba(0, 0, 0, 0.35);
		cursor: pointer;
		text-align: center;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}
	button.opp-cell {
		appearance: none;
		font: inherit;
		color: inherit;
	}
	.opp-cell--equipped {
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 55%, var(--pd-line));
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 18%, transparent),
			0 0 14px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 12%, transparent);
	}
	.opp-cell--locked {
		opacity: 0.55;
		border-style: dashed;
		cursor: default;
	}
	.opp-cell__thumb {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 4.5rem;
		height: 4.5rem;
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.08));
		background: rgba(0, 0, 0, 0.45);
		overflow: hidden;
	}
	.opp-cell__thumb--locked {
		filter: grayscale(0.65);
	}
	.opp-cell__thumb :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.opp-cell__label {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.03em;
		line-height: 1.25;
	}
	.opp-cell__status {
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
	}
	.opp-cell--equipped .opp-cell__status {
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 80%, #fff);
	}
	.opp-hint {
		margin: 0;
		font-size: 0.58rem;
		line-height: 1.5;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
	}
</style>
