<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/setup', { replaceState: true });
	});
</script>

<div
	class="login-gate tw-box-border tw-flex tw-min-h-[100dvh] tw-w-full tw-flex-col tw-p-4 sm:tw-p-8 tw-overflow-x-hidden tw-overflow-y-auto tw-bg-black"
>
	<div
		class="auth-card auth-card--login-surface tw-m-auto tw-flex tw-w-full tw-max-w-md tw-flex-col tw-text-center sm:tw-mx-auto sm:tw-rounded-2xl sm:tw-border sm:tw-border-slate-700 sm:tw-bg-slate-800/50 sm:tw-p-8 sm:tw-shadow-2xl"
	>
		<p
			class="tw-m-0 tw-p-0 tw-text-center tw-font-mono tw-text-sm tw-text-cyan-200/80"
		>
			Redirecting to setup…
		</p>
	</div>
</div>
