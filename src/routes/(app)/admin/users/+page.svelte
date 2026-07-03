<script lang="ts">
	import { AdminUsersEngine } from './AdminUsersEngine.svelte.js';
	import AdminUsersHUD from './AdminUsersHUD.svelte';
	import AdminUsersArena from './AdminUsersArena.svelte';
	import UserSidecar from '$lib/components/admin/UserSidecar.svelte';
	import { patchUserRowLocally } from '$lib/admin/globalUsersDisplay.js';
	import type { GlobalUserRow } from '$lib/types/adminUsers.js';

	import '$lib/styles/enterprise-console.css';
	import '$lib/styles/global-users.css';

	const engine = new AdminUsersEngine();
	engine.subscribe();
</script>

<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6 tw-w-full">
	<div class="xl:tw-col-span-8 tw-min-w-0">
		<div class="gu-root dark-form-surface">
			<AdminUsersHUD {engine} />
			<AdminUsersArena {engine} />
		</div>
	</div>
	
	<aside class="xl:tw-col-span-4 tw-min-w-0 tw-flex tw-flex-col tw-h-full">
		<UserSidecar
			open={engine.editingAdmin !== null}
			admin={engine.editingAdmin}
			onClose={engine.closeEditAdmin}
			onSaved={(patch) => {
				engine.rows = patchUserRowLocally(engine.rows, patch as GlobalUserRow);
				engine.flashOk = `Saved changes for ${patch.email || patch.id}.`;
			}}
		/>
		
		{#if !engine.editingAdmin}
			<div class="cc-chart-card cc-chart-card--soc tw-h-full tw-flex tw-items-center tw-justify-center tw-text-vanguard-text-muted dark-form-surface" data-admin-shell="true">
				Select a user to view details
			</div>
		{/if}
	</aside>
</div>
