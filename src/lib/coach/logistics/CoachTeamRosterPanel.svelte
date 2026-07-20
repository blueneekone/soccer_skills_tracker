<script lang="ts">
	import { db } from '$lib/firebase.js';
	import { collection, onSnapshot, query, where, doc, setDoc } from 'firebase/firestore';
	import CoachRosterImportPanel from '$lib/coach/logistics/CoachRosterImportPanel.svelte';

	let { teamId = '' } = $props();

	let loading = $state(true);
	let err = $state('');
	/** @type {Array<{ id: string; displayName: string; email: string; parentName: string; parentPhone: string; parentEmail: string; }>} */
	let players = $state([]);
	
	/** @type {string | null} */
	let editingPlayerId = $state(null);
	let editData = $state({ displayName: '', parentName: '', parentPhone: '', parentEmail: '' });

	$effect(() => {
		if (!teamId) {
			players = [];
			loading = false;
			return;
		}
		loading = true;
		err = '';
		const q = query(collection(db, 'player_lookup'), where('teamId', '==', teamId));
		const unsub = onSnapshot(
			q,
			(snap) => {
				players = snap.docs.map((d) => {
					const data = d.data();
					const email = d.id.toLowerCase();
					const displayName =
						(typeof data.displayName === 'string' && data.displayName.trim()) ||
						(typeof data.playerName === 'string' && data.playerName.trim()) ||
						email.split('@')[0];
						
					const parentName = typeof data.parentName === 'string' ? data.parentName : '';
					const parentPhone = typeof data.parentPhone === 'string' ? data.parentPhone : '';
					const parentEmail = typeof data.parentEmail === 'string' ? data.parentEmail : '';
					
					return { id: d.id, displayName, email, parentName, parentPhone, parentEmail };
				});
				players.sort((a, b) => a.displayName.localeCompare(b.displayName));
				loading = false;
			},
			(e) => {
				err = e.message || 'Could not load roster.';
				loading = false;
			},
		);
		return () => unsub();
	});

	/**
	 * @param {{ id: string, displayName: string, parentName: string, parentPhone: string, parentEmail: string }} p
	 */
	function startEdit(p) {
		editingPlayerId = p.id;
		editData = {
			displayName: p.displayName,
			parentName: p.parentName,
			parentPhone: p.parentPhone,
			parentEmail: p.parentEmail
		};
	}

	/**
	 * @param {{ id: string }} p
	 */
	async function saveEdit(p) {
		if (!editingPlayerId) return;
		try {
			await setDoc(doc(db, 'player_lookup', p.id), {
				displayName: editData.displayName,
				playerName: editData.displayName,
				parentName: editData.parentName,
				parentPhone: editData.parentPhone,
				parentEmail: editData.parentEmail
			}, { merge: true });
			editingPlayerId = null;
		} catch (e) {
			console.error("Failed to save player profile:", e);
			alert("Failed to save player profile.");
		}
	}
</script>

<div class="ops-panel">
	<h2 class="ops-panel__title">Roster</h2>
	<p class="ops-panel__sub">
		Import CSV below or add one player at a time on
		<a class="ops-link" href="/coach/daily-intel">Daily Intel</a>.
		Linked players with email appear in the list automatically.
	</p>

	<CoachRosterImportPanel {teamId} />

	{#if loading}
		<p class="ops-muted">Loading roster…</p>
	{:else if err}
		<p class="ops-err" role="alert">{err}</p>
	{:else if players.length === 0}
		<p class="ops-muted">No linked players on this team yet. Ask your director to sync the roster.</p>
	{:else}
		<p class="ops-count">{players.length} player{players.length === 1 ? '' : 's'}</p>
		<ul class="ops-roster">
			{#each players as p (p.id)}
				<li class="ops-roster__row">
					{#if editingPlayerId === p.id}
						<div class="tw-flex tw-flex-col tw-gap-2 tw-w-full">
							<div class="tw-flex tw-justify-between tw-items-center tw-mb-2">
								<span class="tw-font-bold tw-text-sm">Edit Player Profile</span>
								<button class="ops-link" onclick={() => editingPlayerId = null}>Cancel</button>
							</div>
							
							<label class="tw-text-xs tw-font-bold tw-text-slate-500 tw-tracking-widest">PLAYER NAME</label>
							<input class="tw-border tw-border-slate-300 tw-p-1.5 tw-rounded tw-text-sm" bind:value={editData.displayName} />
							
							<label class="tw-text-xs tw-font-bold tw-text-slate-500 tw-tracking-widest tw-mt-2">PARENT NAME</label>
							<input class="tw-border tw-border-slate-300 tw-p-1.5 tw-rounded tw-text-sm" bind:value={editData.parentName} />
							
							<label class="tw-text-xs tw-font-bold tw-text-slate-500 tw-tracking-widest tw-mt-2">PARENT PHONE</label>
							<input class="tw-border tw-border-slate-300 tw-p-1.5 tw-rounded tw-text-sm" bind:value={editData.parentPhone} />
							
							<label class="tw-text-xs tw-font-bold tw-text-slate-500 tw-tracking-widest tw-mt-2">PARENT EMAIL</label>
							<input class="tw-border tw-border-slate-300 tw-p-1.5 tw-rounded tw-text-sm" bind:value={editData.parentEmail} />

							<button 
								class="tw-mt-4 tw-bg-teal-600 tw-text-white tw-px-3 tw-py-2 tw-rounded tw-font-bold tw-text-sm hover:tw-bg-teal-700 tw-transition-colors"
								onclick={() => saveEdit(p)}>
								Save Profile
							</button>
						</div>
					{:else}
						<div class="tw-flex tw-w-full tw-justify-between tw-items-center">
							<div class="tw-flex tw-flex-col">
								<span class="ops-roster__name">{p.displayName}</span>
								<span class="ops-roster__email">{p.email}</span>
							</div>
							<button class="ops-link tw-text-xs" onclick={() => startEdit(p)}>Edit</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.ops-panel { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
	.ops-panel__title { margin: 0; font-size: 15px; font-weight: 800; color: var(--text-primary, #0f172a); }
	.ops-panel__sub { margin: 0; font-size: 12px; color: #64748b; max-width: 40rem; }
	.ops-muted { margin: 0; font-size: 13px; color: #64748b; }
	.ops-err { margin: 0; font-size: 12px; color: #b91c1c; }
	.ops-count { margin: 0; font-size: 12px; font-weight: 700; color: #334155; }
	.ops-roster { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
	.ops-roster__row {
		display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px;
		border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; background: #f8fafc;
	}
	.ops-roster__name { font-size: 13px; font-weight: 700; color: #0f172a; }
	.ops-roster__email { font-size: 12px; color: #64748b; font-family: ui-monospace, monospace; }
	.ops-link { color: #0d9488; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
	.ops-link:hover { color: #0f766e; }
</style>
