<script>
	/** Master SVG filter defs — reference via filter="url(#neonBloom)" / url(#aresBloom) app-wide. */
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
	</defs>
</svg>
