<script lang="ts">
	/**
	 * CoachTeamRosterPanel.svelte — Shell layer (Vanguard Trinity)
	 * ─────────────────────────────────────────────────────────────
	 * Orchestrates the roster Brain (RosterPanelEngine) and renders
	 * via the Glass layer (RosterPlayerRow).
	 *
	 * Zero Firestore or business logic lives here — this component
	 * only wires props to child components and manages lifecycle.
	 */
	import { RosterPanelEngine } from './RosterPanelEngine.svelte.js';
	import RosterPlayerRow from './RosterPlayerRow.svelte';
	import CoachRosterImportPanel from '$lib/coach/logistics/CoachRosterImportPanel.svelte';

	import { db } from '$lib/firebase.js';
	import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';

	let { teamId = '' } = $props();

	const engine = new RosterPanelEngine();
	let inviteCode = $state('');
	let codeBusy = $state(false);
	let copied = $state(false);

	const activeTeamId = $derived(teamId || authStore.userProfile?.teamId || '');

	$effect(() => {
		const tid = activeTeamId;
		untrack(() => {
			if (!tid) {
				engine.players = [];
				engine.loading = false;
				inviteCode = '';
				return;
			}
			engine.subscribe(tid);
		});

		if (!db || !tid) return;
		const unsub = onSnapshot(doc(db, 'teams', tid), (snap) => {
			if (snap.exists()) {
				const d = snap.data();
				inviteCode = d.inviteCode || d.dispatchCode || '';
			}
		});

		return () => {
			engine.detach();
			unsub();
		};
	});

	function genDispatchCode() {
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		let s = '';
		for (let i = 0; i < 6; i++) {
			s += chars[Math.floor(Math.random() * chars.length)];
		}
		return `${s.slice(0, 2)}-${s.slice(2)}`;
	}

	async function handleGenerateCode() {
		if (!activeTeamId || codeBusy || !db) return;
		codeBusy = true;
		try {
			const code = genDispatchCode();
			await updateDoc(doc(db, 'teams', activeTeamId), {
				inviteCode: code,
				dispatchCode: code,
				updatedAt: serverTimestamp(),
			});
			inviteCode = code;
		} catch (e) {
			console.error('Failed to issue dispatch code', e);
		} finally {
			codeBusy = false;
		}
	}

	async function copyCode() {
		if (!inviteCode) return;
		try {
			await navigator.clipboard.writeText(inviteCode);
			copied = true;
			setTimeout(() => { copied = false; }, 2000);
		} catch {
			/* non-fatal clipboard error */
		}
	}
</script>

<div class="ops-panel">
	<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border tw-border-slate-800 tw-bg-[#0f172a] tw-p-4">
		<div>
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-inline-block tw-h-2 tw-w-2 tw-bg-[#14b8a6]"></span>
				<h3 class="tw-m-0 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-200">
					TEAM DISPATCH CODE (PARENT ONBOARDING)
				</h3>
			</div>
			<p class="tw-m-0 tw-mt-1 tw-text-xs tw-text-slate-400">
				Share this secure code with parents to let them link their athletes to your roster.
			</p>
		</div>

		<div class="tw-flex tw-items-center tw-gap-2">
			{#if inviteCode}
				<span class="tw-border tw-border-[#14b8a6]/40 tw-bg-slate-950 tw-px-3 tw-py-1.5 tw-font-mono tw-text-sm tw-font-black tw-tracking-widest tw-text-[#14b8a6]">
					{inviteCode}
				</span>
				<button
					type="button"
					class="tw-border tw-border-slate-700 tw-bg-slate-900 tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs tw-font-bold tw-text-slate-200 hover:tw-border-[#14b8a6] hover:tw-text-[#14b8a6] tw-transition-colors"
					onclick={copyCode}
				>
					{copied ? '✓ COPIED' : 'COPY CODE'}
				</button>
			{/if}
			<button
				type="button"
				class="tw-border tw-border-slate-700 tw-bg-slate-900 tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs tw-font-bold tw-text-slate-200 hover:tw-border-[#daff0a] hover:tw-text-[#daff0a] tw-transition-colors disabled:tw-opacity-50"
				onclick={handleGenerateCode}
				disabled={codeBusy || !activeTeamId}
			>
				{inviteCode ? '⟳ RE-ISSUE' : '+ ISSUE CODE'}
			</button>
		</div>
	</div>

	<h2 class="ops-panel__title tw-mt-2">Roster</h2>
	<p class="ops-panel__sub">
		Import CSV below or add one player at a time on
		<a class="ops-link" href="/coach/dashboard">Mission Control</a>.
		Linked players with email appear in the list automatically.
	</p>

	<CoachRosterImportPanel {teamId} />

	{#if engine.loading}
		<p class="ops-muted">Loading roster…</p>
	{:else if engine.err}
		<p class="ops-err" role="alert">{engine.err}</p>
	{:else if engine.players.length === 0}
		<p class="ops-muted">No athletes found on this roster. Ingest using the CSV tool above or share your dispatch code with parents.</p>
	{:else}
		<p class="ops-count">{engine.players.length} player{engine.players.length === 1 ? '' : 's'}</p>
		<ul class="ops-roster">
			{#each engine.players as player (player.id)}
				<RosterPlayerRow
					{player}
					isEditing={engine.editingPlayerId === player.id}
					editData={engine.editData}
					onStartEdit={(p) => engine.startEdit(p)}
					onCancelEdit={() => engine.cancelEdit()}
					onSaveEdit={(id) => engine.saveEdit(id)}
				/>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.ops-panel { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
	.ops-panel__title { margin: 0; font-size: 15px; font-weight: 800; color: #e2e8f0; }
	.ops-panel__sub { margin: 0; font-size: 12px; color: #94a3b8; max-width: 40rem; }
	.ops-muted { margin: 0; font-size: 13px; color: #64748b; }
	.ops-err { margin: 0; font-size: 12px; color: #f87171; }
	.ops-count { margin: 0; font-size: 12px; font-weight: 700; color: #94a3b8; }
	.ops-roster { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
	.ops-link { color: #14b8a6; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
	.ops-link:hover { color: #14b8a6; }
</style>
