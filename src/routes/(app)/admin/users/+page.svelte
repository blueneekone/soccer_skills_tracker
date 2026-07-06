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

<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-[clamp(16px,2vw,24px)] tw-w-full">
	<div class="xl:tw-col-span-12 tw-min-w-0">
		<div class="gu-root">
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
