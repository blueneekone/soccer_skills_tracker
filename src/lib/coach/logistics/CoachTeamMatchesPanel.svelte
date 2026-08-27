<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { getActiveDb } from '$lib/firebase';
	import { collection, query, orderBy, limit, onSnapshot, type Unsubscribe } from 'firebase/firestore';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		teamId?: string;
	}

	let { teamId = '' }: Props = $props();

	export interface SavedMatchRecord {
		id: string;
		teamId?: string;
		teamName?: string;
		opponentName?: string;
		opponentTeam?: string;
		homeScore?: number;
		awayScore?: number;
		finalScore?: string;
		result?: 'WIN' | 'DRAW' | 'LOSS';
		matchDate?: string;
		durationMinutes?: number;
		elapsedSeconds?: number;
		events?: Array<{
			id: string;
			type: string;
			label: string;
			time: string;
			minute?: number;
			playerId?: string;
			playerName?: string;
			note?: string;
		}>;
		playerStats?: Record<string, {
			id: string;
			name: string;
			jersey: string;
			goals: number;
			assists: number;
			shots: number;
			tackles: number;
			saves: number;
			fouls: number;
			yellowCards: number;
			redCards: number;
			mistakes: number;
		}>;
		mistakes?: Array<{
			id: string;
			time: string;
			minute: number;
			playerId: string;
			playerName: string;
			note: string;
		}>;
		status?: string;
		createdAt?: any;
	}

	let matches = $state<SavedMatchRecord[]>([]);
	let loading = $state(true);
	let selectedMatch = $state<SavedMatchRecord | null>(null);

	// B815 Defensive Hydration Firestore Query
	$effect(() => {
		if (!browser) return;
		const db = getActiveDb();
		// B815 Defensive Hydration Guard
		if (!db || !authStore.isAuthenticated) {
			loading = false;
			return;
		}

		const tid = teamId?.trim() || authStore.teamId || authStore.userProfile?.teamId || authStore.user?.teamId;
		if (!tid) {
			matches = [];
			loading = false;
			return;
		}

		loading = true;
		let unsubMatches: Unsubscribe | null = null;
		let unsubSessions: Unsubscribe | null = null;

		try {
			const matchesRef = collection(db, 'teams', tid, 'matches');
			const q = query(matchesRef, orderBy('createdAt', 'desc'), limit(30));

			unsubMatches = onSnapshot(
				q,
				(snapshot) => {
					const list: SavedMatchRecord[] = [];
					snapshot.forEach((doc) => {
						list.push({ id: doc.id, ...doc.data() } as SavedMatchRecord);
					});

					// Fallback to match_sessions if matches collection is empty
					if (list.length === 0) {
						loadSessionFallback(tid);
					} else {
						matches = list;
						loading = false;
					}
				},
				(err) => {
					console.warn('[CoachTeamMatchesPanel] Matches listener error, falling back to sessions:', err);
					loadSessionFallback(tid);
				}
			);
		} catch (err) {
			console.warn('[CoachTeamMatchesPanel] Firestore error:', err);
			loadSessionFallback(tid);
		}

		function loadSessionFallback(targetTeamId: string) {
			try {
				const sessionsRef = collection(db!, 'teams', targetTeamId, 'match_sessions');
				const qSessions = query(sessionsRef, orderBy('updatedAt', 'desc'), limit(30));
				unsubSessions = onSnapshot(qSessions, (sSnap) => {
					const sList: SavedMatchRecord[] = [];
					sSnap.forEach((doc) => {
						const data = doc.data();
						sList.push({
							id: doc.id,
							teamId: targetTeamId,
							teamName: data.teamName || 'Our Squad',
							opponentName: data.opponentName || data.opponentTeam || 'Opponent',
							homeScore: data.homeScore ?? 0,
							awayScore: data.awayScore ?? 0,
							finalScore: `${data.homeScore ?? 0} - ${data.awayScore ?? 0}`,
							result: (data.homeScore ?? 0) > (data.awayScore ?? 0) ? 'WIN' : (data.homeScore ?? 0) < (data.awayScore ?? 0) ? 'LOSS' : 'DRAW',
							matchDate: data.matchDate || (data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : new Date().toISOString()),
							durationMinutes: data.durationMinutes || (data.elapsedSeconds ? Math.round(data.elapsedSeconds / 60) : 90),
							events: data.events || [],
							playerStats: data.playerStats || {},
							mistakes: data.mistakes || [],
							status: data.matchState || data.status || 'completed',
						});
					});
					matches = sList;
					loading = false;
				}, () => {
					loading = false;
				});
			} catch (e) {
				loading = false;
			}
		}

		return () => {
			if (unsubMatches) unsubMatches();
			if (unsubSessions) unsubSessions();
		};
	});

	// Aggregate KPIs
	const kpis = $derived.by(() => {
		let wins = 0;
		let draws = 0;
		let losses = 0;
		let goalsFor = 0;
		let goalsAgainst = 0;
		let mistakesCount = 0;

		for (const m of matches) {
			const h = m.homeScore ?? 0;
			const a = m.awayScore ?? 0;
			if (h > a) wins++;
			else if (h < a) losses++;
			else draws++;

			goalsFor += h;
			goalsAgainst += a;
			mistakesCount += (m.mistakes?.length || 0);
		}

		return {
			total: matches.length,
			wins,
			draws,
			losses,
			goalsFor,
			goalsAgainst,
			mistakesCount,
		};
	});

	function formatDate(isoString?: string): string {
		if (!isoString) return 'Recent Match';
		try {
			const d = new Date(isoString);
			return d.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return isoString;
		}
	}

	function getResultBadge(res?: string, home = 0, away = 0) {
		const determined = res || (home > away ? 'WIN' : home < away ? 'LOSS' : 'DRAW');
		if (determined === 'WIN') {
			return { label: 'WIN', bg: 'tw-bg-emerald-950/70', border: 'tw-border-emerald-500', text: 'tw-text-emerald-300' };
		}
		if (determined === 'LOSS') {
			return { label: 'LOSS', bg: 'tw-bg-rose-950/70', border: 'tw-border-rose-500', text: 'tw-text-rose-300' };
		}
		return { label: 'DRAW', bg: 'tw-bg-amber-950/70', border: 'tw-border-amber-500', text: 'tw-text-amber-300' };
	}
</script>

<div class="tw-space-y-6">
	<!-- Top Header with Summary Metrics (Z2 Slate Card) -->
	<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-5 tw-shadow-xl" style="border-radius: 0px;">
		<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-border-b tw-border-[#334155] tw-pb-4 tw-mb-4">
			<div>
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
					<span class="tw-w-2.5 tw-h-2.5 tw-bg-[#14b8a6]"></span>
					<h2 class="tw-font-mono tw-text-sm sm:tw-text-base tw-font-black tw-text-white tw-uppercase tw-tracking-wider tw-m-0">
						PREVIOUS MATCH REVIEWS & TACTICAL DOSSIERS
					</h2>
				</div>
				<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-m-0">
					Historical match archives, box score player attributions, and coach reminder logs.
				</p>
			</div>

			<a
				href="/coach/matchday"
				class="tw-inline-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-[#fbbf24] hover:tw-bg-amber-400 active:tw-scale-95 tw-text-black tw-font-mono tw-text-xs tw-font-black tw-uppercase tw-tracking-wider tw-transition-all tw-no-underline"
				style="border-radius: 0px;"
			>
				<span>▶</span>
				<span>LAUNCH MATCH DAY</span>
			</a>
		</div>

		<!-- KPI Metric Tiles -->
		<div class="tw-grid tw-grid-cols-2 sm:tw-grid-cols-4 tw-gap-3">
			<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-3">
				<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">MATCHES PLAYED</div>
				<div class="tw-font-mono tw-text-xl tw-font-black tw-text-white">
					{kpis.total}
				</div>
			</div>

			<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-3">
				<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">RECORD (W - D - L)</div>
				<div class="tw-font-mono tw-text-xl tw-font-black tw-text-[#daff0a]">
					{kpis.wins}W - {kpis.draws}D - {kpis.losses}L
				</div>
			</div>

			<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-3">
				<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">GOALS (FOR / AGAINST)</div>
				<div class="tw-font-mono tw-text-xl tw-font-black tw-text-[#14b8a6]">
					{kpis.goalsFor} / {kpis.goalsAgainst}
				</div>
			</div>

			<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-3">
				<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">MISTAKE REMINDERS</div>
				<div class="tw-font-mono tw-text-xl tw-font-black {kpis.mistakesCount > 0 ? 'tw-text-rose-400' : 'tw-text-slate-400'}">
					{kpis.mistakesCount} LOGGED
				</div>
			</div>
		</div>
	</div>

	<!-- Matches Feed / List -->
	{#if loading}
		<div class="tw-p-12 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-center">
			<div class="tw-w-6 tw-h-6 tw-border-2 tw-border-[#14b8a6] tw-border-t-transparent tw-rounded-full tw-animate-spin tw-mx-auto tw-mb-3"></div>
			<div class="tw-font-mono tw-text-xs tw-text-slate-400">Loading saved match records...</div>
		</div>
	{:else if matches.length === 0}
		<div class="tw-p-10 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-center" style="border-radius: 0px;">
			<span class="tw-text-3xl tw-mb-2 tw-block">⚽</span>
			<h3 class="tw-font-mono tw-text-sm tw-font-bold tw-text-white tw-uppercase tw-mb-1">
				NO SAVED MATCH RECORDS FOUND
			</h3>
			<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-max-w-md tw-mx-auto tw-mb-4">
				When you track a game in the Match Day console and blow the final whistle or click Save, the full game dossier and player box score will appear here for review.
			</p>
			<a
				href="/coach/matchday"
				class="tw-inline-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-[#14b8a6] hover:tw-bg-teal-400 tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-no-underline"
				style="border-radius: 0px;"
			>
				Open Match Day Console →
			</a>
		</div>
	{:else}
		<div class="tw-space-y-3">
			{#each matches as m (m.id)}
				{@const badge = getResultBadge(m.result, m.homeScore, m.awayScore)}
				<!-- Match Card Container -->
				<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] hover:tw-border-[#14b8a6] tw-p-4 sm:tw-p-5 tw-transition-all tw-shadow-md" style="border-radius: 0px;">
					<div class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-4">
						<!-- Left: Result + Scoreline + Opponent -->
						<div class="tw-flex tw-items-center tw-gap-4">
							<span class="tw-font-mono tw-text-xs tw-font-black tw-px-3 tw-py-1.5 tw-border {badge.bg} {badge.border} {badge.text}" style="border-radius: 0px;">
								{badge.label}
							</span>

							<div>
								<div class="tw-font-mono tw-text-base sm:tw-text-lg tw-font-black tw-text-white tw-flex tw-items-center tw-gap-2">
									<span>{m.teamName || 'OUR SQUAD'}</span>
									<span class="tw-text-[#daff0a] tw-bg-[#000000] tw-px-2 tw-py-0.5 tw-border tw-border-[#334155]">
										{m.homeScore ?? 0} - {m.awayScore ?? 0}
									</span>
									<span class="tw-text-slate-300">{m.opponentName || m.opponentTeam || 'Opponent'}</span>
								</div>
								<div class="tw-font-mono tw-text-[11px] tw-text-slate-400 tw-mt-1">
									📅 {formatDate(m.matchDate)} • ⏱️ {m.durationMinutes || 90} Mins
								</div>
							</div>
						</div>

						<!-- Right: Stats Chips & Review Button -->
						<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-3">
							{#if m.mistakes && m.mistakes.length > 0}
								<span class="tw-font-mono tw-text-[11px] tw-text-rose-300 tw-bg-rose-950/60 tw-border tw-border-rose-800 tw-px-2.5 tw-py-1">
									⚡ {m.mistakes.length} Reminders
								</span>
							{/if}

							{#if m.events && m.events.length > 0}
								<span class="tw-font-mono tw-text-[11px] tw-text-slate-300 tw-bg-[#000000] tw-border tw-border-[#334155] tw-px-2.5 tw-py-1">
									📊 {m.events.length} Events
								</span>
							{/if}

							<button
								type="button"
								onclick={() => selectedMatch = m}
								class="tw-px-4 tw-py-2 tw-bg-[#000000] hover:tw-bg-[#14b8a6] hover:tw-text-black tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-transition-all tw-cursor-pointer"
								style="border-radius: 0px;"
							>
								Review Match Dossier →
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Match Detail Modal / Dossier -->
{#if selectedMatch}
	{@const selBadge = getResultBadge(selectedMatch.result, selectedMatch.homeScore, selectedMatch.awayScore)}
	{@const statsList = Object.values(selectedMatch.playerStats || {})}

	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="tw-fixed tw-inset-0 tw-z-[9999] tw-flex tw-items-center tw-justify-center tw-p-4 tw-bg-black/85 tw-backdrop-blur-sm"
		role="presentation"
		transition:fade={{ duration: 120 }}
		onclick={() => selectedMatch = null}
	>
		<!-- Modal Content Container -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="tw-relative tw-w-full tw-max-w-4xl tw-max-h-[90vh] tw-overflow-y-auto tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-p-5 sm:tw-p-6 tw-shadow-2xl tw-space-y-5"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			style="border-radius: 0px;"
			transition:fly={{ y: 20, duration: 200, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-4">
				<div class="tw-flex tw-items-center tw-gap-3">
					<span class="tw-font-mono tw-text-xs tw-font-black tw-px-2.5 tw-py-1 tw-border {selBadge.bg} {selBadge.border} {selBadge.text}">
						{selBadge.label}
					</span>
					<div>
						<h3 class="tw-font-mono tw-text-base sm:tw-text-lg tw-font-black tw-text-white tw-uppercase tw-m-0">
							{selectedMatch.teamName || 'OUR SQUAD'} {selectedMatch.homeScore ?? 0} - {selectedMatch.awayScore ?? 0} {selectedMatch.opponentName || selectedMatch.opponentTeam || 'Opponent'}
						</h3>
						<div class="tw-font-mono tw-text-xs tw-text-slate-400">
							{formatDate(selectedMatch.matchDate)} • Match ID: {selectedMatch.id}
						</div>
					</div>
				</div>

				<button
					type="button"
					onclick={() => selectedMatch = null}
					class="tw-text-slate-400 hover:tw-text-white tw-font-mono tw-text-sm tw-p-1.5 tw-cursor-pointer"
				>
					✕
				</button>
			</div>

			<!-- Coach's Post-Match Reminders & Mistake Log -->
			<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4">
				<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-2.5 tw-mb-3">
					<div class="tw-flex tw-items-center tw-gap-2">
						<span class="tw-w-2 tw-h-2 tw-bg-rose-500"></span>
						<h4 class="tw-font-mono tw-text-xs tw-font-bold tw-text-rose-400 tw-uppercase tw-tracking-wider tw-m-0">
							⚡ COACH'S POST-MATCH REMINDERS & MISTAKE LOG ({selectedMatch.mistakes?.length || 0})
						</h4>
					</div>
					<span class="tw-font-mono tw-text-[10px] tw-text-slate-400">FILM & PRACTICE QUEUE</span>
				</div>

				{#if !selectedMatch.mistakes || selectedMatch.mistakes.length === 0}
					<div class="tw-p-4 tw-bg-[#000000] tw-border tw-border-[#334155] tw-text-center">
						<p class="tw-font-mono tw-text-xs tw-text-emerald-400 tw-m-0">
							✓ Clean performance — zero critical mistake reminders recorded for this match.
						</p>
					</div>
				{:else}
					<div class="tw-space-y-2">
						{#each selectedMatch.mistakes as m (m.id || m.minute)}
							<div class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-2 tw-p-2.5 tw-bg-[#000000] tw-border tw-border-rose-950 hover:tw-border-rose-700 tw-transition-colors">
								<div class="tw-flex tw-items-center tw-gap-2.5">
									<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-rose-400 tw-bg-rose-950/60 tw-px-2 tw-py-0.5 tw-border tw-border-rose-800">
										{m.minute}'
									</span>
									<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-white">
										{m.playerName}
									</span>
								</div>
								<div class="tw-font-mono tw-text-xs tw-text-slate-200">
									"{m.note}"
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Player Performance Box Score Table -->
			<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4">
				<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-2.5 tw-mb-3">
					<div class="tw-flex tw-items-center tw-gap-2">
						<span class="tw-w-2 tw-h-2 tw-bg-[#daff0a]"></span>
						<h4 class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#daff0a] tw-uppercase tw-tracking-wider tw-m-0">
							PLAYER PERFORMANCE BOX SCORE
						</h4>
					</div>
					<span class="tw-font-mono tw-text-[10px] tw-text-slate-400">ROSTER STAT ATTRIBUTION</span>
				</div>

				{#if statsList.length === 0}
					<div class="tw-p-4 tw-bg-[#000000] tw-border tw-border-[#334155] tw-text-center">
						<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-m-0">
							No player box scores were saved for this match.
						</p>
					</div>
				{:else}
					<div class="tw-w-full tw-overflow-x-auto">
						<table class="tw-w-full tw-text-left tw-border-collapse">
							<thead>
								<tr class="tw-border-b tw-border-[#334155] tw-bg-[#000000]">
									<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase">Player</th>
									<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase">#</th>
									<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-emerald-400 tw-uppercase tw-text-center">Goals</th>
									<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-teal-400 tw-uppercase tw-text-center">Assists</th>
									<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-text-center">Shots</th>
									<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-text-center">Tackles</th>
									<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-text-center">Saves</th>
									<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-text-center">Fouls</th>
									<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-amber-400 tw-uppercase tw-text-center">Cards</th>
									<th class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-rose-400 tw-uppercase tw-text-center">Mistakes</th>
								</tr>
							</thead>
							<tbody class="tw-divide-y tw-divide-[#334155]/40">
								{#each statsList as player (player.id || player.name)}
									<tr class="hover:tw-bg-[#000000]/60 tw-transition-colors">
										<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-font-bold tw-text-white">{player.name}</td>
										<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-slate-400">{player.jersey ? `#${player.jersey}` : '-'}</td>
										<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center tw-font-bold {player.goals > 0 ? 'tw-text-emerald-400' : 'tw-text-slate-500'}">{player.goals}</td>
										<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center tw-font-bold {player.assists > 0 ? 'tw-text-teal-400' : 'tw-text-slate-500'}">{player.assists}</td>
										<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center {player.shots > 0 ? 'tw-text-slate-200' : 'tw-text-slate-500'}">{player.shots}</td>
										<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center {player.tackles > 0 ? 'tw-text-slate-200' : 'tw-text-slate-500'}">{player.tackles}</td>
										<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center {player.saves > 0 ? 'tw-text-slate-200' : 'tw-text-slate-500'}">{player.saves}</td>
										<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center {player.fouls > 0 ? 'tw-text-amber-400' : 'tw-text-slate-500'}">{player.fouls}</td>
										<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center">
											{#if player.yellowCards > 0 || player.redCards > 0}
												<span class="tw-text-amber-400">{player.yellowCards}Y</span>
												{#if player.redCards > 0}
													<span class="tw-text-rose-400 tw-ml-1">{player.redCards}R</span>
												{/if}
											{:else}
												<span class="tw-text-slate-500">0</span>
											{/if}
										</td>
										<td class="tw-p-2.5 tw-font-mono tw-text-xs tw-text-center {player.mistakes > 0 ? 'tw-text-rose-400 tw-font-bold' : 'tw-text-slate-500'}">{player.mistakes}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			<!-- Full Event Stream Timeline -->
			<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4">
				<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-2.5 tw-mb-3">
					<div class="tw-flex tw-items-center tw-gap-2">
						<span class="tw-w-2 tw-h-2 tw-bg-[#14b8a6]"></span>
						<h4 class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-tracking-wider tw-m-0">
							EVENT LOG TIMELINE ({selectedMatch.events?.length || 0})
						</h4>
					</div>
					<span class="tw-font-mono tw-text-[10px] tw-text-slate-400">CHRONOLOGICAL AUDIT</span>
				</div>

				{#if !selectedMatch.events || selectedMatch.events.length === 0}
					<div class="tw-p-4 tw-bg-[#000000] tw-border tw-border-[#334155] tw-text-center">
						<p class="tw-font-mono tw-text-xs tw-text-slate-500 tw-m-0">No timeline events recorded.</p>
					</div>
				{:else}
					<div class="tw-space-y-1.5 tw-max-h-56 tw-overflow-y-auto tw-p-2 tw-bg-[#000000] tw-border tw-border-[#334155]">
						{#each selectedMatch.events as evt (evt.id || evt.time)}
							<div class="tw-flex tw-items-center tw-justify-between tw-text-xs tw-font-mono tw-p-1.5 tw-bg-[#0f172a] tw-border tw-border-[#334155]/60">
								<div class="tw-flex tw-items-center tw-gap-2.5">
									<span class="tw-text-slate-500 tw-tabular-nums">{evt.time}</span>
									<span class="tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-border {evt.type === 'GOAL' ? 'tw-bg-emerald-950 tw-border-emerald-500 tw-text-emerald-300' : evt.type.includes('CARD') ? 'tw-bg-amber-950 tw-border-amber-400 tw-text-amber-300' : evt.type === 'MISTAKE' ? 'tw-bg-rose-950 tw-border-rose-500 tw-text-rose-300' : 'tw-bg-slate-900 tw-border-slate-700 tw-text-slate-300'}">
										{evt.type}
									</span>
									<span class="tw-text-white tw-font-bold">{evt.label}</span>
								</div>
								{#if evt.minute !== undefined}
									<span class="tw-text-slate-500 tw-text-[10px]">{evt.minute}'</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="tw-flex tw-justify-end tw-border-t tw-border-[#334155] tw-pt-3">
				<button
					type="button"
					onclick={() => selectedMatch = null}
					class="tw-px-4 tw-py-2 tw-bg-[#0f172a] hover:tw-bg-slate-800 tw-border tw-border-[#334155] tw-text-slate-300 tw-font-mono tw-text-xs tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					Close Dossier
				</button>
			</div>
		</div>
	</div>
{/if}
