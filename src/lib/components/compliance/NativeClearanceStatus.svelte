<script lang="ts">
	import type { ClearanceDoc } from '$lib/types/backgroundCheck.js';
	import {
		deriveCoachClearanceStep,
		coachClearanceStepLabel,
		formatClearanceSource,
		formatClearanceTimestamp,
		getClearanceStatusSubLabel,
		clearanceStatusSubLabelTitle,
	} from '$lib/compliance/checkrCoachClearance.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	type Props = {
		clearance?: ClearanceDoc | null;
	};

	let { clearance = null }: Props = $props();

	const step = $derived(deriveCoachClearanceStep(clearance));
	const statusLabel = $derived(coachClearanceStepLabel(step));
	const sourceLabel = $derived(formatClearanceSource(clearance?.source));
	const lastVerified = $derived(formatClearanceTimestamp(clearance?.lastVerified));
	const statusRef = $derived(getClearanceStatusSubLabel(clearance));
</script>

<section class="ncs" aria-label="Screening status">
	<div
		class="ncs__badge"
		class:ncs__badge--cleared={step === 'cleared'}
		class:ncs__badge--flagged={step === 'flagged'}
		class:ncs__badge--active={step === 'invited' || step === 'in_progress'}
	>
		{#if step === 'cleared'}
			<Icon name="status.verified" size={18} />
		{:else if step === 'flagged'}
			<Icon name="status.warning-circle" size={18} />
		{:else if step === 'invited' || step === 'in_progress'}
			<span class="ncs__pulse" aria-hidden="true"></span>
		{/if}
		<span class="ncs__badge-label">{statusLabel}</span>
	</div>

	{#if step === 'not_started'}
		<p class="ncs__hint">
			Your club director will order screening when you are ready. Use the checklist above for next
			steps.
		</p>
	{:else}
		<dl class="ncs__meta">
			{#if sourceLabel}
				<div class="ncs__row">
					<dt>Source</dt>
					<dd>{sourceLabel}</dd>
				</div>
			{/if}
			{#if lastVerified}
				<div class="ncs__row">
					<dt>Last updated</dt>
					<dd>{lastVerified}</dd>
				</div>
			{/if}
			{#if statusRef}
				<div class="ncs__row">
					<dt>{clearanceStatusSubLabelTitle(statusRef.kind)}</dt>
					<dd class="ncs__ref">
						{#if statusRef.kind === 'legacyRecordId'}
							<span class="ncs__legacy">legacy</span>
						{/if}
						{statusRef.value}
					</dd>
				</div>
			{/if}
		</dl>
	{/if}
</section>
