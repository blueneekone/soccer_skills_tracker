<script lang="ts">
	import { browser } from '$app/environment';
	import { auth, db, functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
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

	const CRITERIA: Array<{ key: keyof EvalMatrix; label: string; color: string }> = [
		{ key: 'pace', label: 'Pace', color: '#daff0a' },
		{ key: 'technique', label: 'Technique', color: '#14b8a6' },
		{ key: 'tacticalVision', label: 'Tactical Vision', color: '#fbbf24' },
		{ key: 'physicality', label: 'Physicality', color: '#daff0a' },
		{ key: 'mentality', label: 'Mentality', color: '#fbbf24' },
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
		matrix = { ...matrix, [key]: Math.min(100, Math.max(0, value)) };
	}

	function adjustScore(key: keyof EvalMatrix, delta: number) {
		setScore(key, (matrix[key] || 50) + delta);
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
				if (!db || !authStore.isAuthenticated) return;
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
		if (!db || !authStore.isAuthenticated) return;
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
		if (!db || !authStore.isAuthenticated) return;
		const unsub = onSnapshot(
			query(collection(db, 'tryout_programs', pid, 'evaluations')),
			(snap) => {
				const d = snap.docs.find((doc) => doc.id === aid);
				if (!d) {
					matrix = defaultMatrix();
					notes = '';
					return;
				}
				const x = d.data();
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

	const activeAthlete = $derived(athletes.find((a) => a.id === activeAthleteId) ?? null);

	const overallGrade = $derived.by(() => {
		const sum =
			matrix.pace +
			matrix.technique +
			matrix.tacticalVision +
			matrix.physicality +
			matrix.mentality;
		return Math.round(sum / 5);
	});

	async function lockEval() {
		const pid = selectedProgramId.trim();
		const aid = activeAthleteId.trim();
		if (!pid || !aid || saving) return;
		saving = true;
		err = '';
		ok = '';
		try {
			await submitTryoutEvaluation({
				programId: pid,
				registrationId: aid,
				...matrix,
				notes: notes.trim() || undefined,
			});
			ok = `Evaluation locked — overall grade ${overallGrade}.`;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save evaluation.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-5 sm:tw-p-6 tw-font-mono tw-text-[#fafafa]" style="border-radius: 0px;">
	<!-- Panel Header -->
	<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-b tw-border-[#334155] tw-pb-4 tw-mb-5">
		<div>
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-w-2 tw-h-2 tw-bg-[#fbbf24]"></span>
				<h2 class="tw-font-bold tw-text-sm sm:tw-text-base tw-tracking-wider tw-text-white tw-uppercase tw-m-0">
					TRYOUT EVALUATIONS & PIPELINE
				</h2>
			</div>
			<p class="tw-text-xs tw-text-slate-400 tw-mt-1 tw-font-sans tw-m-0">
				Assess registered tryout prospects directly against club benchmark standards
			</p>
		</div>

		<!-- Program Selector -->
		{#if programs.length > 0}
			<label class="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-text-slate-300">
				<span>PROGRAM:</span>
				<select
					class="tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-text-white tw-px-3 tw-py-1.5 tw-text-xs tw-font-mono tw-outline-none focus:tw-border-[#14b8a6]"
					style="border-radius: 0px;"
					bind:value={selectedProgramId}
				>
					{#each programs as p (p.id)}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>
			</label>
		{/if}
	</div>

	{#if programs.length === 0}
		<div class="tw-p-8 tw-text-center tw-bg-[#080d1a] tw-border tw-border-[#334155]" style="border-radius: 0px;">
			<p class="tw-text-xs tw-text-slate-400">No active tryout programs found for your club.</p>
		</div>
	{:else if loading}
		<div class="tw-p-8 tw-text-center tw-bg-[#080d1a] tw-border tw-border-[#334155]" style="border-radius: 0px;">
			<p class="tw-text-xs tw-text-slate-400">Loading tryout registrations…</p>
		</div>
	{:else if athletes.length === 0}
		<div class="tw-p-8 tw-text-center tw-bg-[#080d1a] tw-border tw-border-[#334155]" style="border-radius: 0px;">
			<p class="tw-text-xs tw-text-slate-400">No registered prospects found for this tryout session.</p>
		</div>
	{:else}
		<!-- 2-Column Tryout Layout: Candidate List (Left) + Evaluation Form (Right) -->
		<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-5">
			<!-- Candidates List (Span 4) -->
			<div class="lg:tw-col-span-4 tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-p-3 tw-flex tw-flex-col tw-max-h-[500px] tw-overflow-y-auto" style="border-radius: 0px;">
				<div class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-400 tw-mb-2">
					REGISTERED CANDIDATES ({athletes.length})
				</div>
				<div class="tw-space-y-1.5" role="listbox" aria-label="Tryout Athletes">
					{#each athletes as a (a.id)}
						{@const isSelected = a.id === activeAthleteId}
						<button
							type="button"
							role="option"
							aria-selected={isSelected}
							class="tw-w-full tw-p-2.5 tw-text-left tw-transition-all tw-cursor-pointer tw-border {isSelected ? 'tw-bg-[#0f172a] tw-border-[#14b8a6]' : 'tw-bg-[#000000]/60 tw-border-[#334155]/60 hover:tw-border-[#334155]'}"
							style="border-radius: 0px;"
							onclick={() => (activeAthleteId = a.id)}
						>
							<div class="tw-flex tw-items-center tw-justify-between">
								<span class="tw-font-bold tw-text-xs tw-text-white tw-truncate">{a.playerName}</span>
								{#if a.overallGrade != null}
									<span class="tw-text-xs tw-font-bold tw-text-[#daff0a]">{a.overallGrade}</span>
								{:else}
									<span class="tw-text-[9px] tw-text-slate-500 tw-border tw-border-[#334155] tw-px-1">NEW</span>
								{/if}
							</div>
							<div class="tw-flex tw-items-center tw-gap-2 tw-text-[10px] tw-text-slate-400 tw-mt-1">
								<span>{a.ageBand || 'U15'}</span>
								<span>•</span>
								<span class="tw-uppercase">{a.pipelineStatus.replace('_', ' ') || 'Registered'}</span>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Candidate Evaluation Sheet (Span 8) -->
			{#if activeAthlete}
				<div class="lg:tw-col-span-8 tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-p-4 sm:tw-p-5 tw-flex tw-flex-col tw-gap-4" style="border-radius: 0px;">
					<!-- Candidate Header -->
					<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3">
						<div>
							<h3 class="tw-font-black tw-text-base tw-text-white tw-m-0">{activeAthlete.playerName}</h3>
							<span class="tw-text-[11px] tw-text-slate-400">
								{activeAthlete.ageBand} · Status: <strong class="tw-text-[#14b8a6]">{activeAthlete.pipelineStatus.replace('_', ' ')}</strong>
							</span>
						</div>

						<div class="tw-text-right">
							<span class="tw-text-[10px] tw-text-slate-400 tw-block">OVERALL</span>
							<span class="tw-font-black tw-text-2xl tw-text-[#daff0a]">{overallGrade}</span>
						</div>
					</div>

					<!-- Attribute Sliders & Steppers -->
					<div class="tw-space-y-3">
						{#each CRITERIA as c (c.key)}
							{@const val = matrix[c.key]}
							<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-2.5" style="border-radius: 0px;">
								<div class="tw-flex tw-items-center tw-justify-between tw-mb-1">
									<span class="tw-text-xs tw-font-bold tw-text-slate-200">{c.label}</span>
									<div class="tw-flex tw-items-center tw-gap-2">
										<button
											type="button"
											class="tw-w-6 tw-h-5 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-[10px] tw-text-white tw-cursor-pointer"
											onclick={() => adjustScore(c.key, -5)}
										>
											-5
										</button>
										<span class="tw-text-xs tw-font-bold tw-w-6 tw-text-center" style="color: {c.color};">{val}</span>
										<button
											type="button"
											class="tw-w-6 tw-h-5 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-[10px] tw-text-white tw-cursor-pointer"
											onclick={() => adjustScore(c.key, 5)}
										>
											+5
										</button>
									</div>
								</div>
								<input
									type="range"
									min="0"
									max="100"
									value={val}
									class="tw-w-full tw-h-1.5 tw-cursor-pointer tw-accent-[#14b8a6]"
									oninput={(e) => setScore(c.key, Number(e.currentTarget.value))}
								/>
							</div>
						{/each}
					</div>

					<!-- Tryout Notes -->
					<div>
						<label class="tw-block tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-400 tw-mb-1" for="tryout-notes">
							Tryout Performance Notes
						</label>
						<textarea
							id="tryout-notes"
							rows="2"
							placeholder="Comments on technical execution, coachability, and tactical discipline…"
							class="tw-w-full tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-2.5 tw-text-xs tw-font-mono tw-text-white tw-outline-none focus:tw-border-[#14b8a6]"
							style="border-radius: 0px;"
							bind:value={notes}
						></textarea>
					</div>

					<!-- Submit / Lock Button -->
					<div class="tw-flex tw-items-center tw-justify-between tw-pt-2 tw-border-t tw-border-[#334155]">
						<div>
							{#if ok}<span class="tw-text-xs tw-text-[#14b8a6]">✓ {ok}</span>{/if}
							{#if err}<span class="tw-text-xs tw-text-rose-400">⚠ {err}</span>{/if}
						</div>
						<button
							type="button"
							class="tw-px-4 tw-py-2 tw-bg-[#fbbf24] hover:tw-bg-amber-400 tw-text-black tw-font-bold tw-text-xs tw-uppercase tw-tracking-wider tw-cursor-pointer active:tw-scale-[0.98]"
							style="border-radius: 0px;"
							disabled={saving}
							onclick={() => void lockEval()}
						>
							{saving ? 'Saving…' : '🔒 Lock Evaluation'}
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
