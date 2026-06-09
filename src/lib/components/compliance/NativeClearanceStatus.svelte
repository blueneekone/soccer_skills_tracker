<script lang="ts">
	import type { ClearanceDoc } from '$lib/types/backgroundCheck.js';
	import {
		deriveCoachClearanceStep,
		coachClearanceStepLabel,
		formatClearanceSource,
		formatClearanceTimestamp,
		getClearanceStatusSubLabel,
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
					<dt>
						{#if statusRef.kind === 'checkrCandidateId'}
							Checkr candidate
						{:else if statusRef.kind === 'invitationId'}
							Checkr invitation
						{:else}
							Reference
						{/if}
					</dt>
					<dd class="ncs__ref">
						{#if statusRef.kind === 'ankoredId'}
							<span class="ncs__legacy">legacy</span>
						{/if}
						{statusRef.value}
					</dd>
				</div>
			{/if}
		</dl>
	{/if}
</section>

<style>
	.ncs {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 1rem 1.1rem;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		background: #f9fafb;
	}

	.ncs__badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		align-self: flex-start;
		padding: 0.4rem 0.75rem;
		border-radius: 999px;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		background: #ffffff;
		border: 1px solid #e5e7eb;
	}

	.ncs__badge--cleared {
		color: #047857;
		background: #ecfdf5;
		border-color: #bbf7d0;
	}

	.ncs__badge--flagged {
		color: #b91c1c;
		background: #fef2f2;
		border-color: #fecaca;
	}

	.ncs__badge--active {
		color: #1d4ed8;
		background: #eff6ff;
		border-color: #93c5fd;
	}

	.ncs__pulse {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: #2563eb;
		animation: ncsPulse 1.4s ease-in-out infinite;
	}

	@keyframes ncsPulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.4;
			transform: scale(0.75);
		}
	}

	.ncs__hint {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.55;
		color: #6b7280;
	}

	.ncs__meta {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.ncs__row {
		display: grid;
		grid-template-columns: 7.5rem 1fr;
		gap: 0.5rem;
		font-size: 0.8125rem;
	}

	.ncs__row dt {
		margin: 0;
		color: #6b7280;
		font-weight: 500;
	}

	.ncs__row dd {
		margin: 0;
		color: #111827;
		font-variant-numeric: tabular-nums;
	}

	.ncs__ref {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
		word-break: break-all;
	}

	.ncs__legacy {
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #92400e;
		border: 1px solid #fcd34d;
		padding: 0.05rem 0.3rem;
		border-radius: 2px;
		background: #fffbeb;
	}
</style>
