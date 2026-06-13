<script lang="ts">
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { clubId = '' } = $props();

	let parentEmailsRaw = $state('');
	let playerEmailsRaw = $state('');
	let householdId = $state('');
	let busy = $state(false);
	let err = $state('');
	let ok = $state('');

	const linkHousehold = httpsCallable(functions, 'linkHousehold');

	function parseList(raw: string): string[] {
		return [
			...new Set(
				raw
					.split(/[\n,;]+/)
					.map((s) => s.trim().toLowerCase())
					.filter(Boolean),
			),
		];
	}

	async function submitLink() {
		err = '';
		ok = '';
		const parentEmails = parseList(parentEmailsRaw);
		const playerEmails = parseList(playerEmailsRaw);
		if (parentEmails.length < 1 || playerEmails.length < 1) {
			err = 'Enter at least one parent email and one player email.';
			return;
		}
		busy = true;
		try {
			const res = await linkHousehold({
				parentEmails,
				playerEmails,
				...(householdId.trim() ? { householdId: householdId.trim() } : {}),
				...(clubId.trim() ? { clubId: clubId.trim() } : {}),
			});
			const hid =
				res.data && typeof res.data === 'object' && 'householdId' in res.data
					? String((res.data as { householdId?: string }).householdId || '')
					: '';
			ok = hid
				? `Household linked (${hid}). Guardian fields will appear on team rosters after refresh.`
				: 'Household linked.';
			if (hid && !householdId.trim()) householdId = hid;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not link household.';
		} finally {
			busy = false;
		}
	}
</script>

<section class="hh-link" aria-labelledby="hh-link-title">
	<header class="hh-link__head">
		<h3 id="hh-link-title" class="hh-link__title">
			<Icon name={'user.group' as IconName} size={18} aria-hidden="true" />
			Link guardian ↔ athlete
		</h3>
		<p class="hh-link__sub">
			Merge parent and player accounts into one household. Required before comms, VPC, and
			compliance surfaces can resolve guardians for an athlete.
		</p>
	</header>

	<div class="hh-link__grid">
		<label class="hh-link__field">
			<span class="hh-link__label">Parent / guardian emails</span>
			<textarea
				class="hh-link__input"
				rows="3"
				placeholder="parent@example.com&#10;coparent@example.com"
				bind:value={parentEmailsRaw}
				disabled={busy}
			></textarea>
		</label>
		<label class="hh-link__field">
			<span class="hh-link__label">Player emails (minors)</span>
			<textarea
				class="hh-link__input"
				rows="3"
				placeholder="operative@operative.local"
				bind:value={playerEmailsRaw}
				disabled={busy}
			></textarea>
		</label>
		<label class="hh-link__field hh-link__field--full">
			<span class="hh-link__label">Existing household ID (optional — merge into)</span>
			<input
				type="text"
				class="hh-link__input hh-link__input--single"
				placeholder="Leave blank to create a new household"
				bind:value={householdId}
				disabled={busy}
			/>
		</label>
	</div>

	{#if err}
		<p class="hh-link__err" role="alert">{err}</p>
	{/if}
	{#if ok}
		<p class="hh-link__ok" role="status">{ok}</p>
	{/if}

	<button type="button" class="hh-link__btn" onclick={submitLink} disabled={busy}>
		{busy ? 'Linking…' : 'Link household'}
	</button>
</section>

<style>
	.hh-link {
		border: 1px solid rgba(51, 65, 85, 0.55);
		border-radius: 10px;
		padding: 1.25rem 1.35rem;
		background: rgba(15, 23, 42, 0.35);
	}

	.hh-link__head {
		margin-bottom: 1rem;
	}

	.hh-link__title {
		margin: 0 0 0.35rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.95rem;
		font-weight: 700;
		color: #f8fafc;
	}

	.hh-link__sub {
		margin: 0;
		font-size: 0.8125rem;
		color: #94a3b8;
		line-height: 1.45;
		max-width: 52rem;
	}

	.hh-link__grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.85rem;
	}

	@media (max-width: 720px) {
		.hh-link__grid {
			grid-template-columns: 1fr;
		}
	}

	.hh-link__field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.hh-link__field--full {
		grid-column: 1 / -1;
	}

	.hh-link__label {
		font-size: 0.6875rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
	}

	.hh-link__input {
		width: 100%;
		border-radius: 7px;
		border: 1px solid rgba(148, 163, 184, 0.25);
		background: rgba(2, 6, 23, 0.55);
		color: #e2e8f0;
		font: inherit;
		font-size: 0.8125rem;
		padding: 0.55rem 0.65rem;
		resize: vertical;
	}

	.hh-link__input--single {
		resize: none;
	}

	.hh-link__input:focus {
		outline: none;
		border-color: rgba(251, 191, 36, 0.55);
	}

	.hh-link__btn {
		margin-top: 0.85rem;
		padding: 0.55rem 1.1rem;
		border-radius: 7px;
		border: 1px solid rgba(251, 191, 36, 0.35);
		background: rgba(251, 191, 36, 0.12);
		color: #fbbf24;
		font-weight: 700;
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.hh-link__btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.hh-link__err {
		margin: 0.75rem 0 0;
		color: #fca5a5;
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.hh-link__ok {
		margin: 0.75rem 0 0;
		color: #6ee7b7;
		font-size: 0.8125rem;
		font-weight: 600;
	}
</style>
