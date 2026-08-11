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
	class="pd-page-root tw-flex tw-flex-col tw-w-full tw-bg-[#0B0F19] tw-text-[#FAFAFA] dark-form-surface cc-root tw-box-border tw-mx-auto tw-max-w-[1680px]"
	style="padding: var(--bento-pad-liquid, clamp(20px, 4vw, 32px)); height: 100dvh; max-height: 100dvh; overflow: hidden; box-sizing: border-box; flex: 1 1 auto; min-height: 0;"
	data-admin-shell="true"
>
	<div
		class="bento-grid-container tw-w-full tw-flex-1 tw-min-h-0"
		style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr)); gap: clamp(16px, 2vw, 24px);"
	>
		<div class="st-bento users-card tw-min-w-0 tw-flex tw-flex-col tw-break-words tw-whitespace-normal tw-min-h-0 tw-h-full" style="grid-column: 1 / -1;">
			<div class="gu-root tw-flex tw-flex-col tw-min-h-0 tw-h-full tw-overflow-y-auto">
				<AdminUsersHUD {engine} />
				<AdminUsersArena {engine} />
			</div>
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
