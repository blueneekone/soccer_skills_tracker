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
	let submittedClubId = $state('');

	const complianceHref = $derived(
		submittedClubId
			? `/messages?channel=compliance&clubId=${encodeURIComponent(submittedClubId)}`
			: '',
	);

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
			submittedClubId = clubId.trim();
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
		{#if ok}
			<div class="report-incident__ok" role="status">
				<p>{ok}</p>
				{#if complianceHref}
					<a class="report-incident__compliance-link" href={complianceHref}>
						View compliance channel →
					</a>
				{/if}
			</div>
		{/if}

		<button type="button" class="report-incident__btn" disabled={!canReport} onclick={() => void submit()}>
			{sending ? 'Submitting…' : 'Submit report'}
		</button>
	{/if}
</section>
