<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/setup', { replaceState: true });
	});
</script>

<div
	class="login-gate tw-box-border tw-flex tw-min-h-[100dvh] tw-w-full tw-flex-col tw-items-center tw-justify-center tw-overflow-x-hidden tw-overflow-y-auto tw-bg-black tw-p-4"
>
	<div class="auth-card auth-card--login-surface tw-flex tw-w-full tw-max-w-md tw-flex-col">
		<div
			class="tw-w-full tw-text-center tw-px-2 tw-py-8 sm:tw-rounded-2xl sm:tw-border sm:tw-border-cyan-500/20 sm:tw-bg-cyan-950/25 sm:tw-p-8 sm:tw-shadow-2xl"
		>
			<p
				class="tw-m-0 tw-p-0 tw-text-center tw-font-mono tw-text-sm tw-text-cyan-200/80"
			>
				Redirecting to setup…
			</p>
		</div>
	</div>
</div>
