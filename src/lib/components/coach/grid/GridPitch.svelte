<script>
	let { showLabels = false } = $props();
</script>

<rect width="100%" height="100%" fill="url(#cyber-grid)" mask="url(#grid-mask)" />
<rect
	x="2"
	y="2"
	width="1596"
	height="896"
	fill="none"
	stroke="rgba(0,240,255,0.28)"
	stroke-width="3"
/>
<line x1="800" y1="4" x2="800" y2="896" stroke="rgba(0,240,255,0.35)" stroke-width="3" />
<circle
	cx="800"
	cy="450"
	r="148"
	fill="none"
	stroke="rgba(0,240,255,0.35)"
	stroke-width="3"
/>
<circle cx="800" cy="450" r="7" fill="#00f0ff" opacity="1" filter="url(#heavy-bloom)" />

<!-- Penalty / six-yard boxes, spots, arcs (scaled to pitch) -->
<rect
	x="4"
	y="183"
	width="248"
	height="534"
	fill="none"
	stroke="rgba(0,240,255,0.3)"
	stroke-width="3"
/>
<rect
	x="1348"
	y="183"
	width="248"
	height="534"
	fill="none"
	stroke="rgba(0,240,255,0.3)"
	stroke-width="3"
/>
<rect x="4" y="329" width="82" height="242" fill="none" stroke="rgba(0,240,255,0.3)" stroke-width="3" />
<rect
	x="1514"
	y="329"
	width="82"
	height="242"
	fill="none"
	stroke="rgba(0,240,255,0.3)"
	stroke-width="3"
/>
<circle cx="172" cy="450" r="5" fill="rgba(0,240,255,0.45)" />
<circle cx="1428" cy="450" r="5" fill="rgba(0,240,255,0.45)" />
<path
	d="M 252 336 A 139 139 0 0 1 252 564"
	fill="none"
	stroke="rgba(0,240,255,0.3)"
	stroke-width="3"
/>
<path
	d="M 1348 336 A 139 139 0 0 0 1348 564"
	fill="none"
	stroke="rgba(0,240,255,0.3)"
	stroke-width="3"
/>

{#if showLabels}
	<g
		class="tw-pointer-events-none"
		font-family="monospace"
		font-size="18"
		fill="#00f0ff"
		opacity="0.25"
		letter-spacing="0.5em"
		text-anchor="middle"
		dominant-baseline="middle"
	>
		<text x="800" y="450">CENTER CIRCLE</text>
		<text x="800" y="20">SIDELINE</text>
		<text x="800" y="880">SIDELINE</text>
		<text x="40" y="450" transform="rotate(-90, 40, 450)">ENDLINE</text>
		<text x="1560" y="450" transform="rotate(90, 1560, 450)">ENDLINE</text>
		<text x="250" y="450">PK BOX</text>
		<text x="1350" y="450">PK BOX</text>
		<text x="80" y="450">SIX-YARD</text>
		<text x="1520" y="450">SIX-YARD</text>
		<text x="10" y="450" fill="#ff0033" transform="rotate(-90, 10, 450)">GOAL</text>
		<text x="1590" y="450" fill="#ff0033" transform="rotate(90, 1590, 450)">GOAL</text>
	</g>
{/if}
