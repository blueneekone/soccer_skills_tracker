<script>
	const HUB_NODE_R = 22;
	const HUB_ORBIT = 118;

	/**
	 * @param {number} rOuter
	 * @param {number} rInner
	 * @param {number} a0
	 * @param {number} a1
	 */
	function hubArcPath(rOuter, rInner, a0, a1) {
		const xo0 = Math.cos(a0) * rOuter;
		const yo0 = Math.sin(a0) * rOuter;
		const xo1 = Math.cos(a1) * rOuter;
		const yo1 = Math.sin(a1) * rOuter;
		const xi0 = Math.cos(a1) * rInner;
		const yi0 = Math.sin(a1) * rInner;
		const xi1 = Math.cos(a0) * rInner;
		const yi1 = Math.sin(a0) * rInner;
		const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
		return `M ${xo0} ${yo0} A ${rOuter} ${rOuter} 0 ${large} 1 ${xo1} ${yo1} L ${xi0} ${yi0} A ${rInner} ${rInner} 0 ${large} 0 ${xi1} ${yi1} Z`;
	}

	let {
		radialOpen = false,
		radialCx = 800,
		radialCy = 450,
		hubPop,
		radialAllSlots = /** @type {{ key: string; angle: number; ring: string; token: { number?: string } }[]} */ ([]),
		hubHoveredKey = null,
		hubCenterLabel = 'DEPLOY',
	} = $props();

	/** Safe spring scalar: avoid `scale(undefined)` when `current` is briefly unset. */
	const hubPopScalar = $derived.by(() => {
		const raw = typeof hubPop === 'number' ? hubPop : hubPop?.current;
		return typeof raw === 'number' && Number.isFinite(raw) ? raw : radialOpen ? 1 : 0;
	});
</script>

{#if radialOpen || hubPopScalar > 0.03}
	<g
		class="tw-isolate"
		opacity={Math.min(1, hubPopScalar)}
		transform="translate({radialCx},{radialCy}) scale({hubPopScalar})"
	>
		<path
			pointer-events="none"
			d={hubArcPath(178, 104, Math.PI * 0.48, Math.PI * 1.04)}
			fill="rgba(20, 184, 166,0.09)"
			stroke="#14b8a6"
			stroke-width="0.5"
		>
			<animate
				attributeName="stroke-opacity"
				values="0.35;0.95;0.35"
				dur="2.2s"
				repeatCount="indefinite"
			/>
		</path>
		<path
			pointer-events="none"
			d={hubArcPath(178, 104, -1.08, 1.08)}
			fill="rgba(251,113,133,0.08)"
			stroke="#fb7185"
			stroke-width="0.5"
		>
			<animate
				attributeName="stroke-opacity"
				values="0.35;0.95;0.35"
				dur="2.2s"
				repeatCount="indefinite"
			/>
		</path>

		<rect
			pointer-events="none"
			x="-112"
			y="-76"
			width="224"
			height="152"
			rx="16"
			fill="rgba(4,6,12,0.4)"
			stroke="#14b8a6"
			stroke-width="0.5"
			opacity="0.95"
		/>

		<g pointer-events="none">
			<animateTransform
				attributeName="transform"
				type="rotate"
				from="0 0 0"
				to="360 0 0"
				dur="14s"
				repeatCount="indefinite"
			/>
			<circle
				r="48"
				fill="none"
				stroke="#14b8a6"
				stroke-width="0.5"
				stroke-dasharray="6 14"
				opacity="0.88"
			/>
			<circle r="40" fill="none" stroke="#14b8a6" stroke-width="0.5" opacity="0.28" />
		</g>

		<text
			pointer-events="none"
			y="8"
			text-anchor="middle"
			fill="#14b8a6"
			class="tw-font-mono tw-text-[12px] tw-tracking-[0.22em]"
			style="paint-order: stroke; stroke: rgba(0,0,0,0.82); stroke-width: 4px;"
		>
			{hubCenterLabel}
		</text>

		{#each radialAllSlots as slot (slot.key)}
			{@const nx = Math.cos(slot.angle) * HUB_ORBIT}
			{@const ny = Math.sin(slot.angle) * HUB_ORBIT}
			{@const hi = hubHoveredKey === slot.key}
			{@const ns = hi ? 1.5 : 1}
			<g
				transform="translate({nx},{ny}) scale({ns})"
				class="tw-relative tw-z-[9999] tw-opacity-100"
				pointer-events="all"
			>
				<circle
					r={HUB_NODE_R}
					fill="url(#magnet-core-radial)"
					stroke={slot.ring}
					stroke-width={hi ? 4 : 2}
					filter={hi ? 'url(#heavy-bloom)' : 'url(#identity-disc-glow)'}
					class="tw-opacity-100"
					opacity="1"
				/>
				<text
					pointer-events="none"
					y="5"
					text-anchor="middle"
					fill="#ffffff"
					class="tw-font-mono tw-text-[13px] tw-font-black"
				>
					{slot.token.number || '—'}
				</text>
			</g>
		{/each}
	</g>
{/if}
