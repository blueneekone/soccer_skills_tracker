<script lang="ts">
	import { CoachClearanceEngine } from './CoachClearanceEngine.svelte.js';
	import CoachClearanceHUD from './CoachClearanceHUD.svelte';
	import CoachClearanceArena from './CoachClearanceArena.svelte';

	interface Props {
		headerLabel?: string;
		pageTitle?: string;
		clubId?: string;
	}

	let {
		headerLabel = 'DIRECTOR PORTAL — COMPLIANCE PANOPTICON',
		pageTitle = 'Staff Clearance Matrix',
		clubId: clubIdProp = '',
	}: Props = $props();

	const engine = new CoachClearanceEngine();
	$effect(() => {
		engine.clubIdProp = clubIdProp;
	});
	engine.subscribe();
</script>

<svelte:head>
	<title>{pageTitle} — Compliance</title>
</svelte:head>

<div class="tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-gap-[clamp(16px,2vw,24px)] tw-bg-[#0B0F19] tw-text-[#FAFAFA]">
	<CoachClearanceHUD {engine} {headerLabel} {pageTitle} />
	<div class="v-table-wrap tw-w-full tw-overflow-x-auto">
		<CoachClearanceArena {engine} />
	</div>
</div>
