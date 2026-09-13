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
			}, 15);
		} else {
			displayedDesc = '';
			if (typingInterval) clearInterval(typingInterval);
		}
		
		return () => {
			if (typingInterval) clearInterval(typingInterval);
		};
	});
</script>

<div class="tw-relative tw-w-full tw-max-w-5xl tw-mx-auto tw-bg-[#000000] tw-rounded-[2px] tw-border-y tw-border-[#334155] tw-overflow-hidden tw-shadow-[0_0_120px_rgba(20,184,166,0.08)]">
	
	<!-- Tech Noir Grid Background -->
	<div class="tw-absolute tw-inset-0 tw-opacity-10" style="background-image: linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px); background-size: 40px 40px;"></div>
	
	<!-- Scanline Overlay -->
	<div class="tw-absolute tw-inset-0 tw-pointer-events-none tw-bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.25)_50%)] tw-bg-[length:100%_4px] tw-z-50 tw-opacity-20 tw-mix-blend-overlay"></div>

	<!-- Target Crosshairs (Structural Grey) -->
	<div class="tw-absolute tw-top-6 tw-left-6 tw-w-6 tw-h-6 tw-border-t-2 tw-border-l-2 tw-border-[#334155]"></div>
	<div class="tw-absolute tw-top-6 tw-right-6 tw-w-6 tw-h-6 tw-border-t-2 tw-border-r-2 tw-border-[#334155]"></div>
	<div class="tw-absolute tw-bottom-6 tw-left-6 tw-w-6 tw-h-6 tw-border-b-2 tw-border-l-2 tw-border-[#334155]"></div>
	<div class="tw-absolute tw-bottom-6 tw-right-6 tw-w-6 tw-h-6 tw-border-b-2 tw-border-r-2 tw-border-[#334155]"></div>

	<div class="tw-relative tw-w-full tw-aspect-square md:tw-aspect-[4/3] tw-max-w-4xl tw-mx-auto tw-p-12 tw-flex tw-items-center tw-justify-center">
		
		<!-- Rotating Radar Rings -->
		<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-opacity-30 tw-pointer-events-none tw-z-0">
			<div class="tw-w-[85%] tw-h-[85%] tw-rounded-full tw-border tw-border-[#14b8a6]/20 tw-border-dashed tw-animate-[spin_40s_linear_infinite]"></div>
			<div class="tw-absolute tw-w-[70%] tw-h-[70%] tw-rounded-full tw-border tw-border-[#fbbf24]/10 tw-border-dotted tw-animate-[spin_25s_linear_infinite_reverse]"></div>
			<!-- Radar Sweep Line -->
			<div class="tw-absolute tw-w-[85%] tw-h-[85%] tw-rounded-full tw-overflow-hidden">
				<div class="tw-w-1/2 tw-h-1/2 tw-bg-gradient-to-tr tw-from-transparent tw-to-[#14b8a6]/20 tw-origin-bottom-right tw-animate-[spin_4s_linear_infinite]"></div>
			</div>
		</div>

		<!-- SVG Base for Vectors & Data Telemetry -->
		<svg viewBox="0 0 100 100" class="tw-absolute tw-inset-0 tw-w-full tw-h-full tw-overflow-visible tw-pointer-events-none tw-z-10" preserveAspectRatio="xMidYMid slice">
			<defs>
				<filter id="ultra-glow" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
					<feMerge>
						<feMergeNode in="coloredBlur"/>
						<feMergeNode in="SourceGraphic"/>
					</feMerge>
				</filter>
				<linearGradient id="grad-coach-athlete" x1="50" y1="20" x2="20" y2="70">
					<stop offset="0%" stop-color="#fbbf24" />
					<stop offset="100%" stop-color="#daff0a" />
				</linearGradient>
				<linearGradient id="grad-athlete-parent" x1="20" y1="70" x2="80" y2="70">
					<stop offset="0%" stop-color="#daff0a" />
					<stop offset="100%" stop-color="#14b8a6" />
				</linearGradient>
				<linearGradient id="grad-parent-coach" x1="80" y1="70" x2="50" y2="20">
					<stop offset="0%" stop-color="#14b8a6" />
					<stop offset="100%" stop-color="#fbbf24" />
				</linearGradient>
			</defs>

			<!-- Dark Core Triangle -->
			<polygon points="50,20 20,70 80,70" fill="#0f172a" fill-opacity="0.6" stroke="#334155" stroke-width="0.3" />
			<!-- High-Velocity Inner Triangles -->
			<polygon points="50,20 20,70 80,70" fill="none" stroke="#14b8a6" stroke-width="0.1" transform="scale(0.8) translate(12, 12)" opacity="0.4" />
			<polygon points="50,20 20,70 80,70" fill="none" stroke="#fbbf24" stroke-width="0.1" transform="scale(0.6) translate(33, 33)" opacity="0.2" />

			<!-- Dynamic Vectors (Data Flow) -->
			<!-- Coach to Athlete -->
			<line x1="50" y1="20" x2="20" y2="70" stroke="url(#grad-coach-athlete)" stroke-width={activeNode === 'coach' || activeNode === 'athlete' ? '1.2' : '0.4'} stroke-dasharray="3 3" class="tw-transition-all tw-duration-500 tw-ease-out" filter={activeNode === 'coach' || activeNode === 'athlete' ? 'url(#ultra-glow)' : 'none'} opacity={activeNode === 'parent' ? '0.3' : '1'}>
				<animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
			</line>
			<!-- Athlete to Parent -->
			<line x1="20" y1="70" x2="80" y2="70" stroke="url(#grad-athlete-parent)" stroke-width={activeNode === 'athlete' || activeNode === 'parent' ? '1.2' : '0.4'} stroke-dasharray="3 3" class="tw-transition-all tw-duration-500 tw-ease-out" filter={activeNode === 'athlete' || activeNode === 'parent' ? 'url(#ultra-glow)' : 'none'} opacity={activeNode === 'coach' ? '0.3' : '1'}>
				<animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
			</line>
			<!-- Parent to Coach -->
			<line x1="80" y1="70" x2="50" y2="20" stroke="url(#grad-parent-coach)" stroke-width={activeNode === 'parent' || activeNode === 'coach' ? '1.2' : '0.4'} stroke-dasharray="3 3" class="tw-transition-all tw-duration-500 tw-ease-out" filter={activeNode === 'parent' || activeNode === 'coach' ? 'url(#ultra-glow)' : 'none'} opacity={activeNode === 'athlete' ? '0.3' : '1'}>
				<animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
			</line>

			<!-- Telemetry Packets (Data traversing the lines) -->
			{#if activeNode === 'coach'}
				<circle r="1" fill="#fbbf24" filter="url(#ultra-glow)">
					<animateMotion path="M50,20 L20,70" dur="1s" repeatCount="indefinite" />
				</circle>
			{/if}
			{#if activeNode === 'athlete'}
				<circle r="1" fill="#daff0a" filter="url(#ultra-glow)">
					<animateMotion path="M20,70 L80,70" dur="1s" repeatCount="indefinite" />
				</circle>
			{/if}
			{#if activeNode === 'parent'}
				<circle r="1" fill="#14b8a6" filter="url(#ultra-glow)">
					<animateMotion path="M80,70 L50,20" dur="1s" repeatCount="indefinite" />
				</circle>
			{/if}
		</svg>

		<!-- DOM Nodes over SVG for exact Typography and Hover Hitboxes -->
		<!-- Coach Node -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_mouse_events_have_key_events -->
		<div 
			class="tw-absolute tw-top-[20%] tw-left-[50%] tw--translate-x-1/2 tw--translate-y-1/2 tw-flex tw-flex-col tw-items-center tw-cursor-pointer tw-group tw-z-20"
			onmouseenter={() => activeNode = 'coach'}
			onmouseleave={() => activeNode = null}
		>
			<div class="tw-relative tw-w-16 tw-h-16 md:tw-w-24 md:tw-h-24 tw-bg-[#0F172A]/80 tw-backdrop-blur-md tw-border-2 tw-rounded-none tw-flex tw-items-center tw-justify-center tw-transition-all tw-duration-300"
				 style="border-color: {activeNode === 'coach' ? '#fbbf24' : '#334155'}; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"
				 class:tw-shadow-[0_0_40px_rgba(251,191,36,0.6)]={activeNode === 'coach'}
				 class:tw-scale-110={activeNode === 'coach'}
			>
				<Icon name="data.target" class="tw-w-8 tw-h-8 md:tw-w-10 md:tw-h-10 tw-transition-colors tw-duration-300 {activeNode === 'coach' ? 'tw-text-[#fbbf24]' : 'tw-text-slate-500'}" />
				{#if activeNode === 'coach'}
					<div class="tw-absolute tw-inset-0 tw-border tw-border-[#fbbf24] tw-animate-ping tw-opacity-30" style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"></div>
				{/if}
			</div>
			<!-- High Contrast Label -->
			<div class="tw-mt-4 tw-px-4 tw-py-1 tw-bg-[#0F172A] tw-border tw-border-[#fbbf24] tw-rounded-none tw-opacity-0 tw-translate-y-2 group-hover:tw-opacity-100 group-hover:tw-translate-y-0 tw-transition-all tw-duration-300 tw-shadow-[0_0_15px_rgba(251,191,36,0.4)]">
				<span class="tw-font-mono tw-text-xs md:tw-text-sm tw-font-bold tw-text-[#fbbf24] tw-tracking-[0.2em]">COACH</span>
			</div>
		</div>

		<!-- Athlete Node -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_mouse_events_have_key_events -->
		<div 
			class="tw-absolute tw-top-[70%] tw-left-[20%] tw--translate-x-1/2 tw--translate-y-1/2 tw-flex tw-flex-col tw-items-center tw-cursor-pointer tw-group tw-z-20"
			onmouseenter={() => activeNode = 'athlete'}
			onmouseleave={() => activeNode = null}
		>
			<div class="tw-relative tw-w-16 tw-h-16 md:tw-w-24 md:tw-h-24 tw-bg-[#0F172A]/80 tw-backdrop-blur-md tw-border-2 tw-rounded-none tw-flex tw-items-center tw-justify-center tw-transition-all tw-duration-300"
				 style="border-color: {activeNode === 'athlete' ? '#daff0a' : '#334155'}; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"
				 class:tw-shadow-[0_0_40px_rgba(218,255,10,0.4)]={activeNode === 'athlete'}
				 class:tw-scale-110={activeNode === 'athlete'}
			>
				<Icon name="game.zap" class="tw-w-8 tw-h-8 md:tw-w-10 md:tw-h-10 tw-transition-colors tw-duration-300 {activeNode === 'athlete' ? 'tw-text-[#daff0a]' : 'tw-text-slate-500'}" />
				{#if activeNode === 'athlete'}
					<div class="tw-absolute tw-inset-0 tw-border tw-border-[#daff0a] tw-animate-ping tw-opacity-30" style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"></div>
				{/if}
			</div>
			<!-- High Contrast Label -->
			<div class="tw-mt-4 tw-px-4 tw-py-1 tw-bg-[#0F172A] tw-border tw-border-[#daff0a] tw-rounded-none tw-opacity-0 tw-translate-y-2 group-hover:tw-opacity-100 group-hover:tw-translate-y-0 tw-transition-all tw-duration-300 tw-shadow-[0_0_15px_rgba(218,255,10,0.3)]">
				<span class="tw-font-mono tw-text-xs md:tw-text-sm tw-font-bold tw-text-[#daff0a] tw-tracking-[0.2em]">ATHLETE</span>
			</div>
		</div>

		<!-- Parent Node -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_mouse_events_have_key_events -->
		<div 
			class="tw-absolute tw-top-[70%] tw-left-[80%] tw--translate-x-1/2 tw--translate-y-1/2 tw-flex tw-flex-col tw-items-center tw-cursor-pointer tw-group tw-z-20"
			onmouseenter={() => activeNode = 'parent'}
			onmouseleave={() => activeNode = null}
		>
			<div class="tw-relative tw-w-16 tw-h-16 md:tw-w-24 md:tw-h-24 tw-bg-[#0F172A]/80 tw-backdrop-blur-md tw-border-2 tw-rounded-none tw-flex tw-items-center tw-justify-center tw-transition-all tw-duration-300"
				 style="border-color: {activeNode === 'parent' ? '#14b8a6' : '#334155'}; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"
				 class:tw-shadow-[0_0_40px_rgba(20,184,166,0.5)]={activeNode === 'parent'}
				 class:tw-scale-110={activeNode === 'parent'}
			>
				<Icon name="status.shield-check" class="tw-w-8 tw-h-8 md:tw-w-10 md:tw-h-10 tw-transition-colors tw-duration-300 {activeNode === 'parent' ? 'tw-text-[#14b8a6]' : 'tw-text-slate-500'}" />
				{#if activeNode === 'parent'}
					<div class="tw-absolute tw-inset-0 tw-border tw-border-[#14b8a6] tw-animate-ping tw-opacity-30" style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"></div>
				{/if}
			</div>
			<!-- High Contrast Label -->
			<div class="tw-mt-4 tw-px-4 tw-py-1 tw-bg-[#0F172A] tw-border tw-border-[#14b8a6] tw-rounded-none tw-opacity-0 tw-translate-y-2 group-hover:tw-opacity-100 group-hover:tw-translate-y-0 tw-transition-all tw-duration-300 tw-shadow-[0_0_15px_rgba(20,184,166,0.4)]">
				<span class="tw-font-mono tw-text-xs md:tw-text-sm tw-font-bold tw-text-[#14b8a6] tw-tracking-[0.2em]">PARENT</span>
			</div>
		</div>
	</div>

	<!-- High-Tech Data Readout HUD -->
	<div class="tw-absolute tw-bottom-0 tw-left-0 tw-w-full tw-bg-gradient-to-t tw-from-[#000000] tw-to-transparent tw-pt-32 tw-pb-8 tw-px-8 tw-flex tw-justify-center tw-z-30 tw-pointer-events-none">
		<div class="tw-w-full tw-max-w-3xl tw-bg-[#0F172A]/90 tw-backdrop-blur-xl tw-border-t-2 tw-border-x tw-rounded-t-[8px] tw-p-6 tw-shadow-[0_-20px_40px_rgba(0,0,0,0.8)] tw-transition-all tw-duration-500 tw-min-h-[160px] tw-flex tw-flex-col tw-justify-center"
			 class:tw-border-[#fbbf24]={activeNode === 'coach'}
			 class:tw-border-[#daff0a]={activeNode === 'athlete'}
			 class:tw-border-[#14b8a6]={activeNode === 'parent'}
			 class:tw-border-[#334155]={!activeNode}
		>
			{#if activeNode}
				<div class="tw-flex tw-items-start tw-gap-6">
					<div class="tw-w-16 tw-h-16 tw-shrink-0 tw-flex tw-items-center tw-justify-center" style="background-color: {hudContent[activeNode].color}15; border: 1px solid {hudContent[activeNode].color}50; clip-path: polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%);">
						<Icon name={hudContent[activeNode].icon as IconName} class="tw-w-8 tw-h-8" style="color: {hudContent[activeNode].color};" />
					</div>
					<div class="tw-flex-1 tw-min-w-0">
						<div class="tw-flex tw-items-center tw-justify-between tw-mb-3">
							<h4 class="tw-font-mono tw-text-base md:tw-text-lg tw-font-bold tw-tracking-widest tw-uppercase" style="color: {hudContent[activeNode].color};">
								{hudContent[activeNode].title}
							</h4>
							<div class="tw-flex tw-items-center tw-gap-2">
								<div class="tw-w-2 tw-h-2 tw-rounded-full tw-animate-pulse" style="background-color: {hudContent[activeNode].color};"></div>
								<span class="tw-text-[10px] tw-font-mono tw-tracking-widest tw-text-[#fafafa]">SYS.SYNC_ACTIVE</span>
							</div>
						</div>
						<p class="tw-text-[#d4d4d8] tw-font-sans tw-text-sm md:tw-text-base tw-leading-relaxed tw-min-h-[48px]" style="font-family: 'Switzer', sans-serif;">
							{displayedDesc}<span class="tw-animate-pulse" style="color: {hudContent[activeNode].color};">_</span>
						</p>
					</div>
				</div>
			{:else}
				<div class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-opacity-60 tw-h-full">
					<div class="tw-flex tw-items-center tw-gap-4 tw-mb-4">
						<div class="tw-w-12 tw-h-[1px] tw-bg-[#334155]"></div>
						<Icon name="data.activity" class="tw-w-8 tw-h-8 tw-text-[#334155] tw-animate-pulse" />
						<div class="tw-w-12 tw-h-[1px] tw-bg-[#334155]"></div>
					</div>
					<p class="tw-font-mono tw-text-xs md:tw-text-sm tw-text-[#334155] tw-tracking-[0.3em] tw-text-center">AWAITING TELEMETRY STREAM<br/><span class="tw-opacity-50 tw-text-[10px]">HOVER NODE TO INITIATE HANDSHAKE</span></p>
				</div>
			{/if}
		</div>
	</div>
</div>
