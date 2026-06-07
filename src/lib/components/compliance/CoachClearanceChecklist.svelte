<script lang="ts">
	import type { ClearanceDoc } from '$lib/types/backgroundCheck.js';
	import {
		deriveCoachClearanceStep,
		type CoachClearanceStepState,
	} from '$lib/compliance/checkrCoachClearance.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	type Props = {
		clubName?: string;
		coachEmail?: string;
		clearance?: ClearanceDoc | null;
	};

	let { clubName = 'Your club', coachEmail = '', clearance = null }: Props = $props();

	const step = $derived(deriveCoachClearanceStep(clearance));
	const invitationUrl = $derived(
		typeof clearance?.invitationUrl === 'string' ? clearance.invitationUrl : '',
	);

	type StepDef = {
		id: CoachClearanceStepState | 'sponsor';
		label: string;
		body: string;
	};

	const steps = $derived.by((): StepDef[] => [
		{
			id: 'sponsor',
			label: 'Club-sponsored screening',
			body: `${clubName} pays for your background check. You will not select packages or pay fees.`,
		},
		{
			id: 'invited',
			label: 'Complete your Checkr invitation',
			body: invitationUrl
				? 'Open the link below or check your email for instructions from Checkr.'
				: 'Your club administrator will order screening. When invited, Checkr will email you a secure link.',
		},
		{
			id: 'in_progress',
			label: 'Screening in progress',
			body: 'Checkr is processing your background check. Status updates appear below when available.',
		},
	]);

	function stepTone(id: StepDef['id']): 'done' | 'active' | 'waiting' | 'alert' {
		if (id === 'sponsor') return step === 'not_started' ? 'active' : 'done';
		if (id === 'invited') {
			if (step === 'cleared') return 'done';
			if (step === 'flagged') return 'alert';
			if (step === 'invited' || step === 'in_progress') return 'active';
			return 'waiting';
		}
		if (id === 'in_progress') {
			if (step === 'cleared') return 'done';
			if (step === 'flagged') return 'alert';
			if (step === 'in_progress') return 'active';
			return 'waiting';
		}
		return 'waiting';
	}

	function statusLabel(): string {
		switch (step) {
			case 'cleared':
				return 'Cleared';
			case 'flagged':
				return 'Needs review';
			case 'invited':
				return 'Invitation sent';
			case 'in_progress':
				return 'In progress';
			default:
				return 'Not started';
		}
	}
</script>

<section class="ccc" aria-label="Background screening checklist">
	<ol class="ccc__list">
		{#each steps as item, index (item.id)}
			{@const tone = stepTone(item.id)}
			<li class="ccc__item ccc__item--{tone}">
				<div class="ccc__marker" aria-hidden="true">
					{#if tone === 'done'}
						<Icon name="status.verified" size={18} />
					{:else}
						<span>{index + 1}</span>
					{/if}
				</div>
				<div class="ccc__content">
					<h2 class="ccc__label">{item.label}</h2>
					<p class="ccc__body">{item.body}</p>
					{#if item.id === 'invited' && invitationUrl}
						<a class="ccc__link" href={invitationUrl} target="_blank" rel="noopener noreferrer">
							Open Checkr screening link
							<Icon name="nav.external" size={14} />
						</a>
					{/if}
					{#if item.id === 'invited' && step === 'invited' && coachEmail}
						<p class="ccc__hint">Invitation sent to <strong>{coachEmail}</strong></p>
					{/if}
				</div>
			</li>
		{/each}
	</ol>

	<div class="ccc__status" class:ccc__status--cleared={step === 'cleared'} class:ccc__status--flagged={step === 'flagged'}>
		<span class="ccc__status-key">Current status</span>
		<span class="ccc__status-val">{statusLabel()}</span>
	</div>

	{#if step === 'not_started'}
		<p class="ccc__note">
			Waiting for your club to order screening. Contact your director if you believe this is an
			error.
		</p>
	{/if}
</section>

<style>
	.ccc {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.ccc__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.ccc__item {
		display: grid;
		grid-template-columns: 2rem 1fr;
		gap: 0.75rem;
		padding: 1rem 1.1rem;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		background: #ffffff;
	}

	.ccc__item--active {
		border-color: #93c5fd;
		background: #f8fbff;
	}

	.ccc__item--done {
		border-color: #bbf7d0;
		background: #f0fdf4;
	}

	.ccc__item--alert {
		border-color: #fecaca;
		background: #fef2f2;
	}

	.ccc__item--waiting {
		opacity: 0.85;
	}

	.ccc__marker {
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 700;
		color: #374151;
		background: #f3f4f6;
	}

	.ccc__item--active .ccc__marker {
		background: #dbeafe;
		color: #1d4ed8;
	}

	.ccc__item--done .ccc__marker {
		background: #dcfce7;
		color: #047857;
	}

	.ccc__item--alert .ccc__marker {
		background: #fee2e2;
		color: #b91c1c;
	}

	.ccc__label {
		margin: 0 0 0.35rem;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}

	.ccc__body {
		margin: 0;
		font-size: 0.9375rem;
		line-height: 1.55;
		color: #4b5563;
	}

	.ccc__link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.75rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1d4ed8;
		text-decoration: none;
	}

	.ccc__link:hover {
		text-decoration: underline;
	}

	.ccc__hint {
		margin: 0.5rem 0 0;
		font-size: 0.8125rem;
		color: #6b7280;
	}

	.ccc__hint strong {
		color: #374151;
	}

	.ccc__status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: #f9fafb;
	}

	.ccc__status--cleared {
		border-color: #bbf7d0;
		background: #ecfdf5;
	}

	.ccc__status--flagged {
		border-color: #fecaca;
		background: #fef2f2;
	}

	.ccc__status-key {
		font-size: 0.8125rem;
		color: #6b7280;
	}

	.ccc__status-val {
		font-size: 0.9375rem;
		font-weight: 600;
		color: #111827;
	}

	.ccc__status--cleared .ccc__status-val {
		color: #047857;
	}

	.ccc__status--flagged .ccc__status-val {
		color: #b91c1c;
	}

	.ccc__note {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
		line-height: 1.5;
	}
</style>
