<script lang="ts">
	import { scale, fade } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	/**
	 * Holographic Radial Intercept Menu — scales in from the click point.
	 *
	 * @typedef {import('./TacticalEngine.svelte.ts').TacticalWarRoomModel} TacticalWarRoomModel
	 * @type {{ model: TacticalWarRoomModel }}
	 */
	let { model } = $props();

	const RADIUS = 96;
	const INNER_R = 28;
	const ICON_R = 32;

	/** @typedef {{ id: string; label: string; icon: IconName; color: string; action: () => void }} RadialAction */

	/** @type {RadialAction[]} */
	const ACTIONS = [
		{
			id: 'route',
			label: 'DRAW ROUTE',
			icon: /** @type {IconName} */ ('sys.route'),
			color: '#14b8a6',
			action: () => {
				model.setActiveTool('ROUTE');
				model.closeMenu();
			},
		},
		{
			id: 'drag',
			label: 'DRAG',
			icon: /** @type {IconName} */ ('nav.crosshair'),
			color: '#a855f7',
			action: () => {
				model.setActiveTool('DRAG');
				model.closeMenu();
			},
		},
		{
			id: 'clear',
			label: 'CLEAR ROUTES',
			icon: /** @type {IconName} */ ('action.eraser'),
			color: '#ffff00',
			action: () => {
				model.clearRoutesOnly();
				model.closeMenu();
			},
		},
		{
			id: 'recall',
			label: 'RECALL',
			icon: /** @type {IconName} */ ('nav.arrow-left'),
			color: '#ff6600',
			action: () => {
				model.recallBench();
				model.closeMenu();
			},
		},
		{
			id: 'cancel',
			label: 'CANCEL',
			icon: /** @type {IconName} */ ('sys.close'),
			color: '#ff003c',
			action: () => model.closeMenu(),
		},
	];

	const slots = $derived(
		ACTIONS.map((a, i) => {
			const angle = (i / ACTIONS.length) * Math.PI * 2 - Math.PI / 2;
			return {
				...a,
				cx: Math.cos(angle) * RADIUS,
				cy: Math.sin(angle) * RADIUS,
			};
		}),
	);

	/** @param {KeyboardEvent} e */
	function onKey(e) {
		if (e.key === 'Escape') model.closeMenu();
	}
</script>

<svelte:window onkeydown={onKey} />

{#if model.contextMenuOpen}
	<!-- Backdrop catcher -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="tw-pointer-events-auto tw-fixed tw-inset-0 tw-z-[9990]"
		role="presentation"
		onclick={() => model.closeMenu()}
		oncontextmenu={(e) => {
			e.preventDefault();
			model.closeMenu();
		}}
		in:fade={{ duration: 120 }}
		out:fade={{ duration: 100 }}
	>
		<!-- Radial menu — anchored to click coords, scales in from the point. -->
		<div
			class="tw-pointer-events-auto tw-absolute"
			style="left: {model.contextMenuClientX}px; top: {model.contextMenuClientY}px; transform: translate(-50%, -50%);"
			role="menu"
			aria-label="Tactical actions"
			in:scale={{ duration: 240, start: 0.1, easing: backOut }}
			out:scale={{ duration: 140, start: 0.4 }}
			onclick={(e) => e.stopPropagation()}
		>
			<svg
				class="tw-block"
				width={(RADIUS + ICON_R + 8) * 2}
				height={(RADIUS + ICON_R + 8) * 2}
				viewBox="{-(RADIUS + ICON_R + 8)} {-(RADIUS + ICON_R + 8)} {(RADIUS + ICON_R + 8) * 2} {(RADIUS + ICON_R + 8) * 2}"
				aria-hidden="true"
			>
				<defs>
					<radialGradient id="ctxRadialBg" cx="50%" cy="50%" r="50%">
						<stop offset="0%" stop-color="rgba(20, 184, 166, 0.18)" />
						<stop offset="60%" stop-color="rgba(20, 184, 166, 0.05)" />
						<stop offset="100%" stop-color="rgba(2, 2, 2, 0)" />
					</radialGradient>
					<filter id="ctxBloom" x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b" />
						<feMerge>
							<feMergeNode in="b" />
							<feMergeNode in="b" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>
				<!-- Holographic backdrop disc -->
				<circle cx="0" cy="0" r={RADIUS + ICON_R + 4} fill="url(#ctxRadialBg)" />
				<!-- Outer ring -->
				<circle
					cx="0"
					cy="0"
					r={RADIUS}
					fill="none"
					stroke="rgba(20, 184, 166, 0.35)"
					stroke-width="1"
					stroke-dasharray="3 4"
					filter="url(#ctxBloom)"
					class="ctx-ring-spin"
				/>
				<!-- Spokes -->
				{#each slots as s (s.id)}
					<line
						x1="0"
						y1="0"
						x2={s.cx}
						y2={s.cy}
						stroke="rgba(20, 184, 166, 0.2)"
						stroke-width="0.6"
						stroke-dasharray="2 4"
					/>
				{/each}
				<!-- Inner core ring + crosshair -->
				<circle cx="0" cy="0" r={INNER_R} fill="rgba(2,2,2,0.65)" stroke="rgba(20, 184, 166, 0.55)" stroke-width="1.2" filter="url(#ctxBloom)" />
				<line x1={-(INNER_R - 8)} y1="0" x2={INNER_R - 8} y2="0" stroke="rgba(20, 184, 166, 0.6)" stroke-width="0.8" />
				<line x1="0" y1={-(INNER_R - 8)} x2="0" y2={INNER_R - 8} stroke="rgba(20, 184, 166, 0.6)" stroke-width="0.8" />
				<text
					x="0"
					y="2"
					text-anchor="middle"
					dominant-baseline="middle"
					font-family="ui-monospace, monospace"
					font-size="7.5"
					font-weight="900"
					letter-spacing="1.2"
					fill="#14b8a6"
				>NEXUS</text>
			</svg>

			<!-- Action chips overlaid in HTML for crisp text + accessible buttons -->
			{#each slots as s (s.id)}
				<button
					type="button"
					class="ctx-action tw-pointer-events-auto tw-absolute tw-flex tw-h-16 tw-w-16 tw-flex-col tw-items-center tw-justify-center tw-gap-0.5 tw-rounded-full tw-border tw-bg-[#020202]/85 tw-font-mono tw-text-[8px] tw-font-black tw-uppercase tw-tracking-widest tw-backdrop-blur-3xl tw-transition-all hover:tw-scale-110 active:tw-scale-95 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2"
					style="left: 50%; top: 50%; transform: translate({s.cx}px, {s.cy}px) translate(-50%, -50%); border-color: {s.color}55; color: {s.color}; box-shadow: 0 0 20px {s.color}33, inset 0 1px 1px rgba(255,255,255,0.05);"
					role="menuitem"
					aria-label={s.label}
					onclick={(e) => {
						e.stopPropagation();
						s.action();
					}}
				>
					<Icon name={s.icon} size={18} />
					<span class="tw-leading-none">{s.label}</span>
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	@keyframes ctxRingSpin {
		to {
			transform: rotate(360deg);
		}
	}

	.ctx-ring-spin {
		transform-origin: 0 0;
		animation: ctxRingSpin 18s linear infinite;
	}
</style>
