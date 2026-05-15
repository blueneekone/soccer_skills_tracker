<script lang="ts">
	/**
	 * FixtureList.svelte
	 * ───────────────────
	 * Trinity role: ARENA (pure presentation)
	 *
	 * High-density fixture schedule in the "Stark Tech" aesthetic.
	 * Completed rows show the final score in a glowing cyan badge.
	 *
	 * Props:
	 *   fixtures       — enriched fixtures (from LeagueManager.enrichedUpcoming /
	 *                    enrichedCompleted, or a combined array)
	 *   matchResults   — optional map of fixtureId → MatchResult for score display
	 *   title          — optional header label
	 *   showFilter     — whether to render the filter tab bar
	 *   onFixtureClick — optional callback when a row is selected
	 */

	import { formatFixtureDate, type LeagueSchema } from '$lib/types/league';
	import { formatFixtureDateFull, getBrowserTimezone } from '$lib/utils/time';

	const browserTz = getBrowserTimezone();
	import { swipe } from '$lib/actions/swipe.js';
	import VanguardEmptyState from '$lib/components/ui/VanguardEmptyState.svelte';

	type EnrichedFixture = LeagueSchema.Fixture & {
		opponent: LeagueSchema.Opponent | null;
		result?: LeagueSchema.MatchResult | null;
	};

	interface Props {
		fixtures?: EnrichedFixture[];
		/**
		 * Explicit match-result map (keyed by fixtureId).
		 * When a fixture has result data here or in `fixture.result`, the
		 * glowing score badge is shown on the row.
		 */
		matchResults?: Record<string, LeagueSchema.MatchResult>;
		title?: string;
		showFilter?: boolean;
		onFixtureClick?: (fixture: EnrichedFixture) => void;
		/** Swipe-left fires this (iOS/Android native UX — e.g. delete / archive). */
		onFixtureSwipeLeft?: (fixture: EnrichedFixture) => void;
		/** Swipe-right fires this (e.g. edit / mark complete). */
		onFixtureSwipeRight?: (fixture: EnrichedFixture) => void;
		/** Whether more fixtures can be fetched from the server (drives Load More button). */
		hasMore?: boolean;
		loadingMore?: boolean;
		onLoadMore?: () => void;
		class?: string;
	}

	const {
		fixtures = [],
		matchResults = {},
		title = 'FIXTURES',
		showFilter = true,
		onFixtureClick,
		onFixtureSwipeLeft,
		onFixtureSwipeRight,
		hasMore = false,
		loadingMore = false,
		onLoadMore,
		class: className = '',
	}: Props = $props();

	// ── Filter state ──────────────────────────────────────────────────────────
	type FilterKey = 'ALL' | 'Scheduled' | 'Completed' | 'Cancelled';
	let activeFilter = $state<FilterKey>('ALL');
	let searchQuery = $state('');

	// ── Derived filtered list ─────────────────────────────────────────────────
	const filtered = $derived.by(() => {
		let list = fixtures;

		if (activeFilter !== 'ALL') {
			list = list.filter((f) => f.status === activeFilter);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			list = list.filter(
				(f) =>
					f.opponent?.name.toLowerCase().includes(q) ||
					f.location?.toLowerCase().includes(q) ||
					f.type.toLowerCase().includes(q),
			);
		}

		return list;
	});

	/** Resolve score for a fixture from either the embedded result or the prop map. */
	function getResult(fixture: EnrichedFixture): LeagueSchema.MatchResult | null {
		return fixture.result ?? matchResults[fixture.id] ?? null;
	}

	// ── Counts per filter tab (for the indicator badge) ───────────────────────
	const tabCounts = $derived({
		ALL: fixtures.length,
		Scheduled: fixtures.filter((f) => f.status === 'Scheduled').length,
		Completed: fixtures.filter((f) => f.status === 'Completed').length,
		Cancelled: fixtures.filter((f) => f.status === 'Cancelled').length,
	});

	// ── Static configs ────────────────────────────────────────────────────────
	const TYPE_COLORS: Record<LeagueSchema.FixtureType, string> = {
		League: '#14b8a6',
		Tournament: '#a855f7',
		Friendly: '#22c55e',
	};

	const STATUS_COLORS: Record<LeagueSchema.FixtureStatus, string> = {
		Scheduled: '#64748b',
		Completed: '#22c55e',
		Cancelled: '#ef4444',
		Postponed: '#f59e0b',
	};

	const OUTCOME_COLORS: Record<'W' | 'L' | 'D', string> = {
		W: '#22c55e',
		L: '#ef4444',
		D: '#f59e0b',
	};

	type TabEntry = { key: FilterKey; label: string };
	const FILTER_TABS: TabEntry[] = [
		{ key: 'ALL', label: 'ALL' },
		{ key: 'Scheduled', label: 'UPCOMING' },
		{ key: 'Completed', label: 'COMPLETED' },
		{ key: 'Cancelled', label: 'CANCELLED' },
	];
</script>

<div class="fl-root {className}">
	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<div class="fl-header">
		<div class="fl-header-left">
			<span class="fl-eyebrow">LEAGUE MANAGEMENT</span>
			<h2 class="fl-title">{title}</h2>
		</div>
		<div class="fl-header-right">
			<span class="fl-count"
				>{filtered.length}<span class="fl-count-label">MATCHES</span></span
			>
		</div>
	</div>

	<!-- ── Controls ──────────────────────────────────────────────────────────── -->
	{#if showFilter}
		<div class="fl-controls">
			<div class="fl-tabs" role="tablist">
				{#each FILTER_TABS as tab (tab.key)}
					<button
						class="fl-tab"
						class:fl-tab--active={activeFilter === tab.key}
						role="tab"
						aria-selected={activeFilter === tab.key}
						onclick={() => (activeFilter = tab.key)}
					>
						{tab.label}
						{#if tabCounts[tab.key] > 0}
							<span class="fl-tab-count">{tabCounts[tab.key]}</span>
						{/if}
					</button>
				{/each}
			</div>

			<div class="fl-search-wrap">
				<span class="fl-search-icon" aria-hidden="true">⌕</span>
				<input
					class="fl-search"
					type="search"
					placeholder="SEARCH OPPONENT, VENUE…"
					bind:value={searchQuery}
					aria-label="Search fixtures"
				/>
			</div>
		</div>
	{/if}

	<!-- ── Fixture list ───────────────────────────────────────────────────────── -->
	{#if fixtures.length === 0}
		<!-- Day-zero state: no fixtures exist yet for this team/season -->
		<div class="fl-empty-wrap">
			<VanguardEmptyState
				title="FIXTURE TELEMETRY EMPTY"
				message="NO MATCH DATA FOUND. SCHEDULE YOUR FIRST FIXTURE TO BEGIN OPERATIONS."
				cta="[ SCHEDULE FIXTURE ]"
				onAction={onLoadMore}
			/>
		</div>
	{:else if filtered.length === 0}
		<!-- Filtered-to-zero state: fixtures exist but none match the current filter -->
		<div class="fl-empty-wrap">
			<VanguardEmptyState
				title="NO MATCHES IN SECTOR"
				message="CURRENT FILTER RETURNS ZERO RESULTS. ADJUST SEARCH PARAMETERS."
				refCode="FILTER_NULL"
			/>
		</div>
	{:else}
		<div class="fl-list" role="list">
			{#each filtered as fixture (fixture.id)}
				{@const result = getResult(fixture)}
				{@const isCompleted = fixture.status === 'Completed'}
				{@const dtDisplay = formatFixtureDateFull(fixture.dateTime, fixture.facilityTimezone)}

			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="fl-row"
				class:fl-row--clickable={!!onFixtureClick}
				class:fl-row--completed={isCompleted}
				class:fl-row--swipeable={!!(onFixtureSwipeLeft || onFixtureSwipeRight)}
				onclick={() => onFixtureClick?.(fixture)}
				role={onFixtureClick ? 'button' : 'listitem'}
				tabindex={onFixtureClick ? 0 : -1}
				use:swipe={{
					onSwipeLeft: onFixtureSwipeLeft ? () => onFixtureSwipeLeft(fixture) : undefined,
					onSwipeRight: onFixtureSwipeRight ? () => onFixtureSwipeRight(fixture) : undefined,
					threshold: 70,
					disableScroll: true,
				}}
			>
					<!-- Date column — timezone-aware display -->
					<div class="fl-col-date">
						<span class="fl-date">
							{dtDisplay.day} {dtDisplay.date}
						</span>
						<span class="fl-time">
							{dtDisplay.time}
							<span class="fl-tz-abbr">{dtDisplay.tzAbbr}</span>
							{#if dtDisplay.hasTzMismatch}
								<span
									class="fl-tz-warn"
									title="Venue is in {fixture.facilityTimezone} · Your local zone: {browserTz}"
									aria-label="Timezone mismatch — venue is in {fixture.facilityTimezone}"
								>⚠</span>
							{/if}
						</span>
					</div>

					<!-- Opponent + location column -->
					<div class="fl-col-main">
						<span class="fl-opponent">
							{#if fixture.opponent?.primaryColor}
								<span
									class="fl-opp-dot"
									style:background={fixture.opponent.primaryColor}
								></span>
							{/if}
							{fixture.opponent?.name ?? fixture.opponentId}
						</span>
						{#if fixture.location}
							<span class="fl-location">📍 {fixture.location}</span>
						{/if}
					</div>

					<!-- Type badge -->
					<div class="fl-col-type">
						<span
							class="fl-type-badge"
							style:border-color={TYPE_COLORS[fixture.type]}
							style:color={TYPE_COLORS[fixture.type]}
						>
							{fixture.type.toUpperCase()}
						</span>
					</div>

					<!-- Score badge (completed) OR status indicator (scheduled/cancelled) -->
					<div class="fl-col-score-status">
						{#if isCompleted && result}
							<!-- ── GLOWING SCORE BADGE ──────────────────────────── -->
							<div
								class="fl-score-badge"
								style:--outcome-color={result.outcome
									? OUTCOME_COLORS[result.outcome]
									: '#14b8a6'}
							>
								{#if result.outcome}
									<span class="fl-outcome-tag" style:color={OUTCOME_COLORS[result.outcome]}>
										{result.outcome}
									</span>
								{/if}
								<span class="fl-score">
									{result.scoreHome}
									<span class="fl-score-sep">–</span>
									{result.scoreAway}
								</span>
							</div>
						{:else}
							<!-- ── STATUS INDICATOR ────────────────────────────── -->
							<span
								class="fl-status-dot"
								style:background={STATUS_COLORS[fixture.status]}
								title={fixture.status}
							></span>
							<span class="fl-status-label" style:color={STATUS_COLORS[fixture.status]}>
								{fixture.status.toUpperCase()}
							</span>
						{/if}
					</div>

					{#if onFixtureClick}
						<span class="fl-chevron" aria-hidden="true">›</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- ── Pagination: Load More ─────────────────────────────────────────────── -->
	{#if hasMore || loadingMore}
		<div class="fl-load-more">
			<button
				class="fl-load-more__btn"
				onclick={onLoadMore}
				disabled={loadingMore || !onLoadMore}
			>
				{#if loadingMore}
					<span class="fl-load-more__spin" aria-hidden="true"></span>
					LOADING FIXTURES…
				{:else}
					▼ LOAD OLDER FIXTURES
				{/if}
			</button>
		</div>
	{/if}
</div>

<style>
	/* ── Root ─────────────────────────────────────────────────────────────── */
	.fl-root {
		background: rgba(1, 4, 9, 0.85);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 8px;
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
		color: #e2e8f0;
		overflow: hidden;
	}

	/* ── Header ──────────────────────────────────────────────────────────── */
	.fl-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		padding: 1.25rem 1.5rem 0.75rem;
		border-bottom: 1px solid rgba(20, 184, 166, 0.1);
	}
	.fl-eyebrow {
		font-size: 9px;
		letter-spacing: 0.28em;
		color: #14b8a6;
		display: block;
		margin-bottom: 3px;
	}
	.fl-title {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		margin: 0;
		color: #f8fafc;
	}
	.fl-count {
		font-size: 1.4rem;
		font-weight: 700;
		color: #14b8a6;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}
	.fl-count-label {
		font-size: 9px;
		letter-spacing: 0.2em;
		color: #475569;
		margin-top: -2px;
	}

	/* ── Controls ────────────────────────────────────────────────────────── */
	.fl-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		flex-wrap: wrap;
	}
	.fl-tabs {
		display: flex;
		gap: 2px;
	}
	.fl-tab {
		display: flex;
		align-items: center;
		gap: 5px;
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.18em;
		padding: 4px 10px;
		border-radius: 2px;
		border: 1px solid transparent;
		background: transparent;
		color: #475569;
		cursor: pointer;
		transition: all 0.15s;
	}
	.fl-tab:hover {
		color: #94a3b8;
	}
	.fl-tab--active {
		background: rgba(20, 184, 166, 0.08);
		border-color: rgba(20, 184, 166, 0.3);
		color: #14b8a6;
	}
	.fl-tab-count {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 2px;
		padding: 0 4px;
		font-size: 8px;
	}
	.fl-tab--active .fl-tab-count {
		background: rgba(20, 184, 166, 0.15);
	}
	.fl-search-wrap {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-left: auto;
	}
	.fl-search-icon {
		color: #475569;
		font-size: 1rem;
		pointer-events: none;
	}
	.fl-search {
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		color: #e2e8f0;
		font-family: inherit;
		font-size: 10px;
		letter-spacing: 0.1em;
		padding: 3px 0;
		width: 200px;
		outline: none;
		transition: border-color 0.2s;
	}
	.fl-search:focus {
		border-bottom-color: rgba(20, 184, 166, 0.5);
	}
	.fl-search::placeholder {
		color: #334155;
	}

	/* ── List ────────────────────────────────────────────────────────────── */
	.fl-list {
		display: flex;
		flex-direction: column;
	}
	.fl-row {
		display: grid;
		grid-template-columns: 200px 1fr auto auto;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		transition: background 0.15s;
	}
	.fl-row--clickable {
		cursor: pointer;
		grid-template-columns: 200px 1fr auto auto 20px;
	}
	.fl-row--completed {
		border-left: 2px solid rgba(34, 197, 94, 0.2);
	}
	.fl-row--swipeable { touch-action: pan-y; }
	/* Hint: show a faint directional arrow on swipeable rows on touch devices */
	@media (pointer: coarse) {
		.fl-row--swipeable::after {
			content: '‹›';
			position: absolute; right: 0.5rem;
			font-size: 0.55rem; letter-spacing: -2px;
			color: rgba(255, 255, 255, 0.1);
			pointer-events: none;
		}
	}
	.fl-row:last-child {
		border-bottom: none;
	}
	.fl-row:hover {
		background: rgba(255, 255, 255, 0.02);
	}
	.fl-row--clickable:hover {
		background: rgba(20, 184, 166, 0.04);
	}

	/* Date column */
	.fl-col-date {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.fl-date {
		font-size: 10px;
		letter-spacing: 0.08em;
		color: #94a3b8;
		white-space: nowrap;
		display: block;
	}
	.fl-time {
		font-size: 10px;
		color: rgba(0, 255, 255, 0.55);
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: 3px;
		font-variant-numeric: tabular-nums;
	}
	.fl-tz-abbr {
		font-size: 8px;
		letter-spacing: 0.12em;
		color: rgba(0, 255, 255, 0.3);
	}
	/* Amber pulsing warning icon for cross-timezone fixtures */
	.fl-tz-warn {
		font-size: 9px;
		color: #f59e0b;
		cursor: help;
		animation: fl-tz-pulse 2.5s ease-in-out infinite;
	}
	@keyframes fl-tz-pulse {
		0%, 100% { opacity: 0.6; }
		50%       { opacity: 1; filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.7)); }
	}

	/* Main column */
	.fl-col-main {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.fl-opponent {
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: #f1f5f9;
		display: flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.fl-opp-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.fl-location {
		font-size: 10px;
		color: #475569;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Type badge */
	.fl-col-type {
		flex-shrink: 0;
	}
	.fl-type-badge {
		font-size: 8px;
		letter-spacing: 0.18em;
		padding: 2px 7px;
		border-radius: 2px;
		border: 1px solid;
		white-space: nowrap;
	}

	/* Score / status column */
	.fl-col-score-status {
		display: flex;
		align-items: center;
		gap: 5px;
		flex-shrink: 0;
	}

	/* ── Score badge (completed games) ───────────────────────────────────── */
	.fl-score-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid color-mix(in srgb, var(--outcome-color) 40%, transparent);
		border-radius: 4px;
		padding: 3px 10px;
		box-shadow:
			0 0 10px color-mix(in srgb, var(--outcome-color) 15%, transparent),
			inset 0 0 8px color-mix(in srgb, var(--outcome-color) 5%, transparent);
	}
	.fl-outcome-tag {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.1em;
		opacity: 0.9;
	}
	.fl-score {
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--outcome-color);
		text-shadow: 0 0 12px color-mix(in srgb, var(--outcome-color) 60%, transparent);
		display: flex;
		align-items: center;
		gap: 3px;
	}
	.fl-score-sep {
		color: #475569;
		font-size: 10px;
	}

	/* Status dot + label (non-completed) */
	.fl-status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.fl-status-label {
		font-size: 9px;
		letter-spacing: 0.15em;
	}

	/* Chevron */
	.fl-chevron {
		color: #334155;
		font-size: 1.1rem;
		transition: color 0.15s;
	}
	.fl-row--clickable:hover .fl-chevron {
		color: #14b8a6;
	}

	/* Empty state */
	.fl-empty-wrap {
		padding: 1rem;
	}
	/* Legacy — kept for compatibility but no longer rendered */
	.fl-empty {
		text-align: center;
		padding: 3rem 2rem;
		color: #475569;
		font-size: 12px;
	}
	.fl-empty-icon {
		display: block;
		font-size: 2rem;
		margin-bottom: 0.75rem;
		opacity: 0.3;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.fl-row,
		.fl-row--clickable {
			grid-template-columns: 1fr auto;
		}
		.fl-col-date,
		.fl-col-type {
			display: none;
		}
	}

	/* ── Load More ──────────────────────────────────────────────────────── */
	.fl-load-more {
		display: flex;
		justify-content: center;
		padding: 0.875rem 1.5rem;
		border-top: 1px solid rgba(20, 184, 166, 0.06);
	}

	.fl-load-more__btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 1.1rem;
		background: transparent;
		border: 1px solid rgba(20, 184, 166, 0.18);
		border-radius: 6px;
		color: rgba(20, 184, 166, 0.55);
		font-family: inherit;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.12em;
		cursor: pointer;
		transition: all 0.2s;
	}

	.fl-load-more__btn:hover:not(:disabled) {
		background: rgba(20, 184, 166, 0.06);
		border-color: rgba(20, 184, 166, 0.35);
		color: #14b8a6;
	}

	.fl-load-more__btn:disabled { opacity: 0.4; cursor: not-allowed; }

	.fl-load-more__spin {
		width: 10px;
		height: 10px;
		border: 1.5px solid rgba(20, 184, 166, 0.25);
		border-top-color: rgba(20, 184, 166, 0.8);
		border-radius: 50%;
		animation: fl-spin 0.7s linear infinite;
	}

	@keyframes fl-spin { to { transform: rotate(360deg); } }
</style>
