<script>
	import { browser } from '$app/environment';
	import {
		addDoc,
		collection,
		deleteDoc,
		doc,
		getDocs,
		orderBy,
		query,
		serverTimestamp,
		where,
	} from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { auth, db, functions } from '$lib/firebase.js';
	import Modal from '$lib/components/Modal.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

	const secureAssignHomework = httpsCallable(functions, 'secureAssignHomework');

	// ── Team context resolution ──────────────────────────────────────────────
	const role = $derived(authStore.role);
	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const myTeams = $derived.by(() => {
		if (!teamsStore.loaded) return [];
		if (role === 'super_admin' || role === 'global_admin' || role === 'director') {
			return teamsStore.teams.slice();
		}
		if (!myEmail) return [];
		return teamsStore.getCoachTeams(myEmail);
	});

	let selectedTeamId = $state('');
	$effect(() => {
		const teams = myTeams;
		if (teams.length === 0) return;
		const pivot = workspaceContextStore.activeTeamId?.trim();
		if (pivot && teams.some((t) => t.id === pivot)) {
			if (selectedTeamId !== pivot) selectedTeamId = pivot;
			return;
		}
		const prof = authStore.userProfile;
		if (
			prof?.teamId &&
			prof.teamId !== 'admin' &&
			teams.some((t) => t.id === prof.teamId)
		) {
			if (selectedTeamId !== prof.teamId) selectedTeamId = prof.teamId;
			return;
		}
		if (!selectedTeamId || !teams.some((t) => t.id === selectedTeamId)) {
			selectedTeamId = teams[0].id;
		}
	});

	const currentTeam = $derived(myTeams.find((t) => t.id === selectedTeamId));

	// ── Drill library data loads ─────────────────────────────────────────────
	/** @typedef {{ id: string, title: string, category: string, metricType: string, videoUrl: string, description: string, durationMinutes: number, baseXp: number, source: 'team' | 'global', createdBy?: string }} DrillRow */

	/** @type {DrillRow[]} */
	let teamDrills = $state([]);
	/** @type {DrillRow[]} */
	let globalDrills = $state([]);
	let loadingTeamDrills = $state(false);
	let loadingGlobalDrills = $state(true);
	let loadError = $state('');
	let reloadCounter = $state(0);

	$effect(() => {
		if (!browser) return;
		void reloadCounter;
		loadingGlobalDrills = true;
		let cancelled = false;
		(async () => {
			try {
				const snap = await getDocs(query(collection(db, 'drills'), orderBy('title')));
				if (cancelled) return;
				globalDrills = snap.docs.map((d) => {
					const x = d.data() || {};
					return {
						id: d.id,
						title: typeof x.title === 'string' ? x.title : 'Untitled Drill',
						category: typeof x.category === 'string' ? x.category : 'General',
						metricType: typeof x.metricType === 'string' ? x.metricType : 'reps',
						videoUrl: typeof x.videoUrl === 'string' ? x.videoUrl : '',
						description: typeof x.description === 'string' ? x.description : '',
						durationMinutes:
							typeof x.durationMinutes === 'number' ? x.durationMinutes : 10,
						baseXp:
							typeof x.base_xp === 'number' && !Number.isNaN(x.base_xp) ?
								Math.floor(x.base_xp) :
								10,
						source: /** @type {'global'} */ ('global'),
					};
				});
			} catch (e) {
				if (!cancelled) {
					loadError =
						e instanceof Error ? e.message : 'Could not load global drill library.';
				}
			} finally {
				if (!cancelled) loadingGlobalDrills = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		void reloadCounter;
		if (!browser || !selectedTeamId) {
			teamDrills = [];
			return;
		}
		loadingTeamDrills = true;
		let cancelled = false;
		(async () => {
			try {
				const snap = await getDocs(
					collection(db, 'teams', selectedTeamId, 'drills'),
				);
				if (cancelled) return;
				const rows = snap.docs.map((d) => {
					const x = d.data() || {};
					return {
						id: d.id,
						title:
							typeof x.name === 'string' && x.name.trim() ?
								x.name.trim() :
								typeof x.title === 'string' ?
									x.title :
									'Untitled Drill',
						category:
							typeof x.category === 'string' ?
								x.category :
								typeof x.focusArea === 'string' ?
									x.focusArea :
									'General',
						metricType: typeof x.metricType === 'string' ? x.metricType : 'reps',
						videoUrl: typeof x.videoUrl === 'string' ? x.videoUrl : '',
						description: typeof x.description === 'string' ? x.description : '',
						durationMinutes:
							typeof x.durationMinutes === 'number' ? x.durationMinutes : 10,
						baseXp:
							typeof x.base_xp === 'number' && !Number.isNaN(x.base_xp) ?
								Math.floor(x.base_xp) :
								10,
						source: /** @type {'team'} */ ('team'),
						createdBy: typeof x.createdBy === 'string' ? x.createdBy : '',
					};
				});
				rows.sort((a, b) => a.title.localeCompare(b.title));
				teamDrills = rows;
			} catch (e) {
				if (!cancelled) {
					console.error('[drills] team load error', e);
					teamDrills = [];
				}
			} finally {
				if (!cancelled) loadingTeamDrills = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	// ── Tab + search ─────────────────────────────────────────────────────────
	/** @type {'team' | 'global'} */
	let activeTab = $state('team');
	let searchTerm = $state('');

	const visibleRows = $derived.by(() => {
		const rows = activeTab === 'team' ? teamDrills : globalDrills;
		const q = searchTerm.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) => {
			return (
				r.title.toLowerCase().includes(q) ||
				r.category.toLowerCase().includes(q) ||
				r.metricType.toLowerCase().includes(q)
			);
		});
	});

	// ── Add Drill modal ──────────────────────────────────────────────────────
	let addOpen = $state(false);
	let formTitle = $state('');
	let formCategory = $state('Ball Mastery');
	let formMetricType = $state('reps');
	let formVideoUrl = $state('');
	let formDuration = $state(10);
	let addBusy = $state(false);
	let addErr = $state('');

	const DRILL_CATEGORIES = [
		'Ball Mastery',
		'Finishing',
		'Passing',
		'Dribbling',
		'Defending',
		'Conditioning',
		'Set Pieces',
		'Goalkeeping',
		'Tactics',
	];
	const METRIC_TYPES = [
		{ value: 'reps', label: 'Reps (count)' },
		{ value: 'time', label: 'Time (seconds)' },
		{ value: 'distance', label: 'Distance (meters)' },
		{ value: 'score', label: 'Score (points)' },
	];

	function openAddDrill() {
		formTitle = '';
		formCategory = 'Ball Mastery';
		formMetricType = 'reps';
		formVideoUrl = '';
		formDuration = 10;
		addErr = '';
		addOpen = true;
	}

	async function submitAddDrill() {
		addErr = '';
		const title = formTitle.trim();
		if (!title) {
			addErr = 'Drill title is required.';
			return;
		}
		if (title.length > 200) {
			addErr = 'Title must be 200 characters or fewer.';
			return;
		}
		if (formVideoUrl && !/^https?:\/\//i.test(formVideoUrl.trim())) {
			addErr = 'Video URL must start with http:// or https://';
			return;
		}
		if (!selectedTeamId) {
			addErr = 'Select a team before creating a drill.';
			return;
		}
		const uid = auth.currentUser?.uid;
		if (!uid) {
			addErr = 'Your session expired. Sign in again.';
			return;
		}
		addBusy = true;
		try {
			const duration = Number.isFinite(formDuration) ?
				Math.max(1, Math.min(240, Math.floor(formDuration))) :
				10;
			const description = `${formCategory} · metric: ${formMetricType}${formVideoUrl ? `\nVideo: ${formVideoUrl.trim()}` : ''}`;
			await addDoc(collection(db, 'teams', selectedTeamId, 'drills'), {
				name: title,
				title,
				category: formCategory,
				focusArea: formCategory,
				metricType: formMetricType,
				videoUrl: formVideoUrl.trim(),
				description,
				durationMinutes: duration,
				createdBy: uid,
				createdByEmail: myEmail,
				createdAt: serverTimestamp(),
			});
			addOpen = false;
			reloadCounter++;
		} catch (e) {
			addErr = e instanceof Error ? e.message : 'Could not save drill.';
		} finally {
			addBusy = false;
		}
	}

	// ── Delete drill ─────────────────────────────────────────────────────────
	async function deleteDrill(row) {
		if (row.source !== 'team') return;
		const ok = confirm(`Delete drill "${row.title}"? This cannot be undone.`);
		if (!ok) return;
		try {
			await deleteDoc(doc(db, 'teams', selectedTeamId, 'drills', row.id));
			reloadCounter++;
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Could not delete drill.');
		}
	}

	// ── Assign Homework modal ────────────────────────────────────────────────
	let assignOpen = $state(false);
	/** @type {DrillRow | null} */
	let assignDrill = $state(null);
	let assignDue = $state('');
	let assignBusy = $state(false);
	let assignErr = $state('');
	let assignOk = $state('');
	/** @type {Array<{ email: string, playerName: string }>} */
	let roster = $state([]);
	let loadingRoster = $state(false);
	let selectedEmails = $state(/** @type {Set<string>} */ (new Set()));

	$effect(() => {
		if (!browser || !selectedTeamId || !assignOpen) return;
		loadingRoster = true;
		let cancelled = false;
		(async () => {
			try {
				const snap = await getDocs(
					query(collection(db, 'users'), where('teamId', '==', selectedTeamId)),
				);
				if (cancelled) return;
				const rows = [];
				snap.forEach((d) => {
					const x = d.data() || {};
					if (x.role !== 'player') return;
					rows.push({
						email: d.id,
						playerName:
							typeof x.playerName === 'string' && x.playerName.trim() ?
								x.playerName.trim() :
								d.id,
					});
				});
				rows.sort((a, b) => a.playerName.localeCompare(b.playerName));
				roster = rows;
			} catch (e) {
				console.error('[drills] roster load', e);
				roster = [];
			} finally {
				if (!cancelled) loadingRoster = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	function openAssign(row) {
		if (row.source !== 'global') return;
		assignDrill = row;
		assignDue = '';
		assignErr = '';
		assignOk = '';
		selectedEmails = new Set();
		assignOpen = true;
	}

	function toggleEmail(em) {
		const next = new Set(selectedEmails);
		if (next.has(em)) next.delete(em);
		else next.add(em);
		selectedEmails = next;
	}

	function toggleAllEmails() {
		if (selectedEmails.size === roster.length) {
			selectedEmails = new Set();
		} else {
			selectedEmails = new Set(roster.map((r) => r.email));
		}
	}

	const assignDisabled = $derived(
		!assignDrill || !assignDue || selectedEmails.size === 0 || assignBusy,
	);

	async function submitAssign() {
		if (assignDisabled || !assignDrill || !selectedTeamId) return;
		assignBusy = true;
		assignErr = '';
		try {
			const due = new Date(assignDue);
			if (Number.isNaN(due.getTime())) {
				assignErr = 'Pick a valid due date and time.';
				return;
			}
			const res = await secureAssignHomework({
				teamId: selectedTeamId,
				drillId: assignDrill.id,
				dueDate: due.toISOString(),
				playerEmails: Array.from(selectedEmails),
			});
			const count =
				res && typeof res.data === 'object' && res.data && 'assignedCount' in res.data ?
					Number(res.data.assignedCount) :
					selectedEmails.size;
			assignOk = `Homework dispatched to ${count} player${count === 1 ? '' : 's'}.`;
			selectedEmails = new Set();
			assignDue = '';
		} catch (e) {
			assignErr = e instanceof Error ? e.message : 'Assignment failed.';
		} finally {
			assignBusy = false;
		}
	}
</script>

<svelte:head>
	<title>Drill Library · SSTRACKER</title>
</svelte:head>

<section class="drill-lib">
	<header class="drill-lib__head">
		<div>
			<h1 class="drill-lib__title">Drill Library</h1>
			<p class="drill-lib__sub">
				Team › {currentTeam?.name || selectedTeamId || '—'}
			</p>
		</div>
		<div class="drill-lib__head-actions">
			{#if myTeams.length > 1}
				<label class="drill-lib__team-picker">
					<span class="sr-only">Team</span>
					<select bind:value={selectedTeamId}>
						{#each myTeams as t (t.id)}
							<option value={t.id}>{t.name || t.id}</option>
						{/each}
					</select>
				</label>
			{/if}
			<button type="button" class="drill-lib__btn drill-lib__btn--primary" onclick={openAddDrill}>
				<i class="ph ph-plus-circle" aria-hidden="true"></i>
				<span>Add Drill</span>
			</button>
		</div>
	</header>

	<nav class="drill-lib__tabs" aria-label="Drill library sections">
		<button
			type="button"
			class="drill-lib__tab"
			class:is-active={activeTab === 'team'}
			onclick={() => (activeTab = 'team')}
		>
			Custom Drills
			<span class="drill-lib__tab-count">{teamDrills.length}</span>
		</button>
		<button
			type="button"
			class="drill-lib__tab"
			class:is-active={activeTab === 'global'}
			onclick={() => (activeTab = 'global')}
		>
			Published Library
			<span class="drill-lib__tab-count">{globalDrills.length}</span>
		</button>
	</nav>

	<div class="drill-lib__toolbar">
		<label class="drill-lib__search">
			<i class="ph ph-magnifying-glass" aria-hidden="true"></i>
			<input
				type="search"
				placeholder="Search by title, category, or metric…"
				bind:value={searchTerm}
			/>
		</label>
		{#if activeTab === 'team'}
			<p class="drill-lib__hint">
				Custom drills are scoped to this team. Promote to the published library via a global admin to make them assignable via homework.
			</p>
		{:else}
			<p class="drill-lib__hint">
				Published drills can be pushed to your roster as homework. Assignments appear in each player's action board.
			</p>
		{/if}
	</div>

	{#if loadError}
		<div class="drill-lib__alert" role="alert">{loadError}</div>
	{/if}

	<div class="drill-lib__table-wrap">
		<table class="drill-lib__table" aria-label="Drill library table">
			<thead>
				<tr>
					<th scope="col">Title</th>
					<th scope="col">Category</th>
					<th scope="col">Metric</th>
					<th scope="col">Video</th>
					<th scope="col" class="drill-lib__num-col">Base XP</th>
					<th scope="col" class="drill-lib__actions-col"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#if activeTab === 'team' && loadingTeamDrills}
					<tr><td colspan="6" class="drill-lib__empty">Loading custom drills…</td></tr>
				{:else if activeTab === 'global' && loadingGlobalDrills}
					<tr><td colspan="6" class="drill-lib__empty">Loading published library…</td></tr>
				{:else if visibleRows.length === 0}
					<tr>
						<td colspan="6" class="drill-lib__empty">
							{#if activeTab === 'team'}
								No custom drills yet. Click <strong>Add Drill</strong> to build your first one.
							{:else}
								No drills in the published library match your filter.
							{/if}
						</td>
					</tr>
				{:else}
					{#each visibleRows as row (row.id)}
						<tr>
							<td class="drill-lib__title-cell">
								<span class="drill-lib__title-text">{row.title}</span>
								{#if row.description}
									<span class="drill-lib__desc">{row.description}</span>
								{/if}
							</td>
							<td>
								<span class="drill-lib__chip">{row.category}</span>
							</td>
							<td>
								<span class="drill-lib__chip drill-lib__chip--alt">{row.metricType}</span>
							</td>
							<td>
								{#if row.videoUrl}
									<a
										class="drill-lib__video-link"
										href={row.videoUrl}
										target="_blank"
										rel="noopener noreferrer"
									>
										<i class="ph ph-play-circle" aria-hidden="true"></i>
										<span>Watch</span>
									</a>
								{:else}
									<span class="drill-lib__muted">—</span>
								{/if}
							</td>
							<td class="drill-lib__num-col tabular-num">{row.baseXp}</td>
							<td class="drill-lib__actions-col">
								{#if row.source === 'global'}
									<button
										type="button"
										class="drill-lib__btn drill-lib__btn--ghost"
										onclick={() => openAssign(row)}
									>
										<i class="ph ph-paper-plane-tilt" aria-hidden="true"></i>
										<span>Assign</span>
									</button>
								{:else}
									<button
										type="button"
										class="drill-lib__btn drill-lib__btn--ghost drill-lib__btn--danger"
										onclick={() => deleteDrill(row)}
										aria-label={`Delete drill ${row.title}`}
									>
										<i class="ph ph-trash" aria-hidden="true"></i>
										<span>Delete</span>
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>

<Modal bind:open={addOpen} title="Add Custom Drill" maxWidth="520px">
	<form class="dl-form" onsubmit={(e) => { e.preventDefault(); void submitAddDrill(); }}>
		<label class="dl-field">
			<span class="dl-field__label">Title</span>
			<input
				type="text"
				bind:value={formTitle}
				maxlength="200"
				required
				placeholder="e.g. 30-Touch Ladder Warmup"
			/>
		</label>

		<label class="dl-field">
			<span class="dl-field__label">Category</span>
			<select bind:value={formCategory}>
				{#each DRILL_CATEGORIES as c}
					<option value={c}>{c}</option>
				{/each}
			</select>
		</label>

		<label class="dl-field">
			<span class="dl-field__label">Metric Type</span>
			<select bind:value={formMetricType}>
				{#each METRIC_TYPES as m}
					<option value={m.value}>{m.label}</option>
				{/each}
			</select>
		</label>

		<label class="dl-field">
			<span class="dl-field__label">Duration (minutes)</span>
			<input type="number" min="1" max="240" bind:value={formDuration} />
		</label>

		<label class="dl-field">
			<span class="dl-field__label">Video URL (optional)</span>
			<input
				type="url"
				bind:value={formVideoUrl}
				placeholder="https://youtube.com/watch?v=…"
			/>
		</label>

		{#if addErr}
			<p class="dl-form__err" role="alert">{addErr}</p>
		{/if}

		<div class="dl-form__actions">
			<button type="button" class="drill-lib__btn drill-lib__btn--ghost" onclick={() => (addOpen = false)}>
				Cancel
			</button>
			<button
				type="submit"
				class="drill-lib__btn drill-lib__btn--primary"
				disabled={addBusy}
			>
				{addBusy ? 'Saving…' : 'Save Drill'}
			</button>
		</div>
	</form>
</Modal>

<Modal bind:open={assignOpen} title="Assign Homework" maxWidth="560px">
	{#if assignDrill}
		<div class="dl-assign">
			<div class="dl-assign__drill">
				<span class="dl-assign__label">Drill</span>
				<strong>{assignDrill.title}</strong>
				<span class="dl-assign__meta">{assignDrill.category} · metric: {assignDrill.metricType}</span>
			</div>

			<label class="dl-field">
				<span class="dl-field__label">Due date &amp; time</span>
				<input type="datetime-local" bind:value={assignDue} required />
			</label>

			<div class="dl-assign__roster">
				<div class="dl-assign__roster-head">
					<span class="dl-field__label">Roster</span>
					<button type="button" class="drill-lib__btn drill-lib__btn--ghost" onclick={toggleAllEmails}>
						{selectedEmails.size === roster.length && roster.length > 0 ? 'Clear all' : 'Select all'}
					</button>
				</div>
				{#if loadingRoster}
					<p class="drill-lib__hint">Loading roster…</p>
				{:else if roster.length === 0}
					<p class="drill-lib__hint">No player accounts on this team yet.</p>
				{:else}
					<ul class="dl-assign__list">
						{#each roster as p (p.email)}
							<li>
								<label class="dl-assign__row">
									<input
										type="checkbox"
										checked={selectedEmails.has(p.email)}
										onchange={() => toggleEmail(p.email)}
									/>
									<span class="dl-assign__name">{p.playerName}</span>
									<span class="dl-assign__email">{p.email}</span>
								</label>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			{#if assignErr}
				<p class="dl-form__err" role="alert">{assignErr}</p>
			{/if}
			{#if assignOk}
				<p class="dl-form__ok" role="status">{assignOk}</p>
			{/if}

			<div class="dl-form__actions">
				<button
					type="button"
					class="drill-lib__btn drill-lib__btn--ghost"
					onclick={() => (assignOpen = false)}
				>
					Close
				</button>
				<button
					type="button"
					class="drill-lib__btn drill-lib__btn--primary"
					disabled={assignDisabled}
					onclick={submitAssign}
				>
					{assignBusy ? 'Dispatching…' : `Assign to ${selectedEmails.size || 0}`}
				</button>
			</div>
		</div>
	{/if}
</Modal>

<style>
	.drill-lib {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 24px clamp(16px, 3vw, 32px) 48px;
		color: var(--text-primary, #fafafa);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.tabular-num {
		font-variant-numeric: tabular-nums;
	}

	.drill-lib__head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.drill-lib__title {
		margin: 0 0 4px;
		font-size: clamp(1.4rem, 3.2vw, 1.75rem);
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.drill-lib__sub {
		margin: 0;
		font-size: 0.85rem;
		color: #a1a1aa;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
	}

	.drill-lib__head-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		align-items: center;
	}

	.drill-lib__team-picker select {
		height: 40px;
		padding: 0 12px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: #18181b;
		color: #fafafa;
		font-size: 13.5px;
		min-width: 200px;
	}

	.drill-lib__btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 16px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: #18181b;
		color: #fafafa;
		font-weight: 700;
		font-size: 13.5px;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease, transform 0.05s ease;
	}

	.drill-lib__btn:hover {
		background: #27272a;
	}

	.drill-lib__btn:active {
		transform: translateY(1px);
	}

	.drill-lib__btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.drill-lib__btn--primary {
		background: linear-gradient(135deg, #6366f1, #4f46e5);
		border-color: transparent;
		color: #fff;
	}

	.drill-lib__btn--primary:hover {
		background: linear-gradient(135deg, #6366f1, #4338ca);
	}

	.drill-lib__btn--ghost {
		background: transparent;
		border-color: rgba(255, 255, 255, 0.14);
	}

	.drill-lib__btn--danger {
		color: #fca5a5;
		border-color: rgba(248, 113, 113, 0.35);
	}

	.drill-lib__btn--danger:hover {
		background: rgba(248, 113, 113, 0.12);
	}

	.drill-lib__tabs {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px;
		border-radius: 12px;
		background: #18181b;
		border: 1px solid rgba(255, 255, 255, 0.06);
		align-self: flex-start;
	}

	.drill-lib__tab {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 34px;
		padding: 0 14px;
		border-radius: 8px;
		background: transparent;
		border: 0;
		color: #d4d4d8;
		font-weight: 700;
		font-size: 13px;
		cursor: pointer;
	}

	.drill-lib__tab.is-active {
		background: #27272a;
		color: #fafafa;
	}

	.drill-lib__tab-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 20px;
		padding: 0 6px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		font-size: 11px;
		font-weight: 800;
	}

	.drill-lib__toolbar {
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}

	.drill-lib__search {
		position: relative;
		flex: 1 1 280px;
		max-width: 420px;
	}

	.drill-lib__search i {
		position: absolute;
		top: 50%;
		left: 12px;
		transform: translateY(-50%);
		color: #a1a1aa;
		font-size: 16px;
		pointer-events: none;
	}

	.drill-lib__search input {
		width: 100%;
		height: 40px;
		padding: 0 14px 0 2.5rem;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: #18181b;
		color: #fafafa;
		font-size: 13.5px;
		line-height: 1;
	}

	.drill-lib__hint {
		margin: 0;
		font-size: 12.5px;
		color: #a1a1aa;
		line-height: 1.5;
		max-width: 560px;
	}

	.drill-lib__alert {
		padding: 12px 14px;
		border-radius: 10px;
		background: rgba(248, 113, 113, 0.1);
		border: 1px solid rgba(248, 113, 113, 0.35);
		color: #fecaca;
		font-size: 13px;
	}

	.drill-lib__table-wrap {
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 14px;
		overflow: hidden;
		background: #09090b;
	}

	.drill-lib__table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
	}

	.drill-lib__table thead th {
		text-align: left;
		padding: 12px 16px;
		font-size: 11.5px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #a1a1aa;
		background: #18181b;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.drill-lib__table tbody td {
		padding: 14px 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
		vertical-align: middle;
		font-size: 13.5px;
		color: #fafafa;
	}

	.drill-lib__table tbody tr:first-child td {
		border-top: 0;
	}

	.drill-lib__table tbody tr:hover td {
		background: rgba(255, 255, 255, 0.02);
	}

	.drill-lib__title-cell {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 200px;
	}

	.drill-lib__title-text {
		font-weight: 700;
	}

	.drill-lib__desc {
		font-size: 12px;
		color: #a1a1aa;
		white-space: pre-wrap;
	}

	.drill-lib__chip {
		display: inline-block;
		padding: 4px 10px;
		border-radius: 999px;
		background: rgba(99, 102, 241, 0.14);
		color: #c7d2fe;
		font-size: 11.5px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.drill-lib__chip--alt {
		background: rgba(16, 185, 129, 0.14);
		color: #6ee7b7;
	}

	.drill-lib__video-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #93c5fd;
		font-weight: 700;
		font-size: 13px;
		text-decoration: none;
	}

	.drill-lib__video-link:hover {
		text-decoration: underline;
	}

	.drill-lib__muted {
		color: #52525b;
	}

	.drill-lib__num-col {
		text-align: right;
		width: 110px;
	}

	.drill-lib__actions-col {
		width: 140px;
		text-align: right;
	}

	.drill-lib__empty {
		padding: 28px 16px;
		text-align: center;
		color: #a1a1aa;
		font-size: 13.5px;
	}

	/* Modal form styles */
	.dl-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.dl-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.dl-field__label {
		font-size: 12px;
		font-weight: 700;
		color: #a1a1aa;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.dl-field input,
	.dl-field select {
		height: 40px;
		padding: 0 12px;
		border-radius: 10px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		background: #fff;
		color: #18181b;
		font-size: 14px;
	}

	:global(html.dark) .dl-field input,
	:global(html.dark) .dl-field select {
		background: #18181b;
		color: #fafafa;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.dl-form__actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 6px;
	}

	.dl-form__err {
		margin: 0;
		padding: 10px 12px;
		border-radius: 8px;
		background: rgba(248, 113, 113, 0.12);
		color: #b91c1c;
		font-size: 13px;
	}

	.dl-form__ok {
		margin: 0;
		padding: 10px 12px;
		border-radius: 8px;
		background: rgba(34, 197, 94, 0.12);
		color: #15803d;
		font-size: 13px;
	}

	/* Assign modal */
	.dl-assign {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.dl-assign__drill {
		padding: 12px 14px;
		border-radius: 10px;
		background: rgba(99, 102, 241, 0.08);
		border: 1px solid rgba(99, 102, 241, 0.2);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.dl-assign__label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #6366f1;
		font-weight: 800;
	}

	.dl-assign__meta {
		font-size: 12.5px;
		color: #a1a1aa;
	}

	.dl-assign__roster-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.dl-assign__list {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 10px;
	}

	:global(html.dark) .dl-assign__list {
		border-color: rgba(255, 255, 255, 0.08);
	}

	.dl-assign__row {
		display: grid;
		grid-template-columns: 24px 1fr auto;
		gap: 10px;
		align-items: center;
		padding: 10px 12px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		cursor: pointer;
	}

	:global(html.dark) .dl-assign__row {
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}

	.dl-assign__list li:last-child .dl-assign__row {
		border-bottom: 0;
	}

	.dl-assign__name {
		font-weight: 700;
		font-size: 13.5px;
	}

	.dl-assign__email {
		font-size: 12px;
		color: #a1a1aa;
	}
</style>
