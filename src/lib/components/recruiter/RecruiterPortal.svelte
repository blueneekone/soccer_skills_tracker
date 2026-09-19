<script lang="ts">
	import { RecruiterPortalEngine } from './RecruiterPortalEngine.svelte.js';
	import RecruiterPortalArena from './RecruiterPortalArena.svelte';
	import RecruiterPortalHUD from './RecruiterPortalHUD.svelte';
	import './recruiter_styles.css';

	const engine = new RecruiterPortalEngine();
</script>

<div class="rp-shell">
	<RecruiterPortalHUD {engine} />
	<RecruiterPortalArena {engine} />
</div>

<style>
	.rp-shell {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}
</style>
