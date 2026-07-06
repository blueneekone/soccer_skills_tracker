<script lang="ts">
	import { RecruitersEngine } from './RecruitersEngine.svelte.js';
	import RecruitersHUD from './RecruitersHUD.svelte';
	import RecruitersArena from './RecruitersArena.svelte';
	import '$lib/styles/enterprise-console.css';
	

	const engine = new RecruitersEngine();
	engine.subscribe();
</script>

<div class="ar-root">
	<RecruitersHUD {engine} />
	<RecruitersArena {engine} />
</div>
