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
	engine.clubIdProp = clubIdProp;
	engine.subscribe();
</script>

<svelte:head>
	<title>{pageTitle} — Compliance</title>
</svelte:head>

<div class="dp-root coach-clearance-panopticon">
	<CoachClearanceHUD {engine} {headerLabel} {pageTitle} />
	<CoachClearanceArena {engine} />
</div>
