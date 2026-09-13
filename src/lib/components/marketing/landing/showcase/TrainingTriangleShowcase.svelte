<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	
	let activeNode: 'coach' | 'athlete' | 'parent' | null = $state(null);

	const hudContent = {
		coach: {
			title: 'Coach Intent Engine',
			desc: 'Prescribes high-velocity tactical drills & intent formulations. Vectors flow immediately to the squad.',
			color: '#fbbf24', // Action Gold
			icon: 'data.target'
		},
		athlete: {
			title: 'Athlete Dopamine OS',
			desc: 'Logs performance, levels up XP, earns badges, and mathematically avoids skill decay.',
			color: '#daff0a', // Cyber Yellow
			icon: 'game.zap'
		},
		parent: {
			title: 'Parent Compliance Shield',
			desc: 'Validates legal compliance, signs consent, and guards post-game emotional safety.',
			color: '#14b8a6', // Data Cyan
			icon: 'status.shield-check'
		}
	};

	// Typewriter effect state
	let displayedDesc = $state('');
	let typingInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		if (activeNode) {
			const fullText = hudContent[activeNode].desc;
			let charIndex = 0;
			displayedDesc = '';
			if (typingInterval) clearInterval(typingInterval);
			
			typingInterval = setInterval(() => {
				if (charIndex < fullText.length) {
					displayedDesc += fullText.charAt(charIndex);
					charIndex++;
				} else {
					if (typingInterval) clearInterval(typingInterval);
				}
			}, 15); // High velocity typing
		} else {
			displayedDesc = '';
			if (typingInterval) clearInterval(typingInterval);
		}
		
		return () => {
			if (typingInterval) clearInterval(typingInterval);
		};
	});
</script>

<div class="tw-relative tw-w-full tw-max-w-5xl tw-mx-auto tw-bg-[#0B0F19] tw-rounded-[32px] tw-border tw-border-[#1E293B] tw-overflow-hidden tw-shadow-[0_0_80px_rgba(20,184,166,0.05)]">
	
	<!-- Target Crosshairs (Top Left, Top Right, Bottom Left, Bottom Right) -->
	<div class="tw-absolute tw-top-4 tw-left-4 tw-w-4 tw-h-4 tw-border-t-2 tw-border-l-2 tw-border-[#334155]"></div>
	<div class="tw-absolute tw-top-4 tw-right-4 tw-w-4 tw-h-4 tw-border-t-2 tw-border-r-2 tw-border-[#334155]"></div>
	<div class="tw-absolute tw-bottom-4 tw-left-4 tw-w-4 tw-h-4 tw-border-b-2 tw-border-l-2 tw-border-[#334155]"></div>
	<div class="tw-absolute tw-bottom-4 tw-right-4 tw-w-4 tw-h-4 tw-border-b-2 tw-border-r-2 tw-border-[#334155]"></div>

	<div class="tw-relative tw-w-full tw-aspect-square md:tw-aspect-[4/3] tw-max-w-3xl tw-mx-auto tw-p-12 tw-flex tw-items-center tw-justify-center">
		
		<!-- Background Grid Rings -->
		<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-opacity-20 tw-pointer-events-none">
			<div class="tw-w-[80%] tw-h-[80%] tw-rounded-full tw-border tw-border-[#334155] tw-border-dashed tw-animate-[spin_60s_linear_infinite]"></div>
			<div class="tw-absolute tw-w-[60%] tw-h-[60%] tw-rounded-full tw-border tw-border-[#334155] tw-border-dotted tw-animate-[spin_40s_linear_infinite_reverse]"></div>
		</div>

		<!-- SVG Base for Vectors & Halos -->
		<svg viewBox="0 0 100 100" class="tw-absolute tw-inset-0 tw-w-full tw-h-full tw-overflow-visible tw-pointer-events-none">
			<defs>
				<filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="3" result="coloredBlur"/>
					<feMerge>
						<feMergeNode in="coloredBlur"/>
						<feMergeNode in="SourceGraphic"/>
					</feMerge>
				</filter>
				<linearGradient id="coach-athlete" x1="50" y1="20" x2="20" y2="70">
					<stop offset="0%" stop-color="#fbbf24" />
					<stop offset="100%" stop-color="#daff0a" />
				</linearGradient>
				<linearGradient id="athlete-parent" x1="20" y1="70" x2="80" y2="70">
					<stop offset="0%" stop-color="#daff0a" />
					<stop offset="100%" stop-color="#14b8a6" />
				</linearGradient>
				<linearGradient id="parent-coach" x1="80" y1="70" x2="50" y2="20">
					<stop offset="0%" stop-color="#14b8a6" />
					<stop offset="100%" stop-color="#fbbf24" />
				</linearGradient>
			</defs>

			<!-- Static Background Triangles -->
			<polygon points="50,20 20,70 80,70" fill="none" stroke="#1E293B" stroke-width="0.5" />
			<polygon points="50,20 20,70 80,70" fill="none" stroke="#334155" stroke-width="0.1" transform="scale(0.8) translate(12, 12)" />

			<!-- Dynamic Vectors (Data Flow) -->
			<!-- Coach to Athlete -->
			<line x1="50" y1="20" x2="20" y2="70" stroke={activeNode === 'coach' || activeNode === 'athlete' ? 'url(#coach-athlete)' : 'transparent'} stroke-width="0.8" stroke-dasharray="2 2" class="tw-transition-all tw-duration-500 tw-ease-out" filter="url(#neon-glow)">
				{#if activeNode === 'coach' || activeNode === 'athlete'}
					<animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
				{/if}
			</line>
			<!-- Athlete to Parent -->
			<line x1="20" y1="70" x2="80" y2="70" stroke={activeNode === 'athlete' || activeNode === 'parent' ? 'url(#athlete-parent)' : 'transparent'} stroke-width="0.8" stroke-dasharray="2 2" class="tw-transition-all tw-duration-500 tw-ease-out" filter="url(#neon-glow)">
				{#if activeNode === 'athlete' || activeNode === 'parent'}
					<animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
				{/if}
			</line>
			<!-- Parent to Coach -->
			<line x1="80" y1="70" x2="50" y2="20" stroke={activeNode === 'parent' || activeNode === 'coach' ? 'url(#parent-coach)' : 'transparent'} stroke-width="0.8" stroke-dasharray="2 2" class="tw-transition-all tw-duration-500 tw-ease-out" filter="url(#neon-glow)">
				{#if activeNode === 'parent' || activeNode === 'coach'}
					<animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
				{/if}
			</line>

			<!-- Concentric Pulses behind nodes -->
			<g transform="translate(50, 20)">
				<circle r="8" fill="none" stroke="#fbbf24" stroke-width="0.2" class="tw-opacity-0 tw-transition-opacity tw-duration-300" class:tw-opacity-50={activeNode === 'coach'}>
					<animate attributeName="r" from="4" to="12" dur="2s" repeatCount="indefinite" />
					<animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
				</circle>
			</g>
			<g transform="translate(20, 70)">
				<circle r="8" fill="none" stroke="#daff0a" stroke-width="0.2" class="tw-opacity-0 tw-transition-opacity tw-duration-300" class:tw-opacity-50={activeNode === 'athlete'}>
					<animate attributeName="r" from="4" to="12" dur="2s" repeatCount="indefinite" />
					<animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
				</circle>
			</g>
			<g transform="translate(80, 70)">
				<circle r="8" fill="none" stroke="#14b8a6" stroke-width="0.2" class="tw-opacity-0 tw-transition-opacity tw-duration-300" class:tw-opacity-50={activeNode === 'parent'}>
					<animate attributeName="r" from="4" to="12" dur="2s" repeatCount="indefinite" />
					<animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
				</circle>
			</g>
		</svg>

		<!-- DOM Nodes over SVG for exact Typography and Hover Hitboxes -->
		<!-- Coach Node -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_mouse_events_have_key_events -->
		<div 
			class="tw-absolute tw-top-[20%] tw-left-[50%] tw--translate-x-1/2 tw--translate-y-1/2 tw-flex tw-flex-col tw-items-center tw-cursor-pointer tw-group tw-z-10"
			onmouseenter={() => activeNode = 'coach'}
			onmouseleave={() => activeNode = null}
		>
			<div class="tw-w-16 tw-h-16 md:tw-w-20 md:tw-h-20 tw-bg-[#0F172A] tw-border-2 tw-border-[#1E293B] tw-rounded-full tw-flex tw-items-center tw-justify-center tw-transition-all tw-duration-300 tw-shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:tw-border-[#fbbf24] group-hover:tw-shadow-[0_0_30px_rgba(251,191,36,0.3)] group-hover:tw-scale-110">
				<Icon name="data.target" class="tw-w-8 tw-h-8 md:tw-w-10 md:tw-h-10 tw-text-slate-400 group-hover:tw-text-[#fbbf24] tw-transition-colors tw-duration-300" />
			</div>
			<div class="tw-mt-4 tw-px-3 tw-py-1 tw-bg-[#fbbf24]/10 tw-border tw-border-[#fbbf24]/30 tw-rounded tw-backdrop-blur-sm tw-opacity-0 tw-translate-y-2 group-hover:tw-opacity-100 group-hover:tw-translate-y-0 tw-transition-all tw-duration-300">
				<span class="tw-font-mono tw-text-xs md:tw-text-sm tw-font-bold tw-text-[#fbbf24] tw-tracking-widest">COACH</span>
			</div>
		</div>

		<!-- Athlete Node -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_mouse_events_have_key_events -->
		<div 
			class="tw-absolute tw-top-[70%] tw-left-[20%] tw--translate-x-1/2 tw--translate-y-1/2 tw-flex tw-flex-col tw-items-center tw-cursor-pointer tw-group tw-z-10"
			onmouseenter={() => activeNode = 'athlete'}
			onmouseleave={() => activeNode = null}
		>
			<div class="tw-w-16 tw-h-16 md:tw-w-20 md:tw-h-20 tw-bg-[#0F172A] tw-border-2 tw-border-[#1E293B] tw-rounded-full tw-flex tw-items-center tw-justify-center tw-transition-all tw-duration-300 tw-shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:tw-border-[#daff0a] group-hover:tw-shadow-[0_0_30px_rgba(218,255,10,0.2)] group-hover:tw-scale-110">
				<Icon name="game.zap" class="tw-w-8 tw-h-8 md:tw-w-10 md:tw-h-10 tw-text-slate-400 group-hover:tw-text-[#daff0a] tw-transition-colors tw-duration-300" />
			</div>
			<div class="tw-mt-4 tw-px-3 tw-py-1 tw-bg-[#daff0a]/10 tw-border tw-border-[#daff0a]/30 tw-rounded tw-backdrop-blur-sm tw-opacity-0 tw-translate-y-2 group-hover:tw-opacity-100 group-hover:tw-translate-y-0 tw-transition-all tw-duration-300">
				<span class="tw-font-mono tw-text-xs md:tw-text-sm tw-font-bold tw-text-[#daff0a] tw-tracking-widest">ATHLETE</span>
			</div>
		</div>

		<!-- Parent Node -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_mouse_events_have_key_events -->
		<div 
			class="tw-absolute tw-top-[70%] tw-left-[80%] tw--translate-x-1/2 tw--translate-y-1/2 tw-flex tw-flex-col tw-items-center tw-cursor-pointer tw-group tw-z-10"
			onmouseenter={() => activeNode = 'parent'}
			onmouseleave={() => activeNode = null}
		>
			<div class="tw-w-16 tw-h-16 md:tw-w-20 md:tw-h-20 tw-bg-[#0F172A] tw-border-2 tw-border-[#1E293B] tw-rounded-full tw-flex tw-items-center tw-justify-center tw-transition-all tw-duration-300 tw-shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:tw-border-[#14b8a6] group-hover:tw-shadow-[0_0_30px_rgba(20,184,166,0.3)] group-hover:tw-scale-110">
				<Icon name="status.shield-check" class="tw-w-8 tw-h-8 md:tw-w-10 md:tw-h-10 tw-text-slate-400 group-hover:tw-text-[#14b8a6] tw-transition-colors tw-duration-300" />
			</div>
			<div class="tw-mt-4 tw-px-3 tw-py-1 tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/30 tw-rounded tw-backdrop-blur-sm tw-opacity-0 tw-translate-y-2 group-hover:tw-opacity-100 group-hover:tw-translate-y-0 tw-transition-all tw-duration-300">
				<span class="tw-font-mono tw-text-xs md:tw-text-sm tw-font-bold tw-text-[#14b8a6] tw-tracking-widest">PARENT</span>
			</div>
		</div>
	</div>

	<!-- Liquid Glassmorphism 2.0 HUD -->
	<div class="tw-absolute tw-bottom-6 tw-left-1/2 tw--translate-x-1/2 tw-w-[90%] md:tw-w-[600px] tw-bg-[#0F172A]/70 tw-backdrop-blur-xl tw-border tw-border-[#1E293B] tw-rounded-2xl tw-p-6 tw-shadow-[0_20px_40px_rgba(0,0,0,0.5)] tw-transition-all tw-duration-500 tw-min-h-[140px] tw-flex tw-flex-col tw-justify-center"
		 class:tw-border-[#fbbf24]={activeNode === 'coach'}
		 class:tw-border-[#daff0a]={activeNode === 'athlete'}
		 class:tw-border-[#14b8a6]={activeNode === 'parent'}
	>
		{#if activeNode}
			<div class="tw-flex tw-items-start tw-gap-4">
				<div class="tw-w-12 tw-h-12 tw-shrink-0 tw-rounded-xl tw-flex tw-items-center tw-justify-center" style="background-color: {hudContent[activeNode].color}15; border: 1px solid {hudContent[activeNode].color}30;">
					<Icon name={hudContent[activeNode].icon as IconName} class="tw-w-6 tw-h-6" style="color: {hudContent[activeNode].color};" />
				</div>
				<div class="tw-flex-1 tw-min-w-0">
					<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
						<h4 class="tw-font-mono tw-text-sm md:tw-text-base tw-font-bold tw-tracking-widest tw-uppercase" style="color: {hudContent[activeNode].color};">
							{hudContent[activeNode].title}
						</h4>
						<span class="tw-text-[10px] tw-font-mono tw-tracking-widest tw-opacity-50 tw-text-white">SYS.SYNC_ACTIVE</span>
					</div>
					<p class="tw-text-slate-300 tw-font-sans tw-text-sm md:tw-text-base tw-leading-relaxed tw-min-h-[48px]" style="font-family: 'Switzer', sans-serif;">
						{displayedDesc}<span class="tw-animate-pulse">_</span>
					</p>
				</div>
			</div>
		{:else}
			<div class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-opacity-50 tw-h-full">
				<Icon name="data.activity" class="tw-w-6 tw-h-6 tw-mb-3 tw-text-slate-400 tw-animate-pulse" />
				<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-tracking-widest tw-text-center">AWAITING TELEMETRY SYNC<br/><span class="tw-opacity-50">HOVER NODE TO INSPECT SUBSYSTEM</span></p>
			</div>
		{/if}
	</div>
</div>
