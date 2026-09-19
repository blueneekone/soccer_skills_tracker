<script lang="ts">
	import type { OrgManager } from '$lib/services/org.svelte.js';
	import OrgInvitesHUD from './OrgInvitesHUD.svelte';
	import OrgInvitesArena from './OrgInvitesArena.svelte';
	import { OrgInvitesEngine } from './OrgInvitesEngine.svelte.js';

	interface Props {
		org: OrgManager;
		class?: string;
	}

	const { org, class: className = '' }: Props = $props();

	const engine = new OrgInvitesEngine(org);

	$effect(() => {
		engine.org = org;
	});
</script>

<div class="oi-root {className}">
	<OrgInvitesHUD {engine} />
	<OrgInvitesArena {engine} />
</div>

<style>
	.oi-root {
		background: rgba(1, 4, 9, 0.85);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 0px;
		font-family: 'Geist Mono', 'Fira Code', ui-monospace, monospace;
		color: #e2e8f0;
		overflow: hidden;
	}
</style>
