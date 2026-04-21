<script>
	import { browser } from '$app/environment';
	import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { db, functions } from '$lib/firebase.js';
	import Modal from '$lib/components/Modal.svelte';

	let { teamId = '' } = $props();

	const secureAssignHomework = httpsCallable(functions, 'secureAssignHomework');

	/** @type {Array<{ id: string, title: string, category: string, description: string, base_xp: number, difficulty: string }>} */
	let drills = $state([]);
	let loadingDrills = $state(true);

	/** @type {Array<{ email: string, playerName: string }>} */
	let roster = $state([]);
	let loadingRoster = $state(false);

	let modalOpen = $state(false);
	/** @type {{ id: string, title: string, category: string, description: string, base_xp: number, difficulty: string } | null} */
	let selectedDrill = $state(null);
	let selectedEmails = $state(/** @type {Set<string>} */ (new Set()));
	let dueLocal = $state('');
	let assignBusy = $state(false);
	let assignErr = $state('');

	$effect(() => {
		if (!browser || !teamId) {
			drills = [];
			loadingDrills = false;
			return;
		}
		loadingDrills = true;
		let cancelled = false;
		(async () => {
			try {
				const q = query(collection(db, 'drills'), orderBy('title'));
				const snap = await getDocs(q);
				if (cancelled) return;
				const rows = [];
				snap.forEach((d) => {
					const x = d.data();
					rows.push({
						id: d.id,
						title: typeof x.title === 'string' ? x.title : 'Drill',
						category: typeof x.category === 'string' ? x.category : 'General',
						description:
							typeof x.description === 'string' ? x.description : '',
						base_xp:
							typeof x.base_xp === 'number' && !Number.isNaN(x.base_xp) ?
								Math.floor(x.base_xp) :
								10,
						difficulty:
							typeof x.difficulty === 'string' ? x.difficulty : 'medium',
					});
				});
				drills = rows;
			} catch (e) {
				console.error('[Playbook]', e);
				drills = [];
			} finally {
				if (!cancelled) loadingDrills = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!browser || !teamId) {
			roster = [];
			return;
		}
		loadingRoster = true;
		let cancelled = false;
		(async () => {
			try {
				const q = query(
					collection(db, 'users'),
					where('teamId', '==', teamId),
				);
				const snap = await getDocs(q);
				if (cancelled) return;
				const rows = [];
				snap.forEach((d) => {
					const x = d.data();
					if (x.role !== 'player') return;
					const em = d.id;
					const playerName =
						typeof x.playerName === 'string' ? x.playerName.trim() : em;
					rows.push({ email: em, playerName });
				});
				rows.sort((a, b) => a.playerName.localeCompare(b.playerName));
				roster = rows;
			} catch (e) {
				console.error('[Playbook] roster', e);
				roster = [];
			} finally {
				if (!cancelled) loadingRoster = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	function openAssign(drill) {
		selectedDrill = drill;
		selectedEmails = new Set();
		dueLocal = '';
		assignErr = '';
		modalOpen = true;
	}

	function closeModal() {
		modalOpen = false;
		selectedDrill = null;
	}

	function toggleEmail(em) {
		const next = new Set(selectedEmails);
		if (next.has(em)) next.delete(em);
		else next.add(em);
		selectedEmails = next;
	}

	function toggleSelectAll() {
		if (selectedEmails.size === roster.length) {
			selectedEmails = new Set();
		} else {
			selectedEmails = new Set(roster.map((r) => r.email));
		}
	}

	const assignDisabled = $derived(
		!dueLocal || selectedEmails.size === 0 || assignBusy || !selectedDrill,
	);

	async function submitAssign() {
		if (!selectedDrill || !teamId || assignDisabled) return;
		assignBusy = true;
		assignErr = '';
		try {
			const due = new Date(dueLocal);
			if (Number.isNaN(due.getTime())) {
				assignErr = 'Pick a valid date and time.';
				return;
			}
			await secureAssignHomework({
				teamId,
				drillId: selectedDrill.id,
				dueDate: due.toISOString(),
				playerEmails: Array.from(selectedEmails),
			});
			closeModal();
		} catch (e) {
			assignErr =
				e && typeof e === 'object' && 'message' in e ?
					String(e.message) :
					'Assignment failed.';
		} finally {
			assignBusy = false;
		}
	}
</script>

<div class="playbook">
	<div class="playbook__intro card">
		<div class="card-body">
			<h3 class="playbook__title">Coach Playbook</h3>
			<p class="playbook__lead">
				Pick a drill from the library, then assign it to your roster with a due date. Assignments
				appear in each athlete’s dashboard inbox.
			</p>
		</div>
	</div>

	<section class="playbook__step">
		<h4 class="playbook__step-label">1 · Drill library</h4>
		{#if loadingDrills}
			<p class="playbook__hint">Loading drills…</p>
		{:else if drills.length === 0}
			<div class="playbook__empty card">
				<div class="card-body">
					<p class="playbook__hint">
						No drills in the global catalog yet. A director or admin can seed the
						<code>drills</code> collection in Firestore (title, category, description, base_xp,
						difficulty).
					</p>
				</div>
			</div>
		{:else}
			<div class="playbook__grid">
				{#each drills as d (d.id)}
					<button
						type="button"
						class="playbook__drill-card"
						onclick={() => openAssign(d)}
					>
						<span class="playbook__drill-cat">{d.category}</span>
						<span class="playbook__drill-title">{d.title}</span>
						<span class="playbook__drill-meta"
							>{d.difficulty} · {d.base_xp} base XP</span
						>
						<span class="playbook__drill-desc">{d.description || '—'}</span>
					</button>
				{/each}
			</div>
		{/if}
	</section>

	<section class="playbook__step playbook__step--note">
		<h4 class="playbook__step-label">2 · Dispatch</h4>
		<p class="playbook__hint">
			Select a drill above to open the assignment modal with your roster checklist.
		</p>
	</section>
</div>

<Modal bind:open={modalOpen} title="Assign homework" maxWidth="560px">
	{#if selectedDrill}
		<div class="dispatch">
			<div class="dispatch__drill">
				<span class="dispatch__label">Drill</span>
				<strong>{selectedDrill.title}</strong>
				<p class="dispatch__desc">{selectedDrill.description || ''}</p>
			</div>

			<label class="dispatch__due">
				<span class="dispatch__label">Due date & time</span>
				<input type="datetime-local" bind:value={dueLocal} class="dispatch__input" />
			</label>

			<div class="dispatch__roster">
				<div class="dispatch__roster-head">
					<span class="dispatch__label">Roster</span>
					<button type="button" class="dispatch__all-btn" onclick={toggleSelectAll}>
						{selectedEmails.size === roster.length ? 'Clear all' : 'Select all'}
					</button>
				</div>
				{#if loadingRoster}
					<p class="playbook__hint">Loading roster…</p>
				{:else if roster.length === 0}
					<p class="playbook__hint">No player accounts on this team yet.</p>
				{:else}
					<ul class="dispatch__list">
						{#each roster as p (p.email)}
							<li>
								<label class="dispatch__row">
									<input
										type="checkbox"
										checked={selectedEmails.has(p.email)}
										onchange={() => toggleEmail(p.email)}
									/>
									<span class="dispatch__name">{p.playerName}</span>
									<span class="dispatch__email">{p.email}</span>
								</label>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			{#if assignErr}
				<p class="dispatch__err" role="alert">{assignErr}</p>
			{/if}

			<button
				type="button"
				class="primary-btn dispatch__btn"
				disabled={assignDisabled}
				onclick={submitAssign}
			>
				{assignBusy ? 'Assigning…' : 'Assign'}
			</button>
		</div>
	{/if}
</Modal>

<style>
	.playbook {
		display: flex;
		flex-direction: column;
		gap: clamp(18px, 3vw, 26px);
	}

	.playbook__title {
		margin: 0 0 8px;
		font-size: clamp(1.15rem, 3vw, 1.35rem);
		font-weight: 900;
	}

	.playbook__lead {
		margin: 0;
		font-size: 0.92rem;
		line-height: 1.55;
		opacity: 0.92;
	}

	.playbook__step-label {
		margin: 0 0 12px;
		font-size: 0.78rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-secondary);
	}

	.playbook__hint {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.playbook__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 14px;
	}

	.playbook__drill-card {
		text-align: left;
		padding: 16px;
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 8px;
		transition:
			box-shadow 0.2s,
			border-color 0.2s,
			transform 0.15s;
	}

	.playbook__drill-card:hover {
		border-color: color-mix(in srgb, var(--brand-primary) 45%, var(--glass-border));
		box-shadow: 0 12px 28px -12px rgba(15, 23, 42, 0.2);
		transform: translateY(-1px);
	}

	.playbook__drill-cat {
		font-size: 0.68rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--brand-primary);
	}

	.playbook__drill-title {
		font-size: 1.05rem;
		font-weight: 900;
		color: var(--text-primary);
	}

	.playbook__drill-meta {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.playbook__drill-desc {
		font-size: 0.82rem;
		line-height: 1.45;
		color: var(--muted-slate);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.dispatch {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.dispatch__label {
		display: block;
		font-size: 0.72rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
		margin-bottom: 6px;
	}

	.dispatch__drill strong {
		font-size: 1.1rem;
	}

	.dispatch__desc {
		margin: 8px 0 0;
		font-size: 0.88rem;
		line-height: 1.45;
	}

	.dispatch__input {
		width: 100%;
		padding: 12px 14px;
		border-radius: 14px;
		border: 1px solid var(--input-border);
		font: inherit;
	}

	.dispatch__roster-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 8px;
	}

	.dispatch__all-btn {
		border: none;
		background: rgba(99, 102, 241, 0.12);
		color: var(--brand-primary);
		font-size: 0.82rem;
		font-weight: 800;
		padding: 6px 12px;
		border-radius: 999px;
		cursor: pointer;
	}

	.dispatch__list {
		list-style: none;
		margin: 0;
		padding: 0;
		border-radius: 14px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
	}

	.dispatch__row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 10px;
		align-items: center;
		padding: 12px 14px;
		border-bottom: 1px solid var(--border-subtle);
		cursor: pointer;
		font: inherit;
	}

	.dispatch__list li:last-child .dispatch__row {
		border-bottom: none;
	}

	.dispatch__name {
		font-weight: 800;
	}

	.dispatch__email {
		font-size: 0.78rem;
		opacity: 0.85;
		text-align: right;
	}

	.dispatch__err {
		margin: 0;
		font-weight: 700;
		color: var(--danger-red);
		font-size: 0.9rem;
	}

	.dispatch__btn {
		width: 100%;
		background: linear-gradient(
			135deg,
			var(--brand-primary),
			color-mix(in srgb, var(--brand-primary) 75%, #1e1b4b)
		);
		border: none;
		font-weight: 900;
		padding: 14px;
		border-radius: 14px;
	}

	.dispatch__btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
