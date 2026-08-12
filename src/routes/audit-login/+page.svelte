<script lang="ts">
	import { AuditLoginEngine } from './AuditLoginEngine.svelte';
	import AuditLoginArena from './AuditLoginArena.svelte';
	import AuditLoginHUD from './AuditLoginHUD.svelte';

	const engine = new AuditLoginEngine();
</script>

<svelte:head>
	<title>Audit Login | Nexus Command</title>
</svelte:head>

<div class="tw-min-h-screen tw-bg-[#020617] tw-text-[#fafafa] tw-p-8 tw-flex tw-flex-col tw-items-center tw-justify-center">
	<div class="tw-w-full tw-max-w-md tw-bg-[#0f172a] tw-p-8 tw-rounded-xl tw-border tw-border-[#334155]">
		<AuditLoginArena {engine} />
		<AuditLoginHUD {engine} />
	</div>
</div>
