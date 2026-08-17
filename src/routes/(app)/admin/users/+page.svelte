<script lang="ts">
	import { AdminUsersEngine } from './AdminUsersEngine.svelte.js';
	import AdminUsersHUD from './AdminUsersHUD.svelte';
	import AdminUsersArena from './AdminUsersArena.svelte';
	import UserSidecar from '$lib/components/admin/UserSidecar.svelte';
	import { patchUserRowLocally } from '$lib/admin/globalUsersDisplay.js';
	import type { GlobalUserRow } from '$lib/types/adminUsers.js';

	import '$lib/styles/enterprise-console.css';

	const engine = new AdminUsersEngine();
	engine.subscribe();
</script>

<div
	class="pd-page-root tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1 tw-min-h-0 tw-bg-[#0B0F19] tw-text-[#FAFAFA] dark-form-surface cc-root tw-box-border"
	style="padding: var(--bento-pad-liquid, clamp(20px, 4vw, 32px)); box-sizing: border-box;"
	data-admin-shell="true"
>
	<div class="users-card tw-w-full tw-min-w-0 tw-flex tw-flex-col tw-min-h-0 tw-flex-1">
		<div class="gu-root tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-min-h-0 tw-flex-1 tw-overflow-y-auto">
			<AdminUsersHUD {engine} />
			<AdminUsersArena {engine} />
		</div>
	</div>
</div>

<UserSidecar
	open={engine.editingAdmin !== null}
	admin={engine.editingAdmin}
	onClose={engine.closeEditAdmin}
	onSaved={(patch) => {
		engine.rows = patchUserRowLocally(engine.rows, patch as GlobalUserRow);
		engine.flashOk = `Saved changes for ${patch.email || patch.id}.`;
	}}
/>
