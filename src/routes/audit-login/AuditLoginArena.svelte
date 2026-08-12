<script lang="ts">
	import type { AuditLoginEngine } from './AuditLoginEngine.svelte';

	let { engine }: { engine: AuditLoginEngine } = $props();

	function onsubmit(e: Event) {
		e.preventDefault();
		void engine.handleLogin();
	}
</script>

<h1>Audit Login</h1>
<p>Please enter your secure audit token to proceed.</p>

<form {onsubmit} class="tw-flex tw-flex-col tw-gap-4 tw-max-w-md">
	<div>
		<label for="audit-token" class="tw-block tw-text-sm tw-font-bold tw-mb-2">Secure Token</label>
		<input
			id="audit-token"
			type="password"
			bind:value={engine.token}
			placeholder="Paste token here"
			class="tw-w-full tw-p-2 tw-border tw-border-[#334155] tw-bg-transparent tw-rounded tw-text-[#fafafa] focus:tw-border-[#14b8a6] focus:tw-outline-none"
			disabled={engine.loading}
		/>
	</div>

	<button
		type="submit"
		class="tw-bg-[#14b8a6]/10 tw-text-[#14b8a6] tw-px-4 tw-py-2 tw-rounded tw-font-bold hover:tw-bg-[#14b8a6]/20 disabled:tw-opacity-50 tw-transition-colors tw-border tw-border-[#14b8a6]/20"
		disabled={engine.loading}
	>
		{engine.loading ? 'Authenticating...' : 'Sign In'}
	</button>
</form>
