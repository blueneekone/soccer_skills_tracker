<script>
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	let { clubId = '' } = $props();

	const setPlayerDateOfBirth = httpsCallable(functions, 'setPlayerDateOfBirth');
	const enqueueMinorRetentionPurge = httpsCallable(functions, 'enqueueMinorRetentionPurge');

	let busy = $state('');

	let dobPlayerEmail = $state('');
	let dobValue = $state('');

	let retentionPlayerEmail = $state('');

	const scopeClub = $derived(String(clubId || authStore.userProfile?.clubId || ''));

	const canUse = $derived(
		authStore.role === 'director' || authStore.role === 'super_admin' || authStore.role === 'global_admin'
	);

	const onSetDob = async () => {
		const playerEmail = dobPlayerEmail.trim().toLowerCase();
		if (!playerEmail || !dobValue) {
			alert('Player email and date of birth are required.');
			return;
		}
		busy = 'dob';
		try {
			const res = await setPlayerDateOfBirth({ playerEmail, dateOfBirth: dobValue });
			const d = res.data;
			alert(
				`Date of birth saved for ${d.playerEmail}.\nMinor: ${d.isMinor}\nvpcStatus: ${d.vpcStatus}`
			);
		} catch (e) {
			alert(e.message || String(e));
		} finally {
			busy = '';
		}
	};

	const onEnqueueRetention = async () => {
		const playerEmail = retentionPlayerEmail.trim().toLowerCase();
		if (!playerEmail) {
			alert('Enter the minor player email to queue for data purge.');
			return;
		}
		if (
			!confirm(
				'Queue this minor for automated COPPA retention purge? Within ~24h the job removes roster/passport/lookup PII and redacts their user profile. This cannot be undone from the app.'
			)
		) {
			return;
		}
		busy = 'retention';
		try {
			const res = await enqueueMinorRetentionPurge({ playerEmail });
			const d = /** @type {{ duplicate?: boolean }} */ (res.data || {});
			if (d.duplicate) {
				alert('A pending purge job already exists for this email.');
			} else {
				alert(
					'Queued. The scheduled worker processes pending jobs daily. The account should sign out; after purge, they may need a fresh club invite to return.'
				);
			}
			retentionPlayerEmail = '';
		} catch (e) {
			alert(e instanceof Error ? e.message : String(e));
		} finally {
			busy = '';
		}
	};
</script>

<div class="household-compliance">
	{#if !canUse}
		<p class="muted">You do not have permission to use household tools.</p>
	{:else}
		<div class="bento-section">
			<div class="card">
				<div class="card-header bg-orange-header">Player date of birth (COPPA)</div>
				<div class="card-body">
					<p class="help">
						Sets <code>dateOfBirth</code>, derives <code>isMinor</code> (under 13) and initial
						<code>vpcStatus</code>. Minors require VPC before waiver attestation.
					</p>
					<label for="dob-email">Player email</label>
					<input id="dob-email" type="email" bind:value={dobPlayerEmail} placeholder="minor@example.com" />

					<label for="dob-value">Date of birth</label>
					<input id="dob-value" type="date" bind:value={dobValue} />

					<button
						class="primary-btn btn-orange w-100"
						onclick={onSetDob}
						disabled={busy !== ''}
					>
						{busy === 'dob' ? 'Saving…' : 'Save date of birth'}
					</button>
				</div>
			</div>

			<div class="card">
				<div class="card-header bg-blue-header">Minor offboarding (TTL purge queue)</div>
				<div class="card-body">
					<p class="help">
						Epic 1.3: after a minor leaves the club, queue automated redaction. A daily Cloud Function clears
						<code>passports</code>, <code>player_lookup</code>, roster slots, household links, and scrubs the
						<code>users</code> doc. Directors may only queue minors in their club; application admins may queue
						any minor.
					</p>
					<label for="retention-email">Minor player email</label>
					<input id="retention-email" type="email" bind:value={retentionPlayerEmail} placeholder="minor@example.com" />

					<button
						class="primary-btn btn-blue w-100"
						onclick={onEnqueueRetention}
						disabled={busy !== ''}
					>
						{busy === 'retention' ? 'Queueing…' : 'Queue retention purge'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.household-compliance {
		display: flex;
		flex-direction: column;
		gap: clamp(16px, 3vw, 24px);
	}
	label {
		display: block;
		margin-top: clamp(8px, 1.5vw, 12px);
		margin-bottom: clamp(4px, 0.8vw, 6px);
	}
	input {
		width: 100%;
		margin-bottom: 0;
	}
	.help {
		font-size: 0.9rem;
		opacity: 0.9;
		margin: 0 0 clamp(8px, 1.2vw, 12px) 0;
		line-height: 1.45;
	}
	.muted {
		opacity: 0.85;
	}

	.vpc-pending-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: clamp(10px, 2vw, 12px);
	}

	.vpc-pending-row {
		display: flex;
		flex-direction: column;
		gap: clamp(8px, 1.5vw, 10px);
		padding: clamp(10px, 2vw, 14px);
		border-radius: 16px;
		border: 1px solid rgba(15, 23, 42, 0.1);
		background: rgba(15, 23, 42, 0.03);
	}

	:global(html.dark) .vpc-pending-row {
		border-color: rgba(226, 232, 240, 0.12);
		background: rgba(15, 23, 42, 0.35);
	}

	.vpc-pending-meta {
		font-size: 0.88rem;
		line-height: 1.45;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.lbl {
		font-weight: 800;
		margin-right: 6px;
		text-transform: uppercase;
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		opacity: 0.85;
	}

	.secondary-btn {
		align-self: flex-start;
		padding: clamp(8px, 1.5vw, 10px) 14px;
		border-radius: 14px;
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		color: inherit;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.secondary-btn:hover {
		filter: brightness(1.05);
	}
</style>
