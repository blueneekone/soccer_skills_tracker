<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	let activeNode: 'coach' | 'athlete' | 'parent' | null = $state(null);

	const hudContent = {
		coach: {
			title: 'Coach Intent',
			desc: 'Prescribes high-velocity tactical drills & intent formulations.',
			color: '#fbbf24' // Action Gold
		},
		athlete: {
			title: 'Athlete XP',
			desc: 'Logs performance, levels up XP, earns badges, avoids skill decay.',
			color: '#daff0a' // Cyber Yellow
		},
		parent: {
			title: 'Parent Compliance',
			desc: 'Validates compliance, signs consent, and guards post-game emotional safety.',
			color: '#14b8a6' // Data Cyan
		}
	};
</script>

<div class="tw-relative tw-w-full tw-max-w-4xl tw-mx-auto tw-p-8 tw-bg-[#0f172a] tw-rounded-xl tw-border tw-border-slate-800">
	<!-- SVG Triangle -->
	<div class="tw-relative tw-w-full tw-aspect-square tw-max-w-2xl tw-mx-auto">
		<svg viewBox="0 0 100 100" class="tw-w-full tw-h-full tw-overflow-visible">
			<defs>
				<filter id="glow">
					<feGaussianBlur stdDeviation="2" result="coloredBlur"/>
					<feMerge>
						<feMergeNode in="coloredBlur"/>
						<feMergeNode in="SourceGraphic"/>
					</feMerge>
				</filter>
			</defs>
			
			<!-- Edges -->
			<!-- Coach to Athlete -->
			<line x1="50" y1="15" x2="20" y2="75" stroke={activeNode === 'coach' || activeNode === 'athlete' ? '#daff0a' : '#334155'} stroke-width="0.5" class="tw-transition-colors tw-duration-300" />
			<!-- Athlete to Parent -->
			<line x1="20" y1="75" x2="80" y2="75" stroke={activeNode === 'athlete' || activeNode === 'parent' ? '#14b8a6' : '#334155'} stroke-width="0.5" class="tw-transition-colors tw-duration-300" />
			<!-- Parent to Coach -->
			<line x1="80" y1="75" x2="50" y2="15" stroke={activeNode === 'parent' || activeNode === 'coach' ? '#fbbf24' : '#334155'} stroke-width="0.5" class="tw-transition-colors tw-duration-300" />
			
			<!-- Animated Vectors -->
			{#if activeNode === 'coach'}
				<circle cx="0" cy="0" r="1.5" fill="#fbbf24" filter="url(#glow)">
					<animateMotion path="M 50 15 L 20 75" dur="1s" repeatCount="indefinite" />
				</circle>
				<circle cx="0" cy="0" r="1.5" fill="#fbbf24" filter="url(#glow)">
					<animateMotion path="M 50 15 L 80 75" dur="1s" repeatCount="indefinite" />
				</circle>
			{/if}
			{#if activeNode === 'athlete'}
				<circle cx="0" cy="0" r="1.5" fill="#daff0a" filter="url(#glow)">
					<animateMotion path="M 20 75 L 50 15" dur="1s" repeatCount="indefinite" />
				</circle>
				<circle cx="0" cy="0" r="1.5" fill="#daff0a" filter="url(#glow)">
					<animateMotion path="M 20 75 L 80 75" dur="1s" repeatCount="indefinite" />
				</circle>
			{/if}
			{#if activeNode === 'parent'}
				<circle cx="0" cy="0" r="1.5" fill="#14b8a6" filter="url(#glow)">
					<animateMotion path="M 80 75 L 20 75" dur="1s" repeatCount="indefinite" />
				</circle>
				<circle cx="0" cy="0" r="1.5" fill="#14b8a6" filter="url(#glow)">
					<animateMotion path="M 80 75 L 50 15" dur="1s" repeatCount="indefinite" />
				</circle>
			{/if}

			<!-- Nodes (Interactive) -->
			<!-- Coach Node (Top) -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<g 
				class="tw-cursor-pointer tw-transition-transform hover:tw-scale-110"
				style="transform-box: fill-box; transform-origin: center;"
				onmouseenter={() => activeNode = 'coach'}
				onmouseleave={() => activeNode = null}
				onclick={() => activeNode = 'coach'}
			>
				<circle cx="50" cy="15" r="6" fill="#0f172a" stroke="#fbbf24" stroke-width="1" class:tw-drop-shadow-[0_0_8px_#fbbf24]={activeNode === 'coach'} />
				<!-- Text instead of Icon to avoid Svelte 5 component inside SVG issues if any -->
				<text x="50" y="16.5" text-anchor="middle" font-size="3" fill="#fbbf24" font-family="Geist Mono">COACH</text>
			</g>

			<!-- Athlete Node (Bottom Left) -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<g 
				class="tw-cursor-pointer tw-transition-transform hover:tw-scale-110"
				style="transform-box: fill-box; transform-origin: center;"
				onmouseenter={() => activeNode = 'athlete'}
				onmouseleave={() => activeNode = null}
				onclick={() => activeNode = 'athlete'}
			>
				<circle cx="20" cy="75" r="6" fill="#0f172a" stroke="#daff0a" stroke-width="1" class:tw-drop-shadow-[0_0_8px_#daff0a]={activeNode === 'athlete'} />
				<text x="20" y="76.5" text-anchor="middle" font-size="3" fill="#daff0a" font-family="Geist Mono">ATHLETE</text>
			</g>

			<!-- Parent Node (Bottom Right) -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<g 
				class="tw-cursor-pointer tw-transition-transform hover:tw-scale-110"
				style="transform-box: fill-box; transform-origin: center;"
				onmouseenter={() => activeNode = 'parent'}
				onmouseleave={() => activeNode = null}
				onclick={() => activeNode = 'parent'}
			>
				<circle cx="80" cy="75" r="6" fill="#0f172a" stroke="#14b8a6" stroke-width="1" class:tw-drop-shadow-[0_0_8px_#14b8a6]={activeNode === 'parent'} />
				<text x="80" y="76.5" text-anchor="middle" font-size="3" fill="#14b8a6" font-family="Geist Mono">PARENT</text>
			</g>
		</svg>
	</div>

	<!-- HUD Display -->
	<div class="tw-absolute tw-bottom-8 tw-left-8 tw-right-8 tw-h-32 tw-bg-[#000000]/80 tw-border tw-border-slate-800 tw-p-4 tw-rounded tw-backdrop-blur-sm tw-flex tw-flex-col tw-justify-center tw-items-center tw-text-center tw-transition-all tw-duration-300">
		{#if activeNode}
			<h4 class="tw-font-mono tw-text-lg tw-font-bold tw-mb-2 tw-tracking-widest" style="color: {hudContent[activeNode].color}">
				[{hudContent[activeNode].title.toUpperCase()}]
			</h4>
			<p class="tw-text-slate-300 tw-font-sans tw-text-sm tw-max-w-md">
				{hudContent[activeNode].desc}
			</p>
		{:else}
			<div class="tw-flex tw-flex-col tw-items-center tw-opacity-50">
				<Icon name="data.activity" class="tw-w-6 tw-h-6 tw-mb-2 tw-text-slate-400" />
				<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-tracking-widest">AWAITING TELEMETRY... HOVER NODE TO INSPECT</p>
			</div>
		{/if}
	</div>
</div>
