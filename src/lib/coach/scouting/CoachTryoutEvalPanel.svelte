<script lang="ts">
	import { browser } from '$app/environment';
	import { auth, db, functions } from '$lib/firebase.js';
	import { onAuthStateChanged } from 'firebase/auth';
	import { collection, onSnapshot, query, where } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';

	type EvalMatrix = {
		pace: number;
		technique: number;
		tacticalVision: number;
		physicality: number;
		mentality: number;
	};

	const CRITERIA: Array<{ key: keyof EvalMatrix; label: string }> = [
		{ key: 'pace', label: 'Pace' },
		{ key: 'technique', label: 'Technique' },
		{ key: 'tacticalVision', label: 'Tactical Vision' },
		{ key: 'physicality', label: 'Physicality' },
		{ key: 'mentality', label: 'Mentality' },
	];

	function defaultMatrix(): EvalMatrix {
		return { pace: 50, technique: 50, tacticalVision: 50, physicality: 50, mentality: 50 };
	}

	interface ProgramRow {
		id: string;
		name: string;
	}

	interface AthleteRow {
		id: string;
		playerName: string;
		ageBand: string;
		pipelineStatus: string;
		overallGrade: number | null;
	}

	let programs = $state<ProgramRow[]>([]);
	let athletes = $state<AthleteRow[]>([]);
	let loading = $state(true);
	let err = $state('');
	let ok = $state('');
	let selectedProgramId = $state('');
	let activeAthleteId = $state('');
	let notes = $state('');
	let matrix = $state<EvalMatrix>(defaultMatrix());
	let saving = $state(false);

	const submitTryoutEvaluation = httpsCallable(functions, 'submitTryoutEvaluation');

	function setScore(key: keyof EvalMatrix, value: number) {
		matrix = { ...matrix, [key]: value };
	}

	$effect(() => {
		if (!browser) {
			programs = [];
			return;
		}
		let unsubPrograms: (() => void) | undefined;
		const authUnsub = onAuthStateChanged(auth, (user) => {
			unsubPrograms?.();
			unsubPrograms = undefined;
			if (!user) {
				programs = [];
				return;
			}
			void user.getIdTokenResult().then((token) => {
				const cid =
					typeof token.claims.clubId === 'string' ? token.claims.clubId.trim() : '';
				if (!cid) {
					programs = [];
					return;
				}
				const q = query(collection(db, 'tryout_programs'), where('clubId', '==', cid));
				unsubPrograms = onSnapshot(q, (snap) => {
					programs = snap.docs
						.map((d) => ({ id: d.id, name: String(d.data().name || 'Tryouts') }))
						.sort((a, b) => a.name.localeCompare(b.name));
					if (!selectedProgramId && programs.length) selectedProgramId = programs[0].id;
				});
			});
		});
		return () => {
			authUnsub();
			unsubPrograms?.();
		};
	});

	$effect(() => {
		const pid = selectedProgramId.trim();
		if (!pid || !browser) {
			athletes = [];
			loading = false;
			return;
		}
		loading = true;
		const regQ = query(collection(db, 'tryout_programs', pid, 'registrations'));
		const evalQ = query(collection(db, 'tryout_programs', pid, 'evaluations'));
		let regRows: AthleteRow[] = [];
		let evalGrades: Record<string, number> = {};

		const apply = () => {
			athletes = regRows
				.filter((r) => r.pipelineStatus !== 'waitlisted')
				.map((r) => ({
					...r,
					overallGrade: evalGrades[r.id] ?? r.overallGrade,
				}))
				.sort((a, b) => a.playerName.localeCompare(b.playerName));
			if (!activeAthleteId || !athletes.some((a) => a.id === activeAthleteId)) {
				activeAthleteId = athletes[0]?.id ?? '';
			}
			loading = false;
		};

		const unsubR = onSnapshot(regQ, (snap) => {
			regRows = snap.docs.map((d) => {
				const x = d.data();
				const grade = Number(x.overallGrade);
				return {
					id: d.id,
					playerName: String(x.playerName || ''),
					ageBand: String(x.ageBand || ''),
					pipelineStatus: String(x.pipelineStatus || ''),
					overallGrade: Number.isFinite(grade) ? grade : null,
				};
			});
			apply();
		});
		const unsubE = onSnapshot(evalQ, (snap) => {
			evalGrades = {};
			for (const d of snap.docs) {
				const g = Number(d.data().overallGrade);
				if (Number.isFinite(g)) evalGrades[d.id] = g;
			}
			apply();
		});
		return () => {
			unsubR();
			unsubE();
		};
	});

	$effect(() => {
		const pid = selectedProgramId.trim();
		const aid = activeAthleteId.trim();
		if (!pid || !aid || !browser) {
			matrix = defaultMatrix();
			return;
		}
		const unsub = onSnapshot(
			query(collection(db, 'tryout_programs', pid, 'evaluations')),
			(snap) => {
				const doc = snap.docs.find((d) => d.id === aid);
				if (!doc) {
					matrix = defaultMatrix();
					notes = '';
					return;
				}
				const x = doc.data();
				matrix = {
					pace: Number(x.pace) || 50,
					technique: Number(x.technique) || 50,
					tacticalVision: Number(x.tacticalVision) || 50,
					physicality: Number(x.physicality) || 50,
					mentality: Number(x.mentality) || 50,
				};
				notes = typeof x.notes === 'string' ? x.notes : '';
			},
		);
		return () => unsub();
	});

	const overallGrade = $derived(
		Math.round(
			(matrix.pace + matrix.technique + matrix.tacticalVision + matrix.physicality + matrix.mentality) /
				5,
		),
	);

	const activeAthlete = $derived(athletes.find((a) => a.id === activeAthleteId) ?? null);

	async function lockEval() {
		if (!selectedProgramId.trim() || !activeAthleteId.trim() || saving) return;
		err = '';
		ok = '';
		saving = true;
		try {
			await submitTryoutEvaluation({
				programId: selectedProgramId.trim(),
				registrationId: activeAthleteId.trim(),
				...matrix,
				notes: notes.trim() || undefined,
			});
			ok = `Evaluation locked — overall ${overallGrade}.`;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save evaluation.';
		} finally {
			saving = false;
		}
	}
</script>

<section class="cte" aria-labelledby="coach-tryout-eval-title">
	<h2 id="coach-tryout-eval-title" class="cte__title">Tryout evaluations</h2>
	<p class="cte__sub">
		Score checked-in tryout athletes using the same matrix as Proving Grounds — writes to the tryout
		program eval sheet.
	</p>

	{#if programs.length === 0}
		<p class="cte__muted">No tryout programs for your club yet.</p>
	{:else}
		<label class="cte__field">
			<span class="cte__label">Tryout program</span>
			<select class="cte__input" bind:value={selectedProgramId}>
				{#each programs as p (p.id)}
					<option value={p.id}>{p.name}</option>
				{/each}
			</select>
		</label>

		{#if loading}
			<p class="cte__muted">Loading athletes…</p>
		{:else if athletes.length === 0}
			<p class="cte__muted">No registrations to evaluate yet.</p>
		{:else}
			<div class="cte__layout">
				<ul class="cte__list">
					{#each athletes as a (a.id)}
						<li>
							<button
								type="button"
								class="cte__row"
								class:cte__row--active={a.id === activeAthleteId}
								onclick={() => (activeAthleteId = a.id)}
							>
								<strong>{a.playerName}</strong>
								<span class="cte__meta">
									{a.ageBand} · {a.pipelineStatus.replace('_', ' ')}
									{#if a.overallGrade != null} · {a.overallGrade}{/if}
								</span>
							</button>
						</li>
					{/each}
				</ul>

				{#if activeAthlete}
					<div class="cte__sheet">
						<h3 class="cte__sheet-title">{activeAthlete.playerName}</h3>
						{#each CRITERIA as c (c.key)}
							<label class="cte__slider">
								<span>{c.label} — {matrix[c.key]}</span>
								<input
									type="range"
									min="0"
									max="100"
									value={matrix[c.key]}
									oninput={(e) => setScore(c.key, Number(e.currentTarget.value))}
								/>
							</label>
						{/each}
						<label class="cte__field">
							<span class="cte__label">Notes</span>
							<textarea class="cte__textarea" rows="3" bind:value={notes}></textarea>
						</label>
						<p class="cte__grade">Overall: <strong>{overallGrade}</strong></p>
						<button type="button" class="cte__lock" disabled={saving} onclick={() => void lockEval()}>
							{saving ? 'Saving…' : 'Lock evaluation'}
						</button>
					</div>
				{/if}
			</div>
		{/if}
	{/if}

	{#if err}<p class="cte__err" role="alert">{err}</p>{/if}
	{#if ok}<p class="cte__ok" role="status">{ok}</p>{/if}
</section>

<style>
	.cte {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #334155;
	}

	.cte__title {
		margin: 0 0 0.35rem;
		font-size: 1.125rem;
		font-weight: 800;
		color: #fbbf24;
	}

	.cte__sub {
		margin: 0 0 1rem;
		font-size: 0.8125rem;
		color: #94a3b8;
	}

	.cte__field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
		max-width: 20rem;
	}

	.cte__label {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		color: #94a3b8;
	}

	.cte__input,
	.cte__textarea {
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 0.45rem 0.55rem;
		background: #0f172a;
		color: #f8fafc;
		font: inherit;
		font-size: 0.8125rem;
	}

	.cte__layout {
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr;
	}

	@media (min-width: 900px) {
		.cte__layout {
			grid-template-columns: minmax(12rem, 1fr) 2fr;
		}
	}

	.cte__list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.cte__row {
		width: 100%;
		text-align: left;
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 0.45rem 0.55rem;
		background: #1e293b;
		color: #e2e8f0;
		cursor: pointer;
		font-size: 0.8125rem;
	}

	.cte__row--active {
		border-color: #14b8a6;
	}

	.cte__meta {
		display: block;
		font-size: 0.6875rem;
		color: #64748b;
		margin-top: 0.15rem;
	}

	.cte__sheet {
		border: 1px solid #334155;
		border-radius: 12px;
		padding: 1rem;
		background: #0f172a;
	}

	.cte__sheet-title {
		margin: 0 0 0.75rem;
		font-size: 1rem;
		color: #f8fafc;
	}

	.cte__slider {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.55rem;
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.cte__grade {
		margin: 0.75rem 0;
		font-size: 0.875rem;
		color: #e2e8f0;
	}

	.cte__lock {
		border: none;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		font-weight: 700;
		background: #14b8a6;
		color: #0f172a;
		cursor: pointer;
	}

	.cte__lock:disabled {
		opacity: 0.5;
	}

	.cte__muted {
		font-size: 0.8125rem;
		color: #64748b;
	}

	.cte__err {
		color: #f87171;
		font-size: 0.8125rem;
	}

	.cte__ok {
		color: #14b8a6;
		font-size: 0.8125rem;
	}
</style>
