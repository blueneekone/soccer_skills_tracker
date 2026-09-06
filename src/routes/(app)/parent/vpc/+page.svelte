<!-- 🛡️ SafeSport Compliance Mandate: Secure WebAuthn Verification Protocol Active -->
<script lang="ts">
	import { VpcEngine } from './VpcEngine.svelte';
	import VpcArena from './VpcArena.svelte';

	const engine = new VpcEngine();

	$effect(() => {
		engine.load();
	});
</script>

<svelte:head>
	<title>Verifiable Parental Consent · Parent OS</title>
</svelte:head>

<VpcArena {engine} />
