<script>
	/** Distinct ink colors for arrow marker defs (palette ∪ live routes). */
	/** Increment to restart sweep-reveal SMIL (pairs with SimulatorEngine.cartridgeSweepEpoch). */
	let { markerColors, cartridgeSweepEpoch = 0 } = $props();

	/** Tip at x≈22; refX pulled back so the chevron overlaps the path end and hides round-cap bleed. */
	const ARROW_REF_X = 17;
	const ARROW_REF_Y = 10;
</script>

<defs>
	<filter id="heavy-bloom" x="-100%" y="-100%" width="300%" height="300%">
		<feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
		<feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
		<feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur3" />
		<feMerge>
			<feMergeNode in="blur3" />
			<feMergeNode in="blur2" />
			<feMergeNode in="blur1" />
			<feMergeNode in="SourceGraphic" />
		</feMerge>
	</filter>
	<filter id="neon-glow" x="-100%" y="-100%" width="300%" height="300%">
		<feGaussianBlur in="SourceGraphic" stdDeviation="5" result="ngb" />
		<feMerge>
			<feMergeNode in="ngb" />
			<feMergeNode in="ngb" />
			<feMergeNode in="SourceGraphic" />
		</feMerge>
	</filter>
	<!-- Draft-route chevron — fill tracks the referencing path stroke (SVG2 context-stroke). -->
	<marker
		id="tech-chevron"
		refX={ARROW_REF_X}
		refY={ARROW_REF_Y}
		markerWidth="28"
		markerHeight="20"
		orient="auto"
		markerUnits="userSpaceOnUse"
	>
		<path d="M 0 2 L 22 10 L 0 18 L 5 10 Z" fill="context-stroke" />
	</marker>
	<!-- Tactical arrowhead — inherits route ink from parent <path> stroke. -->
	<marker
		id="arrowhead"
		refX={ARROW_REF_X}
		refY={ARROW_REF_Y}
		markerWidth="28"
		markerHeight="20"
		orient="auto"
		markerUnits="userSpaceOnUse"
	>
		<path d="M 0 2 L 22 10 L 0 18 L 5 10 Z" fill="context-stroke" />
	</marker>
	<!-- Bloom-filtered arrowhead — same geometry + context fill. -->
	<marker
		id="arrowhead-glow"
		refX={ARROW_REF_X}
		refY={ARROW_REF_Y}
		markerWidth="28"
		markerHeight="20"
		orient="auto"
		markerUnits="userSpaceOnUse"
	>
		<path d="M 0 2 L 22 10 L 0 18 L 5 10 Z" fill="context-stroke" filter="url(#neon-glow)" />
	</marker>
	<filter id="premium-neon" x="-50%" y="-50%" width="200%" height="200%">
		<feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
		<feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
		<feMerge>
			<feMergeNode in="blur2" />
			<feMergeNode in="blur1" />
			<feMergeNode in="SourceGraphic" />
		</feMerge>
	</filter>
	<filter id="identity-disc-glow" x="-100%" y="-100%" width="300%" height="300%">
		<feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="dg" />
		<feMerge>
			<feMergeNode in="dg" />
			<feMergeNode in="dg" />
			<feMergeNode in="SourceGraphic" />
		</feMerge>
	</filter>
	<pattern id="cyber-grid" width="40" height="40" patternUnits="userSpaceOnUse">
		<animateTransform
			attributeName="patternTransform"
			type="translate"
			from="0 0"
			to="0 40"
			dur="4s"
			repeatCount="indefinite"
		/>
		<rect width="40" height="40" fill="none" />
		<path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,240,255,0.07)" stroke-width="1" />
	</pattern>
	<radialGradient id="grid-fade" cx="50%" cy="50%" r="50%">
		<stop offset="40%" stop-color="white" stop-opacity="1" />
		<stop offset="100%" stop-color="white" stop-opacity="0" />
	</radialGradient>
	<mask id="grid-mask">
		<rect width="100%" height="100%" fill="url(#grid-fade)" />
	</mask>
	<mask id="sweep-reveal-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
		<rect x="0" y="0" width="0" height="900" fill="white">
			{#key cartridgeSweepEpoch}
				{#if cartridgeSweepEpoch > 0}
					<animate
						attributeName="width"
						values="0;1650"
						dur="1.2s"
						fill="freeze"
						calcMode="spline"
						keyTimes="0;1"
						keySplines="0.25 0.1 0.25 1"
						begin="0s"
					/>
				{/if}
			{/key}
		</rect>
	</mask>
	<radialGradient id="magnet-core-radial" cx="32%" cy="28%" r="72%">
		<stop offset="0%" stop-color="#2a2a32" />
		<stop offset="42%" stop-color="#0c0c10" />
		<stop offset="100%" stop-color="#020203" />
	</radialGradient>
	{#each markerColors as c (c)}
		{@const aresMk = String(c).replace(/#/g, '')}
		<marker
			id={`ares-disc-${aresMk}`}
			markerWidth="24"
			markerHeight="24"
			refX="12"
			refY="12"
			orient="auto"
			markerUnits="userSpaceOnUse"
		>
			<circle cx="12" cy="12" r="9" fill="transparent" stroke={c} stroke-width="3" />
			<circle cx="12" cy="12" r="5" fill="#050505" stroke="#ffffff" stroke-width="1.5" />
		</marker>
	{/each}
</defs>
