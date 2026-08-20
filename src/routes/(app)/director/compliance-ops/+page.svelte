<script lang="ts">
	import { ComplianceOpsEngine } from './ComplianceOpsEngine.svelte.js';
	import ComplianceOpsHUD from './ComplianceOpsHUD.svelte';
	import ComplianceOpsArena from './ComplianceOpsArena.svelte';

	const engine = new ComplianceOpsEngine();
</script>

<svelte:head>
	<title>Compliance & Ops — Director OS</title>
</svelte:head>

<div class="pd-page-root tw-h-[100dvh] tw-overflow-hidden tw-bg-[#000000] tw-text-[#FAFAFA] tw-flex tw-flex-col">
	<ComplianceOpsHUD {engine} />
	<main class="tw-flex-1 tw-flex tw-flex-col tw-min-w-0 tw-overflow-y-auto">
		<ComplianceOpsArena {engine} />
	</main>
</div>
