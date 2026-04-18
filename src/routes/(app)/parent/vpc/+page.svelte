<script>
	import { httpsCallable } from 'firebase/functions';
	import { doc, getDoc } from 'firebase/firestore';
	import { db, functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const profile = $derived(authStore.userProfile);
	const householdId = $derived(
		profile?.householdId ? String(profile.householdId) : ''
	);

	let household = $state(/** @type {Record<string, unknown> | null} */ (null));
	let loadErr = $state('');
	let busyEmail = $state('');

	const submitIntent = httpsCallable(functions, 'parentSubmitVpcIntent');

	$effect(() => {
		if (!householdId || authStore.role !== 'parent') {
			household = null;
			return;
		}
		let cancelled = false;
		loadErr = '';
		getDoc(doc(db, 'households', householdId))
			.then((snap) => {
				if (cancelled) return;
				if (!snap.exists()) {
					loadErr = 'Household record not found. Ask your director to link your account.';
					household = null;
					return;
				}
				household = snap.data();
			})
			.catch((e) => {
				if (!cancelled) loadErr = e instanceof Error ? e.message : String(e);
			});
		return () => {
			cancelled = true;
		};
	});

	const playerEmails = $derived.by(() => {
		const raw = household?.playerEmails;
		if (!Array.isArray(raw)) return [];
		return [...new Set(raw.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))];
	});

	async function onNotify(playerEmail) {
		busyEmail = playerEmail;
		try {
			const res = await submitIntent({ playerEmail });
			const d = /** @type {{ duplicate?: boolean; alreadyVerified?: boolean }} */ (res.data || {});
			if (d.alreadyVerified) {
				alert('Consent is already verified for this athlete.');
			} else if (d.duplicate) {
				alert('A pending notification is already on file with your club.');
			} else {
				alert(
					'Thank you. Your club has been notified. A director will finalize consent in SSTRACKER after your VPC step is complete.'
				);
			}
		} catch (e) {
			alert(e instanceof Error ? e.message : String(e));
		} finally {
			busyEmail = '';
		}
	}
</script>

<div class="view-section">
	<h2 class="view-title">Verifiable parental consent</h2>

	<div class="bento-section">
		<div class="card">
			<div class="card-header bg-blue-header">Parent / guardian intake (Epic 1.3)</div>
			<div class="card-body vpc-body">
				{#if authStore.role !== 'parent'}
					<p class="muted">This page is for parent accounts.</p>
				{:else if !householdId}
					<p class="muted">
						Your account is not linked to a household yet. Your club director must connect parent and athlete
						emails before VPC intake appears here.
					</p>
				{:else if loadErr}
					<p class="err" role="alert">{loadErr}</p>
				{:else if !household}
					<p class="muted">Loading household…</p>
				{:else if playerEmails.length === 0}
					<p class="muted">No linked athlete emails found on this household.</p>
				{:else}
					<p class="lead">
						After you complete your club’s real-world VPC step (payment card, knowledge-based check, or other
						approved method), tap below so the club knows to record consent in SSTRACKER. This button does not
						substitute for legal parental consent.
					</p>
					<ul class="player-list">
						{#each playerEmails as em}
							<li class="player-row">
								<span class="email">{em}</span>
								<button
									type="button"
									class="primary-btn btn-green notify-btn"
									disabled={busyEmail !== ''}
									onclick={() => onNotify(em)}
								>
									{busyEmail === em ? 'Sending…' : 'Notify club — VPC completed'}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.vpc-body {
		display: flex;
		flex-direction: column;
		gap: clamp(12px, 2vw, 16px);
	}

	.lead {
		margin: 0;
		line-height: 1.5;
		font-size: 0.95rem;
		opacity: 0.95;
	}

	.muted {
		margin: 0;
		opacity: 0.88;
		line-height: 1.45;
	}

	.err {
		margin: 0;
		color: #b91c1c;
		font-weight: 700;
	}

	:global(html.dark) .err {
		color: #fecaca;
	}

	.player-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: clamp(10px, 2vw, 14px);
	}

	.player-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: clamp(12px, 2vw, 16px);
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.04);
	}

	:global(html.dark) .player-row {
		background: rgba(15, 23, 42, 0.35);
	}

	.email {
		font-weight: 700;
		word-break: break-all;
		font-size: 0.9rem;
	}

	.notify-btn {
		align-self: flex-start;
	}
</style>
