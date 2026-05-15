<!--
  ProvingGrounds.svelte
  ─────────────────────
  Data-entry terminal where athletes submit performance metrics to earn XP.

  Architecture
  ────────────
  •  DRILLS  — static catalogue of six athletic tests.  Each drill maps to
     exactly one ScoutsSix stat key, carries its own XP bounty and a
     "performance bonus" threshold that awards extra XP for elite numbers.

  •  Submission flow:
       1. Athlete picks a drill from the Mission Board.
       2. Enters a numeric result in the Submission Terminal.
       3. On submit → armory.updateStat(statKey, formatted) +
                       armory.awardXP(baseXP + bonusXP, reason)
       4. A success flash fires; the input resets; the XP bar on any
          linked VanguardCard reacts automatically (same engine instance).

  •  `engine` prop: pass an ArmoryEngine from the parent so the workout
     data writes into the live card state.  Falls back to a demo engine
     for standalone development/preview use.

  •  Pure Svelte 5 runes: $state, $derived, $derived.by, $effect.
     No framework outside the project's standard stack.
-->
<script lang="ts">
	import { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte';

	// ── Drill catalogue ───────────────────────────────────────────────────
	/**
	 * @typedef {{
	 *   id: string;
	 *   label: string;
	 *   description: string;
	 *   category: string;
	 *   categoryAccent: string;
	 *   statKey: import('$lib/states/ArmoryEngine.svelte').ScoutsSix extends Record<infer K, string> ? K : never;
	 *   unit: string;
	 *   placeholder: string;
	 *   inputMin: number;
	 *   inputMax: number;
	 *   baseXP: number;
	 *   bonusXP: number;
	 *   bonusThreshold: number;
	 *   higherIsBetter: boolean;
	 *   format: (v: number) => string;
	 * }} Drill
	 */

	/** @type {readonly Drill[]} */
	const DRILLS = Object.freeze([
		{
			id: 'sprint-30m',
			label: '30M SPRINT',
			description:
				'Top-end velocity over 30 metres from a stationary start. Measures pure speed ceiling.',
			category: 'SPEED',
			categoryAccent: '#14b8a6',
			statKey: /** @type {const} */ ('PAC'),
			unit: 'MPH',
			placeholder: 'e.g. 24.1',
			inputMin: 5,
			inputMax: 40,
			baseXP: 350,
			bonusXP: 150,
			bonusThreshold: 22,
			higherIsBetter: true,
			format: (v) => `${v.toFixed(1)} MPH`,
		},
		{
			id: 'accel-test',
			label: 'ACCELERATION TEST',
			description:
				'Time from stationary to first full stride. Lower is faster — measures explosive first step.',
			category: 'SPEED',
			categoryAccent: '#14b8a6',
			statKey: /** @type {const} */ ('ACC'),
			unit: 's',
			placeholder: 'e.g. 1.48',
			inputMin: 0.5,
			inputMax: 3.5,
			baseXP: 300,
			bonusXP: 100,
			bonusThreshold: 1.5,
			higherIsBetter: false,
			format: (v) => `${v.toFixed(2)}s`,
		},
		{
			id: 'shuttle-5-10-5',
			label: '5-10-5 SHUTTLE',
			description:
				'Change-of-direction agility across a 20-yard course. Lateral quickness and deceleration.',
			category: 'AGILITY',
			categoryAccent: '#a78bfa',
			statKey: /** @type {const} */ ('AGI'),
			unit: 's',
			placeholder: 'e.g. 4.12',
			inputMin: 3,
			inputMax: 6.5,
			baseXP: 250,
			bonusXP: 100,
			bonusThreshold: 4.2,
			higherIsBetter: false,
			format: (v) => `${v.toFixed(2)}s`,
		},
		{
			id: 'stamina-protocol',
			label: 'STAMINA PROTOCOL',
			description:
				'Progressive aerobic threshold test. Enter the level reached before failure.',
			category: 'ENDURANCE',
			categoryAccent: '#4ade80',
			statKey: /** @type {const} */ ('STM'),
			unit: 'LVL',
			placeholder: 'e.g. 18',
			inputMin: 1,
			inputMax: 40,
			baseXP: 400,
			bonusXP: 150,
			bonusThreshold: 15,
			higherIsBetter: true,
			format: (v) => `Lvl ${Math.round(v)}`,
		},
		{
			id: 'broad-jump',
			label: 'STANDING BROAD JUMP',
			description:
				'Explosive lower-body power output. Maximum horizontal distance from a standing two-foot takeoff.',
			category: 'POWER',
			categoryAccent: '#fb923c',
			statKey: /** @type {const} */ ('POW'),
			unit: 'IN',
			placeholder: 'e.g. 38',
			inputMin: 10,
			inputMax: 80,
			baseXP: 300,
			bonusXP: 150,
			bonusThreshold: 34,
			higherIsBetter: true,
			format: (v) => `${Math.round(v)} in`,
		},
		{
			id: 'combine-composite',
			label: 'COMBINE COMPOSITE',
			description:
				'Full scouting composite score synthesising all six field metrics into the VAN Rating (0–100).',
			category: 'COMPOSITE',
			categoryAccent: '#fbbf24',
			statKey: /** @type {const} */ ('VAN'),
			unit: 'PTS',
			placeholder: 'e.g. 94',
			inputMin: 0,
			inputMax: 100,
			baseXP: 500,
			bonusXP: 250,
			bonusThreshold: 85,
			higherIsBetter: true,
			format: (v) => `${Math.round(v)}`,
		},
	]);

	// ── Props ─────────────────────────────────────────────────────────────
	/**
	 * @type {{
	 *   engine?: import('$lib/states/ArmoryEngine.svelte').ArmoryEngine;
	 *   class?: string;
	 * }}
	 */
	let { engine: externalEngine = undefined, class: extraClass = '' } = $props();

	const _demoEngine = new ArmoryEngine({ totalXP: 3_400 });
	const armory = $derived(externalEngine ?? _demoEngine);

	// ── UI state ──────────────────────────────────────────────────────────
	let selectedDrillId = $state(DRILLS[0].id);
	let inputValue = $state('');
	/** @type {'idle' | 'success' | 'error'} */
	let submitState = $state('idle');
	let lastAwardedXP = $state(0);

	// ── Derived values ────────────────────────────────────────────────────
	const selectedDrill = $derived(
		DRILLS.find((d) => d.id === selectedDrillId) ?? DRILLS[0]
	);

	const numInput = $derived(parseFloat(inputValue));

	const isInputValid = $derived(
		inputValue.trim() !== '' &&
			!isNaN(numInput) &&
			numInput >= selectedDrill.inputMin &&
			numInput <= selectedDrill.inputMax
	);

	// Whether the current input value earns the performance bonus.
	const bonusEarned = $derived(
		isInputValid &&
			(selectedDrill.higherIsBetter
				? numInput >= selectedDrill.bonusThreshold
				: numInput <= selectedDrill.bonusThreshold)
	);

	// Live XP preview (re-evaluates every keystroke).
	const previewXP = $derived(
		isInputValid ? selectedDrill.baseXP + (bonusEarned ? selectedDrill.bonusXP : 0) : selectedDrill.baseXP
	);

	// ── Side-effects ──────────────────────────────────────────────────────
	// Auto-reset success/error feedback after 2.5 s.
	$effect(() => {
		if (submitState === 'idle') return;
		const t = setTimeout(() => {
			submitState = 'idle';
		}, 2500);
		return () => clearTimeout(t);
	});

	// Clear input value when the selected drill changes.
	$effect(() => {
		selectedDrillId; // subscribe to drill change
		inputValue = '';
		submitState = 'idle';
	});

	// ── Submission handler ────────────────────────────────────────────────
	function handleSubmit() {
		if (!isInputValid) {
			submitState = 'error';
			return;
		}

		const xp = previewXP;
		armory.updateStat(selectedDrill.statKey, selectedDrill.format(numInput));
		armory.awardXP(xp, `Drill Completion: ${selectedDrill.label}`);

		lastAwardedXP = xp;
		inputValue = '';
		submitState = 'success';
	}

	/**
	 * Format the performance-bonus threshold text shown under the XP preview.
	 * @param {Drill} drill
	 */
	function bonusHint(drill) {
		const op = drill.higherIsBetter ? '≥' : '≤';
		const val = drill.unit ? `${drill.bonusThreshold} ${drill.unit}` : String(drill.bonusThreshold);
		return `${op} ${val} UNLOCKS +${drill.bonusXP} XP PERFORMANCE BONUS`;
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="pg-shell tw-font-mono tw-text-white {extraClass}">

	<!-- ── PAGE HEADER ─────────────────────────────────────────────────── -->
	<div class="tw-px-6 tw-pt-6 tw-pb-4 tw-border-b tw-border-white/8">
		<p class="tw-text-[8px] tw-uppercase tw-tracking-[0.5em] tw-text-white/25">
			VANGUARD SYSTEM · FIELD OPERATIONS
		</p>
		<h1 class="tw-mt-0.5 tw-text-[14px] tw-font-bold tw-uppercase tw-tracking-[0.3em] tw-text-white">
			PROVING GROUNDS
			<span class="tw-text-white/30">·</span>
			PERFORMANCE TERMINAL
		</h1>
		<!-- Live tier indicator -->
		<div class="tw-mt-2 tw-flex tw-items-center tw-gap-2">
			<span
				class="tw-text-[9px] tw-uppercase tw-tracking-[0.3em]"
				style:color={armory.currentTier.accent}
			>
				{armory.currentTier.label}
			</span>
			<span class="tw-text-white/20 tw-text-[9px]">·</span>
			<span class="tw-text-[9px] tw-text-white/35 tw-tracking-[0.2em]">
				{armory.totalXP.toLocaleString()} XP
			</span>
			{#if armory.nextTier}
				<span class="tw-text-white/20 tw-text-[9px]">·</span>
				<span class="tw-text-[9px] tw-text-white/25 tw-tracking-[0.15em]">
					{armory.xpRequired.toLocaleString()} TO {armory.nextTier.label}
				</span>
			{:else}
				<span class="tw-text-[9px] tw-tracking-[0.2em]" style:color={armory.currentTier.accent}>
					MAX TIER REACHED
				</span>
			{/if}
		</div>
	</div>

	<!-- ── DUAL PANE ──────────────────────────────────────────────────── -->
	<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-[300px_1fr] tw-gap-0 tw-min-h-0">

		<!-- ── LEFT: MISSION BOARD ──────────────────────────────────────── -->
		<aside
			class="pg-mission-board tw-border-b md:tw-border-b-0 md:tw-border-r tw-border-white/8 tw-overflow-y-auto"
		>
			<div class="tw-px-4 tw-py-3 tw-border-b tw-border-white/6">
				<p class="tw-text-[8px] tw-uppercase tw-tracking-[0.45em] tw-text-white/30">
					MISSION BOARD · {DRILLS.length} ACTIVE DRILLS
				</p>
			</div>

			<ul class="tw-py-2" role="listbox" aria-label="Athletic drills">
				{#each DRILLS as drill (drill.id)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<li
						class="pg-drill-item"
						class:pg-drill-item--active={selectedDrillId === drill.id}
						style:--drill-accent={drill.categoryAccent}
						role="option"
						aria-selected={selectedDrillId === drill.id}
						onclick={() => (selectedDrillId = drill.id)}
					>
						<!-- Left accent bar (active only, via CSS) -->
						<div class="tw-flex tw-items-start tw-gap-3 tw-flex-1 tw-min-w-0">
							<!-- Stat key badge -->
							<span
								class="pg-stat-badge tw-shrink-0 tw-mt-0.5"
								style:color={drill.categoryAccent}
								style:border-color="{drill.categoryAccent}44"
								style:background="{drill.categoryAccent}0f"
							>
								{drill.statKey}
							</span>
							<div class="tw-min-w-0 tw-flex-1">
								<p
									class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.22em] tw-truncate {selectedDrillId === drill.id ? 'tw-text-white' : 'tw-text-white/55'}"
								>
									{drill.label}
								</p>
								<p class="tw-text-[8px] tw-tracking-[0.12em] tw-text-white/25 tw-mt-0.5">
									{drill.category} · {drill.baseXP}+ XP
								</p>
							</div>
						</div>
						<!-- Arrow indicator -->
						<span
							class="tw-text-[10px] tw-shrink-0 tw-self-center tw-transition-opacity tw-duration-150"
							class:tw-opacity-100={selectedDrillId === drill.id}
							class:tw-opacity-0={selectedDrillId !== drill.id}
							style:color={drill.categoryAccent}
							aria-hidden="true"
						>▶</span>
					</li>
				{/each}
			</ul>
		</aside>

		<!-- ── RIGHT: SUBMISSION TERMINAL ──────────────────────────────── -->
		<section class="pg-terminal tw-relative tw-overflow-hidden tw-p-6 md:tw-p-8">
			<!-- Subtle scanning-line overlay (pure CSS, pointer-events: none) -->
			<div class="pg-scanline" aria-hidden="true"></div>

			<!-- Corner brackets (aesthetic only) -->
			<span class="pg-bracket pg-bracket--tl" aria-hidden="true"></span>
			<span class="pg-bracket pg-bracket--tr" aria-hidden="true"></span>
			<span class="pg-bracket pg-bracket--bl" aria-hidden="true"></span>
			<span class="pg-bracket pg-bracket--br" aria-hidden="true"></span>

			<!-- Drill header -->
			<div class="tw-mb-6">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-3">
					<span
						class="pg-cat-pill"
						style:color={selectedDrill.categoryAccent}
						style:border-color="{selectedDrill.categoryAccent}55"
						style:background="{selectedDrill.categoryAccent}12"
					>
						{selectedDrill.category}
					</span>
					<span
						class="pg-cat-pill"
						style:color={selectedDrill.categoryAccent}
						style:border-color="{selectedDrill.categoryAccent}30"
						style:background="transparent"
					>
						{selectedDrill.statKey} ← WRITE TARGET
					</span>
				</div>

				<h2
					class="tw-text-[18px] tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-white tw-mb-2"
				>
					{selectedDrill.label}
				</h2>
				<p class="tw-text-[10px] tw-leading-relaxed tw-tracking-[0.1em] tw-text-white/35 tw-max-w-lg">
					{selectedDrill.description}
				</p>
			</div>

			<!-- ── INPUT FORM ──────────────────────────────────────────── -->
			<form
				class="tw-space-y-8"
				onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}
			>
				<!-- Measurement input -->
				<div class="tw-relative">
					<div class="tw-flex tw-items-end tw-gap-4">
						<!-- The large terminal-style number input -->
						<div class="tw-flex-1 tw-relative">
						<label
							for="pg-input"
							class="tw-block tw-text-[8px] tw-uppercase tw-tracking-[0.45em] tw-mb-3 {submitState === 'success' ? 'tw-text-[#2dd4bf]' : submitState === 'error' ? 'tw-text-[#ff4444]' : 'tw-text-white/30'}"
						>
								{#if submitState === 'success'}
									◉ METRIC ENCRYPTED · DATA SECURE
								{:else if submitState === 'error'}
									⚠ INVALID INPUT — CHECK RANGE [{selectedDrill.inputMin}–{selectedDrill.inputMax} {selectedDrill.unit}]
								{:else}
									ENTER MEASUREMENT
								{/if}
							</label>
							<input
								id="pg-input"
								type="number"
								step="any"
								min={selectedDrill.inputMin}
								max={selectedDrill.inputMax}
								placeholder={selectedDrill.placeholder}
								bind:value={inputValue}
								class="pg-input"
								class:pg-input--success={submitState === 'success'}
								class:pg-input--error={submitState === 'error'}
								autocomplete="off"
							/>
						</div>
						<!-- Unit label -->
						<div class="tw-pb-3 tw-shrink-0">
							<span
								class="tw-text-[22px] tw-font-bold tw-tracking-[0.15em]"
								style:color="{selectedDrill.categoryAccent}60"
							>
								{selectedDrill.unit}
							</span>
						</div>
					</div>

					<!-- Input underline (rendered via CSS, not border) -->
				</div>

				<!-- ── XP PREVIEW ──────────────────────────────────────── -->
				<div class="tw-space-y-2">
					<!-- Main XP reward line -->
					<div class="tw-flex tw-items-baseline tw-gap-3">
						<span
							class="tw-text-[11px] tw-uppercase tw-tracking-[0.35em] tw-text-white/25"
						>DRILL YIELD</span>
						<span
							class="tw-text-[28px] tw-font-bold tw-tabular-nums tw-leading-none"
							style:color={bonusEarned ? selectedDrill.categoryAccent : 'rgba(255,255,255,0.5)'}
							style:filter={bonusEarned ? `drop-shadow(0 0 10px ${selectedDrill.categoryAccent}99)` : 'none'}
						>
							+{previewXP.toLocaleString()}
						</span>
						<span class="tw-text-[13px] tw-tracking-[0.2em] tw-text-white/35">XP</span>

						<!-- Performance bonus badge -->
						{#if bonusEarned}
							<span
								class="tw-ml-2 tw-text-[8px] tw-uppercase tw-tracking-[0.3em] tw-px-2 tw-py-0.5 tw-rounded tw-border"
								style:color={selectedDrill.categoryAccent}
								style:border-color="{selectedDrill.categoryAccent}55"
								style:background="{selectedDrill.categoryAccent}12"
							>
								ELITE BONUS ✦
							</span>
						{/if}
					</div>

					<!-- Bonus threshold hint -->
					<p class="tw-text-[8px] tw-uppercase tw-tracking-[0.25em] tw-text-white/18">
						{bonusHint(selectedDrill)}
					</p>

					<!-- XP breakdown (base + bonus) -->
					<div class="tw-flex tw-items-center tw-gap-3 tw-text-[9px] tw-tabular-nums tw-text-white/25 tw-tracking-[0.15em]">
						<span>BASE {selectedDrill.baseXP} XP</span>
						<span class="tw-text-white/12">+</span>
					<span
						class={bonusEarned ? 'tw-text-white/50' : 'tw-text-white/18'}
						style:color={bonusEarned ? selectedDrill.categoryAccent : undefined}
					>
							BONUS {selectedDrill.bonusXP} XP
						</span>
					</div>
				</div>

				<!-- ── SUBMIT BUTTON ───────────────────────────────────── -->
				<div class="tw-space-y-3">
					<button
						type="submit"
						class="pg-submit-btn"
						class:pg-submit-btn--ready={isInputValid && submitState === 'idle'}
						class:pg-submit-btn--success={submitState === 'success'}
						class:pg-submit-btn--error={submitState === 'error'}
						disabled={!isInputValid || submitState !== 'idle'}
						style:--submit-accent={submitState === 'success' ? '#2dd4bf' : submitState === 'error' ? '#ff4444' : selectedDrill.categoryAccent}
					>
						{#if submitState === 'success'}
							◉ &nbsp;+{lastAwardedXP.toLocaleString()} XP ENCRYPTED TO ARMORY
						{:else if submitState === 'error'}
							⚠ &nbsp;TRANSMISSION REJECTED
						{:else}
							[ &nbsp;LOG METRIC&nbsp; ]
						{/if}
					</button>

					<!-- Tier progress micro-bar -->
					<div class="tw-flex tw-items-center tw-gap-3 tw-text-[8px] tw-text-white/20 tw-tracking-[0.2em]">
						<span class="tw-uppercase">TIER PROGRESS</span>
						<div class="tw-flex-1 tw-h-px tw-bg-white/8 tw-relative tw-overflow-hidden">
							<div
								class="tw-absolute tw-inset-y-0 tw-left-0 tw-transition-all tw-duration-700"
								style:width="{armory.progressToNextTier}%"
								style:background={armory.currentTier.accent}
							></div>
						</div>
						<span class="tw-tabular-nums tw-text-white/30">{armory.progressToNextTier.toFixed(1)}%</span>
					</div>
				</div>
			</form>
		</section>

	</div>
</div>

<style>
	/* ── Shell ─────────────────────────────────────────────────────────── */
	.pg-shell {
		background: #010409;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		overflow: hidden;
		position: relative;
	}

	/* ── Mission Board ─────────────────────────────────────────────────── */
	.pg-mission-board {
		background: rgba(0, 0, 0, 0.25);
		max-height: 480px; /* scroll after 6 drills */
	}

	@media (min-width: 768px) {
		.pg-mission-board {
			max-height: none;
		}
	}

	/* ── Drill list item ───────────────────────────────────────────────── */
	.pg-drill-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px 12px 20px;
		cursor: pointer;
		position: relative;
		transition:
			background 0.12s ease,
			color 0.12s ease;
		border-left: 2px solid transparent;
	}

	.pg-drill-item::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--drill-accent, #14b8a6);
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.pg-drill-item:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.pg-drill-item--active {
		background: rgba(255, 255, 255, 0.04);
	}

	.pg-drill-item--active::before {
		opacity: 1;
	}

	/* ── Stat key badge (inside drill item) ────────────────────────────── */
	.pg-stat-badge {
		display: inline-block;
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		padding: 2px 6px;
		border-radius: 3px;
		border: 1px solid;
		font-family: inherit;
	}

	/* ── Terminal pane ─────────────────────────────────────────────────── */
	.pg-terminal {
		background: rgba(1, 4, 9, 0.6);
	}

	/* Dot-grid texture matching ArmoryDashboard */
	.pg-terminal::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: radial-gradient(circle, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
		background-size: 24px 24px;
		pointer-events: none;
		z-index: 0;
	}

	/* All direct children of the terminal sit above the dot-grid layer */
	.pg-terminal > * {
		position: relative;
		z-index: 1;
	}

	/* ── Scanning line animation ────────────────────────────────────────── */
	.pg-scanline {
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(
			to right,
			transparent 0%,
			rgba(20, 184, 166, 0.12) 30%,
			rgba(20, 184, 166, 0.25) 50%,
			rgba(20, 184, 166, 0.12) 70%,
			transparent 100%
		);
		animation: pg-scan 4s linear infinite;
		pointer-events: none;
		z-index: 2;
	}

	@keyframes pg-scan {
		0% {
			top: -2px;
			opacity: 0;
		}
		5% {
			opacity: 1;
		}
		95% {
			opacity: 1;
		}
		100% {
			top: 100%;
			opacity: 0;
		}
	}

	/* ── Corner brackets ────────────────────────────────────────────────── */
	.pg-bracket {
		position: absolute;
		width: 12px;
		height: 12px;
		border-color: rgba(20, 184, 166, 0.2);
		border-style: solid;
		z-index: 3;
		pointer-events: none;
	}

	.pg-bracket--tl {
		top: 8px;
		left: 8px;
		border-width: 1px 0 0 1px;
	}
	.pg-bracket--tr {
		top: 8px;
		right: 8px;
		border-width: 1px 1px 0 0;
	}
	.pg-bracket--bl {
		bottom: 8px;
		left: 8px;
		border-width: 0 0 1px 1px;
	}
	.pg-bracket--br {
		bottom: 8px;
		right: 8px;
		border-width: 0 1px 1px 0;
	}

	/* ── Category pill (above drill name in terminal) ──────────────────── */
	.pg-cat-pill {
		display: inline-block;
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		padding: 2px 8px;
		border-radius: 3px;
		border: 1px solid;
		font-family: inherit;
	}

	/* ── The big terminal input ─────────────────────────────────────────── */
	.pg-input {
		width: 100%;
		background: transparent;
		border: 0;
		border-bottom: 1px solid rgba(100, 116, 139, 0.5);
		padding: 8px 0 12px;
		font-size: 40px;
		font-weight: 700;
		font-family: inherit;
		letter-spacing: 0.06em;
		color: white;
		outline: none;
		transition:
			border-color 0.2s ease,
			color 0.2s ease,
			filter 0.2s ease;
		/* Hide browser number spinners */
		-moz-appearance: textfield;
	}

	.pg-input::-webkit-outer-spin-button,
	.pg-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.pg-input::placeholder {
		color: rgba(255, 255, 255, 0.1);
		font-weight: 400;
	}

	.pg-input:focus {
		border-bottom-color: rgba(20, 184, 166, 0.6);
		filter: drop-shadow(0 4px 12px rgba(20, 184, 166, 0.1));
	}

	.pg-input--success {
		border-bottom-color: rgba(45, 212, 191, 0.7) !important;
		color: #2dd4bf;
	}

	.pg-input--error {
		border-bottom-color: rgba(255, 68, 68, 0.6) !important;
	}

	/* ── Submit button ─────────────────────────────────────────────────── */
	.pg-submit-btn {
		width: 100%;
		padding: 14px 24px;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.25);
		font-family: inherit;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.35em;
		text-transform: uppercase;
		cursor: not-allowed;
		transition:
			color 0.2s ease,
			border-color 0.2s ease,
			background 0.2s ease,
			box-shadow 0.2s ease,
			filter 0.2s ease;
	}

	.pg-submit-btn--ready {
		color: var(--submit-accent, #14b8a6);
		border-color: var(--submit-accent, #14b8a6);
		background: color-mix(in srgb, var(--submit-accent, #14b8a6) 8%, transparent);
		cursor: pointer;
	}

	.pg-submit-btn--ready:hover {
		background: color-mix(in srgb, var(--submit-accent, #14b8a6) 14%, transparent);
		box-shadow:
			0 0 20px color-mix(in srgb, var(--submit-accent, #14b8a6) 22%, transparent),
			inset 0 0 20px color-mix(in srgb, var(--submit-accent, #14b8a6) 5%, transparent);
		filter: drop-shadow(0 0 6px color-mix(in srgb, var(--submit-accent, #14b8a6) 40%, transparent));
	}

	.pg-submit-btn--success {
		color: #2dd4bf;
		border-color: rgba(45, 212, 191, 0.5);
		background: rgba(45, 212, 191, 0.06);
		box-shadow: 0 0 24px rgba(45, 212, 191, 0.12);
		cursor: default;
	}

	.pg-submit-btn--error {
		color: #ff4444;
		border-color: rgba(255, 68, 68, 0.4);
		background: rgba(255, 68, 68, 0.05);
		cursor: default;
	}

	/* ── Reduced motion overrides ────────────────────────────────────────── */
	@media (prefers-reduced-motion: reduce) {
		.pg-scanline {
			animation: none;
			display: none;
		}
	}
</style>
