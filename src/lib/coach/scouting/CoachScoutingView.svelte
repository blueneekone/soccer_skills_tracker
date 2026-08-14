<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auth, db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
	import CoachRosterQuickEvalPanel from '$lib/coach/scouting/CoachRosterQuickEvalPanel.svelte';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import {
		collection,
		doc,
		onSnapshot,
		query,
		serverTimestamp,
		setDoc,
		where,
	} from 'firebase/firestore';

	type Prospect = {
		id: string;
		label: string;
		role: string;
		email: string;
	};

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
		return {
			pace: 50,
			technique: 50,
			tacticalVision: 50,
			physicality: 50,
			mentality: 50,
		};
	}

	function matrixFromData(data: Record<string, unknown>): EvalMatrix {
		const clamp = (v: unknown, fallback: number) =>
			typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : fallback;
		const base = defaultMatrix();
		return {
			pace: clamp(data.pace, base.pace),
			technique: clamp(data.technique, base.technique),
			tacticalVision: clamp(data.tacticalVision, base.tacticalVision),
			physicality: clamp(data.physicality, base.physicality),
			mentality: clamp(data.mentality, base.mentality),
		};
	}

	type ScoutingTab = 'prospect-eval' | 'roster-eval';

	const teamScope = new CoachTeamScope({ preferProfileTeam: true });
	$effect(() => {
		teamScope.syncSelectedTeam();
	});

	const activeTab = $derived.by((): ScoutingTab => {
		const tab = page.url.searchParams.get('tab');
		return tab === 'roster-eval' ? 'roster-eval' : 'prospect-eval';
	});

	const sportHint = $derived.by(() => {
		const team = teamScope.currentTeam;
		return typeof team?.sport === 'string' && team.sport.trim() ? team.sport.trim() : '';
	});

	function setScoutingTab(tab: ScoutingTab) {
		const url = new URL(page.url);
		if (tab === 'roster-eval') {
			url.searchParams.set('tab', 'roster-eval');
		} else {
			url.searchParams.delete('tab');
		}
		const search = url.searchParams.toString();
		void goto(`${url.pathname}${search ? `?${search}` : ''}`, {
			replaceState: true,
			keepFocus: true,
		});
	}

	let prospects = $state<Prospect[]>([]);
	let rosterLoading = $state(true);
	let rosterErr = $state('');
	let scoresByProspect = $state<Record<string, EvalMatrix>>({});
	let searchQuery = $state('');
	let activeId = $state('');
	let lockFlash = $state(false);
	let saving = $state(false);
	let saveErr = $state('');
	let saveOk = $state('');

	const filteredProspects = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return prospects;
		return prospects.filter(
			(p) =>
				p.label.toLowerCase().includes(q) ||
				p.role.toLowerCase().includes(q) ||
				p.email.toLowerCase().includes(q),
		);
	});

	const activeProspect = $derived(
		filteredProspects.find((p) => p.id === activeId) ??
			prospects.find((p) => p.id === activeId) ??
			filteredProspects[0] ??
			prospects[0] ??
			null,
	);

	const activeMatrix = $derived(
		activeProspect ? (scoresByProspect[activeProspect.id] ?? defaultMatrix()) : defaultMatrix(),
	);

	const overallGrade = $derived.by(() => {
		const m = activeMatrix;
		return Math.round(
			(m.pace + m.technique + m.tacticalVision + m.physicality + m.mentality) / 5,
		);
	});

	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
		const teamId = teamScope.selectedTeamId;
		if (!browser || !teamId) {
			prospects = [];
			rosterLoading = false;
			return;
		}
		rosterLoading = true;
		rosterErr = '';
		if (!db || !authStore.isAuthenticated) return;
		const q = query(collection(db, 'player_lookup'), where('teamId', '==', teamId));
		const unsub = onSnapshot(
			q,
			(snap) => {
				prospects = snap.docs.map((d) => {
					const data = d.data();
					const email = d.id.toLowerCase();
					const displayName =
						(typeof data.displayName === 'string' && data.displayName.trim()) ||
						(typeof data.playerName === 'string' && data.playerName.trim()) ||
						email.split('@')[0];
					const role =
						(typeof data.position === 'string' && data.position.trim()) ||
						(typeof data.role === 'string' && data.role.trim()) ||
						'Squad player';
					return {
						id: email,
						email,
						label: displayName,
						role,
					};
				});
				prospects.sort((a, b) => a.label.localeCompare(b.label));
				if (!activeId || !prospects.some((p) => p.id === activeId)) {
					activeId = prospects[0]?.id ?? '';
				}
				rosterLoading = false;
			},
			(e) => {
				rosterErr = e.message || 'Could not load squad roster.';
				rosterLoading = false;
			},
		);
		return () => unsub();
	});

	$effect(() => {
		const teamId = teamScope.selectedTeamId;
		if (!browser || !teamId || !db || !authStore.isAuthenticated) return;
		const unsub = onSnapshot(collection(db, 'teams', teamId, 'scouting_assessments'), (snap) => {
			const next = { ...scoresByProspect };
			for (const d of snap.docs) {
				next[d.id.toLowerCase()] = matrixFromData(d.data() as Record<string, unknown>);
			}
			for (const p of prospects) {
				if (!next[p.id]) next[p.id] = defaultMatrix();
			}
			scoresByProspect = next;
		});
		return () => unsub();
	});

	async function lockAssessment() {
		const prospect = activeProspect;
		const teamId = teamScope.selectedTeamId;
		const uid = auth.currentUser?.uid;
		const email = auth.currentUser?.email?.toLowerCase();
		if (!prospect || !teamId || !uid || !email || saving) return;

		saving = true;
		saveErr = '';
		saveOk = '';
		const matrix = scoresByProspect[prospect.id] ?? defaultMatrix();
		try {
			await setDoc(
				doc(db, 'teams', teamId, 'scouting_assessments', prospect.email),
				{
					playerEmail: prospect.email,
					playerName: prospect.label,
					teamId,
					...matrix,
					overallGrade,
					lockedAt: serverTimestamp(),
					lockedBy: uid,
					lockedByEmail: email,
				},
				{ merge: true },
			);
			lockFlash = true;
			saveOk = `Assessment locked for ${prospect.label}.`;
			setTimeout(() => {
				lockFlash = false;
			}, 1600);
		} catch (e) {
			saveErr = e instanceof Error ? e.message : 'Could not save assessment.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="tw-mb-10 tw-mt-2 tw-min-w-0 tw-flex-1" style="padding: var(--bento-pad-liquid);">
	<header class="tw-mb-6 tw-text-center md:tw-text-left">
		<h1 class="tw-font-black tw-uppercase tw-tracking-tight tw-text-white tw-text-2xl md:tw-text-4xl">
			Scouting
		</h1>
		<p class="tw-mt-2 tw-text-xs tw-font-semibold tw-uppercase tw-tracking-widest tw-text-[#14b8a6]">
			Prospect matrix · roster quick log · tryout pipeline on same surface
		</p>
		<div class="tw-mt-4 tw-flex tw-flex-wrap tw-justify-center tw-gap-2 md:tw-justify-start" role="tablist" aria-label="Scouting modes">
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === 'prospect-eval'}
				class="tw-rounded-lg tw-border tw-px-4 tw-py-2 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-transition {activeTab === 'prospect-eval'
					? 'tw-border-nuclear-yellow/40 tw-bg-slate-800/50 tw-text-nuclear-yellow'
					: 'tw-border-white/10 tw-bg-transparent tw-text-slate-500 hover:tw-text-slate-300'}"
				onclick={() => setScoutingTab('prospect-eval')}
			>
				Prospect eval
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === 'roster-eval'}
				class="tw-rounded-lg tw-border tw-px-4 tw-py-2 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-transition {activeTab === 'roster-eval'
					? 'tw-border-nuclear-yellow/40 tw-bg-slate-800/50 tw-text-nuclear-yellow'
					: 'tw-border-white/10 tw-bg-transparent tw-text-slate-500 hover:tw-text-slate-300'}"
				onclick={() => setScoutingTab('roster-eval')}
			>
				Roster eval
			</button>
		</div>
	</header>

	{#if !teamsStore.loaded}
		<p class="tw-text-sm tw-text-slate-500">Loading teams…</p>
	{:else if teamScope.myTeams.length === 0}
		<p class="tw-text-sm tw-text-slate-500">No team assigned — contact your director to link a roster.</p>
	{:else}
		<div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-end tw-gap-3">
			{#if teamScope.myTeams.length > 1}
				<label class="tw-flex tw-flex-col tw-gap-1 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-500">
					Team
					<select
						class="tw-min-w-[12rem] tw-rounded-lg tw-border tw-border-white/10 tw-bg-slate-950/80 tw-px-3 tw-py-2 tw-text-sm tw-text-slate-100"
						bind:value={teamScope.selectedTeamId}
					>
						{#each teamScope.myTeams as team (team.id)}
							<option value={team.id}>{team.name || team.id}</option>
						{/each}
					</select>
				</label>
			{:else}
				<p class="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-widest tw-text-slate-500">
					{teamScope.teamLabel}
				</p>
			{/if}
		</div>

		{#if activeTab === 'roster-eval'}
			<CoachRosterQuickEvalPanel teamId={teamScope.selectedTeamId} sportHint={sportHint} />
		{:else if rosterLoading}
			<p class="tw-text-sm tw-text-slate-500">Loading squad…</p>
		{:else if rosterErr}
			<p class="tw-text-sm tw-text-red-400" role="alert">{rosterErr}</p>
		{:else if prospects.length === 0}
			<p class="tw-text-sm tw-text-slate-500">
				No linked players on this team yet. Roster syncs from <code class="tw-text-cyan-400/90">player_lookup</code>.
			</p>
		{:else}
			<div class="st-bento bento-grid bento-grid--12col bento-grid--liquid tw-grid-cols-1 lg:tw-grid-cols-12" style="display: grid;">
				<div
					class="tw-col-span-12 lg:tw-col-span-4 vanguard-panel tw-flex tw-min-h-[min(70vh,560px)] tw-min-w-0 tw-flex-col tw-p-4 md:tw-min-h-[640px]"
				>
					<h2 class="tw-mb-3 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.25em] tw-text-[#334155]">
						Squad roster
					</h2>
					<label class="tw-sr-only" for="proving-grounds-search">Search prospects</label>
					<input
						id="proving-grounds-search"
						type="text"
						placeholder="Search…"
						autocomplete="off"
						class="tw-mb-3 tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-3 tw-py-2.5 tw-font-mono tw-text-sm tw-text-slate-100 tw-outline-none focus:tw-border-nuclear-yellow"
						bind:value={searchQuery}
					/>

					<ul class="tw-min-h-0 tw-flex-1 tw-space-y-1 tw-overflow-y-auto tw-p-0" role="listbox" aria-label="Prospects">
						{#each filteredProspects as prospect (prospect.id)}
							<li>
								<button
									type="button"
									role="option"
									aria-selected={activeId === prospect.id}
									class="tw-w-full tw-px-3 tw-py-3 tw-text-left tw-transition-colors hover:tw-bg-[#0f172a] {activeId === prospect.id
										? 'tw-border-l-2 tw-border-nuclear-yellow tw-bg-[#0f172a]'
										: 'tw-border-l-2 tw-border-transparent'}"
									onclick={() => {
										activeId = prospect.id;
									}}
								>
									<span class="tw-block tw-truncate tw-text-sm tw-font-semibold tw-text-slate-100">{prospect.label}</span>
									<span class="tw-mt-0.5 tw-block tw-truncate tw-text-[11px] tw-font-medium tw-text-slate-500">{prospect.role}</span>
								</button>
							</li>
						{/each}
					</ul>
					{#if filteredProspects.length === 0}
						<p class="tw-py-6 tw-text-center tw-text-sm tw-text-slate-500">No players match.</p>
					{/if}
				</div>

				{#if activeProspect}
					<div
						class="tw-col-span-12 lg:tw-col-span-8 vanguard-panel tw-flex tw-min-h-[min(70vh,560px)] tw-min-w-0 tw-flex-col tw-p-5 md:tw-min-h-[640px] md:tw-p-6"
					>
						<div
							class="bento-mb-lg tw-flex tw-flex-col bento-gap-md tw-border-b tw-border-[#334155] tw-pb-6 sm:tw-flex-row sm:tw-items-end sm:tw-justify-between"
						>
							<div class="tw-min-w-0">
								<p class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.22em] tw-text-[#334155]">
									Active player
								</p>
								<h2 class="tw-mt-1 tw-truncate tw-text-xl tw-font-black tw-text-white md:tw-text-2xl">
									{activeProspect.label}
								</h2>
								<p class="tw-mt-1 tw-truncate tw-font-mono tw-text-[11px] tw-text-slate-500">{activeProspect.email}</p>
							</div>
							<div class="tw-shrink-0 tw-text-right">
								<p class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-nuclear-yellow">
									Overall grade
								</p>
								<p class="tw-font-black tw-tabular-nums tw-text-nuclear-yellow tw-text-5xl tw-leading-none tw-tracking-tighter md:tw-text-6xl">
									{overallGrade}
								</p>
							</div>
						</div>

						<div class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col bento-gap-lg tw-overflow-y-auto">
							{#each CRITERIA as row (row.key)}
								{@const k = row.key}
								{@const value = activeMatrix[k]}
								<div class="tw-min-w-0">
									<div class="tw-mb-2 tw-flex tw-items-center tw-justify-between tw-gap-3">
										<label class="tw-text-sm tw-font-bold tw-text-slate-200" for="slider-{activeProspect.id}-{row.key}">
											{row.label}
										</label>
										<span class="tw-font-mono tw-text-xs tw-tabular-nums tw-text-nuclear-yellow">{value}</span>
									</div>
									<input
										id="slider-{activeProspect.id}-{row.key}"
										type="range"
										min="0"
										max="100"
										class="tw-mb-2 tw-h-2 tw-w-full tw-cursor-pointer tw-accent-nuclear-yellow"
										value={scoresByProspect[activeProspect.id]?.[k] ?? value}
										oninput={(e) => {
											const v = Number(e.currentTarget.value);
											const id = activeProspect.id;
											scoresByProspect = {
												...scoresByProspect,
												[id]: { ...(scoresByProspect[id] ?? defaultMatrix()), [k]: v },
											};
										}}
									/>
									<div class="tw-h-2 tw-overflow-hidden tw-rounded-full tw-bg-slate-800">
										<div
											class="tw-h-full tw-rounded-full tw-bg-nuclear-yellow tw-transition-[width] tw-duration-150 tw-ease-out"
											style="width: {value}%"
										></div>
									</div>
								</div>
							{/each}
						</div>

						<div class="bento-mt-lg tw-shrink-0 tw-border-t tw-border-[#334155] tw-pt-5">
							<button
								type="button"
								class="coach-os-action-chip tw-w-full tw-py-3.5 tw-text-center tw-flex tw-items-center tw-justify-center tw-gap-2 tw-font-mono tw-font-bold tw-uppercase tw-tracking-widest {lockFlash ? 'tw-ring-2 tw-ring-nuclear-yellow' : ''}"
								style="background: {saving ? '#0f172a' : '#daff0a'}; color: {saving ? '#334155' : '#000000'}; border-color: {saving ? '#334155' : '#daff0a'};"
								disabled={saving}
								onclick={() => void lockAssessment()}
							>
								<Icon name={"status.shield-check" as IconName} size={16} />
								<span>{saving ? 'Saving…' : 'Lock assessment'}</span>
							</button>
							{#if saveErr}
								<p class="tw-mt-3 tw-text-center tw-text-[11px] tw-font-semibold tw-text-red-400" role="alert">{saveErr}</p>
							{:else if saveOk && lockFlash}
								<p class="tw-mt-3 tw-text-center tw-text-[11px] tw-font-semibold tw-text-nuclear-yellow">{saveOk}</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
