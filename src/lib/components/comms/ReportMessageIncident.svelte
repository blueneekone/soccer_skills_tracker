<script lang="ts">
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	let {
		clubId = '',
		teamId = '',
		messageKind = 'other',
		messageId = '',
		bodyPreview = '',
	}: {
		clubId?: string;
		teamId?: string;
		messageKind?: string;
		messageId?: string;
		bodyPreview?: string;
	} = $props();

	let reason = $state('');
	let details = $state('');
	let sending = $state(false);
	let err = $state('');
	let ok = $state('');

	const canReport = $derived(Boolean(clubId?.trim()) && reason.trim().length > 0 && !sending);

	async function submit() {
		if (!clubId?.trim() || !reason.trim() || sending) return;
		sending = true;
		err = '';
		ok = '';
		try {
			const fn = httpsCallable(functions, 'reportMessageIncident');
			await fn({
				clubId: clubId.trim(),
				teamId: teamId?.trim() || undefined,
				messageKind,
				messageId: messageId?.trim() || undefined,
				bodyPreview: bodyPreview?.trim() || undefined,
				reason: reason.trim(),
				details: details.trim() || undefined,
			});
			ok = 'Report submitted. Your club director will review this incident.';
			reason = '';
			details = '';
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not submit report.';
		} finally {
			sending = false;
		}
	}
</script>

<section class="report-incident" aria-labelledby="report-incident-heading">
	<h2 id="report-incident-heading" class="report-incident__title">Report a comms concern</h2>
	<p class="report-incident__sub">
		SafeSport-monitored escalation — use for inappropriate messages, missing parent CC, or other comms
		policy concerns. Filed reports go to your club director.
	</p>

	{#if !clubId}
		<p class="report-incident__muted">Club context required to file a report.</p>
	{:else if !authStore.user}
		<p class="report-incident__muted">Sign in to file a report.</p>
	{:else}
		<label class="report-incident__label" for="report-reason">Reason</label>
		<input
			id="report-reason"
			class="report-incident__input"
			type="text"
			maxlength="200"
			placeholder="Missing parent copy, inappropriate content…"
			bind:value={reason}
			disabled={sending}
		/>

		<label class="report-incident__label" for="report-details">Details (optional)</label>
		<textarea
			id="report-details"
			class="report-incident__textarea"
			rows="3"
			maxlength="2000"
			placeholder="What happened? Include dates or message context if helpful."
			bind:value={details}
			disabled={sending}
		></textarea>

		{#if err}<p class="report-incident__err" role="alert">{err}</p>{/if}
		{#if ok}<p class="report-incident__ok" role="status">{ok}</p>{/if}

		<button type="button" class="report-incident__btn" disabled={!canReport} onclick={() => void submit()}>
			{sending ? 'Submitting…' : 'Submit report'}
		</button>
	{/if}
</section>

<style>
	.report-incident {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px 18px;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		background: #fff;
		margin-top: 16px;
	}

	.report-incident__title {
		margin: 0;
		font-size: 14px;
		font-weight: 800;
		color: #0f172a;
	}

	.report-incident__sub {
		margin: 0;
		font-size: 12px;
		line-height: 1.45;
		color: #64748b;
	}

	.report-incident__label {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
	}

	.report-incident__input,
	.report-incident__textarea {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 8px 10px;
		font: inherit;
		font-size: 13px;
	}

	.report-incident__muted {
		margin: 0;
		font-size: 13px;
		color: #64748b;
	}

	.report-incident__err {
		margin: 0;
		font-size: 12px;
		color: #b91c1c;
	}

	.report-incident__ok {
		margin: 0;
		font-size: 12px;
		color: #15803d;
	}

	.report-incident__btn {
		align-self: flex-start;
		border: none;
		border-radius: 10px;
		padding: 9px 16px;
		font-size: 13px;
		font-weight: 700;
		background: #0f172a;
		color: #fff;
		cursor: pointer;
	}

	.report-incident__btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
