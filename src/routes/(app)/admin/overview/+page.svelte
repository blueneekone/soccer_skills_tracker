<script lang="ts">
	import { AdminOverviewEngine } from './AdminOverviewEngine.svelte.js';
	import AdminOverviewArena from './AdminOverviewArena.svelte';
	import AdminOverviewHUD from './AdminOverviewHUD.svelte';
	import '$lib/styles/enterprise-console.css';
	import './admin-overview.css';

	const engine = new AdminOverviewEngine();
	engine.subscribe();
</script>

<div
	class="tw-col-span-1 lg:tw-col-span-12 tw-flex tw-flex-col tw-w-full tw-bg-[#0B0F19] tw-text-[#FAFAFA] dark-form-surface cc-root tw-box-border tw-mx-auto tw-max-w-[1680px]"
	style="padding: var(--bento-pad-liquid);"
	data-admin-shell="true"
>
	<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-[clamp(16px,2vw,24px)] tw-w-full tw-min-w-0">
		<div class="xl:tw-col-span-12 tw-min-w-0 tw-flex tw-flex-col tw-break-words tw-whitespace-normal">
			<AdminOverviewHUD {engine} />
			<section
				class="tw-w-full tw-min-w-0"
				style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"
			>
				<div class="tw-min-w-0">
					<AdminOverviewArena {engine} />
				</div>
			</section>
		</div>
	</div>
</div>
