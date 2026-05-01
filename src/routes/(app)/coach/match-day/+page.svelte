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
	 * @typedef {'emerald' | 'rose' | 'cyan'} PadTone
	 * @typedef {{ id: string; label: string; tone: PadTone }} TelemetryPadDef
	 * @typedef {{ id: string; matchTs: string; line: string; tone: PadTone }} FeedLine
	 */

	/** Strict Arc Reactor grid: 2×3 — order row-major */
	const TELEMETRY_PAD = /** @type {const} */ ([
		{ id: 'GOAL', label: 'GOAL', tone: 'emerald' },
		{ id: 'SHOT_ON_TARGET', label: 'SHOT ON TARGET', tone: 'emerald' },
		{ id: 'TACKLE_WON', label: 'TACKLE WON', tone: 'emerald' },
		{ id: 'FOUL', label: 'FOUL', tone: 'rose' },
		{ id: 'TURNOVER', label: 'TURNOVER', tone: 'rose' },
		{ id: 'PASS_COMPLETED', label: 'PASS COMPLETED', tone: 'cyan' },
	]);

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
		return n ? n.toUpperCase() : 'AGGIES FC';
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

	/** Active asset for next telemetry log */
	let activeTarget = $state(/** @type {string | null} */ (null));

	let homeScore = $state(2);
	let awayScore = $state(1);

	/** Match elapsed seconds (live sideline clock) */
	let elapsedSeconds = $state(0);

	/** @type {FeedLine[]} */
	let eventFeed = $state([]);

	let ingestPulse = $state(false);
	let feedScrollRoot = $state(/** @type {HTMLDivElement | undefined} */ (undefined));

	/** @type {string | null} */
	let flashActionId = $state(null);

	$effect(() => {
		if (!browser) return;
		const id = window.setInterval(() => {
			elapsedSeconds += 1;
		}, 1000);
		return () => window.clearInterval(id);
	});

	$effect(() => {
		if (!browser || authStore.isLoading || !authStore.isAuthenticated) return;

		const tid = selectedTeamId?.trim();
		if (!tid) {
			operatives = MOCK_OPERATIVES.slice();
			activeTarget = operatives[0]?.id ?? null;
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
				const still = operatives.some((o) => o.id === activeTarget);
				if (!still) activeTarget = operatives[0].id;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	const activeOperative = $derived(
		operatives.find((o) => o.id === activeTarget) ?? operatives[0] ?? null,
	);

	const matchClockDisplay = $derived.by(() => {
		const t = Math.max(0, elapsedSeconds);
		const m = Math.floor(t / 60);
		const s = t % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	});

	$effect(() => {
		eventFeed;
		queueMicrotask(() => {
			const el = feedScrollRoot;
			if (!el) return;
			el.scrollTop = el.scrollHeight;
		});
	});

	function formatMatchTs(totalSeconds) {
		const t = Math.max(0, totalSeconds);
		const m = Math.floor(t / 60);
		const s = t % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	function triggerIngestPulse() {
		ingestPulse = true;
		window.setTimeout(() => {
			ingestPulse = false;
		}, 140);
	}

	function flashTelemetryButton(actionId) {
		flashActionId = actionId;
		window.setTimeout(() => {
			flashActionId = null;
		}, 220);
	}

	/**
	 * @param {string} actionType
	 * @param {PadTone} tone
	 */
	function logTelemetryEvent(actionType, tone) {
		const op = activeOperative;
		if (!op) return;

		const matchTs = formatMatchTs(elapsedSeconds);
		const tag = operativeTelemetryTag(op);
		const line = `[${matchTs}] ${tag} >> ${actionType}`;

		eventFeed = [
			...eventFeed,
			{
				id:
					typeof crypto !== 'undefined' && crypto.randomUUID ?
						crypto.randomUUID()
					:	`ev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
				matchTs,
				line,
				tone,
			},
		];

		if (actionType === 'GOAL') homeScore += 1;

		triggerIngestPulse();
	}

	/**
	 * @param {TelemetryPadDef} a
	 */
	function fireAction(a) {
		logTelemetryEvent(a.id, a.tone);
		flashTelemetryButton(a.id);
	}

	function stripAbbr(op) {
		return op.role.slice(0, 3).toUpperCase();
	}

	/** Stable OP-XX tag for feed (mock uses OP-01; long ids map by roster order). */
	function operativeTelemetryTag(op) {
		const raw = op.shortId.trim();
		if (/^OP-\d{1,2}$/i.test(raw)) {
			const n = raw.match(/^OP-(\d{1,2})$/i)?.[1] ?? '0';
			return `OP-${n.padStart(2, '0')}`;
		}
		const i = operatives.findIndex((x) => x.id === op.id);
		return i >= 0 ? `OP-${String(i + 1).padStart(2, '0')}` : 'OP-??';
	}

	function rosterGlyph(op) {
		const t = operativeTelemetryTag(op);
		const m = /^OP-(\d{2})$/i.exec(t);
		return m ? m[1] : t.replace(/^OP-?/i, '').slice(0, 2).toUpperCase();
	}

	/**
	 * @param {number} idx
	 */
	function feedLineOpacity(idx) {
		const n = eventFeed.length;
		if (n <= 1) return 1;
		return 0.28 + 0.72 * (idx / Math.max(n - 1, 1));
	}

	/**
	 * @param {FeedLine} entry
	 * @param {number} idx
	 */
	function feedLineToneClass(entry, idx) {
		const n = eventFeed.length;
		const isLatest = n > 0 && idx === n - 1;
		if (isLatest) {
			return 'tw-font-mono tw-text-[11px] tw-leading-snug tw-tracking-wide tw-text-cyan-300 tw-drop-shadow-[0_0_10px_rgba(0, 240, 255,0.55)]';
		}
		const muted =
			entry.tone === 'rose' ? 'tw-text-rose-600/45'
			: entry.tone === 'cyan' ? 'tw-text-slate-600'
			: 'tw-text-slate-600';
		return `tw-font-mono tw-text-[11px] tw-leading-snug tw-tracking-wide ${muted}`;
	}

	/**
	 * @param {PadTone} tone
	 */
	function padFlashShadow(tone) {
		if (tone === 'emerald') return 'tw-shadow-[0_0_30px_rgba(52,211,153,0.95)]';
		if (tone === 'rose') return 'tw-shadow-[0_0_30px_rgba(244,63,94,0.95)]';
		return 'tw-shadow-[0_0_30px_rgba(0, 240, 255,0.95)]';
	}

	/** .cursorrules PRIMARY-style clipped tactical buttons */
	const clipPrimary =
		'tw-[clip-path:polygon(10%_0,100%_0,100%_70%,90%_100%,0_100%,0_30%)]';

	const padBtnEmerald = `tw-min-h-[4.25rem] tw-w-full tw-border-2 tw-border-emerald-500/65 tw-bg-emerald-500 tw-px-2 tw-py-3 tw-font-black tw-text-black tw-text-[11px] tw-tracking-widest tw-uppercase tw-transition-all hover:tw-scale-[1.02] hover:tw-shadow-[0_0_24px_rgba(52,211,153,0.5)] active:tw-scale-[0.98] disabled:tw-opacity-40 ${clipPrimary}`;

	const padBtnRose = `tw-min-h-[4.25rem] tw-w-full tw-border-2 tw-border-rose-500/65 tw-bg-rose-600 tw-px-2 tw-py-3 tw-font-black tw-text-white tw-text-[11px] tw-tracking-widest tw-uppercase tw-transition-all hover:tw-scale-[1.02] hover:tw-shadow-[0_0_28px_rgba(244,63,94,0.55)] active:tw-scale-[0.98] disabled:tw-opacity-40 ${clipPrimary}`;

	const padBtnCyan = `tw-min-h-[4.25rem] tw-w-full tw-border-2 tw-border-cyan-400/65 tw-bg-cyan-500 tw-px-2 tw-py-3 tw-font-black tw-text-black tw-text-[11px] tw-tracking-widest tw-uppercase tw-transition-all hover:tw-scale-[1.02] hover:tw-shadow-[0_0_24px_rgba(0, 240, 255,0.55)] active:tw-scale-[0.98] disabled:tw-opacity-40 ${clipPrimary}`;

	/**
	 * @param {TelemetryPadDef} a
	 */
	function padBtnClass(a) {
		const base =
			a.tone === 'emerald' ? padBtnEmerald
			: a.tone === 'rose' ? padBtnRose
			: padBtnCyan;
		const flash = flashActionId === a.id ? padFlashShadow(a.tone) : '';
		return `${base} ${flash}`;
	}
</script>

<div
	class="tw-relative tw-mx-auto tw-flex tw-h-screen tw-max-w-md tw-flex-col tw-overflow-hidden tw-bg-[#020617] tw-font-sans tw-text-slate-300 tw-selection:bg-cyan-500/30"
	class:matchLoggerPulse={ingestPulse}
>
	<!-- Deep space grid -->
	<div
		class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-0 tw-bg-[radial-gradient(ellipse_at_50%_0%,rgba(0, 240, 255,0.08)_0%,transparent_55%)]"
		aria-hidden="true"
	></div>
	<div
		class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-0 tw-opacity-[0.14]"
		style="background-image: linear-gradient(rgba(15, 23, 42, 0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.9) 1px, transparent 1px); background-size: 32px 32px;"
		aria-hidden="true"
	></div>

	<a
		href="/coach"
		class="tw-absolute tw-right-3 tw-top-3 tw-z-[50] tw-rounded-md tw-border tw-border-cyan-500/40 tw-bg-black/50 tw-px-2.5 tw-py-1.5 tw-font-mono tw-text-[9px] tw-font-black tw-tracking-widest tw-text-cyan-400 tw-backdrop-blur-sm tw-transition-colors hover:tw-border-cyan-400 hover:tw-bg-cyan-950/40 hover:tw-text-cyan-200"
	>
		HUB
	</a>

	<!-- Top viewport ~15% — clock & score -->
	<header
		class="tw-relative tw-z-10 tw-flex tw-shrink-0 tw-basis-[15%] tw-min-h-0 tw-flex-col tw-items-center tw-justify-center tw-border-b tw-border-cyan-500/20 tw-px-4 tw-pt-10 tw-pb-2"
	>
		<p
			class="tw-mb-1 tw-font-mono tw-text-[9px] tw-tracking-[0.28em] tw-text-slate-500 tw-uppercase"
		>
			Live match clock
		</p>
		<p
			class="tw-font-mono tw-text-5xl tw-font-black tw-tabular-nums tw-tracking-tight tw-text-cyan-300 tw-drop-shadow-[0_0_24px_rgba(0, 240, 255,0.55)] sm:tw-text-6xl"
			aria-live="polite"
		>
			{matchClockDisplay}
		</p>
		<p class="tw-mt-2 tw-max-w-full tw-truncate tw-text-center tw-font-mono tw-text-xs tw-font-black tw-tracking-[0.14em] tw-text-white tw-uppercase">
			{activeTeamLabel}
			<span class="tw-tabular-nums tw-text-cyan-400"> {homeScore} </span>
			<span class="tw-text-slate-500">—</span>
			<span class="tw-tabular-nums tw-text-rose-300"> {awayScore} </span>
			<span class="tw-text-slate-400"> ENEMY</span>
		</p>
	</header>

	<!-- Middle viewport ~35% — holographic feed -->
	<section
		class="tw-relative tw-z-10 tw-flex tw-min-h-0 tw-shrink-0 tw-basis-[35%] tw-flex-col tw-px-3 tw-pt-2"
		aria-label="Telemetry event stream"
	>
		<p class="tw-mb-1 tw-font-mono tw-text-[8px] tw-tracking-[0.24em] tw-text-slate-600 tw-uppercase">
			Event stream
		</p>
		<div
			class="tw-relative tw-min-h-0 tw-flex-1 tw-overflow-hidden tw-rounded-lg tw-border tw-border-white/[0.06] tw-bg-black/40"
		>
			<div
				bind:this={feedScrollRoot}
				class="telemetry-feed-mask tw-h-full tw-overflow-y-auto tw-px-3 tw-py-3 tw-font-mono tw-leading-relaxed"
				role="log"
				aria-live="polite"
				aria-relevant="additions"
			>
				{#if eventFeed.length === 0}
					<p class="tw-py-8 tw-text-center tw-font-mono tw-text-[10px] tw-text-slate-600">
						AWAITING FIRST INGEST…
					</p>
				{:else}
					{#each eventFeed as entry, idx (entry.id)}
						<div
							style="opacity: {feedLineOpacity(idx)}"
							class="tw-mb-2 tw-break-words tw-border-l-2 tw-border-cyan-500/15 tw-pl-2 {feedLineToneClass(entry, idx)}"
						>
							{entry.line}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</section>

	<!-- Arc Reactor pad ~50% thumb zone -->
	<div
		class="tw-relative tw-z-10 tw-mt-auto tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-rounded-t-3xl tw-border-t tw-border-cyan-500/30 tw-bg-[#020617]/80 tw-p-4 tw-backdrop-blur-xl"
		aria-label="Telemetry control pad"
	>
		<p class="tw-mb-2 tw-font-mono tw-text-[8px] tw-tracking-[0.22em] tw-text-slate-500 tw-uppercase">
			Asset selector
		</p>
		<div
			class="telemetry-roster-strip tw-mb-4 tw-flex tw-gap-3 tw-overflow-x-auto tw-overflow-y-visible tw-py-3 tw-px-1"
			role="tablist"
			aria-label="Select active player"
		>
			{#if rosterLoading}
				<p class="tw-whitespace-nowrap tw-py-3 tw-font-mono tw-text-[10px] tw-text-slate-500">
					SYNCING…
				</p>
			{:else}
				{#each operatives as op (op.id)}
					<button
						type="button"
						role="tab"
						class="tw-relative tw-flex tw-h-14 tw-w-14 tw-shrink-0 tw-flex-col tw-items-center tw-justify-center tw-rounded-full tw-border-2 tw-bg-black/70 tw-transition-[box-shadow,border-color] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-cyan-400 {						activeTarget ===
						op.id ?
							'tw-border-cyan-400 tw-shadow-[0_0_28px_rgba(0, 240, 255,0.95),0_0_48px_rgba(0, 240, 255,0.35)]'
						:	'tw-border-white/10 hover:tw-border-cyan-500/35'}"
						aria-selected={activeTarget === op.id}
						aria-label="Target {op.name}"
						onclick={() => (activeTarget = op.id)}
					>
						<span class="tw-font-mono tw-text-[11px] tw-font-black tw-tabular-nums tw-text-white">
							{rosterGlyph(op)}
						</span>
						<span class="tw-mt-px tw-font-mono tw-text-[7px] tw-tabular-nums tw-tracking-wide tw-text-slate-500">
							{stripAbbr(op)}
						</span>
					</button>
				{/each}
			{/if}
		</div>

		<p class="tw-mb-2 tw-font-mono tw-text-[8px] tw-tracking-[0.22em] tw-text-slate-500 tw-uppercase">
			Telemetry triggers
		</p>
		<div class="tw-grid tw-min-h-0 tw-grid-cols-3 tw-gap-2 tw-gap-y-3">
			{#each TELEMETRY_PAD as a (a.id)}
				<button
					type="button"
					class={padBtnClass(a)}
					disabled={!activeOperative}
					onclick={() => fireAction(a)}
				>
					{a.label}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	@keyframes matchLoggerIngestPulse {
		0% {
			box-shadow: inset 0 0 0 0 rgba(0, 240, 255, 0);
		}
		40% {
			box-shadow: inset 0 0 36px 3px rgba(0, 240, 255, 0.28);
		}
		100% {
			box-shadow: inset 0 0 0 0 rgba(0, 240, 255, 0);
		}
	}

	:global(.matchLoggerPulse) {
		animation: matchLoggerIngestPulse 0.28s ease-out;
	}

	.telemetry-feed-mask {
		mask-image: linear-gradient(to bottom, transparent, black 40%);
		-webkit-mask-image: linear-gradient(to bottom, transparent, black 40%);
	}

	.telemetry-roster-strip {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.telemetry-roster-strip::-webkit-scrollbar {
		display: none;
	}
</style>
