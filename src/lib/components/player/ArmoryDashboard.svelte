<!--
  ArmoryDashboard.svelte
  ──────────────────────
  Recruiter-facing roster view.  A full-page "data terminal" that renders a
  responsive holo-grid of VanguardCards and exposes a sticky Stark-tech
  command bar for searching, tier-filtering, and sorting.

  Architecture
  ────────────
  •  ROSTER   — static array of player descriptors.  Each entry owns an
     ArmoryEngine instance (the source of truth for XP, tier, and Scout's Six).
     The engine is passed down to VanguardCard via the `engine` prop so one
     live instance drives both the card visuals and the filter logic.

  •  Command bar — $state for searchQuery / tierFilter / sortKey.
     filteredRoster is a $derived.by() that reads engine getters, so it
     re-evaluates automatically whenever awardXP() mutates any engine.

  •  Tier filter buttons use --btn-accent CSS variables so each tier glows
     in its own colour (gray ROOKIE → violet PRO → amber ELITE → cyan VAN).

  XP / Tier distribution in the mock roster
  ──────────────────────────────────────────
  VANGUARD  (≥ 10 000 XP) :  Hunter 11 500,  Reilly 13 200
  ELITE     (5 000–9 999) :  Diallo 7 800,   Ferrari 6 100,  Espinoza 5 400
  PRO       (1 000–4 999) :  Morris 3 400,   Li 1 800
  ROOKIE    (0–999)       :  Vega 650
-->
<script lang="ts">
	import { ArmoryEngine, TIER_DEFINITIONS } from '$lib/states/ArmoryEngine.svelte';
	import VanguardCard from '$lib/components/player/VanguardCard.svelte';

	// ── Mock roster ───────────────────────────────────────────────────────
	// In production these rows would be hydrated from Firestore.  Each entry
	// carries identity fields (name / classification / number) plus a live
	// ArmoryEngine instance the VanguardCard consumes directly.
	const ROSTER = /** @type {const} */ ([
		{
			id: 'p001',
			name: 'ALEX HUNTER',
			classification: 'FORWARD',
			number: '9',
			engine: new ArmoryEngine({
				totalXP: 11_500,
				playerStats: { PAC: '24.1 MPH', ACC: '1.42s', AGI: '3.89s', STM: 'Lvl 22', POW: '38 in', VAN: '97' },
			}),
		},
		{
			id: 'p002',
			name: 'JAMES REILLY',
			classification: 'MIDFIELDER',
			number: '8',
			engine: new ArmoryEngine({
				totalXP: 13_200,
				playerStats: { PAC: '22.3 MPH', ACC: '1.55s', AGI: '4.02s', STM: 'Lvl 25', POW: '35 in', VAN: '96' },
			}),
		},
		{
			id: 'p003',
			name: 'OMAR DIALLO',
			classification: 'WINGER',
			number: '11',
			engine: new ArmoryEngine({
				totalXP: 7_800,
				playerStats: { PAC: '26.2 MPH', ACC: '1.31s', AGI: '3.78s', STM: 'Lvl 16', POW: '31 in', VAN: '91' },
			}),
		},
		{
			id: 'p004',
			name: 'LUCA FERRARI',
			classification: 'DEFENDER',
			number: '5',
			engine: new ArmoryEngine({
				totalXP: 6_100,
				playerStats: { PAC: '19.8 MPH', ACC: '1.68s', AGI: '4.45s', STM: 'Lvl 19', POW: '42 in', VAN: '88' },
			}),
		},
		{
			id: 'p005',
			name: 'SOFIA ESPINOZA',
			classification: 'ATTACKING MID',
			number: '10',
			engine: new ArmoryEngine({
				totalXP: 5_400,
				playerStats: { PAC: '21.7 MPH', ACC: '1.48s', AGI: '4.18s', STM: 'Lvl 14', POW: '30 in', VAN: '85' },
			}),
		},
		{
			id: 'p006',
			name: 'KADE MORRIS',
			classification: 'STRIKER',
			number: '20',
			engine: new ArmoryEngine({
				totalXP: 3_400,
				playerStats: { PAC: '23.0 MPH', ACC: '1.49s', AGI: '4.11s', STM: 'Lvl 12', POW: '33 in', VAN: '80' },
			}),
		},
		{
			id: 'p007',
			name: 'YUN LI',
			classification: 'GOALKEEPER',
			number: '1',
			engine: new ArmoryEngine({
				totalXP: 1_800,
				playerStats: { PAC: '18.5 MPH', ACC: '1.72s', AGI: '4.38s', STM: 'Lvl 9', POW: '44 in', VAN: '75' },
			}),
		},
		{
			id: 'p008',
			name: 'TOMAS VEGA',
			classification: 'DEFENDER',
			number: '3',
			engine: new ArmoryEngine({
				totalXP: 650,
				playerStats: { PAC: '17.2 MPH', ACC: '1.89s', AGI: '4.92s', STM: 'Lvl 5', POW: '28 in', VAN: '68' },
			}),
		},
	]);

	// ── Tier filter button definitions ────────────────────────────────────
	// Rendered highest-to-lowest so VANGUARD is the first filter a scout sees.
	const TIER_BTNS = [
		{ id: 'ALL', label: 'ALL', accent: '#00f0ff' },
		...[...TIER_DEFINITIONS].reverse().map((t) => ({ id: t.id, label: t.label, accent: t.accent })),
	];

	const SORT_OPTIONS = [
		{ value: 'VAN', label: 'VAN RATING ↓' },
		{ value: 'PAC', label: 'PACE ↓' },
		{ value: 'POW', label: 'POWER ↓' },
		{ value: 'XP', label: 'TOTAL XP ↓' },
	];

	// ── Command bar state ─────────────────────────────────────────────────
	let searchQuery = $state('');
	let tierFilter = $state('ALL');
	let sortKey = $state('VAN');

	// ── Per-tier player counts for the filter badge ───────────────────────
	const tierCounts = $derived.by(() => {
		/** @type {Record<string, number>} */
		const counts = { ALL: ROSTER.length };
		for (const t of TIER_DEFINITIONS) counts[t.id] = 0;
		for (const p of ROSTER) counts[p.engine.currentTier.id]++;
		return counts;
	});

	// ── Reactive filtered + sorted roster ────────────────────────────────
	// Reads engine getters ($state signals) so it re-evaluates whenever any
	// engine mutates (awardXP, updateStat, etc.).
	function parseStat(/** @type {string} */ str) {
		return parseFloat(str) || 0;
	}

	const filteredRoster = $derived.by(() => {
		let result = [...ROSTER];

		// 1. Name search
		const q = searchQuery.trim().toLowerCase();
		if (q) result = result.filter((p) => p.name.toLowerCase().includes(q));

		// 2. Tier filter
		if (tierFilter !== 'ALL') {
			result = result.filter((p) => p.engine.currentTier.id === tierFilter);
		}

		// 3. Sort (descending)
		result.sort((a, b) => {
			switch (sortKey) {
				case 'PAC':
					return parseStat(b.engine.playerStats.PAC) - parseStat(a.engine.playerStats.PAC);
				case 'POW':
					return parseStat(b.engine.playerStats.POW) - parseStat(a.engine.playerStats.POW);
				case 'XP':
					return b.engine.totalXP - a.engine.totalXP;
				case 'VAN':
				default:
					return parseStat(b.engine.playerStats.VAN) - parseStat(a.engine.playerStats.VAN);
			}
		});

		return result;
	});
</script>

<div class="ad-shell tw-min-h-screen tw-bg-[#010409] tw-text-white tw-font-mono">

	<!-- ── COMMAND BAR ──────────────────────────────────────────────────── -->
	<header
		class="tw-sticky tw-top-0 tw-z-50 tw-bg-[#010409]/90 tw-backdrop-blur-md tw-border-b tw-border-white/10 tw-p-4"
	>
		<!-- Title row -->
		<div class="tw-flex tw-items-center tw-justify-between tw-mb-4">
			<div>
				<p class="tw-text-[8px] tw-uppercase tw-tracking-[0.45em] tw-text-white/25">
					VANGUARD SYSTEM · SCOUT CLEARANCE ACTIVE
				</p>
				<h1 class="tw-text-[13px] tw-font-bold tw-uppercase tw-tracking-[0.3em] tw-text-white tw-mt-0.5">
					ARMORY <span class="tw-text-white/30">·</span> OPERATIVE ROSTER
				</h1>
			</div>
			<!-- Live unit count -->
			<span
				class="tw-tabular-nums tw-text-[9px] tw-font-mono tw-tracking-[0.35em] tw-text-white/30 tw-border tw-border-white/10 tw-rounded tw-px-2 tw-py-1"
			>
				{filteredRoster.length}<span class="tw-text-white/15">/{ROSTER.length}</span> UNITS
			</span>
		</div>

		<!-- Controls row -->
		<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-3">

			<!-- Search input -->
			<div class="ad-search-wrap tw-relative tw-flex-1 tw-min-w-[160px] tw-max-w-xs">
				<span
					class="tw-pointer-events-none tw-absolute tw-left-0 tw-top-1/2 -tw-translate-y-1/2 tw-text-white/20 tw-text-[11px]"
					aria-hidden="true"
				>⌕</span>
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<input
					id="ad-search"
					type="search"
					placeholder="SEARCH OPERATIVE…"
					bind:value={searchQuery}
					class="ad-search tw-w-full tw-bg-transparent tw-border-0 tw-border-b tw-border-white/15 tw-pl-5 tw-pr-0 tw-py-1.5 tw-text-[10px] tw-uppercase tw-tracking-[0.25em] tw-text-white tw-placeholder-white/20 focus:tw-outline-none tw-transition-colors tw-duration-200"
				/>
			</div>

			<!-- Tier filter pills -->
			<div class="tw-flex tw-items-center tw-gap-1 tw-flex-wrap" role="group" aria-label="Filter by tier">
				{#each TIER_BTNS as btn (btn.id)}
					<button
						class="ad-tier-btn"
						class:ad-tier-btn--active={tierFilter === btn.id}
						style:--btn-accent={btn.accent}
						onclick={() => (tierFilter = btn.id)}
						aria-pressed={tierFilter === btn.id}
					>
						{btn.label}
						{#if tierCounts[btn.id] !== undefined}
							<span class="ad-tier-btn__count">{tierCounts[btn.id]}</span>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Sort dropdown -->
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<select
				id="ad-sort"
				bind:value={sortKey}
				class="tw-bg-[#0a0e14] tw-border tw-border-white/12 tw-rounded tw-px-3 tw-py-1.5 tw-text-[9px] tw-uppercase tw-tracking-[0.3em] tw-text-white/55 tw-font-mono tw-cursor-pointer tw-transition-colors tw-duration-150 hover:tw-border-white/25 focus:tw-outline-none focus:tw-border-[#00f0ff]/40"
			>
				{#each SORT_OPTIONS as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>

		</div>
	</header>

	<!-- ── HOLO-GRID ────────────────────────────────────────────────────── -->
	<main class="ad-grid-wrap">
		<div
			class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 xl:tw-grid-cols-4 tw-gap-8 tw-p-8 tw-max-w-[1800px] tw-mx-auto"
		>
			{#each filteredRoster as player (player.id)}
				<VanguardCard
					engine={player.engine}
					name={player.name}
					classification={player.classification}
					number={player.number}
				/>
			{:else}
				<!-- Empty state -->
				<div
					class="tw-col-span-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-32 tw-text-white/20"
				>
					<span class="tw-text-6xl tw-mb-5 tw-leading-none" aria-hidden="true">⊘</span>
					<p class="tw-text-[11px] tw-uppercase tw-tracking-[0.45em]">NO OPERATIVES FOUND</p>
					<p class="tw-mt-2 tw-text-[9px] tw-tracking-[0.25em] tw-text-white/12">
						ADJUST FILTER PARAMETERS
					</p>
				</div>
			{/each}
		</div>
	</main>

</div>

<style>
	/* ──────────────────────────────────────────────────────────────────────
	   Dot-grid background: a subtle repeating radial pattern gives the
	   page a holographic display texture without an image asset.
	   ────────────────────────────────────────────────────────────────────── */
	.ad-grid-wrap {
		background-image: radial-gradient(circle, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
		background-size: 28px 28px;
	}

	/* ── Search input ─────────────────────────────────────────────────── */
	.ad-search:focus {
		border-bottom-color: rgba(0, 240, 255, 0.5);
	}

	/* Webkit browsers show a built-in clear button in search inputs; hide it
	   so it doesn't break the minimal look. */
	.ad-search::-webkit-search-cancel-button {
		display: none;
	}

	/* ── Tier filter buttons ──────────────────────────────────────────── */
	.ad-tier-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 10px;
		border-radius: 3px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: transparent;
		color: rgba(255, 255, 255, 0.3);
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background 0.15s ease,
			box-shadow 0.15s ease;
	}

	.ad-tier-btn:hover {
		color: rgba(255, 255, 255, 0.6);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.ad-tier-btn--active {
		color: var(--btn-accent, #00f0ff);
		border-color: var(--btn-accent, #00f0ff);
		background: color-mix(in srgb, var(--btn-accent, #00f0ff) 10%, transparent);
		box-shadow: 0 0 14px color-mix(in srgb, var(--btn-accent, #00f0ff) 18%, transparent);
	}

	/* Small numeric badge inside each tier button */
	.ad-tier-btn__count {
		font-size: 8px;
		letter-spacing: 0;
		opacity: 0.55;
	}

	.ad-tier-btn--active .ad-tier-btn__count {
		opacity: 0.8;
	}
</style>
