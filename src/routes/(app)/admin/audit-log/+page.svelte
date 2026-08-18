<script lang="ts">
	import { AdminAuditEngine } from './AdminAuditEngine.svelte.js';
	import AdminAuditHUD from './AdminAuditHUD.svelte';
	import AdminAuditArena from './AdminAuditArena.svelte';
	import '$lib/styles/enterprise-console.css';
	

	const engine = new AdminAuditEngine();
	engine.subscribe();
</script>

<div
	class="pd-page-root al-page tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1 tw-min-h-0 tw-bg-[#0B0F19] tw-text-[#FAFAFA] dark-form-surface cc-root tw-box-border"
	style="padding: var(--bento-pad-liquid, clamp(20px, 4vw, 32px)); box-sizing: border-box;"
	data-admin-shell="true"
>
	<div class="al-card tw-w-full tw-min-w-0 tw-flex tw-flex-col tw-min-h-0 tw-flex-1">
		<div class="al-root tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-min-h-0 tw-flex-1 tw-overflow-y-auto">
			<AdminAuditHUD {engine} />
			<AdminAuditArena {engine} />
		</div>
	</div>
</div>
