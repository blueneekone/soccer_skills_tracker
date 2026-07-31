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
		@apply flex w-full items-center justify-center py-12 px-6;
	}

	.izh-glass {
		@apply flex max-w-md flex-col items-center justify-center rounded-2xl border border-white/5 bg-slate-900/40 p-8 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] backdrop-blur-md transition-all duration-500 hover:border-[#14b8a6]/20 hover:bg-slate-900/60;
	}

	.izh-icon-wrap {
		@apply relative mb-5 flex items-center justify-center;
	}

	.izh-glow {
		@apply absolute h-24 w-24 rounded-full bg-[#14b8a6] opacity-10 blur-2xl transition-opacity duration-700;
	}

	.izh-glass:hover .izh-glow {
		@apply opacity-20 scale-110;
	}

	.izh-title {
		@apply m-0 mb-2 font-mono text-lg font-black tracking-tight text-slate-100;
	}

	.izh-subtitle {
		@apply m-0 font-mono text-sm leading-relaxed text-slate-400;
	}
</style>
