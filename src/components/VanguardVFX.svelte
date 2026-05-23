<script>
	/**
	 * Master SVG filter defs — reference app-wide:
	 * - filter="url(#neonBloom)" — general neon bloom
	 * - filter="url(#aresBloom)" — Ares aggression (non–Player OS)
	 * - filter="url(#pdDataBloom)" — Player OS radar/VPP teal data glow (HQ + Stats parity)
	 */
</script>

<svg
	class="vanguard-vfx-defs tw-pointer-events-none tw-fixed tw-left-0 tw-top-0 tw-z-[2147483647] tw-h-0 tw-w-0 tw-overflow-hidden tw-opacity-0"
	width="0"
	height="0"
	aria-hidden="true"
	focusable="false"
>
	<defs>
		<filter id="neonBloom" x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="blur" />
			<feMerge>
				<feMergeNode in="blur" />
				<feMergeNode in="blur" />
				<feMergeNode in="blur" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
		<filter id="aresBloom" x="-55%" y="-55%" width="210%" height="210%">
			<feGaussianBlur in="SourceGraphic" stdDeviation="6" result="aresBlur" />
			<feColorMatrix
				in="aresBlur"
				type="matrix"
				values="1.15 0 0 0 0.15  0 0.15 0 0 0  0 0 0.15 0 0  0 0 0 1 0"
				result="aresTint"
			/>
			<feMerge>
				<feMergeNode in="aresTint" />
				<feMergeNode in="aresTint" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
		<!-- Sprint 2.18 — youth-safe teal data bloom for AttributeRadar / VPP (lighter than neonBloom) -->
		<filter id="pdDataBloom" x="-40%" y="-40%" width="180%" height="180%">
			<feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="pdBlur" />
			<feColorMatrix
				in="pdBlur"
				type="matrix"
				values="0.2 0 0 0 0.02  0 0.85 0.75 0 0.04  0 0.55 0.65 0 0.03  0 0 0 1 0"
				result="pdTealTint"
			/>
			<feMerge>
				<feMergeNode in="pdTealTint" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</defs>
</svg>
