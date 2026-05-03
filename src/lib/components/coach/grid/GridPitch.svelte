<script>
	let { showLabels = false } = $props();
</script>

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
<circle cx="800" cy="450" r="7" fill="#00f0ff" opacity="1" filter="url(#neon-glow)" />

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
		pointer-events="none"
		class="tw-font-mono"
		style="font-size: 11px; letter-spacing: 0.14em;"
	>
		<text x="800" y="436" text-anchor="middle" fill="rgba(255,255,255,0.3)">MIDFIELD</text>
		<text x="128" y="448" text-anchor="middle" fill="rgba(255,255,255,0.3)">18-YARD BOX</text>
		<text x="1472" y="448" text-anchor="middle" fill="rgba(255,255,255,0.3)">18-YARD BOX</text>
		<text x="290" y="120" text-anchor="middle" fill="rgba(255,255,255,0.3)">FLANK</text>
		<text x="1310" y="120" text-anchor="middle" fill="rgba(255,255,255,0.3)">FLANK</text>
		<text x="230" y="320" text-anchor="middle" fill="rgba(255,255,255,0.3)">PENALTY ARC</text>
		<text x="1370" y="320" text-anchor="middle" fill="rgba(255,255,255,0.3)">PENALTY ARC</text>
	</g>
{/if}
