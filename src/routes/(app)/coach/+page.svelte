<script>
	import { browser } from '$app/environment';
	import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

	/** Dev / no-team fallback — mirrors mission brief shape. */
	const MOCK_ROSTER = [
		{ name: 'Jimmy T.', status: 'cleared', number: 10 },
		{ name: 'Sarah W.', status: 'injured', number: 4 },
		{ name: 'Marcus R.', status: 'fatigued', number: 7 },
	];

	const role = $derived(authStore.role);
	const userEmail = $derived((authStore.user?.email || '').trim());

	const myTeams = $derived.by(() => {
		if (!teamsStore.loaded) return [];
		if (role === 'super_admin' || role === 'global_admin') return teamsStore.teams.slice();
		if (!userEmail) return [];
		return teamsStore.getCoachTeams(userEmail);
	});

	const effectiveTeamId = $derived.by(() => {
		const pivot = workspaceContextStore.activeTeamId?.trim();
		if (pivot && myTeams.some((t) => t.id === pivot)) return pivot;
		return myTeams[0]?.id ?? '';
	});

	const activeTeamRow = $derived(myTeams.find((t) => t.id === effectiveTeamId) ?? null);

	const hudSubtitle = $derived.by(() => {
		const cid = typeof activeTeamRow?.clubId === 'string' ? activeTeamRow.clubId : '';
		const clubName =
			cid ? (teamsStore.clubs.find((c) => c.id === cid)?.name ?? 'Club') : 'Club';
		const teamName =
			typeof activeTeamRow?.name === 'string' && activeTeamRow.name.trim() ?
				activeTeamRow.name.trim()
			:	'Squad';
		return `${clubName} · ${teamName} · Current Status: Nominal`;
	});

	const activeClubId = $derived(
		typeof activeTeamRow?.clubId === 'string' ? activeTeamRow.clubId : '',
	);

	/** @typedef {{ name: string, status: 'cleared' | 'injured' | 'fatigued', number: number | string }} HudPlayer */

	/** @type {HudPlayer[]} */
	let rosterHud = $state([]);
	let rosterLoading = $state(false);

	/**
	 * @param {unknown} raw
	 * @returns {'cleared' | 'injured' | 'fatigued'}
	 */
	function mapLookupStatus(raw) {
		const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
		if (!s || s === 'active' || s === 'pending' || s === '') return 'cleared';
		if (s.includes('fatigue') || s.includes('fatigued')) return 'fatigued';
		if (
			s.includes('injur') ||
			s.includes('inactive') ||
			s.includes('absent') ||
			s.includes('medical')
		) {
			return 'injured';
		}
		return 'cleared';
	}

	$effect(() => {
		if (!browser || authStore.isLoading || !authStore.isAuthenticated) return;

		const tid = effectiveTeamId;
		if (!tid) {
			rosterHud = [];
			rosterLoading = false;
			return;
		}

		let cancelled = false;
		rosterLoading = true;

		void (async () => {
			try {
				const [lookupSnap, rosterSnap] = await Promise.all([
					getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', tid))),
					getDoc(doc(db, 'rosters', tid)),
				]);
				if (cancelled) return;

				/** @type {Record<string, string>} */
				let jerseys = {};
				if (rosterSnap.exists() && typeof rosterSnap.data()?.jerseys === 'object') {
					jerseys = /** @type {Record<string, string>} */ (rosterSnap.data().jerseys);
				}

				/** @type {HudPlayer[]} */
				const rows = [];
				lookupSnap.forEach((d) => {
					const data = d.data();
					const playerName =
						typeof data.playerName === 'string' && data.playerName.trim() ?
							data.playerName.trim()
						:	'';
					if (!playerName) return;

					const rawNum = jerseys[playerName];
					let number = /** @type {number | string} */ ('—');
					if (typeof rawNum === 'string' && /^\d+$/.test(rawNum.trim())) {
						number = parseInt(rawNum.trim(), 10);
					} else if (rawNum != null && String(rawNum).trim()) {
						number = String(rawNum).trim();
					}

					rows.push({
						name: playerName,
						status: mapLookupStatus(data.status),
						number,
					});
				});
				rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
				rosterHud = rows;
			} catch (e) {
				console.error('[Coach HUD] roster load', e);
				if (!cancelled) rosterHud = [];
			} finally {
				if (!cancelled) rosterLoading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	const activeRoster = $derived.by(() => {
		if (rosterHud.length > 0) return rosterHud;
		if (!effectiveTeamId) return MOCK_ROSTER;
		return [];
	});
</script>

<div class="view-section coach-command-hud">
	<div class="card-header tw-mb-8 tw-border-none">
		<div class="tw-min-w-0">
			<h1 class="view-title tw-mb-0">Command Center</h1>
			<p class="tw-mt-1 tw-text-sm tw-font-medium tw-text-slate-400">{hudSubtitle}</p>
		</div>

		<a
			href="/coach/tactical"
			class="primary-btn tw-shrink-0 tw-border-none tw-bg-red-600 tw-text-white tw-shadow-[0_0_20px_rgba(220,38,38,0.4)] tw-transition-all hover:tw-bg-red-500"
		>
			INITIATE MATCH DAY
		</a>
	</div>

	<div class="bento-grid bento-grid--4">
		<div class="bento-card bento-card--glass tw-col-span-1 md:tw-col-span-2">
			<h2 class="bg-blue-header tw-mb-4">Live Roster Matrix</h2>
			{#if rosterLoading && effectiveTeamId}
				<p class="tw-py-8 tw-text-center tw-text-sm tw-text-slate-500">Syncing roster…</p>
			{:else if activeRoster.length === 0}
				<p class="tw-py-8 tw-text-center tw-text-sm tw-text-slate-500">
					No linked players for this team yet.
				</p>
			{:else}
				<div class="tw-grid tw-grid-cols-2 tw-gap-4 sm:tw-grid-cols-3">
					{#each activeRoster as player (`${player.name}-${player.number}-${player.status}`)}
						<div
							class="tw-flex tw-items-center tw-rounded-lg tw-border tw-border-white/5 tw-bg-slate-800/50 tw-p-3"
						>
							<div
								class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border tw-text-xs tw-font-bold {player.status === 'injured'
									? 'tw-border-red-500/50 tw-bg-red-500/20 tw-text-red-400'
									: player.status === 'fatigued'
										? 'tw-border-amber-500/50 tw-bg-amber-500/20 tw-text-amber-400'
										: 'tw-border-emerald-500/50 tw-bg-emerald-500/20 tw-text-emerald-400'}"
							>
								#{player.number}
							</div>
							<div class="tw-ml-3 tw-min-w-0">
								<p class="tw-truncate tw-text-sm tw-font-bold tw-text-white">{player.name}</p>
								<p class="tw-text-xs tw-uppercase tw-text-slate-400">{player.status}</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="bento-card bento-card--glass tw-col-span-1">
			<h2 class="bg-orange-header tw-mb-4">Next Match Briefing</h2>
			<div class="tw-rounded-lg tw-border tw-border-white/5 tw-bg-slate-950 tw-p-4">
				<p class="tw-text-xs tw-uppercase tw-tracking-widest tw-text-slate-500">Opponent</p>
				<p class="tw-text-lg tw-font-bold tw-text-white">North Valley United</p>
				<div class="tw-mt-4 tw-flex tw-items-end tw-justify-between">
					<div>
						<p class="tw-text-xs tw-uppercase tw-text-slate-500">Formation</p>
						<p class="tw-font-mono tw-font-bold tw-text-cyan-400">4-3-3 ATTACK</p>
					</div>
					<div class="tw-text-right">
						<p class="tw-text-xs tw-uppercase tw-text-slate-500">Weather</p>
						<p class="tw-text-slate-300">Clear, 72°</p>
					</div>
				</div>
			</div>
		</div>

		<div class="bento-card bento-card--glass tw-col-span-1">
			<h2 class="bg-green-header tw-mb-4">Mission Compliance</h2>
			<div
				class="tw-flex tw-h-full tw-flex-col tw-items-center tw-justify-center tw-pb-6 tw-pt-2"
			>
				<div
					class="tw-text-5xl tw-font-black tw-text-emerald-400 tw-drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]"
				>
					85%
				</div>
				<p class="tw-mt-2 tw-text-sm tw-text-slate-400">Squad Completion Rate</p>
				<p class="tw-mt-1 tw-text-xs tw-text-red-400">3 players missing homework</p>
			</div>
		</div>

		<div class="bento-card bento-card--glass tw-col-span-1 md:tw-col-span-4">
			<h2 class="bg-blue-header tw-mb-4">Priority Comms & Alerts</h2>
			<ActionInbox clubId={activeClubId} teamId={effectiveTeamId} />
		</div>
	</div>
</div>

<style>
	.coach-command-hud .view-title {
		margin-bottom: 0;
	}

	.coach-command-hud .card-header {
		border-bottom: none;
	}
</style>
