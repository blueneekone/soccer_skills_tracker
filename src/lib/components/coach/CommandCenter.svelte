<script lang="ts">
	import CommandCenterHUD from './CommandCenterHUD.svelte';
	import CommandCenterArena from './CommandCenterArena.svelte';
	import { CommandCenterEngine } from './CommandCenterEngine.svelte.js';

	let { teamId = undefined, class: extraClass = '' }: { teamId?: string; class?: string } = $props();

	const engine = new CommandCenterEngine(teamId);
</script>

<div class="cc-shell {extraClass}">
	<CommandCenterHUD {engine} />
	<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-0 tw-min-h-0 tw-flex-1">
		<CommandCenterArena {engine} />
	</div>
</div>

<style>
	.cc-shell {
		display: flex;
		flex-direction: column;
		background: rgba(1, 4, 9, 0.8);
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		border: 1px solid var(--vanguard-border);
		border-radius: var(--vanguard-radius);
		box-shadow: var(--vanguard-elev-2);
		overflow: hidden;
		min-height: 520px;
		font-family: ui-monospace, 'SFMono-Regular', monospace;
		color: #fafafa;
	}
</style>
