<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { auth, db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
	import CoachRosterQuickEvalPanel from '$lib/coach/scouting/CoachRosterQuickEvalPanel.svelte';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
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
		jerseyNumber?: string;
	};

	type EvalMatrix = {
		pace: number;
		technique: number;
		tacticalVision: number;
		physicality: number;
		defending: number;
		mentality: number;
	};

	const CRITERIA: Array<{ key: keyof EvalMatrix; label: string; desc: string; color: string }> = [
		{ key: 'pace', label: 'Pace', desc: 'Sprint Acceleration & Top Speed', color: '#daff0a' },
		{ key: 'technique', label: 'Technique', desc: 'First Touch & Ball Mastery', color: '#14b8a6' },
		{ key: 'tacticalVision', label: 'Tactical Vision', desc: 'Spatial Scanning & Decision Speed', color: '#fbbf24' },
		{ key: 'physicality', label: 'Physicality', desc: 'Aerobic Engine & Duel Strength', color: '#daff0a' },
		{ key: 'defending', label: 'Defending', desc: 'Tackling, Interceptions & Shape', color: '#14b8a6' },
		{ key: 'mentality', label: 'Mentality', desc: 'Composure, Leadership & Grit', color: '#fbbf24' },
	];

	const QUICK_TAGS = [
		'Elite First Touch',
		'High Work Rate',
		'Dominant 1v1',
		'Creative Playmaker',
		'Set Piece Specialist',
		'Rapid Transition',
		'Needs Spatial Scanning',
		'Collegiate Prospect',
		'Aerial Threat',
		'Pressing Trigger',
	];

	function defaultMatrix(): EvalMatrix {
		return {
			pace: 65,
			technique: 65,
			tacticalVision: 65,
			physicality: 65,
			defending: 65,
			mentality: 65,
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
			defending: clamp(data.defending, base.defending),
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
		untrack(() => {
			void goto(`${url.pathname}${search ? `?${search}` : ''}`, {
				replaceState: true,
				keepFocus: true,
				noScroll: true,
			});
		});
	}

	let prospects = $state<Prospect[]>([]);
	let rosterLoading = $state(true);
	let rosterErr = $state('');
	let scoresByProspect = $state<Record<string, EvalMatrix>>({});
	let notesByProspect = $state<Record<string, string>>({});
	let tagsByProspect = $state<Record<string, string[]>>({});
	let lockedAssessments = $state<Record<string, { grade: number; lockedAt: any }>>({});
	let searchQuery = $state('');
	let positionFilter = $state<string>('ALL');
	let activeId = $state('');
	let lockFlash = $state(false);
	let saving = $state(false);
	let saveErr = $state('');
	let saveOk = $state('');

	const filteredProspects = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return prospects.filter((p) => {
			const matchesQuery =
				!q ||
				p.label.toLowerCase().includes(q) ||
				p.role.toLowerCase().includes(q) ||
				p.email.toLowerCase().includes(q);

			if (!matchesQuery) return false;
			if (positionFilter === 'ALL') return true;
			const r = p.role.toUpperCase();
			if (positionFilter === 'FW') return r.includes('FW') || r.includes('FORWARD') || r.includes('ST') || r.includes('WING');
			if (positionFilter === 'MF') return r.includes('MF') || r.includes('MID') || r.includes('CAM') || r.includes('CDM');
			if (positionFilter === 'DF') return r.includes('DF') || r.includes('BACK') || r.includes('CB') || r.includes('LB') || r.includes('RB');
			if (positionFilter === 'GK') return r.includes('GK') || r.includes('GOAL');
			return true;
		});
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
			(m.pace + m.technique + m.tacticalVision + m.physicality + m.defending + m.mentality) / 6,
		);
	});

	const tier = $derived.by(() => {
		const g = overallGrade;
		if (g >= 90) return { label: 'TIER S', title: 'Elite Collegiate / Pro Prospect', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' };
		if (g >= 80) return { label: 'TIER A', title: 'Varsity Starter / First Team', color: '#daff0a', bg: 'rgba(218, 255, 10, 0.12)' };
		if (g >= 70) return { label: 'TIER B', title: 'Academy Development', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.12)' };
		return { label: 'TIER C', title: 'Foundational Trainee', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' };
	});

	// Radar polygon computation: 6 axes, center (140, 140), radius 100
	const radarPolygonPoints = $derived.by(() => {
		const cx = 140;
		const cy = 140;
		const r = 95;
		const m = activeMatrix;
		const values = [m.pace, m.technique, m.tacticalVision, m.physicality, m.defending, m.mentality];
		return values
			.map((val, i) => {
				const angle = ((-90 + i * 60) * Math.PI) / 180;
				const dist = (val / 100) * r;
				const x = cx + dist * Math.cos(angle);
				const y = cy + dist * Math.sin(angle);
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
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
						'Squad Player';
					const jerseyNumber =
						typeof data.jerseyNumber === 'string' || typeof data.jerseyNumber === 'number'
							? String(data.jerseyNumber)
							: undefined;
					return {
						id: email,
						email,
						label: displayName,
						role,
						jerseyNumber,
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
			const nextScores = { ...scoresByProspect };
			const nextNotes = { ...notesByProspect };
			const nextTags = { ...tagsByProspect };
			const nextLocked = { ...lockedAssessments };

			for (const d of snap.docs) {
				const data = d.data() as Record<string, unknown>;
				const key = d.id.toLowerCase();
				nextScores[key] = matrixFromData(data);
				if (typeof data.notes === 'string') nextNotes[key] = data.notes;
				if (Array.isArray(data.tags)) nextTags[key] = data.tags.map(String);
				if (typeof data.overallGrade === 'number') {
					nextLocked[key] = { grade: data.overallGrade, lockedAt: data.lockedAt };
				}
			}
			scoresByProspect = nextScores;
			notesByProspect = nextNotes;
			tagsByProspect = nextTags;
			lockedAssessments = nextLocked;
		});
		return () => unsub();
	});

	function adjustScore(key: keyof EvalMatrix, delta: number) {
		if (!activeProspect) return;
		const id = activeProspect.id;
		const current = scoresByProspect[id]?.[key] ?? activeMatrix[key];
		const nextVal = Math.min(100, Math.max(0, current + delta));
		scoresByProspect = {
			...scoresByProspect,
			[id]: { ...(scoresByProspect[id] ?? defaultMatrix()), [key]: nextVal },
		};
	}

	function toggleTag(tag: string) {
		if (!activeProspect) return;
		const id = activeProspect.id;
		const current = tagsByProspect[id] ?? [];
		const updated = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
		tagsByProspect = { ...tagsByProspect, [id]: updated };
	}

	export async function lockAssessment() {
		const prospect = activeProspect;
		const teamId = teamScope.selectedTeamId;
		const uid = auth.currentUser?.uid;
		const email = auth.currentUser?.email?.toLowerCase();
		if (!prospect || !teamId || !uid || !email || saving) return;

		saving = true;
		saveErr = '';
		saveOk = '';
		const matrix = scoresByProspect[prospect.id] ?? defaultMatrix();
		const notes = notesByProspect[prospect.id] || '';
		const tags = tagsByProspect[prospect.id] || [];

		try {
			await setDoc(
				doc(db, 'teams', teamId, 'scouting_assessments', prospect.email),
				{
					playerEmail: prospect.email,
					playerName: prospect.label,
					teamId,
					...matrix,
					notes,
					tags,
					overallGrade,
					lockedAt: serverTimestamp(),
					lockedBy: uid,
					lockedByEmail: email,
				},
				{ merge: true },
			);
			lockFlash = true;
			saveOk = `Assessment locked for ${prospect.label} (Score: ${overallGrade}).`;
			setTimeout(() => {
				lockFlash = false;
			}, 2500);
		} catch (e) {
			saveErr = e instanceof Error ? e.message : 'Could not save assessment.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="tw-w-full tw-min-h-screen tw-bg-[#000000] tw-text-[#fafafa] tw-font-mono">
	<!-- Top Command Header: Identity, Squad Anchor, and Surface Mode Switcher -->
	<header class="tw-bg-[#080d1a] tw-border-b tw-border-[#334155] tw-p-4 sm:tw-px-6 tw-py-4">
		<div class="tw-max-w-[1700px] tw-mx-auto tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4">
			<!-- Title & Telemetry Beacon -->
			<div class="tw-flex tw-items-center tw-gap-3">
				<span class="tw-w-2.5 tw-h-2.5 tw-bg-[#14b8a6] tw-animate-pulse" style="border-radius: 0px;"></span>
				<div>
					<div class="tw-flex tw-items-center tw-gap-2">
						<h1 class="tw-font-black tw-text-base sm:tw-text-lg tw-tracking-widest tw-text-white tw-uppercase tw-m-0">
							SCOUTING DOSSIER & TALENT MATRIX
						</h1>
						<span class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-[#daff0a] tw-text-[10px] tw-font-bold tw-px-2 tw-py-0.5" style="border-radius: 0px;">
							SIEM v2
						</span>
					</div>
					<p class="tw-text-xs tw-text-slate-400 tw-mt-0.5 tw-font-sans tw-m-0">
						Scout's Six talent evaluation · roster benchmark quick log · collegiate prospect grading
					</p>
				</div>
			</div>

			<!-- Active Squad Anchor -->
			<div class="tw-flex tw-items-center tw-gap-3">
				{#if teamScope.myTeams.length > 1}
					<label class="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-text-slate-400">
						<span>SQUAD:</span>
						<select
							class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-white tw-px-3 tw-py-1.5 tw-text-xs tw-font-mono tw-outline-none focus:tw-border-[#14b8a6]"
							style="border-radius: 0px;"
							bind:value={teamScope.selectedTeamId}
						>
							{#each teamScope.myTeams as team (team.id)}
								<option value={team.id}>{team.name || team.id}</option>
							{/each}
						</select>
					</label>
				{:else if teamScope.teamLabel}
					<span class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-3 tw-py-1 tw-text-xs tw-text-slate-200" style="border-radius: 0px;">
						<span class="tw-text-[#daff0a]">▶</span> {teamScope.teamLabel}
					</span>
				{/if}
			</div>
		</div>

		<!-- Mode Switcher Tabs -->
		<div class="tw-max-w-[1700px] tw-mx-auto tw-mt-4 tw-pt-3 tw-border-t tw-border-[#334155]/60 tw-flex tw-items-center tw-gap-2">
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === 'prospect-eval'}
				class="tw-px-4 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-transition-all tw-cursor-pointer {activeTab === 'prospect-eval' ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]' : 'tw-bg-transparent tw-text-slate-400 tw-border tw-border-transparent hover:tw-text-white'}"
				style="border-radius: 0px;"
				onclick={() => setScoutingTab('prospect-eval')}
			>
				<span>🎯 Prospect Assessment Matrix</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === 'roster-eval'}
				class="tw-px-4 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-transition-all tw-cursor-pointer {activeTab === 'roster-eval' ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]' : 'tw-bg-transparent tw-text-slate-400 tw-border tw-border-transparent hover:tw-text-white'}"
				style="border-radius: 0px;"
				onclick={() => setScoutingTab('roster-eval')}
			>
				<span>📋 Roster Quick Log</span>
			</button>
		</div>
	</header>

	<!-- Main Workspace Area -->
	<main class="tw-max-w-[1700px] tw-mx-auto tw-p-4 sm:tw-p-6">
		{#if !teamsStore.loaded}
			<div class="tw-p-12 tw-text-center tw-bg-[#0f172a] tw-border tw-border-[#334155]" style="border-radius: 0px;">
				<p class="tw-text-sm tw-text-slate-400">Loading squad credentials…</p>
			</div>
		{:else if teamScope.myTeams.length === 0}
			<div class="tw-p-12 tw-text-center tw-bg-[#0f172a] tw-border tw-border-[#334155]" style="border-radius: 0px;">
				<p class="tw-text-sm tw-text-amber-400">No active team assigned. Link an active roster in Team Ops or contact your Director.</p>
			</div>
		{:else if activeTab === 'roster-eval'}
			<CoachRosterQuickEvalPanel teamId={teamScope.selectedTeamId} sportHint={sportHint} />
		{:else if rosterLoading}
			<div class="tw-p-12 tw-text-center tw-bg-[#0f172a] tw-border tw-border-[#334155]" style="border-radius: 0px;">
				<p class="tw-text-sm tw-text-slate-400">Hydrating roster from database…</p>
			</div>
		{:else if rosterErr}
			<div class="tw-p-4 tw-bg-rose-950/40 tw-border tw-border-rose-800 tw-text-rose-300 tw-text-sm" role="alert" style="border-radius: 0px;">
				{rosterErr}
			</div>
		{:else if prospects.length === 0}
			<div class="tw-p-12 tw-text-center tw-bg-[#0f172a] tw-border tw-border-[#334155]" style="border-radius: 0px;">
				<p class="tw-text-sm tw-text-slate-400">
					No linked athletes on this team roster yet. Synchronize athletes in Team Ops to evaluate prospects.
				</p>
			</div>
		{:else}
			<!-- 12-Column Asymmetric Bento Grid (4-col Roster + 8-col Evaluation Dossier) -->
			<div class="bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6" style="display: grid;">
				
				<!-- Left 4 Columns: Prospect Directory (tw-col-span-4) -->
				<section class="tw-col-span-12 xl:tw-col-span-4 vanguard-panel tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4 sm:tw-p-5 tw-flex tw-flex-col tw-h-[calc(100vh-220px)] tw-min-h-[640px]" style="border-radius: 0px;">
					<!-- Directory Header & Count -->
					<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-3">
						<h2 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-300 tw-m-0">
							PROSPECT ROSTER
						</h2>
						<span class="tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-text-[#14b8a6] tw-text-[11px] tw-font-bold tw-px-2 tw-py-0.5" style="border-radius: 0px;">
							{filteredProspects.length} ATHLETES
						</span>
					</div>

					<!-- Search Box -->
					<div class="tw-relative tw-mb-3">
						<input
							type="text"
							placeholder="Search by name, position, email…"
							autocomplete="off"
							class="tw-w-full tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-px-3 tw-py-2 tw-text-xs tw-font-mono tw-text-white tw-outline-none focus:tw-border-[#14b8a6]"
							style="border-radius: 0px;"
							bind:value={searchQuery}
						/>
						{#if searchQuery}
							<button
								type="button"
								class="tw-absolute tw-right-2.5 tw-top-2 tw-text-slate-500 hover:tw-text-white tw-text-xs"
								onclick={() => (searchQuery = '')}
							>
								✕
							</button>
						{/if}
					</div>

					<!-- Position Filter Chips -->
					<div class="tw-flex tw-items-center tw-gap-1.5 tw-mb-3 tw-overflow-x-auto tw-pb-1">
						{#each ['ALL', 'FW', 'MF', 'DF', 'GK'] as pos}
							<button
								type="button"
								class="tw-px-2.5 tw-py-1 tw-text-[10px] tw-font-bold tw-uppercase tw-transition-all tw-cursor-pointer {positionFilter === pos ? 'tw-bg-[#14b8a6] tw-text-black' : 'tw-bg-[#080d1a] tw-text-slate-400 tw-border tw-border-[#334155] hover:tw-text-white'}"
								style="border-radius: 0px;"
								onclick={() => (positionFilter = pos)}
							>
								{pos}
							</button>
						{/each}
					</div>

					<!-- Athlete List Cards -->
					<div class="tw-flex-1 tw-overflow-y-auto tw-space-y-1.5 tw-pr-1" role="listbox" aria-label="Prospect Roster">
						{#each filteredProspects as prospect (prospect.id)}
							{@const isSelected = activeId === prospect.id}
							{@const locked = lockedAssessments[prospect.id]}
							<button
								type="button"
								role="option"
								aria-selected={isSelected}
								class="tw-w-full tw-p-3 tw-text-left tw-transition-all tw-cursor-pointer tw-border {isSelected ? 'tw-bg-[#080d1a] tw-border-[#14b8a6] tw-shadow-lg' : 'tw-bg-[#080d1a]/50 tw-border-[#334155]/60 hover:tw-bg-[#080d1a] hover:tw-border-[#334155]'}"
								style="border-radius: 0px;"
								onclick={() => (activeId = prospect.id)}
							>
								<div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
									<div class="tw-flex tw-items-center tw-gap-2.5 tw-min-w-0">
										<!-- Initials Badge -->
										<div class="tw-w-8 tw-h-8 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-text-xs tw-font-bold {isSelected ? 'tw-text-[#14b8a6] tw-border-[#14b8a6]' : 'tw-text-slate-300'}" style="border-radius: 0px;">
											{prospect.jerseyNumber || prospect.label.slice(0, 2).toUpperCase()}
										</div>
										<div class="tw-min-w-0">
											<div class="tw-text-xs tw-font-bold tw-text-white tw-truncate">{prospect.label}</div>
											<div class="tw-text-[10px] tw-text-slate-400 tw-truncate">{prospect.role}</div>
										</div>
									</div>

									<!-- Score or Status Pill -->
									<div class="tw-text-right tw-shrink-0">
										{#if locked}
											<span class="tw-font-bold tw-text-xs {locked.grade >= 80 ? 'tw-text-[#daff0a]' : 'tw-text-[#14b8a6]'}">
												{locked.grade}
											</span>
											<span class="tw-block tw-text-[9px] tw-text-slate-500">LOCKED</span>
										{:else}
											<span class="tw-text-[10px] tw-text-slate-500 tw-border tw-border-[#334155] tw-px-1.5 tw-py-0.5" style="border-radius: 0px;">
												DRAFT
											</span>
										{/if}
									</div>
								</div>
							</button>
						{/each}
					</div>
				</section>

				<!-- Right 8 Columns: Comprehensive Evaluation Studio (tw-col-span-8) -->
				{#if activeProspect}
					<section class="tw-col-span-12 xl:tw-col-span-8 vanguard-panel tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-5 sm:tw-p-6 tw-flex tw-flex-col tw-gap-6 tw-overflow-y-auto" style="border-radius: 0px;">
						
						<!-- Header Dossier Card: Identity, Overall Grade & Tier Badge -->
						<div class="tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-p-5 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-5" style="border-radius: 0px;">
							<div class="tw-flex tw-items-center tw-gap-4 tw-min-w-0">
								<div class="tw-w-14 tw-h-14 tw-bg-[#000000] tw-border-2 tw-border-[#14b8a6] tw-flex tw-items-center tw-justify-center tw-font-black tw-text-lg tw-text-[#14b8a6]" style="border-radius: 0px;">
									{activeProspect.jerseyNumber ? `#${activeProspect.jerseyNumber}` : activeProspect.label.slice(0, 2).toUpperCase()}
								</div>
								<div class="tw-min-w-0">
									<div class="tw-flex tw-items-center tw-gap-2">
										<h2 class="tw-font-black tw-text-lg sm:tw-text-xl tw-text-white tw-truncate tw-m-0">
											{activeProspect.label}
										</h2>
										<span class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-slate-300 tw-text-[11px] tw-px-2 tw-py-0.5" style="border-radius: 0px;">
											{activeProspect.role}
										</span>
									</div>
									<p class="tw-text-xs tw-text-slate-400 tw-mt-1 tw-m-0 tw-truncate">
										{activeProspect.email}
									</p>
								</div>
							</div>

							<!-- Grade & Tier Display -->
							<div class="tw-flex tw-items-center tw-gap-4 tw-shrink-0">
								<div class="tw-text-right">
									<span class="tw-block tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-400">
										OVERALL RATING
									</span>
									<span class="tw-font-black tw-text-4xl sm:tw-text-5xl tw-tabular-nums" style="color: {tier.color};">
										{overallGrade}
									</span>
								</div>

								<div class="tw-border-l tw-border-[#334155] tw-pl-4">
									<span class="tw-inline-block tw-px-3 tw-py-1 tw-font-bold tw-text-xs tw-tracking-wider" style="color: {tier.color}; background: {tier.bg}; border: 1px solid {tier.color}; border-radius: 0px;">
										{tier.label}
									</span>
									<span class="tw-block tw-text-[10px] tw-text-slate-400 tw-mt-1">
										{tier.title}
									</span>
								</div>
							</div>
						</div>

						<!-- Two-Column Layout: SVG Radar Polygon (Left) + Attribute Steppers (Right) -->
						<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 tw-items-center">
							<!-- SVG Radar Visualization (Span 5) -->
							<div class="lg:tw-col-span-5 tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-p-4 tw-flex tw-flex-col tw-items-center tw-justify-center" style="border-radius: 0px;">
								<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-400 tw-mb-2">
									SCOUT'S SIX RADAR PROFILE
								</span>
								<svg class="tw-w-full tw-max-w-[280px] tw-aspect-square" viewBox="0 0 280 280">
									<!-- Concentric Grid Rings -->
									{#each [0.25, 0.5, 0.75, 1.0] as scale}
										<polygon
											points={[0, 1, 2, 3, 4, 5].map(i => {
												const a = ((-90 + i * 60) * Math.PI) / 180;
												const x = 140 + (95 * scale) * Math.cos(a);
												const y = 140 + (95 * scale) * Math.sin(a);
												return `${x.toFixed(1)},${y.toFixed(1)}`;
											}).join(' ')}
											fill="none"
											stroke="#334155"
											stroke-width={scale === 1.0 ? "1.5" : "0.75"}
											stroke-dasharray={scale === 1.0 ? "none" : "2,2"}
										/>
									{/each}

									<!-- Axis Lines -->
									{#each [0, 1, 2, 3, 4, 5] as i}
										{@const a = ((-90 + i * 60) * Math.PI) / 180}
										{@const x2 = 140 + 95 * Math.cos(a)}
										{@const y2 = 140 + 95 * Math.sin(a)}
										<line x1="140" y1="140" {x2} {y2} stroke="#334155" stroke-width="1" />
									{/each}

									<!-- Value Radar Polygon -->
									<polygon
										points={radarPolygonPoints}
										fill="rgba(20, 184, 166, 0.25)"
										stroke="#14b8a6"
										stroke-width="2"
									/>

									<!-- Vertex Points -->
									{#each [0, 1, 2, 3, 4, 5] as i}
										{@const a = ((-90 + i * 60) * Math.PI) / 180}
										{@const val = [activeMatrix.pace, activeMatrix.technique, activeMatrix.tacticalVision, activeMatrix.physicality, activeMatrix.defending, activeMatrix.mentality][i]}
										{@const x = 140 + (val / 100 * 95) * Math.cos(a)}
										{@const y = 140 + (val / 100 * 95) * Math.sin(a)}
										<circle cx={x} cy={y} r="3.5" fill="#daff0a" stroke="#000000" stroke-width="1" />
									{/each}

									<!-- Labels -->
									<text x="140" y="24" text-anchor="middle" font-size="9" font-family="monospace" fill="#daff0a" font-weight="bold">PACE</text>
									<text x="245" y="80" text-anchor="start" font-size="9" font-family="monospace" fill="#14b8a6" font-weight="bold">TECH</text>
									<text x="245" y="200" text-anchor="start" font-size="9" font-family="monospace" fill="#fbbf24" font-weight="bold">VISION</text>
									<text x="140" y="260" text-anchor="middle" font-size="9" font-family="monospace" fill="#daff0a" font-weight="bold">PHYS</text>
									<text x="35" y="200" text-anchor="end" font-size="9" font-family="monospace" fill="#14b8a6" font-weight="bold">DEF</text>
									<text x="35" y="80" text-anchor="end" font-size="9" font-family="monospace" fill="#fbbf24" font-weight="bold">MENT</text>
								</svg>
							</div>

							<!-- Attribute Steppers (Span 7) -->
							<div class="lg:tw-col-span-7 tw-space-y-3.5">
								{#each CRITERIA as item (item.key)}
									{@const val = activeMatrix[item.key]}
									<div class="tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-p-3" style="border-radius: 0px;">
										<div class="tw-flex tw-items-center tw-justify-between tw-mb-1.5">
											<div>
												<span class="tw-text-xs tw-font-bold tw-text-white tw-uppercase">{item.label}</span>
												<span class="tw-block tw-text-[10px] tw-text-slate-400">{item.desc}</span>
											</div>

											<div class="tw-flex tw-items-center tw-gap-2">
												<button
													type="button"
													class="tw-w-7 tw-h-6 tw-bg-[#0f172a] hover:tw-bg-slate-800 tw-border tw-border-[#334155] tw-text-xs tw-text-white tw-cursor-pointer"
													style="border-radius: 0px;"
													onclick={() => adjustScore(item.key, -5)}
												>
													-5
												</button>
												<span class="tw-font-black tw-text-sm tw-tabular-nums tw-w-8 tw-text-center" style="color: {item.color};">
													{val}
												</span>
												<button
													type="button"
													class="tw-w-7 tw-h-6 tw-bg-[#0f172a] hover:tw-bg-slate-800 tw-border tw-border-[#334155] tw-text-xs tw-text-white tw-cursor-pointer"
													style="border-radius: 0px;"
													onclick={() => adjustScore(item.key, 5)}
												>
													+5
												</button>
											</div>
										</div>

										<!-- Progress Gauge -->
										<div class="tw-w-full tw-h-1.5 tw-bg-[#000000] tw-overflow-hidden" style="border-radius: 0px;">
											<div
												class="tw-h-full tw-transition-all tw-duration-150"
												style="width: {val}%; background-color: {item.color}; border-radius: 0px;"
											></div>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Scouting Observation Tags -->
						<div class="tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-p-4" style="border-radius: 0px;">
							<span class="tw-block tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-400 tw-mb-2">
								QUALITATIVE SCOUTING TAGS
							</span>
							<div class="tw-flex tw-flex-wrap tw-gap-1.5">
								{#each QUICK_TAGS as tag}
									{@const selected = (tagsByProspect[activeProspect.id] ?? []).includes(tag)}
									<button
										type="button"
										class="tw-px-2.5 tw-py-1 tw-text-[10px] tw-font-bold tw-transition-all tw-cursor-pointer tw-border {selected ? 'tw-bg-[#14b8a6] tw-text-black tw-border-[#14b8a6]' : 'tw-bg-[#0f172a] tw-text-slate-400 tw-border-[#334155] hover:tw-text-white'}"
										style="border-radius: 0px;"
										onclick={() => toggleTag(tag)}
									>
										{tag}
									</button>
								{/each}
							</div>
						</div>

						<!-- Confidential Coach Notes Textarea -->
						<div class="tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-p-4" style="border-radius: 0px;">
							<label class="tw-block tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-400 tw-mb-2" for="scouting-notes">
								CONFIDENTIAL SCOUTING & RECRUITMENT NOTES
							</label>
							<textarea
								id="scouting-notes"
								rows="3"
								placeholder="Capture observations on tactical discipline, coachability, match impact, and recruitment priority…"
								class="tw-w-full tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-3 tw-text-xs tw-font-mono tw-text-white tw-outline-none focus:tw-border-[#14b8a6]"
								style="border-radius: 0px;"
								value={notesByProspect[activeProspect.id] || ''}
								oninput={(e) => {
									if (activeProspect) {
										notesByProspect = { ...notesByProspect, [activeProspect.id]: e.currentTarget.value };
									}
								}}
							></textarea>
						</div>

						<!-- Bottom Action Bar: Lock & Submit Assessment -->
						<div class="tw-border-t tw-border-[#334155] tw-pt-4 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4">
							<div>
								{#if saveOk}
									<span class="tw-text-xs tw-font-bold tw-text-[#14b8a6]">✓ {saveOk}</span>
								{:else if saveErr}
									<span class="tw-text-xs tw-font-bold tw-text-rose-400">⚠ {saveErr}</span>
								{:else}
									<span class="tw-text-xs tw-text-slate-500">
										Locking assessment persists official grade and Scout's Six ratings to squad records.
									</span>
								{/if}
							</div>

							<button
								type="button"
								class="coach-os-action-chip tw-px-6 tw-py-3 tw-font-mono tw-font-bold tw-text-xs tw-uppercase tw-tracking-wider tw-cursor-pointer tw-transition-all active:tw-scale-[0.98] {lockFlash ? 'tw-ring-2 tw-ring-[#fbbf24]' : ''}"
								style="background: {saving ? '#0f172a' : '#fbbf24'}; color: {saving ? '#94a3b8' : '#000000'}; border: 1px solid {saving ? '#334155' : '#fbbf24'}; border-radius: 0px;"
								disabled={saving}
								onclick={() => void lockAssessment()}
							>
								{saving ? 'LOCKING ASSESSMENT…' : '🔒 LOCK & SUBMIT ASSESSMENT'}
							</button>
						</div>
					</section>
				{/if}
			</div>
		{/if}
	</main>
</div>
