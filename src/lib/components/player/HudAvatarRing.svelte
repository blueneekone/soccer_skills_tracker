<script lang="ts">
	import { renderOperativeAvatarSvg } from '$lib/avatars/operativeAvatar.js';
	import { parseOperativePortrait } from '$lib/avatars/portraitV2Schema.js';
	import { composeOperativePortrait } from '$lib/gamification/renderOperativeLoadout.js';

	let {
		operativeAvatar = undefined,
		operativeLoadout = undefined,
		ownedCosmetics = undefined,
		seed = 'player',
		size = 72,
		level = 1,
		/** 0..1 progress toward next level within current tier */
		xpFill = 0,
		strokeColor = 'var(--color-accent, #fbbf24)',
		embedded = false,
	}: {
		operativeAvatar?: unknown;
		operativeLoadout?: unknown;
		ownedCosmetics?: string[];
		seed?: string;
		size?: number;
		level?: number;
		xpFill?: number;
		strokeColor?: string;
		embedded?: boolean;
	} = $props();

	const innerAvatar = $derived(Math.round(size * 0.68));

	const hasOperativePortrait = $derived(parseOperativePortrait(operativeAvatar) !== null);

	const portraitLayers = $derived.by(() =>
		composeOperativePortrait({
			operativeAvatar,
			loadout: operativeLoadout,
			size: innerAvatar,
			ownedIds: ownedCosmetics,
		}),
	);

	const innerPortraitSvg = $derived.by(() => {
		if (hasOperativePortrait) return portraitLayers.portraitSvg;
		return renderOperativeAvatarSvg(seed || 'player', innerAvatar);
	});

	const R = 34;
	const strokeW = 4;
	const view = 80;
	const c = 2 * Math.PI * R;
	const fill = $derived(Math.min(1, Math.max(0, Number(xpFill) || 0)));
	const dashOffset = $derived(c * (1 - fill));
</script>

<div
	class="hud-avatar-ring"
	class:hud-avatar-ring--embedded={embedded}
	class:hud-avatar-ring--has-xp={fill > 0}
	style="--har-size: var(--player-hud-avatar-size, {size}px); --har-stroke: {strokeColor};"
	role="img"
	aria-label="Level {level}, {Math.round(fill * 100)} percent to next level"
>
	<svg class="hud-avatar-ring__svg" viewBox="0 0 {view} {view}" width={size} height={size} aria-hidden="true">
		<circle class="hud-avatar-ring__track" cx="40" cy="40" r={R} fill="none" stroke-width={strokeW} />
		<circle
			class="hud-avatar-ring__fill"
			cx="40"
			cy="40"
			r={R}
			fill="none"
			stroke-width={strokeW}
			stroke-linecap="round"
			stroke-dasharray={c}
			stroke-dashoffset={dashOffset}
			transform="rotate(-90 40 40)"
		/>
	</svg>
	<div class="hud-avatar-ring__avatar-wrap">
		<div class="hud-avatar-ring__portrait" aria-hidden="true">
			{@html innerPortraitSvg}
		</div>
		{#if portraitLayers.borderSvg}
			<div class="hud-avatar-ring__loadout-border" aria-hidden="true">
				{@html portraitLayers.borderSvg}
			</div>
		{/if}
	</div>
	<span class="hud-avatar-ring__badge">LVL {level}</span>
</div>

<style>
	.hud-avatar-ring {
		position: relative;
		width: var(--har-size, 72px);
		height: var(--har-size, 72px);
		flex-shrink: 0;
	}

	.hud-avatar-ring__svg {
		display: block;
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 0 8px color-mix(in srgb, var(--har-stroke, #fbbf24) 45%, transparent));
	}

	.hud-avatar-ring__track {
		stroke: color-mix(in srgb, var(--har-stroke, #fbbf24) 22%, #1e293b);
	}

	.hud-avatar-ring__fill {
		stroke: var(--har-stroke, #fbbf24);
		transition: stroke-dashoffset 0.65s cubic-bezier(0.33, 1, 0.68, 1);
	}

	.hud-avatar-ring--has-xp .hud-avatar-ring__fill {
		filter: drop-shadow(0 0 6px color-mix(in srgb, var(--har-stroke, #fbbf24) 35%, transparent));
		animation: har-fill-emissive-pulse 2.4s ease-in-out infinite;
	}

	@keyframes har-fill-emissive-pulse {
		0%,
		100% {
			filter: drop-shadow(0 0 4px color-mix(in srgb, var(--har-stroke, #fbbf24) 25%, transparent));
		}
		50% {
			filter: drop-shadow(0 0 8px color-mix(in srgb, var(--har-stroke, #fbbf24) 42%, transparent));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hud-avatar-ring--has-xp .hud-avatar-ring__fill {
			animation: none;
		}
	}

	.hud-avatar-ring__avatar-wrap {
		position: absolute;
		inset: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: visible;
	}

	.hud-avatar-ring__portrait {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: visible;
	}

	.hud-avatar-ring__portrait :global(svg.layered-portrait) {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	/* Bust circle clips kit+face only; hair bleeds above crown (3.5g-g SIR / 3.5i-fix) */
	.hud-avatar-ring__portrait :global([data-portrait-layer='kit']),
	.hud-avatar-ring__portrait :global([data-portrait-layer='face']) {
		clip-path: circle(46% at 50% 44%);
	}

	.hud-avatar-ring__portrait :global([data-portrait-layer='hair']) {
		clip-path: none;
	}

	.hud-avatar-ring__loadout-border {
		position: absolute;
		inset: 0;
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hud-avatar-ring__loadout-border :global(svg),
	.hud-avatar-ring__loadout-border :global(img) {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: contain;
	}

	.hud-avatar-ring__badge {
		position: absolute;
		left: 50%;
		bottom: -2px;
		transform: translateX(-50%);
		padding: 0.2rem 0.45rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--har-stroke, #fbbf24) 55%, transparent);
		background: color-mix(in srgb, var(--pd-panel, #05050a) 92%, transparent);
		box-shadow:
			0 0 12px color-mix(in srgb, var(--har-stroke, #fbbf24) 35%, transparent),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.48rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #ffffff;
		white-space: nowrap;
	}

	.hud-avatar-ring--embedded .hud-avatar-ring__badge {
		background: transparent !important;
		border: none !important;
		border-radius: 0 !important;
		box-shadow: none !important;
		padding: 0;
	}
</style>
