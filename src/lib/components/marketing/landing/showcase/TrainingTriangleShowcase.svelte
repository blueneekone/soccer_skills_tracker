<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	
	let activeNode: 'coach' | 'athlete' | 'parent' | null = $state(null);

	const hudContent = {
		coach: {
			title: 'Coach Engine',
			desc: 'Intent formulations flow directly to the squad.',
			color: '#fbbf24', // Action Gold
			icon: 'data.target'
		},
		athlete: {
			title: 'Athlete OS',
			desc: 'Logs performance and avoids skill decay.',
			color: '#daff0a', // Cyber Yellow
			icon: 'game.zap'
		},
		parent: {
			title: 'Parent Shield',
			desc: 'Validates compliance & guards safety.',
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
			}, 25);
		} else {
			displayedDesc = '';
			if (typingInterval) clearInterval(typingInterval);
		}
		
		return () => {
			if (typingInterval) clearInterval(typingInterval);
		};
	});
</script>

<div class="tw-flex tw-flex-col tw-w-full tw-max-w-5xl tw-mx-auto tw-bg-[#000000] tw-rounded-[2px] tw-border-y tw-border-[#334155] tw-shadow-[0_0_120px_rgba(20,184,166,0.08)]">
	
	<!-- Tech Noir Grid Background -->
	<div class="tw-absolute tw-inset-0 tw-opacity-10" style="background-image: linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px); background-size: 40px 40px;"></div>
	
	<!-- Scanline Overlay -->
	<div class="tw-absolute tw-inset-0 tw-pointer-events-none tw-bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.25)_50%)] tw-bg-[length:100%_4px] tw-z-50 tw-opacity-20 tw-mix-blend-overlay"></div>

	<!-- Target Crosshairs (Structural Grey) -->
	<div class="tw-absolute tw-top-6 tw-left-6 tw-w-6 tw-h-6 tw-border-t-2 tw-border-l-2 tw-border-[#334155]"></div>
	<div class="tw-absolute tw-top-6 tw-right-6 tw-w-6 tw-h-6 tw-border-t-2 tw-border-r-2 tw-border-[#334155]"></div>
	<div class="tw-absolute tw-bottom-6 tw-left-6 tw-w-6 tw-h-6 tw-border-b-2 tw-border-l-2 tw-border-[#334155]"></div>
	<div class="tw-absolute tw-bottom-6 tw-right-6 tw-w-6 tw-h-6 tw-border-b-2 tw-border-r-2 tw-border-[#334155]"></div>

	<div class="tw-relative tw-w-full tw-aspect-square tw-max-w-[700px] tw-mx-auto tw-p-8 md:tw-p-12 tw-pb-12 md:tw-pb-16 tw-flex tw-items-center tw-justify-center">
		
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
				<linearGradient id="grad-coach-core" x1="50" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stop-color="#fbbf24" stop-opacity="0.8" />
					<stop offset="100%" stop-color="#fbbf24" stop-opacity="0.1" />
				</linearGradient>
				<linearGradient id="grad-athlete-core" x1="15.4" y1="70" x2="50" y2="50">
					<stop offset="0%" stop-color="#daff0a" stop-opacity="0.8" />
					<stop offset="100%" stop-color="#daff0a" stop-opacity="0.1" />
				</linearGradient>
				<linearGradient id="grad-parent-core" x1="84.6" y1="70" x2="50" y2="50">
					<stop offset="0%" stop-color="#14b8a6" stop-opacity="0.8" />
					<stop offset="100%" stop-color="#14b8a6" stop-opacity="0.1" />
				</linearGradient>
				<linearGradient id="grad-coach-athlete" x1="50" y1="10" x2="15.4" y2="70">
					<stop offset="0%" stop-color="#fbbf24" />
					<stop offset="100%" stop-color="#daff0a" />
				</linearGradient>
				<linearGradient id="grad-coach-parent" x1="50" y1="10" x2="84.6" y2="70">
					<stop offset="0%" stop-color="#fbbf24" />
					<stop offset="100%" stop-color="#14b8a6" />
				</linearGradient>
				<linearGradient id="grad-athlete-parent" x1="15.4" y1="70" x2="84.6" y2="70">
					<stop offset="0%" stop-color="#daff0a" />
					<stop offset="100%" stop-color="#14b8a6" />
				</linearGradient>
				<linearGradient id="grad-athlete-coach" x1="15.4" y1="70" x2="50" y2="10">
					<stop offset="0%" stop-color="#daff0a" />
					<stop offset="100%" stop-color="#fbbf24" />
				</linearGradient>
				<linearGradient id="grad-parent-coach" x1="84.6" y1="70" x2="50" y2="10">
					<stop offset="0%" stop-color="#14b8a6" />
					<stop offset="100%" stop-color="#fbbf24" />
				</linearGradient>
				<linearGradient id="grad-parent-athlete" x1="84.6" y1="70" x2="15.4" y2="70">
					<stop offset="0%" stop-color="#14b8a6" />
					<stop offset="100%" stop-color="#daff0a" />
				</linearGradient>
			</defs>

			<!-- Orbital Triangle Ring -->
			<circle cx="50" cy="50" r="40" fill="none" stroke="#334155" stroke-width="0.2" stroke-dasharray="1 2" opacity="0.6"/>

			<!-- Radial Beams (Nodes to Core) -->
			<!-- Coach to Core -->
			<line x1="50" y1="17" x2="50" y2="28" stroke="url(#grad-coach-core)" stroke-width={activeNode === 'coach' ? '1.5' : '0.3'} class="tw-transition-all tw-duration-500" opacity={!activeNode || activeNode === 'coach' ? '1' : '0.2'} filter={activeNode === 'coach' ? 'url(#ultra-glow)' : 'none'} />
			<!-- Athlete to Core -->
			<line x1="21.5" y1="64" x2="31" y2="59" stroke="url(#grad-athlete-core)" stroke-width={activeNode === 'athlete' ? '1.5' : '0.3'} class="tw-transition-all tw-duration-500" opacity={!activeNode || activeNode === 'athlete' ? '1' : '0.2'} filter={activeNode === 'athlete' ? 'url(#ultra-glow)' : 'none'} />
			<!-- Parent to Core -->
			<line x1="78.5" y1="64" x2="69" y2="59" stroke="url(#grad-parent-core)" stroke-width={activeNode === 'parent' ? '1.5' : '0.3'} class="tw-transition-all tw-duration-500" opacity={!activeNode || activeNode === 'parent' ? '1' : '0.2'} filter={activeNode === 'parent' ? 'url(#ultra-glow)' : 'none'} />
			
			<!-- Inter-Node Orbital Beams (Perimeter Flows) -->
			<!-- Coach feeds Athlete (Left Arc Down) -->
			<path d="M 50,10 A 40,40 0 0,0 15.4,70" fill="none" stroke="url(#grad-coach-athlete)" stroke-width={activeNode === 'coach' ? '1.5' : '0.3'} stroke-dasharray="3 3" class="tw-transition-all tw-duration-500 tw-ease-out" filter={activeNode === 'coach' ? 'url(#ultra-glow)' : 'none'} opacity={activeNode === 'coach' ? '0.8' : '0.1'}>
				<animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
			</path>
			<!-- Coach feeds Parent (Right Arc Down) -->
			<path d="M 50,10 A 40,40 0 0,1 84.6,70" fill="none" stroke="url(#grad-coach-parent)" stroke-width={activeNode === 'coach' ? '1.5' : '0.3'} stroke-dasharray="3 3" class="tw-transition-all tw-duration-500 tw-ease-out" filter={activeNode === 'coach' ? 'url(#ultra-glow)' : 'none'} opacity={activeNode === 'coach' ? '0.8' : '0.1'}>
				<animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
			</path>

			<!-- Athlete feeds Parent (Bottom Arc Right) -->
			<path d="M 15.4,70 A 40,40 0 0,0 84.6,70" fill="none" stroke="url(#grad-athlete-parent)" stroke-width={activeNode === 'athlete' ? '1.5' : '0.3'} stroke-dasharray="3 3" class="tw-transition-all tw-duration-500 tw-ease-out" filter={activeNode === 'athlete' ? 'url(#ultra-glow)' : 'none'} opacity={activeNode === 'athlete' ? '0.8' : '0.1'}>
				<animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
			</path>
			<!-- Athlete feeds Coach (Left Arc Up) -->
			<path d="M 15.4,70 A 40,40 0 0,1 50,10" fill="none" stroke="url(#grad-athlete-coach)" stroke-width={activeNode === 'athlete' ? '1.5' : '0.3'} stroke-dasharray="3 3" class="tw-transition-all tw-duration-500 tw-ease-out" filter={activeNode === 'athlete' ? 'url(#ultra-glow)' : 'none'} opacity={activeNode === 'athlete' ? '0.8' : '0.1'}>
				<animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
			</path>

			<!-- Parent feeds Coach (Right Arc Up) -->
			<path d="M 84.6,70 A 40,40 0 0,0 50,10" fill="none" stroke="url(#grad-parent-coach)" stroke-width={activeNode === 'parent' ? '1.5' : '0.3'} stroke-dasharray="3 3" class="tw-transition-all tw-duration-500 tw-ease-out" filter={activeNode === 'parent' ? 'url(#ultra-glow)' : 'none'} opacity={activeNode === 'parent' ? '0.8' : '0.1'}>
				<animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
			</path>
			<!-- Parent feeds Athlete (Bottom Arc Left) -->
			<path d="M 84.6,70 A 40,40 0 0,1 15.4,70" fill="none" stroke="url(#grad-parent-athlete)" stroke-width={activeNode === 'parent' ? '1.5' : '0.3'} stroke-dasharray="3 3" class="tw-transition-all tw-duration-500 tw-ease-out" filter={activeNode === 'parent' ? 'url(#ultra-glow)' : 'none'} opacity={activeNode === 'parent' ? '0.8' : '0.1'}>
				<animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
			</path>

			<!-- Coach Hexagon -->
			<polygon points="50,4 55,7 55,13 50,16 45,13 45,7" fill="#000000" stroke="#fbbf24" stroke-width="0.3" class="tw-transition-all tw-duration-500" filter={activeNode === 'coach' ? 'url(#ultra-glow)' : 'none'} opacity={!activeNode || activeNode === 'coach' ? '1' : '0.2'}/>
			
			<!-- Athlete Hexagon -->
			<polygon points="15.4,64 20.4,67 20.4,73 15.4,76 10.4,73 10.4,67" fill="#000000" stroke="#daff0a" stroke-width="0.3" class="tw-transition-all tw-duration-500" filter={activeNode === 'athlete' ? 'url(#ultra-glow)' : 'none'} opacity={!activeNode || activeNode === 'athlete' ? '1' : '0.2'}/>

			<!-- Parent Hexagon -->
			<polygon points="84.6,64 89.6,67 89.6,73 84.6,76 79.6,73 79.6,67" fill="#000000" stroke="#14b8a6" stroke-width="0.3" class="tw-transition-all tw-duration-500" filter={activeNode === 'parent' ? 'url(#ultra-glow)' : 'none'} opacity={!activeNode || activeNode === 'parent' ? '1' : '0.2'}/>

			<!-- Telemetry Packets (Data traversing the lines) -->
			{#if activeNode === 'coach'}
				<!-- Orbit Beams -->
				<circle r="2" fill="#daff0a" filter="url(#ultra-glow)">
					<animateMotion path="M 50,10 A 40,40 0 0,0 15.4,70" dur="1.2s" repeatCount="indefinite" />
				</circle>
				<circle r="2" fill="#14b8a6" filter="url(#ultra-glow)">
					<animateMotion path="M 50,10 A 40,40 0 0,1 84.6,70" dur="1.2s" repeatCount="indefinite" />
				</circle>
			{/if}
			{#if activeNode === 'athlete'}
				<!-- Orbit Beams -->
				<circle r="2" fill="#14b8a6" filter="url(#ultra-glow)">
					<animateMotion path="M 15.4,70 A 40,40 0 0,0 84.6,70" dur="1.2s" repeatCount="indefinite" />
				</circle>
				<circle r="2" fill="#fbbf24" filter="url(#ultra-glow)">
					<animateMotion path="M 15.4,70 A 40,40 0 0,1 50,10" dur="1.2s" repeatCount="indefinite" />
				</circle>
			{/if}
			{#if activeNode === 'parent'}
				<!-- Orbit Beams -->
				<circle r="2" fill="#fbbf24" filter="url(#ultra-glow)">
					<animateMotion path="M 84.6,70 A 40,40 0 0,0 50,10" dur="1.2s" repeatCount="indefinite" />
				</circle>
				<circle r="2" fill="#daff0a" filter="url(#ultra-glow)">
					<animateMotion path="M 84.6,70 A 40,40 0 0,1 15.4,70" dur="1.2s" repeatCount="indefinite" />
				</circle>
			{/if}
		</svg>

		<!-- CENTRAL DATA CORE (The Integrated HUD) -->
		<div class="tw-absolute tw-top-[50%] tw-left-[50%] tw--translate-x-1/2 tw--translate-y-1/2 tw-w-[50%] tw-h-[50%] tw-rounded-full tw-z-30 tw-flex tw-items-center tw-justify-center tw-transition-all tw-duration-500 tw-overflow-hidden"
			 style="
			 	backdrop-filter: blur(24px);
				background: {activeNode ? `rgba(15,23,42,0.85)` : `rgba(15,23,42,0.5)`};
				border: 1px solid {activeNode ? hudContent[activeNode].color + '60' : '#334155'};
				box-shadow: {activeNode ? `0 0 50px ${hudContent[activeNode].color}20 inset, 0 0 30px ${hudContent[activeNode].color}10` : '0 0 20px rgba(0,0,0,0.5) inset'};
			 ">
			
			<div class="tw-p-6 md:tw-p-10 tw-text-center tw-flex tw-flex-col tw-items-center tw-justify-center tw-w-full tw-h-full">
				{#if activeNode}
					<div class="tw-flex tw-items-center tw-gap-3 tw-mb-2">
						<Icon name={hudContent[activeNode].icon as IconName} class="tw-w-6 tw-h-6 md:tw-w-8 md:tw-h-8" style="color: {hudContent[activeNode].color};" />
						<h4 class="tw-font-mono tw-text-sm md:tw-text-xl tw-font-bold tw-tracking-widest tw-uppercase" style="color: {hudContent[activeNode].color};">
							{hudContent[activeNode].title}
						</h4>
					</div>
					<div class="tw-w-full tw-h-[1px] tw-my-3 tw-bg-gradient-to-r tw-from-transparent tw-via-[#fafafa20] tw-to-transparent"></div>
					<p class="tw-text-[#d4d4d8] tw-font-sans tw-text-xs md:tw-text-sm tw-leading-relaxed tw-max-w-[200px] md:tw-max-w-[250px]" style="font-family: 'Switzer', sans-serif;">
						{displayedDesc}<span class="tw-animate-pulse" style="color: {hudContent[activeNode].color};">_</span>
					</p>
					<div class="tw-absolute tw-bottom-6 tw-flex tw-items-center tw-gap-2">
						<div class="tw-w-1.5 tw-h-1.5 tw-rounded-full tw-animate-pulse" style="background-color: {hudContent[activeNode].color};"></div>
						<span class="tw-text-[9px] tw-font-mono tw-tracking-widest tw-text-[#fafafa]">SYS.SYNC_ACTIVE</span>
					</div>
				{:else}
					<div class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-opacity-60">
						<Icon name="data.activity" class="tw-w-8 tw-h-8 tw-text-[#334155] tw-animate-pulse tw-mb-4" />
						<p class="tw-font-mono tw-text-[10px] md:tw-text-xs tw-text-[#334155] tw-tracking-[0.3em] tw-text-center">AWAITING TELEMETRY<br/><span class="tw-opacity-50 tw-text-[8px]">HOVER TO INITIATE</span></p>
					</div>
				{/if}
			</div>
		</div>

		<!-- ORBITAL NODES -->
		<!-- Coach Node (12 o'clock / 90 deg / Top Center) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_mouse_events_have_key_events -->
		<div 
			class="tw-absolute tw-top-[10%] tw-left-[50%] tw--translate-x-1/2 tw--translate-y-1/2 tw-flex tw-flex-col tw-items-center tw-cursor-pointer tw-group tw-z-40"
			onmouseenter={() => activeNode = 'coach'}
			onmouseleave={() => activeNode = null}
		>
			<div class="tw-relative tw-w-16 tw-h-16 md:tw-w-20 md:tw-h-20 tw-flex tw-items-center tw-justify-center tw-transition-all tw-duration-300"
				 style="
					clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
					background: {activeNode === 'coach' ? 'rgba(251,191,36,0.15)' : 'rgba(15,23,42,0.85)'};
					filter: {activeNode === 'coach' ? 'drop-shadow(0 0 12px rgba(251,191,36,0.7))' : 'drop-shadow(0 0 4px rgba(51,65,85,0.4))'};
					transition: filter 0.3s ease, background 0.3s ease;
				"
				class:tw-scale-110={activeNode === 'coach'}
			>
				<Icon name="data.target" size={28} class="tw-shrink-0 tw-transition-colors tw-duration-300 {activeNode === 'coach' ? 'tw-text-[#fbbf24]' : 'tw-text-slate-500'}" />
			</div>
			<!-- High Contrast Label -->
			<div class="tw-mt-3 tw-px-4 tw-py-1 tw-bg-[#0F172A] tw-border tw-border-[#fbbf24] tw-rounded-none tw-opacity-0 tw-translate-y-2 group-hover:tw-opacity-100 group-hover:tw-translate-y-0 tw-transition-all tw-duration-300 tw-shadow-[0_0_15px_rgba(251,191,36,0.4)]">
				<span class="tw-font-mono tw-text-xs md:tw-text-sm tw-font-bold tw-text-[#fbbf24] tw-tracking-[0.2em]">COACH</span>
			</div>
		</div>

		<!-- Athlete Node (8 o'clock / 210 deg / Bottom Left) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_mouse_events_have_key_events -->
		<div 
			class="tw-absolute tw-top-[70%] tw-left-[15.4%] tw--translate-x-1/2 tw--translate-y-1/2 tw-flex tw-flex-col tw-items-center tw-cursor-pointer tw-group tw-z-40"
			onmouseenter={() => activeNode = 'athlete'}
			onmouseleave={() => activeNode = null}
		>
			<div class="tw-relative tw-w-16 tw-h-16 md:tw-w-20 md:tw-h-20 tw-flex tw-items-center tw-justify-center tw-transition-all tw-duration-300"
				 style="
					clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
					background: {activeNode === 'athlete' ? 'rgba(218,255,10,0.15)' : 'rgba(15,23,42,0.85)'};
					filter: {activeNode === 'athlete' ? 'drop-shadow(0 0 12px rgba(218,255,10,0.6))' : 'drop-shadow(0 0 4px rgba(51,65,85,0.4))'};
					transition: filter 0.3s ease, background 0.3s ease;
				"
				class:tw-scale-110={activeNode === 'athlete'}
			>
				<Icon name="game.zap" size={28} class="tw-shrink-0 tw-transition-colors tw-duration-300 {activeNode === 'athlete' ? 'tw-text-[#daff0a]' : 'tw-text-slate-500'}" />
			</div>
			<!-- High Contrast Label -->
			<div class="tw-mt-3 tw-px-4 tw-py-1 tw-bg-[#0F172A] tw-border tw-border-[#daff0a] tw-rounded-none tw-opacity-0 tw-translate-y-2 group-hover:tw-opacity-100 group-hover:tw-translate-y-0 tw-transition-all tw-duration-300 tw-shadow-[0_0_15px_rgba(218,255,10,0.3)]">
				<span class="tw-font-mono tw-text-xs md:tw-text-sm tw-font-bold tw-text-[#daff0a] tw-tracking-[0.2em]">ATHLETE</span>
			</div>
		</div>

		<!-- Parent Node (4 o'clock / 330 deg / Bottom Right) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_mouse_events_have_key_events -->
		<div 
			class="tw-absolute tw-top-[70%] tw-left-[84.6%] tw--translate-x-1/2 tw--translate-y-1/2 tw-flex tw-flex-col tw-items-center tw-cursor-pointer tw-group tw-z-40"
			onmouseenter={() => activeNode = 'parent'}
			onmouseleave={() => activeNode = null}
		>
			<div class="tw-relative tw-w-16 tw-h-16 md:tw-w-20 md:tw-h-20 tw-flex tw-items-center tw-justify-center tw-transition-all tw-duration-300"
				 style="
					clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
					background: {activeNode === 'parent' ? 'rgba(20,184,166,0.15)' : 'rgba(15,23,42,0.85)'};
					filter: {activeNode === 'parent' ? 'drop-shadow(0 0 12px rgba(20,184,166,0.7))' : 'drop-shadow(0 0 4px rgba(51,65,85,0.4))'};
					transition: filter 0.3s ease, background 0.3s ease;
				"
				class:tw-scale-110={activeNode === 'parent'}
			>
				<Icon name="status.shield-check" size={28} class="tw-shrink-0 tw-transition-colors tw-duration-300 {activeNode === 'parent' ? 'tw-text-[#14b8a6]' : 'tw-text-slate-500'}" />
			</div>
			<!-- High Contrast Label -->
			<div class="tw-mt-3 tw-px-4 tw-py-1 tw-bg-[#0F172A] tw-border tw-border-[#14b8a6] tw-rounded-none tw-opacity-0 tw-translate-y-2 group-hover:tw-opacity-100 group-hover:tw-translate-y-0 tw-transition-all tw-duration-300 tw-shadow-[0_0_15px_rgba(20,184,166,0.4)]">
				<span class="tw-font-mono tw-text-xs md:tw-text-sm tw-font-bold tw-text-[#14b8a6] tw-tracking-[0.2em]">PARENT</span>
			</div>
		</div>
	</div>
</div>
