<script lang="ts">
	import {
		RARITY_CHIP_LABELS,
		type OperativeCardMetadata,
	} from '$lib/gamification/cardCollectibleMetadata.js';

	const ARC_FLOURISH_MAX_CHARS = 12;
	const LONG_NAME_THRESHOLD = 16;

	const PORTRAIT_CX = 100;
	const PORTRAIT_CY = 100;
	/** 96px min portrait diameter mapped into 200×200 arc viewBox */
	const PORTRAIT_LOGICAL_RADIUS = 48;
	/** Premium flourish only (3.5k) — upper ring outside portrait; default off */
	const NAME_ARC_RADIUS = PORTRAIT_LOGICAL_RADIUS + 12;
	const NAME_ARC_START_DEG = 225;
	const NAME_ARC_END_DEG = 315;

	let {
		displayName = 'Operative',
		clubName = undefined,
		rankName = undefined,
		operativeLevel = undefined,
		portraitSvg = '',
		borderSvg = '',
		bannerSvg = '',
		frameClass = '',
		size = 96,
		variant = 'card',
		roleLabel = 'OPERATIVE',
		showArcFlourish = false,
		cardMetadata = undefined,
	}: {
		displayName?: string;
		clubName?: string;
		rankName?: string;
		operativeLevel?: number;
		portraitSvg?: string;
		borderSvg?: string;
		bannerSvg?: string;
		frameClass?: string;
		size?: number;
		variant?: 'card' | 'holo';
		roleLabel?: string;
		showArcFlourish?: boolean;
		cardMetadata?: OperativeCardMetadata;
	} = $props();

	const uid = $props.id();
	const nameArcId = `oicf-name-arc-${uid}`;

	const callsign = $derived((displayName || 'Operative').trim().toUpperCase());

	const showLevelChip = $derived(
		operativeLevel != null && Number.isFinite(Number(operativeLevel)),
	);
	const levelChipLabel = $derived.by(() => {
		if (!showLevelChip) return '';
		return `LVL ${String(Math.floor(Number(operativeLevel))).padStart(2, '0')}`;
	});

	const typeLine = $derived.by(() => {
		const role = (roleLabel || 'OPERATIVE').trim().toUpperCase();
		const club = clubName?.trim();
		return club ? `${club} · ${role}` : role;
	});

	const rankLine = $derived(
		typeof rankName === 'string' && rankName.trim() ? rankName.trim().toUpperCase() : '',
	);

	const arcFlourishText = $derived.by(() => {
		const name = (displayName || 'Operative').trim();
		const token = (name.split(/\s+/)[0] || name).toUpperCase();
		if (token.length <= ARC_FLOURISH_MAX_CHARS) return token;
		return `${token.slice(0, ARC_FLOURISH_MAX_CHARS - 1)}…`;
	});

	const isLongArcName = $derived(arcFlourishText.length > LONG_NAME_THRESHOLD);

	function arcPoint(cx: number, cy: number, r: number, deg: number) {
		const rad = (deg * Math.PI) / 180;
		return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
	}

	const nameArcPath = $derived.by(() => {
		const start = arcPoint(PORTRAIT_CX, PORTRAIT_CY, NAME_ARC_RADIUS, NAME_ARC_START_DEG);
		const end = arcPoint(PORTRAIT_CX, PORTRAIT_CY, NAME_ARC_RADIUS, NAME_ARC_END_DEG);
		return `M ${start.x} ${start.y} A ${NAME_ARC_RADIUS} ${NAME_ARC_RADIUS} 0 1 0 ${end.x} ${end.y}`;
	});

	const nameArcSweepDeg = $derived(Math.abs(NAME_ARC_END_DEG - NAME_ARC_START_DEG));
	const nameArcLength = $derived((NAME_ARC_RADIUS * nameArcSweepDeg * Math.PI) / 180);

	const arcFlourishActive = $derived(
		cardMetadata?.rarity === 'illustration_rare' ? true : showArcFlourish,
	);

	const rarityChipLabel = $derived(
		cardMetadata ? RARITY_CHIP_LABELS[cardMetadata.rarity] : '',
	);

	const cardLabel = $derived(
		[callsign, typeLine, rankLine, showLevelChip ? levelChipLabel : ''].filter(Boolean).join(' · ') ||
			'Operative ID card',
	);
</script>

<div
	class="oicf-root tw-flex tw-min-w-0 tw-max-w-full tw-flex-col {frameClass}"
	class:oicf-root--holo={variant === 'holo'}
	role="img"
	aria-label={cardLabel}
>
	<div class="oicf-title-bar">
		<span class="oicf-callsign" title={callsign}>{callsign}</span>
		{#if showLevelChip}
			<span class="oicf-level-chip qa-mono" aria-hidden="true">{levelChipLabel}</span>
		{/if}
	</div>

	<p class="oicf-type-line qa-mono">{typeLine}</p>

	<div class="oicf-art-well" aria-hidden="true">
		{#if bannerSvg}
			<div class="oicf-banner">
				{@html bannerSvg}
			</div>
		{/if}
		<div class="oicf-portrait-stage">
			<div
				class="oicf-portrait-ring"
				class:oicf-portrait-ring--holo={variant === 'holo'}
				style={variant === 'holo'
					? 'max-width: 100%;'
					: `width: ${size}px; height: ${size}px; max-width: 100%;`}
			>
				<div class="oicf-portrait">
					{@html portraitSvg}
				</div>
				{#if borderSvg}
					<div class="oicf-loadout-border" aria-hidden="true">
						{@html borderSvg}
					</div>
				{/if}
			</div>
			{#if arcFlourishActive}
				<svg
					class="oicf-name-arc"
					viewBox="0 0 200 200"
					preserveAspectRatio="xMidYMid meet"
					aria-hidden="true"
				>
					<defs>
						<path id={nameArcId} d={nameArcPath} fill="none" />
					</defs>
					<text
						class="oicf-name-arc__text"
						class:oicf-name-arc__text--long={isLongArcName}
						text-anchor="middle"
						dominant-baseline="central"
					>
						<textPath
							href="#{nameArcId}"
							startOffset="50%"
							lengthAdjust="spacing"
							textLength={nameArcLength * 0.85}
						>
							{arcFlourishText}
						</textPath>
					</text>
				</svg>
			{/if}
		</div>
	</div>

	{#if rankLine}
		<p class="oicf-rank-strip">{rankLine}</p>
	{/if}

	{#if cardMetadata}
		<div class="oicf-collectible-footer">
			<span class="oicf-set-line qa-mono">{cardMetadata.setId} · {cardMetadata.collectorNumber}</span>
			{#if rarityChipLabel}
				<span class="oicf-rarity-chip qa-mono" data-rarity={cardMetadata.rarity}>{rarityChipLabel}</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.oicf-root {
		width: fit-content;
		max-width: 100%;
		min-height: 12rem;
		gap: 0.25rem;
	}

	.oicf-root--holo {
		width: 100%;
		max-width: min(168px, 100%);
		min-height: 10rem;
	}

	.oicf-title-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		min-width: 0;
	}

	.oicf-callsign {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--pd-text, #f8fafc);
	}

	.oicf-level-chip {
		flex-shrink: 0;
		background: var(--pd-bg, #05050a);
		border: 1px solid var(--pd-accent-action, #fbbf24);
		color: var(--pd-accent-action, #fbbf24);
		font-size: 8px;
		padding: 2px 5px;
		border-radius: 2px;
		font-weight: 700;
		letter-spacing: 0.06em;
		line-height: 1.2;
		text-transform: uppercase;
		box-shadow: 0 0 6px color-mix(in srgb, var(--pd-accent-action, #fbbf24) 25%, transparent);
	}

	.oicf-type-line {
		margin: 0;
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-variant: all-small-caps;
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 55%, transparent);
	}

	.oicf-art-well {
		position: relative;
		display: flex;
		flex: 1 1 auto;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: clamp(7rem, 55%, 65%);
		margin: 0.15rem 0;
	}

	.oicf-banner {
		position: absolute;
		inset: 0 0 auto 0;
		z-index: 0;
		max-height: 10%;
		overflow: hidden;
		pointer-events: none;
		opacity: 0.35;
		mix-blend-mode: soft-light;
	}

	.oicf-portrait-stage {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: 6rem;
	}

	.oicf-portrait-ring {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		overflow: visible;
	}

	.oicf-portrait-ring--holo {
		width: min(112px, 100%);
		height: min(112px, 100%);
		min-width: 96px;
		min-height: 96px;
	}

	.oicf-portrait {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		overflow: visible;
		border-radius: 9999px;
		border: 2px solid var(--pd-accent-data, #14b8a6);
		background: #1e293b;
	}

	/* Bust circle on kit+face; hair crown bleed per 3.5g-g SIR safe zone */
	.oicf-portrait :global([data-portrait-layer='kit']),
	.oicf-portrait :global([data-portrait-layer='face']) {
		clip-path: circle(46% at 50% 44%);
	}

	.oicf-portrait :global([data-portrait-layer='hair']) {
		clip-path: none;
	}

	.oicf-loadout-border {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.oicf-name-arc {
		position: absolute;
		inset: 0;
		z-index: 2;
		width: 100%;
		height: 100%;
		max-width: min(168px, 100%);
		margin: auto;
		pointer-events: none;
	}

	.oicf-name-arc__text {
		fill: none;
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		paint-order: stroke;
		stroke: rgba(248, 250, 252, 0.82);
		stroke-width: 2px;
	}

	.oicf-name-arc__text--long {
		font-size: 7px;
		letter-spacing: 0.05em;
	}

	.oicf-rank-strip {
		margin: 0.35rem 0 0;
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 85%, transparent);
	}

	.oicf-collectible-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.45rem;
		width: 100%;
		margin-top: 0.35rem;
		min-width: 0;
	}

	.oicf-set-line {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 7px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(148, 163, 184, 0.82);
	}

	.oicf-rarity-chip {
		flex-shrink: 0;
		padding: 2px 5px;
		font-size: 7px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		border-radius: 2px;
		border: 1px solid rgba(148, 163, 184, 0.35);
		color: rgba(226, 232, 240, 0.88);
		background: rgba(15, 23, 42, 0.55);
	}

	.oicf-rarity-chip[data-rarity='rare'] {
		border-color: color-mix(in srgb, #60a5fa 45%, transparent);
		color: #bfdbfe;
	}

	.oicf-rarity-chip[data-rarity='epic'] {
		border-color: color-mix(in srgb, #a78bfa 45%, transparent);
		color: #ddd6fe;
	}

	.oicf-rarity-chip[data-rarity='legendary'],
	.oicf-rarity-chip[data-rarity='illustration_rare'] {
		border-color: color-mix(in srgb, var(--pd-accent-action, #fbbf24) 55%, transparent);
		color: color-mix(in srgb, var(--pd-accent-action, #fbbf24) 90%, #fff);
	}

	.oicf-root--holo .oicf-callsign {
		font-size: 10px;
	}

	.oicf-root--holo .oicf-type-line {
		font-size: 8px;
	}

	.oicf-root--holo .oicf-rank-strip {
		font-size: 9px;
	}

	.oicf-root--holo .oicf-name-arc__text {
		font-size: 8px;
	}

	.oicf-root--holo .oicf-name-arc__text--long {
		font-size: 7px;
	}

	.qa-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
		font-feature-settings: 'tnum' 1;
	}

	.oicf-portrait :global(svg),
	.oicf-portrait :global(img) {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
		object-fit: cover;
		object-position: center 35%;
	}

	.oicf-loadout-border :global(svg),
	.oicf-loadout-border :global(img) {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: contain;
	}

	.oicf-banner :global(svg),
	.oicf-banner :global(img) {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
		object-position: top;
	}

	.loadout-frame--neon .oicf-portrait {
		box-shadow:
			0 0 8px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 35%, transparent),
			0 0 0 1px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 35%, transparent);
	}
</style>
