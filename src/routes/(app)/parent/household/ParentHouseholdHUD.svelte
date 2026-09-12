<script lang="ts">
	import type { ParentHouseholdEngine } from './ParentHouseholdEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	interface Props {
		engine: ParentHouseholdEngine;
	}
	let { engine }: Props = $props();
</script>

<div class="phh-hud bento-mb-lg tw-flex tw-flex-col tw-gap-4 md:tw-flex-row">
	<!-- Compliance Status Badge -->
	<div class="st-bento phh-surface tw-flex-1 tw-p-4 vanguard-panel tw-flex tw-flex-col tw-justify-between">
		<div>
			<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
				<span class="phh-eyebrow tw-text-red-400/90">COPPA &amp; LIABILITY</span>
				<Icon name={"status.seal-check" as IconName} size={18} class={engine.coppaSigned ? "tw-text-cyan-400" : "tw-text-amber-500"} />
			</div>
			<div class="tw-text-sm tw-font-bold tw-text-white tw-font-mono tw-uppercase">
				{engine.coppaSigned ? 'Cleared' : 'Pending Signature'}
			</div>
			{#if engine.coppaSigned}
				<div class="phh-mono tw-text-xs tw-text-[var(--text-secondary)] tw-mt-1">{engine.fmtTs(engine.coppaAt)}</div>
			{/if}
		</div>
	</div>

	<!-- Active Athletes Count Badge -->
	<div class="st-bento phh-surface tw-flex-1 tw-p-4 vanguard-panel tw-flex tw-flex-col tw-justify-between">
		<div>
			<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
				<span class="phh-eyebrow tw-text-cyan-200/80">Active Athletes</span>
				<Icon name={"users.group" as IconName} size={18} class="tw-text-cyan-400" />
			</div>
			<div class="tw-text-sm tw-font-bold tw-text-white tw-font-mono tw-uppercase">
				{engine.operativeRows.length} {engine.operativeRows.length === 1 ? 'Operative' : 'Operatives'}
			</div>
		</div>
	</div>

	<!-- Fee Clearance Badge (Stub) -->
	<div class="st-bento phh-surface tw-flex-1 tw-p-4 vanguard-panel tw-flex tw-flex-col tw-justify-between">
		<div>
			<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
				<span class="phh-eyebrow tw-text-amber-200/80">Season & Tournament Fees</span>
				<Icon name={"finance.bank" as IconName} size={18} class="tw-text-amber-400" />
			</div>
			<div class="tw-text-sm tw-font-bold tw-text-white tw-font-mono tw-uppercase">
				Fully Cleared
			</div>
		</div>
	</div>
</div>

<style>
	.phh-eyebrow {
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.45);
	}
	.phh-surface {
		background: #05050a;
		box-shadow: var(--shadow-liquid);
		background-image: linear-gradient(
			160deg,
			rgba(255, 255, 255, 0.03) 0%,
			rgba(255, 255, 255, 0) 60%
		);
	}
	.phh-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Consolas, monospace;
	}
</style>
