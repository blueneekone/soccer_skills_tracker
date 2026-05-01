<script>
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

	/**
	 * @typedef {{ id: string; shortId: string; name: string; role: string }} Operative
	 * @typedef {'emerald' | 'rose' | 'amber'} ActionTone
	 * @typedef {{ id: string; label: string; tone: ActionTone }} TelemetryActionDef
	 * @typedef {{ id: string; ts: string; line: string; tone: ActionTone }} FeedLine
	 */

	/** @type {TelemetryActionDef[]} */
	const POSITIVE_ACTIONS = [
		{ id: 'PASS', label: 'PASS', tone: 'emerald' },
		{ id: 'SHOT_ON_TARGET', label: 'SHOT ON TARGET', tone: 'emerald' },
		{ id: 'ASSIST', label: 'ASSIST', tone: 'emerald' },
		{ id: 'GOAL', label: 'GOAL', tone: 'emerald' },
		{ id: 'TACKLE_WON', label: 'TACKLE WON', tone: 'emerald' },
	];

	/** @type {TelemetryActionDef[]} */
	const NEGATIVE_ACTIONS = [
		{ id: 'FOUL', label: 'FOUL', tone: 'rose' },
		{ id: 'TURNOVER', label: 'TURNOVER', tone: 'rose' },
		{ id: 'SHOT_OFF_TARGET', label: 'SHOT OFF TARGET', tone: 'rose' },
	];

	/** @type {TelemetryActionDef[]} */
	const CRITICAL_ACTIONS = [
		{ id: 'SUB_OUT', label: 'SUB OUT', tone: 'amber' },
		{ id: 'INJURY_ALERT', label: 'INJURY ALERT', tone: 'amber' },
	];

	const MOCK_OPERATIVES = /** @type {Operative[]} */ ([
		{ id: 'm1', shortId: 'OP-01', name: 'Jimmy T.', role: 'MID' },
		{ id: 'm2', shortId: 'OP-02', name: 'Sarah W.', role: 'DEF' },
		{ id: 'm3', shortId: 'OP-03', name: 'Marcus R.', role: 'FWD' },
		{ id: 'm4', shortId: 'OP-04', name: 'Leo M.', role: 'MID' },
		{ id: 'm5', shortId: 'OP-05', name: 'David K.', role: 'GK' },
	]);

	let selectedTeamId = $state('');

	const role = $derived(authStore.role);
	const userEmail = $derived((authStore.user?.email || '').trim());

	const myTeams = $derived.by(() => {
		if (!teamsStore.loaded) return [];
		if (role === 'super_admin' || role === 'global_admin') return teamsStore.teams.slice();
		if (!userEmail) return [];
		return teamsStore.getCoachTeams(userEmail);
	});

	const activeTeamLabel = $derived.by(() => {
		const t = myTeams.find((x) => x.id === selectedTeamId);
		const n = typeof t?.name === 'string' ? t.name.trim() : '';
		return n || 'NO TEAM BIND';
	});

	$effect(() => {
		const teams = myTeams;
		if (teams.length === 0) return;

		const pivot = workspaceContextStore.activeTeamId?.trim();
		if (pivot && teams.some((t) => t.id === pivot)) {
			if (selectedTeamId !== pivot) selectedTeamId = pivot;
			return;
		}

		const urlTeam = page.url.searchParams.get('teamId')?.trim();
		if (urlTeam && teams.some((t) => t.id === urlTeam)) {
			if (selectedTeamId !== urlTeam) selectedTeamId = urlTeam;
			return;
		}

		if (!selectedTeamId) {
			selectedTeamId = teams[0].id;
		}
	});

	/** @type {Operative[]} */
	let operatives = $state([]);
	let rosterLoading = $state(false);

	/** @type {string | null} */
	let activeAssetId = $state(null);

	/** @type {FeedLine[]} */
	let eventFeed = $state([]);

	let ingestPulse = $state(false);
	let feedScrollRoot = $state(/** @type {HTMLDivElement | undefined} */ (undefined));

	$effect(() => {
		if (!browser || authStore.isLoading || !authStore.isAuthenticated) return;

		const tid = selectedTeamId?.trim();
		if (!tid) {
			operatives = MOCK_OPERATIVES.slice();
			activeAssetId = operatives[0]?.id ?? null;
			rosterLoading = false;
			return;
		}

		let cancelled = false;
		rosterLoading = true;

		void (async () => {
			try {
				const lookupSnap = await getDocs(
					query(collection(db, 'player_lookup'), where('teamId', '==', tid)),
				);
				if (cancelled) return;

				/** @type {Operative[]} */
				const rows = [];
				lookupSnap.forEach((d) => {
					const data = d.data();
					const name =
						typeof data.playerName === 'string' && data.playerName.trim() ?
							data.playerName.trim()
						:	'';
					if (!name) return;
					const pos =
						typeof data.position === 'string' && data.position.trim() ?
							String(data.position).trim().toUpperCase().slice(0, 3)
						:	'MID';
					const sid =
						d.id.length > 14 ? d.id.slice(0, 10).toUpperCase() + '…' : d.id.toUpperCase();
					rows.push({ id: d.id, shortId: sid, name, role: pos });
				});
				rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
				operatives = rows.length > 0 ? rows : MOCK_OPERATIVES.slice();
			} catch (e) {
				console.error('[Match Logger] roster', e);
				if (!cancelled) operatives = MOCK_OPERATIVES.slice();
			} finally {
				if (!cancelled) rosterLoading = false;
			}
			if (!cancelled && operatives.length) {
				const still = operatives.some((o) => o.id === activeAssetId);
				if (!still) activeAssetId = operatives[0].id;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	const activeOperative = $derived(operatives.find((o) => o.id === activeAssetId) ?? operatives[0] ?? null);

	$effect(() => {
		eventFeed;
		queueMicrotask(() => {
			const el = feedScrollRoot;
			if (!el) return;
			el.scrollTop = el.scrollHeight;
		});
	});

	function padNow() {
		const d = new Date();
		const h = String(d.getHours()).padStart(2, '0');
		const m = String(d.getMinutes()).padStart(2, '0');
		const s = String(d.getSeconds()).padStart(2, '0');
		return `${h}:${m}:${s}`;
	}

	function triggerIngestPulse() {
		ingestPulse = true;
		window.setTimeout(() => {
			ingestPulse = false;
		}, 140);
	}

	/**
	 * @param {string} actionType
	 * @param {ActionTone} tone
	 */
	function logTelemetryEvent(actionType, tone) {
		const op = activeOperative;
		if (!op) return;

		const ts = padNow();
		const line = `[${ts}] ${op.shortId} (${op.name}) >> ${actionType}`;

		eventFeed = [
			...eventFeed,
			{
				id:
					typeof crypto !== 'undefined' && crypto.randomUUID ?
						crypto.randomUUID()
					:	`ev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
				ts,
				line,
				tone,
			},
		];

		triggerIngestPulse();
	}

	/**
	 * @param {TelemetryActionDef} a
	 */
	function fireAction(a) {
		logTelemetryEvent(a.id, a.tone);
	}

	/**
	 * @param {ActionTone} tone
	 */
	function feedToneClass(tone) {
		if (tone === 'rose') return 'tw-text-rose-400';
		if (tone === 'amber') return 'tw-text-amber-400';
		return 'tw-text-emerald-400';
	}

	const clipPrimary =
		'tw-[clip-path:polygon(10%_0,100%_0,100%_70%,90%_100%,0_100%,0_30%)]';

	const padBtnEmerald = `tw-min-h-[3.25rem] tw-w-full tw-border-2 tw-border-emerald-500/60 tw-bg-emerald-600 tw-px-2 tw-py-3 tw-font-black tw-text-black tw-text-[10px] tw-tracking-widest tw-uppercase tw-transition-all hover:tw-scale-[1.02] hover:tw-shadow-[0_0_24px_rgba(52,211,153,0.45)] active:tw-scale-[0.98] disabled:tw-opacity-40 ${clipPrimary}`;

	const padBtnRose = `tw-min-h-[3.25rem] tw-w-full tw-border-2 tw-border-rose-500/60 tw-bg-rose-600 tw-px-2 tw-py-3 tw-font-black tw-text-white tw-text-[10px] tw-tracking-widest tw-uppercase tw-transition-all hover:tw-scale-[1.02] hover:tw-shadow-[0_0_30px_rgba(225,29,72,0.55)] active:tw-scale-[0.98] disabled:tw-opacity-40 ${clipPrimary}`;

	const padBtnAmber = `tw-min-h-[3.25rem] tw-w-full tw-border-2 tw-border-amber-500/60 tw-bg-amber-500 tw-px-2 tw-py-3 tw-font-black tw-text-black tw-text-[10px] tw-tracking-widest tw-uppercase tw-transition-all hover:tw-scale-[1.02] hover:tw-shadow-[0_0_24px_rgba(245,158,11,0.45)] active:tw-scale-[0.98] disabled:tw-opacity-40 ${clipPrimary}`;
</script>

<div
	class="tw-flex tw-min-h-[100dvh] tw-flex-col tw-bg-black tw-font-sans tw-text-slate-300 tw-selection:bg-cyan-500/30"
	class:matchLoggerPulse={ingestPulse}
>
	<div
		class="tw-pointer-events-none tw-fixed tw-inset-0 tw-z-0 tw-opacity-[0.07]"
		style="background-image: linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px); background-size: 48px 48px;"
		aria-hidden="true"
	></div>

	<header
		class="tw-relative tw-z-10 tw-border-b tw-border-cyan-500/30 tw-bg-black/80 tw-px-3 tw-py-3 tw-backdrop-blur-md tw-[clip-path:polygon(0_0,100%_0,100%_82%,96%_100%,0_100%)]"
	>
		<div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
			<div class="tw-min-w-0 tw-flex-1">
				<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-cyan-500 tw-uppercase">
					&gt;_ MATCH LOGGER · TELEMETRY INGEST
				</p>
				<h1 class="tw-truncate tw-text-sm tw-font-black tw-tracking-widest tw-text-white tw-uppercase">
					{activeTeamLabel}
				</h1>
			</div>
			<a
				href="/coach"
				class="tw-shrink-0 tw-bg-transparent tw-border tw-border-cyan-500/50 tw-px-4 tw-py-2 tw-font-black tw-text-xs tw-tracking-widest tw-text-cyan-400 tw-uppercase tw-transition-colors hover:tw-bg-cyan-500/10"
			>
				HUB
			</a>
		</div>

		<div class="tw-mt-3 tw--mx-1 tw-overflow-x-auto tw-pb-1 tw-pl-1">
			<div class="tw-flex tw-gap-2 tw-pr-3">
				{#if rosterLoading}
					<p class="tw-whitespace-nowrap tw-py-2 tw-font-mono tw-text-[10px] tw-text-slate-500">
						SYNCING ROSTER…
					</p>
				{:else}
					{#each operatives as op (op.id)}
						<button
							type="button"
							class="tw-flex tw-min-w-[5.5rem] tw-shrink-0 tw-snap-start tw-flex-col tw-items-center tw-gap-1 tw-border tw-bg-black/80 tw-px-2 tw-py-2 tw-transition-all tw-[clip-path:polygon(15%_0,100%_0,100%_85%,85%_100%,0_100%,0_15%)] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-cyan-400 {activeAssetId === op.id ?
								'tw-border-cyan-400 tw-shadow-[0_0_18px_rgba(6,182,212,0.35)]'
							:	'tw-border-slate-700 hover:tw-border-cyan-500/40'}"
							onclick={() => (activeAssetId = op.id)}
						>
							<div
								class="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-border tw-border-slate-700 tw-bg-black tw-font-mono tw-text-[10px] tw-font-black tw-text-cyan-400 tw-[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]"
							>
								{op.shortId.slice(0, 4)}
							</div>
							<span class="tw-line-clamp-2 tw-max-w-[5rem] tw-text-center tw-font-mono tw-text-[9px] tw-font-bold tw-tracking-wide tw-text-white">
								{op.name}
							</span>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</header>

	<section
		class="tw-relative tw-z-10 tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-px-3 tw-pb-3 tw-pt-2"
		aria-label="Telemetry event stream"
	>
		<div
			class="tw-mb-2 tw-flex tw-items-center tw-justify-between tw-border-b tw-border-white/5 tw-pb-2"
		>
			<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-500 tw-uppercase">
				{'>'}_ EVENT_FEED
			</span>
			<span class="tw-font-mono tw-text-[9px] tw-text-slate-600">LIVE · MOCK</span>
		</div>

		<div
			bind:this={feedScrollRoot}
			class="tw-mb-3 tw-min-h-[28vh] tw-max-h-[38vh] tw-flex-1 tw-overflow-y-auto tw-border tw-border-white/5 tw-bg-black/60 tw-px-2 tw-py-2 tw-font-mono tw-text-[10px] tw-leading-relaxed tw-backdrop-blur-md md:tw-max-h-[40vh]"
			role="log"
			aria-live="polite"
			aria-relevant="additions"
		>
			{#if eventFeed.length === 0}
				<p class="tw-py-6 tw-text-center tw-text-slate-600">AWAITING FIRST INGEST…</p>
			{:else}
				{#each eventFeed as entry (entry.id)}
					<div class="tw-break-words tw-border-l-2 tw-border-cyan-500/20 tw-pl-2 tw-font-mono tw-text-[10px] {feedToneClass(entry.tone)}">
						{entry.line}
					</div>
				{/each}
			{/if}
		</div>

		<div
			class="tw-mt-auto tw-border tw-border-slate-800 tw-bg-black/60 tw-p-3 tw-backdrop-blur-md tw-[clip-path:polygon(0_0,100%_0,100%_96%,96%_100%,0_100%)]"
			aria-label="Telemetry action pad"
		>
			<p class="tw-mb-2 tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-500 tw-uppercase">
				&gt;_ ACTION_PAD
			</p>

			<div class="tw-mb-3 tw-grid tw-grid-cols-2 tw-gap-2 sm:tw-grid-cols-3">
				{#each POSITIVE_ACTIONS as a (a.id)}
					<button
						type="button"
						class={padBtnEmerald}
						disabled={!activeOperative}
						onclick={() => fireAction(a)}
					>
						{a.label}
					</button>
				{/each}
			</div>

			<div class="tw-mb-3 tw-grid tw-grid-cols-2 tw-gap-2 sm:tw-grid-cols-3">
				{#each NEGATIVE_ACTIONS as a (a.id)}
					<button
						type="button"
						class={padBtnRose}
						disabled={!activeOperative}
						onclick={() => fireAction(a)}
					>
						{a.label}
					</button>
				{/each}
			</div>

			<div class="tw-grid tw-grid-cols-2 tw-gap-2">
				{#each CRITICAL_ACTIONS as a (a.id)}
					<button
						type="button"
						class={padBtnAmber}
						disabled={!activeOperative}
						onclick={() => fireAction(a)}
					>
						{a.label}
					</button>
				{/each}
			</div>
		</div>
	</section>
</div>

<style>
	@keyframes matchLoggerIngestPulse {
		0% {
			box-shadow: inset 0 0 0 0 rgba(6, 182, 212, 0);
		}
		40% {
			box-shadow: inset 0 0 32px 2px rgba(6, 182, 212, 0.22);
		}
		100% {
			box-shadow: inset 0 0 0 0 rgba(6, 182, 212, 0);
		}
	}

	:global(.matchLoggerPulse) {
		animation: matchLoggerIngestPulse 0.28s ease-out;
	}
</style>
