<script lang="ts">
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { DEFAULT_ELIGIBILITY_MATRIX } from '$lib/director/evaluateClubEligibility.js';
	import {
		describeEligibilityMatrixValidation,
		formatEligibilityCallableError,
	} from '$lib/director/eligibilityMatrixUi.js';

	let { clubId = '', onSaved = () => {} } = $props();

	let matrix = $state({ ...DEFAULT_ELIGIBILITY_MATRIX });
	let loading = $state(true);
	let saving = $state(false);
	let err = $state('');
	let ok = $state('');
	let isDefault = $state(true);

	const getClubEligibilityMatrix = httpsCallable(functions, 'getClubEligibilityMatrix');
	const upsertClubEligibilityMatrix = httpsCallable(functions, 'upsertClubEligibilityMatrix');

	const toggles: Array<{ key: keyof typeof DEFAULT_ELIGIBILITY_MATRIX; label: string; hint: string }> =
		[
			{
				key: 'requireWaiver',
				label: 'Signed waiver',
				hint: 'Household waiver on passport',
			},
			{
				key: 'requirePassportVerified',
				label: 'Passport verified',
				hint: 'Passport vault cleared (not pending/expired)',
			},
			{
				key: 'requireVpcForMinors',
				label: 'VPC for minors',
				hint: 'Parent VPC ceremony complete for U18 operatives',
			},
			{
				key: 'requireGuardianLinked',
				label: 'Guardian account linked',
				hint: 'Roster row has email-linked player account',
			},
			{
				key: 'requireSafeSportClearance',
				label: 'SafeSport / clearance',
				hint: 'Not suspended or SafeSport pending (linked players only)',
			},
		];

	const validation = $derived(describeEligibilityMatrixValidation(matrix));
	const hasClub = $derived(Boolean(clubId.trim()));

	$effect(() => {
		const cid = clubId.trim();
		if (!cid || !browser) {
			matrix = { ...DEFAULT_ELIGIBILITY_MATRIX };
			isDefault = true;
			loading = false;
			err = '';
			ok = '';
			return;
		}
		loading = true;
		err = '';
		ok = '';
		void (async () => {
			try {
				const res = await getClubEligibilityMatrix({ clubId: cid });
				const data = res.data as {
					matrix?: Record<string, boolean>;
					isDefault?: boolean;
				};
				matrix = { ...DEFAULT_ELIGIBILITY_MATRIX, ...(data.matrix || {}) };
				isDefault = data.isDefault !== false;
			} catch (e) {
				err = formatEligibilityCallableError(e, 'Could not load eligibility matrix.');
			} finally {
				loading = false;
			}
		})();
	});

	async function saveMatrix() {
		if (!hasClub || saving) return;
		err = '';
		ok = '';
		saving = true;
		try {
			await upsertClubEligibilityMatrix({ clubId: clubId.trim(), matrix });
			ok = 'Eligibility requirements saved.';
			isDefault = false;
			onSaved();
		} catch (e) {
			err = formatEligibilityCallableError(e, 'Could not save eligibility matrix.');
		} finally {
			saving = false;
		}
	}
</script>

<section class="em-panel" aria-labelledby="em-panel-title">
	<h3 id="em-panel-title" class="em-panel__title">Eligibility requirements</h3>
	<p class="em-panel__sub">
		Configure which gates must pass before a player shows as <strong>eligible</strong> in the
		compliance matrix (SportsEngine-style org rules).
	</p>

	{#if !hasClub}
		<p class="em-panel__empty" role="status">Select a club to configure eligibility requirements.</p>
	{:else if loading}
		<p class="em-panel__muted" aria-busy="true">Loading requirements…</p>
	{:else}
		{#if isDefault}
			<p class="em-panel__note" role="status">Using platform defaults — save to persist club-specific rules.</p>
		{/if}

		<p
			class="em-panel__validation"
			class:em-panel__validation--warn={validation.level === 'warn'}
			role={validation.level === 'warn' ? 'alert' : 'status'}
		>
			{validation.message}
		</p>

		<ul class="em-panel__list">
			{#each toggles as t (t.key)}
				<li class="em-panel__row">
					<label class="em-panel__check">
						<input type="checkbox" bind:checked={matrix[t.key]} disabled={saving} />
						<span>
							<strong>{t.label}</strong>
							<span class="em-panel__hint">{t.hint}</span>
						</span>
					</label>
				</li>
			{/each}
		</ul>

		<button
			type="button"
			class="em-panel__save"
			disabled={saving}
			onclick={() => void saveMatrix()}
		>
			{saving ? 'Saving…' : 'Save requirements'}
		</button>
	{/if}

	{#if err}<p class="em-panel__err" role="alert">{err}</p>{/if}
	{#if ok}<p class="em-panel__ok" role="status">{ok}</p>{/if}
</section>

<style>
	.em-panel {
		margin-bottom: 1rem;
		padding: 1rem 1.1rem;
		border: 1px solid #334155;
		border-radius: 12px;
		background: #0f172a;
	}

	.em-panel__title {
		margin: 0 0 0.35rem;
		font-size: 0.9375rem;
		font-weight: 800;
		color: #fbbf24;
	}

	.em-panel__sub {
		margin: 0 0 0.85rem;
		font-size: 0.8125rem;
		color: #94a3b8;
		line-height: 1.45;
	}

	.em-panel__list {
		list-style: none;
		padding: 0;
		margin: 0 0 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.em-panel__check {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: #e2e8f0;
		cursor: pointer;
	}

	.em-panel__check strong {
		display: block;
	}

	.em-panel__hint {
		display: block;
		font-size: 0.6875rem;
		color: #64748b;
		margin-top: 0.1rem;
	}

	.em-panel__save {
		border: none;
		border-radius: 8px;
		padding: 0.45rem 0.85rem;
		font-size: 0.8125rem;
		font-weight: 700;
		background: #14b8a6;
		color: #0f172a;
		cursor: pointer;
	}

	.em-panel__save:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.em-panel__muted,
	.em-panel__empty {
		font-size: 0.8125rem;
		color: #64748b;
	}

	.em-panel__note {
		margin: 0 0 0.55rem;
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.em-panel__validation {
		margin: 0 0 0.65rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #14b8a6;
	}

	.em-panel__validation--warn {
		color: #fbbf24;
	}

	.em-panel__err {
		margin: 0.5rem 0 0;
		font-size: 0.8125rem;
		color: #f87171;
	}

	.em-panel__ok {
		margin: 0.5rem 0 0;
		font-size: 0.8125rem;
		color: #14b8a6;
	}
</style>
