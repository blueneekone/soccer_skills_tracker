<script lang="ts">
	interface Props {
		context?: 'nexus' | 'default';
		class?: string;
		size?: 'sm' | 'md' | 'lg';
	}
	let { context = 'nexus', class: extraClass = '', size = 'md' }: Props = $props();

	const imgSize = $derived(
		size === 'sm' ? 'tw-w-7 tw-h-7' :
		size === 'lg' ? 'tw-w-10 tw-h-10' :
		'tw-w-8 tw-h-8'
	);

	let titleSizeClass = $derived(
		size === 'sm' ? 'tw-text-[0.65rem]' :
		size === 'lg' ? 'tw-text-[0.95rem]' :
		'tw-text-[0.75rem]'
	);

	let subtitleSizeClass = $derived(
		size === 'sm' ? 'tw-text-[0.42rem]' :
		size === 'lg' ? 'tw-text-[0.58rem]' :
		'tw-text-[0.48rem]'
	);
</script>

<div class="tw-flex tw-items-center tw-gap-2.5 tw-overflow-hidden {extraClass}">
	<!-- Flame / Torch mark — horizontal lockup for headers/nav -->
	<img
		src="/logo-flame-rembg-hq.png"
		alt="SSTracker"
		class="{imgSize} tw-shrink-0 tw-object-contain tw-drop-shadow-[0_0_10px_rgba(20,184,166,0.5)]"
	/>
	<!-- Wordmark -->
	<div class="tw-flex tw-flex-col tw-justify-center tw-min-w-0">
		<span
			class="{titleSizeClass} tw-font-black tw-tracking-[0.14em] tw-text-[#fafafa] tw-uppercase tw-truncate tw-leading-none"
			style="font-family: 'Geist Mono', ui-monospace, monospace;"
		>SSTracker</span>
		{#if context === 'nexus'}
			<span
				class="{subtitleSizeClass} tw-font-bold tw-tracking-[0.28em] tw-text-[#14b8a6] tw-uppercase tw-truncate tw-mt-[2px] tw-leading-none"
				style="font-family: 'Geist Mono', ui-monospace, monospace;"
			>Nexus Command</span>
		{/if}
	</div>
</div>
