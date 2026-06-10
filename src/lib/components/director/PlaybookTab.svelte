<script>
	/**
	 * PlaybookTab — strategic playbook hub for Director workspace.
	 * Strictly sports tactics (formations, set pieces, tactical notes).
	 * No marketing, no campaigns, no public-facing promotion. Those concerns
	 * live outside the Director console.
	 */
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		collection,
		doc,
		getDocs,
		orderBy,
		query,
		serverTimestamp,
		setDoc,
		where,
	} from 'firebase/firestore';

	import DirectorDrillRecommendationsPanel from '$lib/components/director/DirectorDrillRecommendationsPanel.svelte';

	let { clubId = '' } = $props();

	/**
	 * @typedef {{
	 *   id: string,
	 *   title: string,
	 *   formation: string,
	 *   phase: 'attack' | 'defense' | 'set-piece' | 'transition',
	 *   notes: string,
	 *   updatedAt?: { toMillis?: () => number } | null,
	 * }} PlaybookEntry
	 */

	/** @type {PlaybookEntry[]} */
	let entries = $state([]);
	let loading = $state(false);
	let errMsg = $state('');

	let title = $state('');
	let formation = $state('4-3-3');
	/** @type {'attack' | 'defense' | 'set-piece' | 'transition'} */
	let phase = $state('attack');
	let notes = $state('');
	let saving = $state(false);
	let savedFlash = $state('');

	const phaseOptions = [
		{ value: 'attack', label: 'Attacking Phase' },
		{ value: 'defense', label: 'Defensive Phase' },
		{ value: 'set-piece', label: 'Set Piece' },
		{ value: 'transition', label: 'Transition' },
	];

	const formationOptions = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2'];

	async function loadEntries() {
		if (!clubId) return;
		loading = true;
		errMsg = '';
		try {
			const ref = collection(db, 'club_playbooks');
			const q = query(ref, where('clubId', '==', clubId), orderBy('updatedAt', 'desc'));
			const snap = await getDocs(q);
			entries = snap.docs.map((d) => ({
				id: d.id,
				title: String(d.data().title ?? ''),
				formation: String(d.data().formation ?? '4-3-3'),
				phase: /** @type {PlaybookEntry['phase']} */ (d.data().phase ?? 'attack'),
				notes: String(d.data().notes ?? ''),
				updatedAt: d.data().updatedAt ?? null,
			}));
		} catch (e) {
			errMsg = e instanceof Error ? e.message : 'Failed to load playbook.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!clubId) return;
		void loadEntries();
	});

	async function saveEntry() {
		const t = title.trim();
		if (!t) return;
		saving = true;
		errMsg = '';
		savedFlash = '';
		try {
			const ref = doc(collection(db, 'club_playbooks'));
			await setDoc(ref, {
				clubId,
				title: t,
				formation,
				phase,
				notes: notes.trim(),
				authorEmail: authStore.userProfile?.email || null,
				updatedAt: serverTimestamp(),
				createdAt: serverTimestamp(),
			});
			title = '';
			notes = '';
			savedFlash = 'Play saved to the club playbook.';
			await loadEntries();
			setTimeout(() => (savedFlash = ''), 2400);
		} catch (e) {
			errMsg = e instanceof Error ? e.message : 'Failed to save play.';
		} finally {
			saving = false;
		}
	}

	/** @param {PlaybookEntry} entry */
	function formatUpdated(entry) {
		const ms = entry.updatedAt?.toMillis?.();
		if (!ms) return '—';
		try {
			return new Date(ms).toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			});
		} catch {
			return '—';
		}
	}
</script>

<div class="pb-tab">
	<DirectorDrillRecommendationsPanel {clubId} />

	<header class="pb-tab__header">
		<div>
			<h3 class="pb-tab__title">Club Playbook</h3>
			<p class="pb-tab__sub">
				Tactical plays, formations, and set pieces shared with the coaching staff. Strictly
				strategy — no marketing or campaigns.
			</p>
		</div>
	</header>

	<section class="pb-tab__panel">
		<h4 class="pb-tab__section-title">Add New Play</h4>

		{#if errMsg}
			<p class="pb-tab__flash pb-tab__flash--err" role="alert">{errMsg}</p>
		{/if}
		{#if savedFlash}
			<p class="pb-tab__flash pb-tab__flash--ok" role="status">{savedFlash}</p>
		{/if}

		<div class="pb-tab__grid">
			<label class="pb-tab__field">
				<span class="pb-tab__label">Play Title</span>
				<input
					type="text"
					bind:value={title}
					placeholder="e.g. Overlap & Cross Right Channel"
					class="pb-tab__input"
				/>
			</label>

			<label class="pb-tab__field">
				<span class="pb-tab__label">Formation</span>
				<select bind:value={formation} class="pb-tab__input">
					{#each formationOptions as f (f)}
						<option value={f}>{f}</option>
					{/each}
				</select>
			</label>

			<label class="pb-tab__field">
				<span class="pb-tab__label">Phase</span>
				<select bind:value={phase} class="pb-tab__input">
					{#each phaseOptions as p (p.value)}
						<option value={p.value}>{p.label}</option>
					{/each}
				</select>
			</label>
		</div>

		<label class="pb-tab__field pb-tab__field--full">
			<span class="pb-tab__label">Tactical Notes</span>
			<textarea
				bind:value={notes}
				placeholder="Triggers, cues, roles, responsibilities…"
				class="pb-tab__textarea"
				rows="4"
			></textarea>
		</label>

		<div class="pb-tab__actions">
			<button
				type="button"
				class="pb-tab__btn pb-tab__btn--primary"
				onclick={saveEntry}
				disabled={saving || !title.trim()}
			>
				{saving ? 'Saving…' : 'Save Play'}
			</button>
		</div>
	</section>

	<section class="pb-tab__panel">
		<h4 class="pb-tab__section-title">Playbook Library</h4>

		{#if loading}
			<p class="pb-tab__muted">Loading plays…</p>
		{:else if entries.length === 0}
			<p class="pb-tab__muted">No plays yet. Add your first tactical play above.</p>
		{:else}
			<div class="pb-tab__table-wrap">
				<table class="pb-tab__table">
					<thead>
						<tr>
							<th>Play</th>
							<th>Formation</th>
							<th>Phase</th>
							<th>Updated</th>
						</tr>
					</thead>
					<tbody>
						{#each entries as entry (entry.id)}
							<tr>
								<td>
									<div class="pb-tab__play-title">{entry.title}</div>
									{#if entry.notes}
										<div class="pb-tab__play-notes">{entry.notes}</div>
									{/if}
								</td>
								<td><code class="pb-tab__code">{entry.formation}</code></td>
								<td><span class="pb-tab__chip pb-tab__chip--{entry.phase}">{entry.phase}</span></td>
								<td class="pb-tab__muted">{formatUpdated(entry)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>

<style>
	.pb-tab {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.pb-tab__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.pb-tab__title {
		margin: 0 0 4px;
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary, #09090b);
		letter-spacing: -0.02em;
	}

	.pb-tab__sub {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary, #52525b);
		max-width: 64ch;
	}

	.pb-tab__panel {
		background: var(--glass-bg, #ffffff);
		border: 1px solid var(--border-muted, #e5e5e5);
		border-radius: 12px;
		padding: 16px;
	}

	:global(html.dark) .pb-tab__panel {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.pb-tab__section-title {
		margin: 0 0 12px;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text-primary, #09090b);
	}

	.pb-tab__grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 12px;
		margin-bottom: 12px;
	}

	.pb-tab__field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.pb-tab__field--full {
		grid-column: 1 / -1;
	}

	.pb-tab__label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary, #52525b);
	}

	.pb-tab__input,
	.pb-tab__textarea {
		width: 100%;
		padding: 10px 12px;
		font: inherit;
		font-size: 14px;
		border: 1px solid var(--border-muted, #e5e5e5);
		border-radius: 8px;
		background: #ffffff;
		color: var(--text-primary, #09090b);
		box-sizing: border-box;
	}

	:global(html.dark) .pb-tab__input,
	:global(html.dark) .pb-tab__textarea {
		background: #0a0a0b;
		color: #fafafa;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.pb-tab__textarea {
		resize: vertical;
		min-height: 88px;
		font-family: inherit;
	}

	.pb-tab__actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 12px;
	}

	.pb-tab__btn {
		padding: 9px 16px;
		border-radius: 8px;
		border: 1px solid transparent;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}

	.pb-tab__btn--primary {
		background: #2563eb;
		color: #ffffff;
	}

	.pb-tab__btn--primary:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.pb-tab__btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.pb-tab__table-wrap {
		overflow-x: auto;
		border: 1px solid var(--border-muted, #e5e5e5);
		border-radius: 10px;
	}

	:global(html.dark) .pb-tab__table-wrap {
		border-color: rgba(255, 255, 255, 0.08);
	}

	.pb-tab__table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13.5px;
	}

	.pb-tab__table th,
	.pb-tab__table td {
		padding: 10px 12px;
		text-align: left;
		border-bottom: 1px solid var(--border-muted, #eeeeee);
		vertical-align: top;
	}

	:global(html.dark) .pb-tab__table th,
	:global(html.dark) .pb-tab__table td {
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}

	.pb-tab__table th {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary, #52525b);
		background: #fafafa;
	}

	:global(html.dark) .pb-tab__table th {
		background: #0a0a0b;
	}

	.pb-tab__play-title {
		font-weight: 600;
		color: var(--text-primary, #09090b);
	}

	.pb-tab__play-notes {
		margin-top: 2px;
		color: var(--text-secondary, #52525b);
		font-size: 12.5px;
	}

	.pb-tab__code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 12px;
		padding: 2px 6px;
		border-radius: 4px;
		background: #f4f4f5;
		color: var(--text-primary, #09090b);
	}

	:global(html.dark) .pb-tab__code {
		background: rgba(255, 255, 255, 0.06);
		color: #fafafa;
	}

	.pb-tab__chip {
		display: inline-block;
		padding: 2px 8px;
		font-size: 11px;
		font-weight: 600;
		border-radius: 999px;
		text-transform: capitalize;
	}

	.pb-tab__chip--attack {
		background: rgba(239, 68, 68, 0.12);
		color: #b91c1c;
	}

	.pb-tab__chip--defense {
		background: rgba(59, 130, 246, 0.12);
		color: #1d4ed8;
	}

	.pb-tab__chip--set-piece {
		background: rgba(234, 179, 8, 0.18);
		color: #a16207;
	}

	.pb-tab__chip--transition {
		background: rgba(168, 85, 247, 0.14);
		color: #7e22ce;
	}

	:global(html.dark) .pb-tab__chip--attack {
		background: rgba(239, 68, 68, 0.18);
		color: #fca5a5;
	}
	:global(html.dark) .pb-tab__chip--defense {
		background: rgba(59, 130, 246, 0.18);
		color: #93c5fd;
	}
	:global(html.dark) .pb-tab__chip--set-piece {
		background: rgba(234, 179, 8, 0.22);
		color: #fde68a;
	}
	:global(html.dark) .pb-tab__chip--transition {
		background: rgba(168, 85, 247, 0.2);
		color: #d8b4fe;
	}

	.pb-tab__flash {
		margin: 0 0 12px;
		padding: 9px 12px;
		border-radius: 8px;
		font-size: 13px;
		border: 1px solid transparent;
	}

	.pb-tab__flash--err {
		background: rgba(239, 68, 68, 0.08);
		border-color: rgba(239, 68, 68, 0.25);
		color: #b91c1c;
	}

	.pb-tab__flash--ok {
		background: rgba(16, 185, 129, 0.1);
		border-color: rgba(16, 185, 129, 0.28);
		color: #047857;
	}

	.pb-tab__muted {
		color: var(--text-secondary, #52525b);
		font-size: 13px;
		margin: 0;
	}
</style>
