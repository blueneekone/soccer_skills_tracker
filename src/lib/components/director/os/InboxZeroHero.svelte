<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';

	let { title = 'INBOX ZERO', subtitle = 'You have zero pending tasks. Breathe easy.' } = $props();
</script>

<div class="inbox-zero-hero" role="status">
	<div class="izh-glass">
		<div class="izh-icon-wrap" aria-hidden="true">
			<div class="izh-glow"></div>
			<Icon name="status.inbox-zero" size={56} class="izh-icon" />
		</div>
		<h4 class="izh-title">{title}</h4>
		<p class="izh-subtitle">{subtitle}</p>
	</div>
</div>

<style>
	.inbox-zero-hero {
		@apply tw-flex tw-w-full tw-items-center tw-justify-center tw-py-12 tw-px-6;
	}

	.izh-glass {
		@apply tw-flex tw-max-w-md tw-flex-col tw-items-center tw-justify-center tw-rounded-2xl tw-border tw-border-white/5 tw-bg-slate-900/40 tw-p-8 tw-text-center tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] tw-backdrop-blur-md tw-transition-all tw-duration-500 hover:tw-border-[#14b8a6]/20 hover:tw-bg-slate-900/60;
	}

	.izh-icon-wrap {
		@apply tw-relative tw-mb-5 tw-flex tw-items-center tw-justify-center;
	}

	.izh-glow {
		@apply tw-absolute tw-h-24 tw-w-24 tw-rounded-full tw-bg-[#14b8a6] tw-opacity-10 tw-blur-2xl tw-transition-opacity tw-duration-700;
	}

	.izh-glass:hover .izh-glow {
		@apply tw-opacity-20 tw-scale-110;
	}

	.izh-icon {
		@apply tw-relative tw-z-10 tw-text-[#14b8a6]/80 tw-drop-shadow-lg tw-transition-transform tw-duration-500;
	}

	.izh-glass:hover .izh-icon {
		@apply tw-scale-110 tw-text-[#14b8a6];
	}

	.izh-title {
		@apply tw-m-0 tw-mb-2 tw-font-mono tw-text-lg tw-font-black tw-tracking-tight tw-text-slate-100;
	}

	.izh-subtitle {
		@apply tw-m-0 tw-font-mono tw-text-sm tw-leading-relaxed tw-text-slate-400;
	}
</style>
