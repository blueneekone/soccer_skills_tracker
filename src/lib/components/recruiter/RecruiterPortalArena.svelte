
<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { RecruiterPortalEngine } from './RecruiterPortalEngine.svelte.js';
	import { tierAccent, tierBg, eligColor, buildSparkline } from '$lib/utils/recruiterPortalUtils.js';

	let { engine }: { engine: RecruiterPortalEngine } = $props();

	const positions = ['GK', 'DEF', 'MID', 'FWD'];
	const tiers = ['VANGUARD', 'ELITE', 'PRO', 'PROSPECT'];

</script>
<style src="./recruiter_styles.css"></style>
<svelte:window onkeydown={engine.handleKeydown} />

<div class="rp-root">
	<!-- ── HEADER ──────────────────────────────────────────────────────────────── -->
	<header class="rp-header">
		<div class="rp-header__brand">
			<span class="rp-header__icon" aria-hidden="true">
				<Icon name="action.search" size={18} strokeWidth={2.2} />
			</span>
			<span class="rp-header__title">NEXUS TALENT INTEL</span>
			<span class="rp-header__badge">RESTRICTED ACCESS</span>
		</div>
		<nav class="rp-tabs" aria-label="Recruiter sections">
			<button
				class="rp-tab"
				class:rp-tab--active={engine.activeTab === 'feed'}
				onclick={() => (engine.activeTab = 'feed')}
			>
				TALENT FEED
				{#if engine.filteredPlayers.length}
					<span class="rp-tab__count tw-font-mono">{engine.filteredPlayers.length}</span>
				{/if}
			</button>
			<button
				class="rp-tab"
				class:rp-tab--active={engine.activeTab === 'watchlist'}
				onclick={() => (engine.activeTab = 'watchlist')}
			>
				WATCHLIST
				{#if engine.watchlist.length}
					<span class="rp-tab__count tw-font-mono" class:rp-tab__count--alert={0 > 0}>
						{engine.watchlist.length}
					</span>
				{/if}
			</button>
		</nav>
	</header>

	<!-- ── FILTERS ─────────────────────────────────────────────────────────────── -->
	{#if engine.activeTab === 'feed'}
		<div class="rp-filters">
			<div class="rp-filter-group rp-filter-group--search">
				<Icon name="action.search" size={13} strokeWidth={2.2} class="rp-filter-group__icon" />
				<input
					class="rp-input"
					type="search"
					placeholder="Search by name, position, club…"
					bind:value={engine.searchQuery}
					aria-label="Search players"
				/>
			</div>
			<select class="rp-select" bind:value={engine.filterPos} aria-label="Filter by position">
				<option value="">ALL POSITIONS</option>
				{#each positions as pos}
					<option value={pos}>{pos}</option>
				{/each}
			</select>
			<select class="rp-select" bind:value={engine.filterTier} aria-label="Filter by tier">
				<option value="">ALL TIERS</option>
				{#each tiers as t}
					<option value={t}>{t}</option>
				{/each}
			</select>
			<div class="rp-filter-group rp-filter-group--number">
				<span class="rp-filter-group__label">MIN VAN</span>
				<input
					class="rp-input rp-input--num"
					type="number"
					min="0"
					max="99"
					placeholder="0"
					value={engine.filterVan ?? ''}
					oninput={(e) => { const v = parseInt((e.target as HTMLInputElement).value); engine.filterVan = isNaN(v) ? null : v; }}
					aria-label="Minimum VAN rating"
				/>
			</div>
			<div class="rp-filter-group rp-filter-group--number">
				<span class="rp-filter-group__label">MIN GPA</span>
				<input
					class="rp-input rp-input--num"
					type="number"
					min="0"
					max="4"
					step="0.1"
					placeholder="0.0"
					value={engine.filterGpa ?? ''}
					oninput={(e) => { const v = parseFloat((e.target as HTMLInputElement).value); engine.filterGpa = isNaN(v) ? null : v; }}
					aria-label="Minimum GPA"
				/>
			</div>
			{#if engine.searchQuery || engine.filterPos || engine.filterTier || engine.filterGpa !== null || engine.filterVan !== null}
				<button
					class="rp-btn-ghost"
					onclick={() => { engine.searchQuery=''; engine.filterPos=''; engine.filterTier=''; engine.filterGpa=null; engine.filterVan=null; }}
				>CLEAR</button>
			{/if}
		</div>
	{/if}

	<!-- ── MAIN CONTENT ─────────────────────────────────────────────────────────── -->
	<div class="rp-body">
		{#if engine.feedError}
			<div class="rp-engine.feedError">
				<span>⚠ {engine.feedError}</span>
				<button class="rp-btn-ghost" onclick={() => engine.loadFeed(true)}>RETRY</button>
			</div>
		{/if}

		{#if engine.activeTab === 'feed'}
			{#if engine.feedLoading}
				<div class="rp-engine.feedLoading">
					<span class="rp-spinner" aria-label="Loading"></span>
					<span>SCANNING TALENT DATABASE…</span>
				</div>
			{:else}
				<div class="rp-grid tw-font-mono">
					{#each engine.filteredPlayers as player (player.id)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="rp-card"
							class:rp-card--vanguard={player.tier === 'VANGUARD'}
							style:--card-accent={tierAccent(player.tier)}
							onclick={() => engine.openDetail(player)}
						>
							<!-- Tier accent bar -->
							<div class="rp-card__accent-bar" style:background={tierAccent(player.tier)}></div>

							<!-- Header: name + position -->
							<div class="rp-card__head">
								<div class="rp-card__name-block">
									<span class="rp-card__name">{player.name}</span>
									<span class="rp-card__pos">{player.position}</span>
								</div>
								<button
									class="rp-watch-btn"
									class:rp-watch-btn--active={player.isWatched}
									onclick={(e) => engine.toggleWatchlist(player)}
									aria-label={player.isWatched ? 'Remove from engine.watchlist' : 'Add to engine.watchlist'}
									title={player.isWatched ? 'Watching' : 'Watch'}
								>
									<svg width="13" height="13" viewBox="0 0 24 24" fill={player.isWatched ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" aria-hidden="true">
										<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/>
									</svg>
								</button>
							</div>
							{#if player.verified_video_url}
								<div class="rp-card__video-badge tw-font-mono">▶ VERIFIED TRIAL</div>
							{/if}

							<!-- VAN + Tier + XP -->
							<div class="rp-card__metrics">
								<div class="rp-card__metric">
									<span class="rp-card__metric-val" style:color={tierAccent(player.tier)}>
										{player.vanRating}
									</span>
									<span class="rp-card__metric-label">VAN</span>
								</div>
								<div class="rp-card__metric">
									<span
										class="rp-card__tier-chip"
										style:background={tierBg(player.tier)}
										style:border-color="{tierAccent(player.tier)}44"
										style:color={tierAccent(player.tier)}
									>{player.tier}</span>
								</div>
								{#if player.gpa !== null}
									<div class="rp-card__metric">
										<span class="rp-card__metric-val" style:color={eligColor(player.gpa)}>
											{player.gpa.toFixed(2)}
											{#if player.gpa >= 3.5}
												<span class="rp-card__scholar-star" title="Scholar">🎓</span>
											{/if}
										</span>
										<span class="rp-card__metric-label">GPA</span>
									</div>
								{/if}
							</div>

							<!-- XP progress bar -->
							<div class="rp-card__xp-bar-wrap" aria-label="XP {player.xp.toLocaleString()}">
								<div
									class="rp-card__xp-bar"
									style:width="{Math.min(100, (player.xp / 50000) * 100)}%"
									style:background={tierAccent(player.tier)}
								></div>
							</div>

							<!-- Handshake indicator -->
							{#if player.engine.handshakeStatus === 'pending'}
								<div class="rp-card__hs rp-card__hs--pending">HANDSHAKE PENDING</div>
							{:else if player.engine.handshakeStatus === 'approved'}
								<div class="rp-card__hs rp-card__hs--accepted">PII UNLOCKED</div>
							{/if}

							<!-- Club attribution (no PII) -->
							{#if player.clubName}
								<div class="rp-card__club">{player.clubName}</div>
							{/if}
						</div>
					{/each}

					{#if engine.filteredPlayers.length === 0 && !engine.feedLoading}
						<div class="rp-empty">
							<span>NO OPERATIVES MATCH CURRENT FILTERS</span>
						</div>
					{/if}
				</div>

				{#if engine.hasMore && !engine.feedLoading}
					<div class="rp-load-more">
						<button class="rp-btn-ghost rp-btn-ghost--lg" onclick={() => engine.loadFeed()}>
							LOAD MORE OPERATIVES
						</button>
					</div>
				{/if}
				{#if engine.feedLoading}
					<div class="rp-load-more"><span class="rp-spinner"></span></div>
				{/if}
			{/if}

		{:else if engine.activeTab === 'watchlist'}
			{#if engine.watchlist.length === 0}
				<div class="rp-empty rp-empty--center">
					<Icon name="game.star" size={40} class="tw-opacity-20" />
					<span>YOUR WATCHLIST IS EMPTY</span>
					<span class="rp-empty__sub">Click the ★ on any player to track milestones.</span>
				</div>
			{:else}
				<div class="rp-grid tw-font-mono">
					{#each engine.watchlist as player (player.id)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="rp-card rp-card--watched"
							class:rp-card--vanguard={player.tier === 'VANGUARD'}
							style:--card-accent={tierAccent(player.tier)}
							onclick={() => engine.openDetail(player)}
						>
							<div class="rp-card__accent-bar" style:background={tierAccent(player.tier)}></div>
							<div class="rp-card__head">
								<div class="rp-card__name-block">
									<span class="rp-card__name">{player.name}</span>
									<span class="rp-card__pos">{player.position}</span>
								</div>
								{#if player.tier === 'VANGUARD' || player.tier === 'ELITE'}
									<span class="rp-milestone-badge" title="Milestone reached">⚡ {player.tier}</span>
								{/if}
							</div>
							<div class="rp-card__metrics">
								<div class="rp-card__metric">
									<span class="rp-card__metric-val" style:color={tierAccent(player.tier)}>{player.vanRating}</span>
									<span class="rp-card__metric-label">VAN</span>
								</div>
								{#if player.gpa !== null}
									<div class="rp-card__metric">
										<span class="rp-card__metric-val" style:color={eligColor(player.gpa)}>
											{player.gpa.toFixed(2)}
											{#if player.gpa >= 3.5}🎓{/if}
										</span>
										<span class="rp-card__metric-label">GPA</span>
									</div>
								{/if}
							</div>
							<div class="rp-card__xp-bar-wrap">
								<div class="rp-card__xp-bar" style:width="{Math.min(100, (player.xp / 50000) * 100)}%" style:background={tierAccent(player.tier)}></div>
							</div>
							{#if player.clubName}
								<div class="rp-card__club">{player.clubName}</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

<!-- ── DETAIL SLIDE-IN PANEL ────────────────────────────────────────────────── -->
{#if engine.detailOpen && engine.detailPlayer}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="rp-detail-backdrop" onclick={engine.closeDetail}></div>

	<aside class="rp-detail" aria-label="Player dossier: {engine.detailPlayer.name}">
		<header class="rp-detail__header">
			<div class="rp-detail__id tw-font-mono">
				<span
					class="rp-detail__tier-dot"
					style:background={tierAccent(engine.detailPlayer.tier)}
					style:box-shadow="0 0 8px {tierAccent(engine.detailPlayer.tier)}"
				></span>
				<div>
					<h2 class="rp-detail__name">{engine.detailPlayer.name}</h2>
					<p class="rp-detail__sub">
						{engine.detailPlayer.position}
						{#if engine.detailPlayer.clubName} · {engine.detailPlayer.clubName}{/if}
					</p>
				</div>
			</div>
			<button class="rp-detail__close" onclick={engine.closeDetail} aria-label="Close detail panel">✕</button>
		</header>

		<!-- Key metrics row -->
		<div class="rp-detail__kpis">
			<div class="rp-detail__kpi">
				<span class="rp-detail__kpi-val" style:color={tierAccent(engine.detailPlayer.tier)}>{engine.detailPlayer.vanRating}</span>
				<span class="rp-detail__kpi-label">VAN RATING</span>
			</div>
			<div class="rp-detail__kpi">
				<span class="rp-detail__kpi-val" style:color={tierAccent(engine.detailPlayer.tier)}>
					<span class="rp-detail__kpi-chip" style:background={tierBg(engine.detailPlayer.tier)} style:color={tierAccent(engine.detailPlayer.tier)} style:border-color="{tierAccent(engine.detailPlayer.tier)}44">
						{engine.detailPlayer.tier}
					</span>
				</span>
				<span class="rp-detail__kpi-label">TIER</span>
			</div>
			<div class="rp-detail__kpi">
				<span class="rp-detail__kpi-val">{engine.detailPlayer.xp.toLocaleString()}</span>
				<span class="rp-detail__kpi-label">XP</span>
			</div>
			{#if engine.detailPlayer.gpa !== null}
				<div class="rp-detail__kpi">
					<span class="rp-detail__kpi-val" style:color={eligColor(engine.detailPlayer.gpa)}>
						{engine.detailPlayer.gpa.toFixed(2)}
						{#if engine.detailPlayer.gpa >= 3.5}<span title="Scholar">🎓</span>{/if}
					</span>
					<span class="rp-detail__kpi-label">GPA</span>
				</div>
			{/if}
		</div>

		<!-- Scout's Six current stats -->
		{#if Object.keys(engine.detailPlayer.stats).length}
			<section class="rp-detail__section">
				<h3 class="rp-detail__section-title">SCOUT'S SIX · CURRENT</h3>
				<div class="rp-detail__stats-grid tw-font-mono">
					{#each Object.entries(engine.detailPlayer.stats).filter(([k]) => k !== 'VAN') as [key, value]}
						<div class="rp-detail__stat">
							<span class="rp-detail__stat-label">{key}</span>
							<span class="rp-detail__stat-value">{value}</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Growth Sparklines -->
		<section class="rp-detail__section">
			<h3 class="rp-detail__section-title">GROWTH ANALYTICS</h3>
			{#if engine.snapshotsLoading}
				<div class="rp-detail__sparkline-engine.feedLoading">
					<span class="rp-spinner rp-spinner--sm"></span>
					<span>LOADING HISTORY…</span>
				</div>
			{:else if engine.snapshots.length < 2}
				<p class="rp-detail__empty-msg">Insufficient history for growth analysis. (Requires ≥ 2 data points)</p>
			{:else}
				<div class="rp-detail__sparklines">
					{#each ['PAC', 'ACC', 'AGI', 'STM', 'POW'] as statKey}
						{@const series = engine.getStatSeries(statKey)}
						{@const spark = buildSparkline(series, 120, 32)}
						{#if spark.path && series.some((v) => v > 0)}
							<div class="rp-sparkline-card">
								<div class="rp-sparkline-card__head">
									<span class="rp-sparkline-card__key">{statKey}</span>
									<span
										class="rp-sparkline-card__delta"
										class:rp-sparkline-card__delta--up={spark.pct > 0}
										class:rp-sparkline-card__delta--down={spark.pct < 0}
									>
										{spark.pct > 0 ? '+' : ''}{spark.pct}%
									</span>
								</div>
								<svg
									class="rp-sparkline-card__svg"
									viewBox="0 0 120 32"
									preserveAspectRatio="none"
									aria-hidden="true"
								>
									<defs>
										<linearGradient id="spark-grad-{statKey}" x1="0" x2="0" y1="0" y2="1">
											<stop offset="0%" stop-color={tierAccent(engine.detailPlayer.tier)} stop-opacity="0.35"/>
											<stop offset="100%" stop-color={tierAccent(engine.detailPlayer.tier)} stop-opacity="0"/>
										</linearGradient>
									</defs>
									<path
										d="{spark.path} L 120,32 L 0,32 Z"
										fill="url(#spark-grad-{statKey})"
									/>
									<path
										d={spark.path}
										fill="none"
										stroke={tierAccent(engine.detailPlayer.tier)}
										stroke-width="1.5"
									/>
								</svg>
								<span class="rp-sparkline-card__last">{spark.last.toFixed(spark.last < 10 ? 2 : 0)}</span>
							</div>
						{/if}
					{/each}
				</div>
				<p class="rp-detail__history-range">
					{engine.snapshots.length} engine.snapshots · {engine.snapshots[0].capturedAt.toLocaleDateString()} – {engine.snapshots[engine.snapshots.length - 1].capturedAt.toLocaleDateString()}
				</p>
			{/if}
		</section>

		<!-- Digital Handshake (PII Gate) -->
		<section class="rp-detail__section rp-detail__section--handshake">
			<h3 class="rp-detail__section-title">PII ACCESS · DIGITAL HANDSHAKE</h3>
			<p class="rp-detail__hs-desc">
				Contact information and sensitive documents require a Director/Parent approval.
				Your request is logged in the compliance audit trail.
			</p>
			{#if engine.handshakeStatus === 'none'}
				<button
					class="rp-hs-btn"
					onclick={() => engine.detailPlayer && engine.requestHandshake()}
					disabled={engine.handshakeBusy}
				>
					{engine.handshakeBusy ? 'SUBMITTING…' : '🤝 REQUEST DIGITAL HANDSHAKE'}
				</button>
			{:else if engine.handshakeStatus === 'pending'}
				<div class="rp-hs-status rp-hs-status--pending">
					⏳ HANDSHAKE PENDING — Awaiting Director/Parent Approval
				</div>
			{:else if engine.handshakeStatus === 'approved'}
				<div class="rp-hs-status rp-hs-status--accepted">
					✓ HANDSHAKE ACCEPTED — PII Access Unlocked
				</div>
			{/if}
		</section>

		<!-- Verified Video Trial -->
		{#if engine.detailPlayer.verified_video_url}
			<section class="rp-detail__section">
				<h3 class="rp-detail__section-title">VERIFIED 30S TRIAL</h3>
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					src={engine.detailPlayer.verified_video_url}
					controls
					playsinline
					class="rp-detail__video tw-font-mono"
				></video>
			</section>
		{/if}
	</aside>
{/if}