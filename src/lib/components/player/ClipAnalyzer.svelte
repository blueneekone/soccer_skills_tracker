<script lang="ts">
	import type { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte.js';
	import ClipAnalyzerHUD from './ClipAnalyzerHUD.svelte';
	import ClipAnalyzerArena from './ClipAnalyzerArena.svelte';
	import { ClipAnalyzerEngine } from './ClipAnalyzerEngine.svelte.js';

	interface Props {
		armory: ArmoryEngine;
		playerUid: string;
		targetStat?: 'PAC' | 'ACC' | 'AGI' | 'STM' | 'POW' | 'VAN';
		onClipReady?: (clipId: string, publicUrl: string) => void;
	}
	const { armory, playerUid, targetStat = 'PAC', onClipReady }: Props = $props();

	const engine = new ClipAnalyzerEngine({ armory, playerUid, targetStat, onClipReady });

	$effect(() => {
		engine.armory = armory;
		engine.playerUid = playerUid;
		engine.targetStat = targetStat;
		engine.onClipReady = onClipReady;
	});
</script>

<div class="ca-root" class:ca-root--analyzing={engine.phase === 'analyzing'}>
	<ClipAnalyzerHUD {engine} />
	<ClipAnalyzerArena {engine} />
</div>

<style>
	.ca-root {
		position: relative;
		border-radius: var(--vanguard-radius-sm);
		border: 1px solid var(--vanguard-border);
		background: rgba(5, 8, 15, 0.9);
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		box-shadow: var(--vanguard-elev-2);
		font-family: 'Geist Mono', monospace;
		overflow: hidden;
		min-height: 280px;
		transition: border-color 0.3s;
	}
	.ca-root--analyzing {
		border-color: rgba(20, 184, 166, 0.35);
		box-shadow: 0 0 30px rgba(20, 184, 166, 0.12);
	}
</style>
