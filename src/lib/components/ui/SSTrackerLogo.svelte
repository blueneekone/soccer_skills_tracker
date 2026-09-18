<script lang="ts">
	interface Props {
		context?: 'nexus' | 'default';
		class?: string;
		size?: 'sm' | 'md' | 'lg';
	}
	let { context = 'nexus', class: extraClass = '', size = 'md' }: Props = $props();

	const markSize = $derived(
		size === 'sm' ? 28 :
		size === 'lg' ? 44 :
		36
	);

	let titleSizeClass = $derived(
		size === 'sm' ? 'tw-text-[0.7rem]' :
		size === 'lg' ? 'tw-text-base' :
		'tw-text-[0.8rem]'
	);

	let subtitleSizeClass = $derived(
		size === 'sm' ? 'tw-text-[0.45rem]' :
		size === 'lg' ? 'tw-text-[0.6rem]' :
		'tw-text-[0.5rem]'
	);
</script>

<div class="tw-flex tw-items-center tw-gap-2.5 tw-overflow-hidden {extraClass}">
	<!-- Crisp inline SVG mark: hexagonal shield with "SS" monogram -->
	<svg
		width={markSize}
		height={markSize}
		viewBox="0 0 40 40"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		class="tw-shrink-0"
	>
		<!-- Hexagon background -->
		<polygon
			points="20,2 36,11 36,29 20,38 4,29 4,11"
			fill="#0f172a"
			stroke="#14b8a6"
			stroke-width="1.5"
		/>
		<!-- Data Cyan accent bar -->
		<rect x="10" y="19" width="20" height="1.5" fill="#14b8a6" opacity="0.6" />
		<!-- "SS" bold letterform -->
		<text
			x="20"
			y="25"
			text-anchor="middle"
			font-family="'Geist Mono', ui-monospace, monospace"
			font-size="14"
			font-weight="900"
			letter-spacing="-1"
			fill="#fafafa"
		>SS</text>
	</svg>

	<!-- Wordmark -->
	<div class="tw-flex tw-flex-col tw-justify-center tw-min-w-0">
		<span
			class="tw-font-mono {titleSizeClass} tw-font-black tw-tracking-[0.12em] tw-text-[#fafafa] tw-uppercase tw-truncate tw-leading-none"
			style="font-family: 'Geist Mono', ui-monospace, monospace;"
		>SSTracker</span>
		{#if context === 'nexus'}
			<span
				class="tw-font-mono {subtitleSizeClass} tw-font-bold tw-tracking-[0.3em] tw-text-[#14b8a6] tw-uppercase tw-truncate tw-mt-[2px] tw-leading-none"
				style="font-family: 'Geist Mono', ui-monospace, monospace;"
			>Nexus Command</span>
		{/if}
	</div>
</div>
