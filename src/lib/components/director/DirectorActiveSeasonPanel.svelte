<script lang="ts">
	import { db } from '$lib/firebase.js';
	import { doc, getDoc, updateDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';

	let { clubId = '' } = $props();

	let loading = $state(true);
	let saving = $state(false);
	let err = $state('');
	let ok = $state('');

	let seasonId = $state('');
	let seasonName = $state('');
	let feeAmountDollars = $state('');
	let registrationDeadline = $state('');

	$effect(() => {
		if (!clubId) {
			loading = false;
			return;
		}
		loading = true;
		err = '';
		void (async () => {
			try {
				const snap = await getDoc(doc(db, 'organizations', clubId));
				const raw = snap.exists()
					? (snap.data().activeSeason as Record<string, unknown> | undefined)
					: undefined;
				seasonId = typeof raw?.seasonId === 'string' ? raw.seasonId : '';
				seasonName = typeof raw?.name === 'string' ? raw.name : '';
				feeAmountDollars =
					typeof raw?.feeAmountDollars === 'number' && raw.feeAmountDollars > 0
						? String(raw.feeAmountDollars)
						: '';
				registrationDeadline =
					typeof raw?.registrationDeadline === 'string' ? raw.registrationDeadline : '';
			} catch (e) {
				err = e instanceof Error ? e.message : 'Could not load active season.';
			} finally {
				loading = false;
			}
		})();
	});

	async function save() {
		if (!clubId || saving) return;
		saving = true;
		err = '';
		ok = '';
		try {
			const fee = feeAmountDollars.trim() ? Number(feeAmountDollars) : 0;
			if (feeAmountDollars.trim() && (!Number.isFinite(fee) || fee <= 0)) {
				err = 'Fee must be a positive number.';
				return;
			}
			if (registrationDeadline.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(registrationDeadline.trim())) {
				err = 'Deadline must be YYYY-MM-DD.';
				return;
			}

			const activeSeason: Record<string, unknown> = {};
			if (seasonId.trim()) activeSeason.seasonId = seasonId.trim();
			if (seasonName.trim()) activeSeason.name = seasonName.trim();
			if (fee > 0) activeSeason.feeAmountDollars = fee;
			if (registrationDeadline.trim()) {
				activeSeason.registrationDeadline = registrationDeadline.trim();
			}

			await updateDoc(doc(db, 'organizations', clubId), { activeSeason });
			ok = 'Active season saved. Payment reminders use registrationDeadline at 7/3/1/0 days.';
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save active season.';
		} finally {
			saving = false;
		}
	}

	const canEdit = $derived(authStore.isDirector || authStore.isAdmin);
</script>

<section class="season-panel" aria-labelledby="season-panel-heading">
	<h3 id="season-panel-heading" class="season-panel__title">Active season & registration deadline</h3>
	<p class="season-panel__sub">
		Epic 4.6 payment reminders — parents with unpaid registrations receive push nudges at 7, 3, 1, and 0 days
		before the deadline (`push_paymentReminders`).
	</p>

	{#if loading}
		<p class="season-panel__muted">Loading…</p>
	{:else if !canEdit}
		<p class="season-panel__muted">Director access required to edit season registration settings.</p>
	{:else}
		<div class="season-panel__grid">
			<label class="season-field">
				<span class="season-label">Season ID</span>
				<input class="season-input" type="text" bind:value={seasonId} placeholder="2026-spring" />
			</label>
			<label class="season-field">
				<span class="season-label">Season name</span>
				<input class="season-input" type="text" bind:value={seasonName} placeholder="Spring 2026" />
			</label>
			<label class="season-field">
				<span class="season-label">Registration fee (USD)</span>
				<input class="season-input" type="number" min="0" step="0.01" bind:value={feeAmountDollars} placeholder="150" />
			</label>
			<label class="season-field">
				<span class="season-label">Registration deadline</span>
				<input class="season-input" type="date" bind:value={registrationDeadline} />
			</label>
		</div>

		{#if err}<p class="season-err" role="alert">{err}</p>{/if}
		{#if ok}<p class="season-ok" role="status">{ok}</p>{/if}

		<button type="button" class="season-btn" disabled={!clubId || saving} onclick={() => void save()}>
			{saving ? 'Saving…' : 'Save active season'}
		</button>
	{/if}
</section>

<style>
	.season-panel {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px 18px;
		border: 1px solid #334155;
		border-radius: 12px;
		background: #0f172a;
		margin-bottom: 16px;
	}

	.season-panel__title {
		margin: 0;
		font-size: 14px;
		font-weight: 800;
		color: #f8fafc;
	}

	.season-panel__sub {
		margin: 0;
		font-size: 12px;
		line-height: 1.45;
		color: #94a3b8;
		max-width: 42rem;
	}

	.season-panel__grid {
		display: grid;
		gap: 10px;
		grid-template-columns: 1fr;
	}

	@media (min-width: 720px) {
		.season-panel__grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.season-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.season-label {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
	}

	.season-input {
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 8px 10px;
		font-size: 13px;
		background: #1e293b;
		color: #f8fafc;
	}

	.season-panel__muted {
		margin: 0;
		font-size: 13px;
		color: #94a3b8;
	}

	.season-err {
		margin: 0;
		font-size: 12px;
		color: #f87171;
	}

	.season-ok {
		margin: 0;
		font-size: 12px;
		color: #14b8a6;
	}

	.season-btn {
		align-self: flex-start;
		border: none;
		border-radius: 8px;
		padding: 9px 16px;
		font-size: 13px;
		font-weight: 700;
		background: #14b8a6;
		color: #0f172a;
		cursor: pointer;
	}

	.season-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
