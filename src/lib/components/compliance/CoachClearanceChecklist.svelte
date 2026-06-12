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
