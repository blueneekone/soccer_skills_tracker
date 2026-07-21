<script lang="ts">
	import RecruiterOnboardingArena from './RecruiterOnboardingArena.svelte';
	import { RecruiterOnboardingEngine } from './RecruiterOnboardingEngine.svelte.js';

	const engine = new RecruiterOnboardingEngine();
</script>

<div class="onboarding-shell">
	<RecruiterOnboardingArena {engine} />
</div>

<style>
	.onboarding-shell {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem;
	}
</style>
