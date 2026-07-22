<script lang="ts">
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { db, functions } from '$lib/firebase.js';
	import { collection, query, where, onSnapshot } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import TryoutSessionsPanel from './TryoutSessionsPanel.svelte';

	let { clubId = '' } = $props();

	interface TryoutProgramRow {
		id: string;
		name: string;
		registrationCount: number;
		waitlistCount: number;
		registrationOpen: boolean;
		capacity: number | null;
		ageBands: string[];
	}

	let programs = $state<TryoutProgramRow[]>([]);
	let loading = $state(true);
	let expandedProgramId = $state('');

	let name = $state('');
	let ageBandsInput = $state('U10, U12, U14');
	let capacity = $state('');
	let closesAt = $state('');
	let fee = $state('');
	let registrationOpen = $state(true);
	let saving = $state(false);
	let err = $state('');
	let ok = $state('');
	let copyLabel = $state('Copy');

	const upsertTryoutProgram = httpsCallable(functions, 'upsertTryoutProgram');

	$effect(() => {
		const cid = clubId.trim();
		if (!cid || !browser) {
			programs = [];
			loading = false;
			return;
		}
		loading = true;
		const q = query(collection(db, 'tryout_programs'), where('clubId', '==', cid));
		const unsub = onSnapshot(
			q,
			(snap) => {
				programs = snap.docs
					.map((d) => {
					const x = d.data();
					const cap = Number(x.capacity);
					return {
						id: d.id,
						name: String(x.name || 'Tryouts'),
						registrationCount: Number(x.registrationCount) || 0,
						waitlistCount: Number(x.waitlistCount) || 0,
						registrationOpen: x.registrationOpen !== false,
						capacity: Number.isFinite(cap) && cap > 0 ? cap : null,
						ageBands: Array.isArray(x.ageBands) ? x.ageBands.map(String) : [],
					};
				})
					.sort((a, b) => a.name.localeCompare(b.name));
				loading = false;
			},
			(e) => {
				err = e.message;
				loading = false;
			},
		);
		return () => unsub();
	});

	function tryoutLink(programId: string) {
		if (!browser) return '';
		return `${window.location.origin}/tryouts/${encodeURIComponent(programId)}`;
	}

	async function saveProgram() {
		if (!clubId.trim() || saving) return;
		err = '';
		ok = '';
		saving = true;
		try {
			const ageBands = ageBandsInput
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			const cap = capacity.trim() ? Number(capacity) : undefined;
			const feeAmountDollars = fee.trim() ? Number(fee) : 0;
			const res = await upsertTryoutProgram({
				clubId: clubId.trim(),
				name: name.trim(),
				ageBands,
				registrationOpen,
				...(closesAt.trim() ? { registrationClosesAt: closesAt.trim() } : {}),
				...(cap != null && Number.isFinite(cap) && cap > 0 ? { capacity: cap } : {}),
				feeAmountDollars,
			});
			const data = res.data as { programId?: string };
			ok = data.programId
				? `Tryout program published. Share: ${tryoutLink(data.programId)}`
				: 'Tryout program saved.';
			name = '';
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save tryout program.';
		} finally {
			saving = false;
		}
	}

	async function copyLink(programId: string) {
		const url = tryoutLink(programId);
		if (!url) return;
		try {
			await navigator.clipboard.writeText(url);
			copyLabel = 'Copied';
			setTimeout(() => (copyLabel = 'Copy'), 2000);
		} catch {
			copyLabel = 'Failed';
		}
	}
</script>

<section class="tryouts-panel" aria-labelledby="tryouts-panel-title">
	<h3 id="tryouts-panel-title" class="tryouts-panel__title">Tryout programs</h3>
	<p class="tryouts-panel__sub">
		Publish registration, schedule field sessions, assign athletes, and run gate check-in.
	</p>

	{#if !clubId}
		<p class="tryouts-panel__muted">Select a club to manage tryouts.</p>
	{:else}
		<div class="tryouts-panel__grid">
			<label class="tryouts-field">
				<span class="tryouts-label">Program name</span>
				<input class="tryouts-input" type="text" bind:value={name} placeholder="Spring 2026 Tryouts" />
			</label>
			<label class="tryouts-field">
				<span class="tryouts-label">Age bands (comma-separated)</span>
				<input class="tryouts-input" type="text" bind:value={ageBandsInput} placeholder="U10, U12" />
			</label>
			<label class="tryouts-field">
				<span class="tryouts-label">Capacity (optional)</span>
				<input class="tryouts-input" type="number" min="1" bind:value={capacity} placeholder="120" />
			</label>
			<label class="tryouts-field">
				<span class="tryouts-label">Registration closes (YYYY-MM-DD)</span>
				<input class="tryouts-input" type="date" bind:value={closesAt} />
			</label>
			<label class="tryouts-field tryouts-field--check">
				<input type="checkbox" bind:checked={registrationOpen} />
				<span class="tryouts-label">Registration open</span>
			</label>
		</div>

		{#if err}<p class="tryouts-err" role="alert">{err}</p>{/if}
		{#if ok}<p class="tryouts-ok" role="status">{ok}</p>{/if}

		<button type="button" class="tryouts-btn" disabled={!name.trim() || saving} onclick={() => void saveProgram()}>
			{saving ? 'Publishing…' : 'Publish tryout program'}
		</button>

		{#if loading}
			<p class="tryouts-panel__muted">Loading programs…</p>
		{:else if programs.length > 0}
			<ul class="tryouts-list">
				{#each programs as p (p.id)}
					<li class="tryouts-list__item">
						<div class="tryouts-list__head">
							<div>
								<strong>{p.name}</strong>
								<span class="tryouts-list__meta">
									{p.registrationCount} registered
									{#if p.waitlistCount > 0}· {p.waitlistCount} waitlisted{/if}
									{#if p.capacity != null}· cap {p.capacity}{/if}
								</span>
							</div>
							<div class="tryouts-list__actions">
								<button type="button" class="tryouts-btn tryouts-btn--ghost" onclick={() => void copyLink(p.id)}>
									{copyLabel} link
								</button>
								<button
									type="button"
									class="tryouts-btn tryouts-btn--ghost"
									onclick={() => (expandedProgramId = expandedProgramId === p.id ? '' : p.id)}
								>
									{expandedProgramId === p.id ? 'Hide sessions' : 'Sessions & check-in'}
								</button>
							</div>
						</div>
						{#if expandedProgramId === p.id}
							<TryoutSessionsPanel programId={p.id} programName={p.name} ageBands={p.ageBands} clubId={clubId} />
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</section>

<style>
	.tryouts-panel {
		margin-bottom: 1.25rem;
		padding: 1rem 1.1rem;
		border: 1px solid #334155;
		border-radius: 12px;
		background: #0f172a;
	}

	.tryouts-panel__title {
		margin: 0 0 0.35rem;
		font-size: 0.9375rem;
		font-weight: 800;
		color: #f8fafc;
	}

	.tryouts-panel__sub {
		margin: 0 0 0.85rem;
		font-size: 0.8125rem;
		color: #94a3b8;
		line-height: 1.45;
	}

	.tryouts-panel__grid {
		display: grid;
		gap: 0.65rem;
		grid-template-columns: 1fr;
		margin-bottom: 0.75rem;
	}

	@media (min-width: 720px) {
		.tryouts-panel__grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.tryouts-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.tryouts-field--check {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		grid-column: 1 / -1;
	}

	.tryouts-label {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
	}

	.tryouts-input {
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 0.45rem 0.55rem;
		background: #1e293b;
		color: #f8fafc;
		font: inherit;
		font-size: 0.8125rem;
	}

	.tryouts-btn {
		border: none;
		border-radius: 8px;
		padding: 0.45rem 0.85rem;
		font-size: 0.8125rem;
		font-weight: 700;
		background: #14b8a6;
		color: #0f172a;
		cursor: pointer;
		margin-bottom: 0.75rem;
	}

	.tryouts-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.tryouts-btn--ghost {
		background: transparent;
		border: 1px solid #334155;
		color: #e2e8f0;
		margin: 0;
	}

	.tryouts-err {
		margin: 0 0 0.5rem;
		font-size: 0.8125rem;
		color: #f87171;
	}

	.tryouts-ok {
		margin: 0 0 0.5rem;
		font-size: 0.8125rem;
		color: #14b8a6;
		word-break: break-all;
	}

	.tryouts-panel__muted {
		margin: 0;
		font-size: 0.8125rem;
		color: #64748b;
	}

	.tryouts-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.tryouts-list__item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.55rem 0.65rem;
		border-radius: 8px;
		border: 1px solid #334155;
		background: #1e293b;
		font-size: 0.8125rem;
		color: #e2e8f0;
	}

	.tryouts-list__head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
	}

	.tryouts-list__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.tryouts-list__meta {
		display: block;
		font-size: 0.6875rem;
		color: #94a3b8;
		margin-top: 0.15rem;
	}
</style>
