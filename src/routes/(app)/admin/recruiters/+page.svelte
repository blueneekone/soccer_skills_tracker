<script lang="ts">
	import { RecruitersEngine } from './RecruitersEngine.svelte.js';
	import RecruitersHUD from './RecruitersHUD.svelte';
	import RecruitersArena from './RecruitersArena.svelte';
	import '$lib/styles/enterprise-console.css';
	

	const engine = new RecruitersEngine();
	engine.subscribe();
</script>

<div
	class="pd-page-root tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1 tw-min-h-0 tw-bg-[#0B0F19] tw-text-[#FAFAFA] dark-form-surface cc-root tw-box-border"
	style="padding: var(--bento-pad-liquid, clamp(20px, 4vw, 32px)); box-sizing: border-box;"
	data-admin-shell="true"
>
	<div class="rec-card tw-w-full tw-min-w-0 tw-flex tw-flex-col tw-min-h-0 tw-flex-1">
		<div class="rec-root tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-min-h-0 tw-flex-1 tw-overflow-y-auto">
			<RecruitersHUD {engine} />
			<RecruitersArena {engine} />
		</div>
	</div>
</div>
