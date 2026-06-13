<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { getFunctions, httpsCallable } from 'firebase/functions';

	const programId = $derived(page.params.programId ?? '');

	interface TryoutProgram {
		ok: boolean;
		notFound?: boolean;
		name?: string;
		clubName?: string;
		ageBands?: string[];
		feeAmountDollars?: number;
		registrationOpen?: boolean;
		registrationClosesAt?: string | null;
		capacity?: number | null;
		registrationCount?: number;
		waitlistCount?: number;
		spotsRemaining?: number | null;
	}

	let loading = $state(true);
	let program = $state<TryoutProgram | null>(null);
	let err = $state('');

	let playerName = $state('');
	let ageBand = $state('');
	let guardianName = $state('');
	let guardianEmail = $state('');
	let guardianPhone = $state('');
	let submitting = $state(false);
	let submitErr = $state('');
	let submitOk = $state('');
	let registrationId = $state('');
	let offerErr = $state('');
	let offerOk = $state('');
	let offerSubmitting = $state(false);
	let pipelineStatus = $state('');
	let rsvpSubmitting = $state(false);
	let rsvpErr = $state('');
	let rsvpOk = $state('');

	$effect(() => {
		const id = programId.trim();
		if (!id || !browser) return;
		let cancelled = false;
		loading = true;
		err = '';
		void (async () => {
			try {
				const fns = getFunctions(undefined, 'us-east1');
				const fn = httpsCallable<{ programId: string }, TryoutProgram>(
					fns,
					'getPublicTryoutProgram',
				);
				const res = await fn({ programId: id });
				if (!cancelled) {
					program = res.data;
					if (res.data.ageBands?.length === 1) ageBand = res.data.ageBands[0];
				}
			} catch (e) {
				if (!cancelled) err = e instanceof Error ? e.message : 'Could not load tryout.';
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function submitRegistration() {
		submitErr = '';
		submitOk = '';
		submitting = true;
		try {
			const fns = getFunctions(undefined, 'us-east1');
			const fn = httpsCallable(fns, 'registerForTryout');
			const res = await fn({
				programId: programId.trim(),
				playerName: playerName.trim(),
				ageBand: ageBand.trim(),
				guardianName: guardianName.trim(),
				guardianEmail: guardianEmail.trim(),
				guardianPhone: guardianPhone.trim() || undefined,
			});
			const data = res.data as { pipelineStatus?: string; registrationId?: string };
			registrationId = typeof data.registrationId === 'string' ? data.registrationId : '';
			pipelineStatus = data.pipelineStatus === 'waitlisted' ? 'waitlisted' : 'registered';
			submitOk =
				data.pipelineStatus === 'waitlisted'
					? 'You are on the waitlist. The club will contact you if a spot opens.'
					: registrationId
						? 'Registration received. Save your confirmation code below — use it to RSVP once the club assigns your session time.'
						: 'Registration received. Watch your email for session details from the club.';
			playerName = '';
			guardianPhone = '';
		} catch (e) {
			submitErr = e instanceof Error ? e.message : 'Registration failed.';
		} finally {
			submitting = false;
		}
	}

	async function submitSessionRsvp(status: 'going' | 'not_going' | 'maybe') {
		if (!registrationId.trim() || !guardianEmail.trim()) return;
		rsvpErr = '';
		rsvpOk = '';
		rsvpSubmitting = true;
		try {
			const fns = getFunctions(undefined, 'us-east1');
			const fn = httpsCallable(fns, 'setTryoutSessionRsvp');
			await fn({
				programId: programId.trim(),
				registrationId: registrationId.trim(),
				guardianEmail: guardianEmail.trim(),
				status,
			});
			rsvpStatus = status;
			rsvpOk = 'Session RSVP saved. See you at the field.';
		} catch (e) {
			rsvpErr = e instanceof Error ? e.message : 'RSVP failed.';
		} finally {
			rsvpSubmitting = false;
		}
	}

	async function respondOffer(response: 'accepted' | 'declined') {
		if (!registrationId.trim() || !guardianEmail.trim()) return;
		offerErr = '';
		offerOk = '';
		offerSubmitting = true;
		try {
			const fns = getFunctions(undefined, 'us-east1');
			const fn = httpsCallable(fns, 'respondTryoutOffer');
			const res = await fn({
				programId: programId.trim(),
				registrationId: registrationId.trim(),
				guardianEmail: guardianEmail.trim(),
				response,
			});
			const data = res.data as { pipelineStatus?: string };
			pipelineStatus = data.pipelineStatus ?? response;
			offerOk =
				response === 'accepted'
					? 'Offer accepted — the club will send roster next steps.'
					: 'Offer declined.';
		} catch (e) {
			offerErr = e instanceof Error ? e.message : 'Could not respond to offer.';
		} finally {
			offerSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Tryout registration · SSTracker</title>
</svelte:head>

<div class="ty-root tw-mx-auto tw-max-w-lg tw-px-4 tw-py-16 tw-text-slate-100">
	{#if loading}
		<p class="tw-font-mono tw-text-sm tw-text-slate-400">Loading tryout program…</p>
	{:else if err}
		<p class="tw-text-red-400">{err}</p>
	{:else if !program?.ok}
		<h1 class="tw-text-2xl tw-font-bold">Tryout not found</h1>
		<p class="tw-mt-2 tw-text-slate-400">This registration link may be invalid or expired.</p>
	{:else}
		<p class="tw-mb-1 tw-font-mono tw-text-xs tw-uppercase tw-tracking-widest tw-text-slate-500">
			Tryout registration
		</p>
		<h1 class="tw-m-0 tw-text-3xl tw-font-black">{program.name}</h1>
		<p class="tw-mt-1 tw-text-slate-400">{program.clubName}</p>

		<dl class="ty-facts tw-mt-6 tw-space-y-2 tw-rounded-xl tw-border tw-border-slate-800 tw-bg-slate-900/50 tw-p-4 tw-text-sm">
			{#if program.ageBands && program.ageBands.length > 0}
				<div class="tw-flex tw-justify-between tw-gap-3">
					<dt class="tw-text-slate-500">Age bands</dt>
					<dd>{program.ageBands.join(', ')}</dd>
				</div>
			{/if}
			{#if program.spotsRemaining != null}
				<div class="tw-flex tw-justify-between tw-gap-3">
					<dt class="tw-text-slate-500">Spots left</dt>
					<dd class="tw-font-mono">{program.spotsRemaining}</dd>
				</div>
			{/if}
			{#if program.registrationClosesAt}
				<div class="tw-flex tw-justify-between tw-gap-3">
					<dt class="tw-text-slate-500">Closes</dt>
					<dd class="tw-font-mono">{program.registrationClosesAt}</dd>
				</div>
			{/if}
		</dl>

		{#if !program.registrationOpen}
			<p class="tw-mt-6 tw-text-amber-400">Registration is closed for this tryout.</p>
		{:else}
			<form
				class="ty-form tw-mt-8 tw-flex tw-flex-col tw-gap-3"
				onsubmit={(e) => {
					e.preventDefault();
					void submitRegistration();
				}}
			>
				<label class="ty-label">
					Athlete name
					<input class="ty-input" required bind:value={playerName} autocomplete="name" />
				</label>

				<label class="ty-label">
					Age band
					{#if program.ageBands && program.ageBands.length > 0}
						<select class="ty-input" required bind:value={ageBand}>
							<option value="">Select…</option>
							{#each program.ageBands as band (band)}
								<option value={band}>{band}</option>
							{/each}
						</select>
					{:else}
						<input class="ty-input" required bind:value={ageBand} placeholder="U12" />
					{/if}
				</label>

				<label class="ty-label">
					Guardian name
					<input class="ty-input" required bind:value={guardianName} autocomplete="name" />
				</label>

				<label class="ty-label">
					Guardian email
					<input
						class="ty-input"
						type="email"
						required
						bind:value={guardianEmail}
						autocomplete="email"
					/>
				</label>

				<label class="ty-label">
					Guardian phone (optional)
					<input class="ty-input" type="tel" bind:value={guardianPhone} autocomplete="tel" />
				</label>

				{#if submitErr}<p class="tw-text-sm tw-text-red-400" role="alert">{submitErr}</p>{/if}
				{#if submitOk}<p class="tw-text-sm tw-text-teal-400" role="status">{submitOk}</p>{/if}

				<button
					type="submit"
					class="tw-vanguard-btn-primary tw-mt-2"
					disabled={submitting}
				>
					{submitting ? 'Submitting…' : 'Register for tryouts'}
				</button>
			</form>

			{#if registrationId}
				<section class="ty-rsvp tw-mt-8 tw-rounded-xl tw-border tw-border-slate-800 tw-bg-slate-900/50 tw-p-4">
					<h2 class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-wide tw-text-slate-400">
						Session RSVP
					</h2>
					<p class="tw-mt-2 tw-text-sm tw-text-slate-400">
						Confirmation code: <code class="tw-font-mono tw-text-teal-300">{registrationId}</code>
					</p>
					<p class="tw-text-sm tw-text-slate-500">
						After the club assigns your tryout block, confirm attendance below (same guardian email).
					</p>
					<div class="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
						<button
							type="button"
							class="tw-vanguard-btn-primary"
							disabled={rsvpSubmitting || rsvpStatus === 'going'}
							onclick={() => void submitSessionRsvp('going')}
						>
							Going
						</button>
						<button
							type="button"
							class="ty-rsvp-btn"
							disabled={rsvpSubmitting || rsvpStatus === 'maybe'}
							onclick={() => void submitSessionRsvp('maybe')}
						>
							Maybe
						</button>
						<button
							type="button"
							class="ty-rsvp-btn"
							disabled={rsvpSubmitting || rsvpStatus === 'not_going'}
							onclick={() => void submitSessionRsvp('not_going')}
						>
							Can&apos;t make it
						</button>
					</div>
					{#if rsvpErr}<p class="tw-mt-2 tw-text-sm tw-text-red-400" role="alert">{rsvpErr}</p>{/if}
					{#if rsvpOk}<p class="tw-mt-2 tw-text-sm tw-text-teal-400" role="status">{rsvpOk}</p>{/if}
				</section>

				{#if pipelineStatus === 'offered'}
					<section class="ty-rsvp tw-mt-6 tw-rounded-xl tw-border tw-border-amber-800/60 tw-bg-amber-950/30 tw-p-4">
						<h2 class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-wide tw-text-amber-300">
							Roster offer
						</h2>
						<p class="tw-mt-2 tw-text-sm tw-text-slate-300">
							The club has offered a roster spot. Accept or decline below.
						</p>
						<div class="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
							<button
								type="button"
								class="tw-vanguard-btn-primary"
								disabled={offerSubmitting}
								onclick={() => void respondOffer('accepted')}
							>
								Accept offer
							</button>
							<button
								type="button"
								class="ty-rsvp-btn"
								disabled={offerSubmitting}
								onclick={() => void respondOffer('declined')}
							>
								Decline
							</button>
						</div>
						{#if offerErr}<p class="tw-mt-2 tw-text-sm tw-text-red-400" role="alert">{offerErr}</p>{/if}
						{#if offerOk}<p class="tw-mt-2 tw-text-sm tw-text-teal-400" role="status">{offerOk}</p>{/if}
					</section>
				{/if}
			{/if}
		{/if}
	{/if}
</div>

<style>
	.ty-label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
	}

	.ty-input {
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 0.5rem 0.65rem;
		background: #0f172a;
		color: #f8fafc;
		font: inherit;
		font-size: 0.9375rem;
		text-transform: none;
		letter-spacing: normal;
		font-weight: 400;
	}

	.ty-rsvp-btn {
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 0.45rem 0.85rem;
		background: transparent;
		color: #e2e8f0;
		font-size: 0.8125rem;
		font-weight: 700;
		cursor: pointer;
	}

	.ty-rsvp-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
