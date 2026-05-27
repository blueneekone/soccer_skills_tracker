<script lang="ts">

	const NAME_TRUNCATE_THRESHOLD = 20;
	const LONG_NAME_THRESHOLD = 16;

	/** Portrait center in 200×200 emblem (28% banner band; 96px avatar centered in body). */
	const PORTRAIT_CX = 100;
	const PORTRAIT_CY = 128;
	const NAME_ARC_RADIUS = 52;

	/** ~240° arc endpoints (deg, CCW from +x): sweep through 12 o'clock. */
	const NAME_ARC_START_DEG = 200;
	const NAME_ARC_END_DEG = 340;

	let {
		portraitSvg = '',
		borderSvg = '',
		bannerSvg = '',
		frameClass = '',
		displayName = 'Operative',
		clubName = undefined,
		rankName = undefined,
		operativeLevel = undefined,
		size = 96,
		/** 'card' = full ID card surfaces; 'holo' = HQ / Armory holo shell (scale via CSS only). */
		variant = 'card',
		/** 'ring' = foil stamp on portrait ring (2 o'clock); 'card' = anchored to card face top-right. */
		levelAnchor = 'ring',
	}: {
		portraitSvg?: string;
		borderSvg?: string;
		bannerSvg?: string;
		frameClass?: string;
		displayName?: string;
		clubName?: string;
		rankName?: string;
		operativeLevel?: number;
		size?: number;
		variant?: 'card' | 'holo';
		levelAnchor?: 'ring' | 'card';
	} = $props();

	const uid = $props.id();
	const nameArcId = `operative-id-name-arc-${uid}`;

	const emblemLogical = 200;

	/** Polar point on portrait-concentric ring (deg CCW from +x, SVG y-down). */
	function arcPoint(cx: number, cy: number, r: number, deg: number) {
		const rad = (deg * Math.PI) / 180;
		return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
	}

	const curvedName = $derived.by(() => {
		const name = (displayName || 'Operative').trim();
		if (name.length <= NAME_TRUNCATE_THRESHOLD) return name;
		return `${name.slice(0, NAME_TRUNCATE_THRESHOLD - 1)}…`;
	});

	const isLongName = $derived(curvedName.length > LONG_NAME_THRESHOLD);

	const hasClub = $derived(Boolean(clubName?.trim()));
	const showLevelBadge = $derived(
		operativeLevel != null && Number.isFinite(Number(operativeLevel)),
	);
	const levelBadgeLabel = $derived.by(() => {
		if (!showLevelBadge) return '';
		return `LVL ${String(Math.floor(Number(operativeLevel))).padStart(2, '0')}`;
	});

	const rankLine = $derived(
		typeof rankName === 'string' && rankName.trim() ? rankName.trim().toUpperCase() : '',
	);

	/** ~240° arc around portrait ring — wraps sides through top (12 o'clock). */
	const nameArcPath = $derived.by(() => {
		const cx = PORTRAIT_CX;
		const cy = PORTRAIT_CY;
		const r = NAME_ARC_RADIUS;
		const start = arcPoint(cx, cy, r, NAME_ARC_START_DEG);
		const end = arcPoint(cx, cy, r, NAME_ARC_END_DEG);
		// large-arc + CCW sweep → long path through 270° (top).
		return `M ${start.x} ${start.y} A ${r} ${r} 0 1 0 ${end.x} ${end.y}`;
	});

	const nameArcLength = $derived(
		(NAME_ARC_RADIUS * (360 - Math.abs(NAME_ARC_END_DEG - NAME_ARC_START_DEG)) * Math.PI) / 180,
	);

	const emblemLabel = $derived(
		[displayName, clubName, rankLine, showLevelBadge ? levelBadgeLabel : '']
			.filter(Boolean)
			.join(' · ') || 'Operative emblem',
	);
</script>

<div
	class="oie-root tw-flex tw-min-w-0 tw-max-w-full tw-flex-col tw-items-center {frameClass}"
	class:oie-root--holo={variant === 'holo'}
>
	{#if hasClub}
		<p
			class="oie-club qa-mono tw-m-0 tw-mb-1 tw-max-w-full tw-truncate tw-text-center tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-[0.22em]"
		>
			{clubName}
		</p>
	{/if}

	<div
		class="oie-emblem tw-relative tw-mx-auto tw-max-w-full tw-shrink-0 tw-overflow-visible"
		style="width: {emblemLogical}px; max-width: 100%; aspect-ratio: 1 / 1; height: auto;"
		role="img"
		aria-label={emblemLabel}
	>
		{#if showLevelBadge && levelAnchor === 'card'}
			<span
				class="oie-level-badge oie-level-badge--card qa-mono tw-absolute tw-z-[4] tw-font-bold tw-uppercase"
				aria-hidden="true"
			>
				{levelBadgeLabel}
			</span>
		{/if}

		{#if bannerSvg}
			<div
				class="oie-banner tw-pointer-events-none tw-absolute tw-inset-x-0 tw-top-0 tw-z-0 tw-h-[28%] tw-overflow-hidden"
				aria-hidden="true"
			>
				{@html bannerSvg}
			</div>
		{/if}

		<div
			class="oie-body tw-absolute tw-inset-x-0 tw-bottom-0 tw-top-[28%] tw-z-[1] tw-flex tw-flex-col tw-items-center tw-justify-center tw-overflow-hidden tw-px-2"
			aria-hidden="true"
		>
			<div
				class="oie-avatar-ring tw-relative tw-flex tw-shrink-0 tw-items-center tw-justify-center tw-overflow-visible tw-rounded-full"
				style="width: {size}px; height: {size}px; max-width: 100%;"
			>
				<div
					class="oie-portrait tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-full tw-border-2 tw-border-cyan-500 tw-bg-slate-700"
				>
					{@html portraitSvg}
				</div>
				{#if borderSvg}
					<div class="oie-loadout-border tw-pointer-events-none tw-absolute tw-inset-0" aria-hidden="true">
						{@html borderSvg}
					</div>
				{/if}
				{#if showLevelBadge && levelAnchor === 'ring'}
					<span
						class="oie-level-badge oie-level-badge--ring qa-mono tw-absolute tw-z-[4] tw-font-bold tw-uppercase"
						aria-hidden="true"
					>
						{levelBadgeLabel}
					</span>
				{/if}
			</div>
		</div>

		<svg
			class="oie-name-arc tw-pointer-events-none tw-absolute tw-inset-0 tw-z-[3] tw-h-full tw-w-full"
			viewBox="0 0 {emblemLogical} {emblemLogical}"
			preserveAspectRatio="xMidYMid meet"
			aria-hidden="true"
		>
			<defs>
				<path id={nameArcId} d={nameArcPath} fill="none" />
			</defs>
			<text
				class="oie-name-arc__text"
				class:oie-name-arc__text--long={isLongName}
				text-anchor="middle"
				dominant-baseline="central"
			>
				<textPath
					href="#{nameArcId}"
					startOffset="50%"
					lengthAdjust="spacing"
					textLength={nameArcLength * 0.85}
				>
					{curvedName}
				</textPath>
			</text>
		</svg>
	</div>

	{#if rankLine}
		<p
			class="oie-rank tw-m-0 tw-mt-1 tw-max-w-full tw-truncate tw-text-center tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-widest tw-opacity-80"
		>
			{rankLine}
		</p>
	{/if}
</div>

<style>
	.oie-root {
		width: fit-content;
		max-width: 100%;
	}

	.oie-root--holo {
		width: 100%;
		max-width: 100%;
	}

	.oie-root--holo .oie-emblem {
		width: min(168px, 100%);
		max-width: 100%;
	}

	.oie-root--holo .oie-club,
	.oie-root--holo .oie-rank {
		max-width: min(168px, 100%);
	}

	.oie-root--holo .oie-name-arc__text {
		font-size: 10px;
		letter-spacing: 0.1em;
	}

	.oie-root--holo .oie-name-arc__text--long {
		font-size: 8px;
		letter-spacing: 0.06em;
	}

	.oie-club {
		color: rgba(20, 184, 166, 0.55);
		font-variant: all-small-caps;
	}

	.oie-level-badge {
		background: var(--pd-bg, #05050a);
		border: 1px solid var(--pd-accent-action, #fbbf24);
		color: var(--pd-accent-action, #fbbf24);
		font-size: 8px;
		padding: 2px 5px;
		border-radius: 2px;
		box-shadow: 0 0 6px color-mix(in srgb, var(--pd-accent-action, #fbbf24) 25%, transparent);
		letter-spacing: 0.06em;
		line-height: 1.2;
	}

	.oie-level-badge--ring {
		top: 0;
		right: 12%;
		transform: translate(25%, -15%) rotate(6deg);
	}

	.oie-level-badge--card {
		top: 12px;
		right: 12px;
		transform: rotate(6deg);
	}

	.qa-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
		font-feature-settings: 'tnum' 1;
	}

	.oie-portrait :global(svg),
	.oie-portrait :global(img) {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 9999px;
		object-fit: cover;
	}

	.oie-loadout-border :global(svg),
	.oie-loadout-border :global(img),
	.oie-banner :global(svg),
	.oie-banner :global(img) {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: contain;
	}

	.oie-rank {
		color: rgba(34, 211, 238, 0.85);
		text-transform: uppercase;
		margin-top: 4px;
	}

	.oie-name-arc__text {
		fill: #ffffff;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		paint-order: stroke fill;
		stroke: rgba(1, 4, 9, 0.85);
		stroke-width: 2px;
	}

	.oie-name-arc__text--long {
		font-size: 9px;
		letter-spacing: 0.06em;
	}

	.loadout-frame--neon .oie-portrait {
		box-shadow:
			0 0 8px rgba(20, 184, 166, 0.35),
			0 0 0 1px rgba(20, 184, 166, 0.35);
	}
</style>
