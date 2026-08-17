<script lang="ts">
	import { RecruitersEngine } from './RecruitersEngine.svelte.js';
	import RecruitersHUD from './RecruitersHUD.svelte';
	import RecruitersArena from './RecruitersArena.svelte';
	import '$lib/styles/enterprise-console.css';
	

	const engine = new RecruitersEngine();
	engine.subscribe();
</script>

<div class="pd-page-root tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1" style="padding: var(--bento-pad-liquid, clamp(16px, 2vw, 24px)); box-sizing: border-box;">
	<RecruitersHUD {engine} />
	<RecruitersArena {engine} />
</div>
