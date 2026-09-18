<script lang="ts">
	interface Props {
		context?: 'nexus' | 'default';
		class?: string;
		size?: 'sm' | 'md' | 'lg';
	}
	let { context = 'nexus', class: extraClass = '', size = 'md' }: Props = $props();

	let svgSizeClass = $derived(
		size === 'sm' ? 'tw-w-5 tw-h-5' :
		size === 'lg' ? 'tw-w-8 tw-h-8' :
		'tw-w-6 tw-h-6'
	);

	let titleSizeClass = $derived(
		size === 'sm' ? 'tw-text-xs' :
		size === 'lg' ? 'tw-text-lg' :
		'tw-text-sm'
	);

	let subtitleSizeClass = $derived(
		size === 'sm' ? 'tw-text-[0.45rem]' :
		size === 'lg' ? 'tw-text-[0.65rem]' :
		'tw-text-[0.55rem]'
	);
</script>

<div class="tw-flex tw-items-center tw-gap-2 tw-overflow-hidden {extraClass}">
	<!-- Spark Mark SVG -->
	<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="{svgSizeClass} tw-shrink-0 tw-drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]">
		<path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="url(#sparkGradient)"/>
		<defs>
			<linearGradient id="sparkGradient" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
				<stop stop-color="#14b8a6"/> <!-- Data Cyan -->
				<stop offset="1" stop-color="#daff0a"/> <!-- Cybernetic Nuclear Yellow -->
			</linearGradient>
		</defs>
	</svg>
	<!-- Wordmark -->
	<div class="tw-flex tw-flex-col tw-justify-center tw-min-w-0">
		<span class="tw-font-sans {titleSizeClass} tw-font-black tw-tracking-[0.2em] tw-text-[#FAFAFA] tw-uppercase tw-truncate tw-leading-none">SSTracker</span>
		{#if context === 'nexus'}
			<span class="tw-font-sans {subtitleSizeClass} tw-font-bold tw-tracking-[0.3em] tw-text-[#14b8a6] tw-uppercase tw-truncate tw-mt-[3px] tw-leading-none">Nexus Command</span>
		{/if}
	</div>
</div>
