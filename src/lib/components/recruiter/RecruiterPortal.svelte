<script lang="ts">
	/**
	 * RecruiterPortal.svelte — Nexus Talent Intelligence HUD
	 * ────────────────────────────────────────────────────────
	 * Full-screen, high-density dashboard for the Recruiter role.
	 *
	 * PANELS
	 * ──────
	 * TALENT FEED   — Paginated player cards (public data only). Search + filter
	 *                  by position, tier, min GPA, min VAN rating.
	 * WATCHLIST     — Bookmarked players with milestone-badge notifications.
	 * DETAIL PANEL  — Slide-in player dossier with Scout's Six growth sparklines
	 *                 and a "Digital Handshake" button to request PII access.
	 *
	 * ZERO-TRUST PII GATE
	 * ───────────────────
	 * Players' phone/email/address fields are NEVER fetched or rendered.
	 * A "Digital Handshake" writes to recruiter_handshakes/{id} and requires
	 * approval from the player's Director or Parent before PII is unlocked.
	 *
	 * DATA MODEL
	 * ──────────
	 * users/{email}            — public fields: name, position, tier, xp, stats, gpa, teamId
	 * recruiter_watchlist/{rEmail}/bookmarks/{pEmail} — saved players
	 * recruiter_handshakes/{id} — PII access requests
	 * stat_history/{pEmail}/snapshots/{id} — historical stat snapshots for growth charts
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import {
		collection,
		query,
		where,
		orderBy,
		limit,
		startAfter,
		getDocs,
		doc,
		setDoc,
		deleteDoc,
		getDoc,
		addDoc,
		serverTimestamp,
		type DocumentSnapshot,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	// ── Types ─────────────────────────────────────────────────────────────────

	interface PlayerCard {
		uid: string;
		name: string;
		position: string;
		tier: string;
		xp: number;
		vanRating: number;
		gpa: number | null;
		teamName?: string;
		clubName?: string;
		stats: Record<string, string>;
		isWatched: boolean;
		handshakeStatus: 'none' | 'pending' | 'accepted';
		verified_video_url?: string | null;
	}

	interface StatSnapshot {
		capturedAt: Date;
		stats: Record<string, number>;
		xp: number;
		tier: string;
	}

	type ActiveTab = 'feed' | 'watchlist';

	// ── State ─────────────────────────────────────────────────────────────────

	let activeTab = $state<ActiveTab>('feed');
	let players = $state<PlayerCard[]>([]);
	let watchlist = $state<PlayerCard[]>([]);
	let loading = $state(false);
	let loadingMore = $state(false);
	let error = $state('');
	let lastDoc = $state<DocumentSnapshot | null>(null);
	let hasMore = $state(true);
	const PAGE_SIZE = 20;

	// Filters
	let searchQuery = $state('');
	let filterPosition = $state('');
	let filterTier = $state('');
	let filterMinGpa = $state<number | null>(null);
	let filterMinVan = $state<number | null>(null);

	// Detail panel
	let selectedPlayer = $state<PlayerCard | null>(null);
	let detailOpen = $state(false);
	let snapshots = $state<StatSnapshot[]>([]);
	let snapshotsLoading = $state(false);
	let handshakeLoading = $state(false);

	// ── Derived ───────────────────────────────────────────────────────────────

	const recruiterEmail = $derived(authStore.user?.email?.toLowerCase() ?? '');

	const filteredPlayers = $derived.by(() => {
		let list = players;
		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.position.toLowerCase().includes(q) ||
					p.clubName?.toLowerCase().includes(q),
			);
		}
		if (filterPosition) list = list.filter((p) => p.position === filterPosition);
		if (filterTier) list = list.filter((p) => p.tier === filterTier);
		if (filterMinGpa !== null) list = list.filter((p) => (p.gpa ?? 0) >= (filterMinGpa ?? 0));
		if (filterMinVan !== null) list = list.filter((p) => p.vanRating >= (filterMinVan ?? 0));
		return list;
	});

	const positions = $derived([...new Set(players.map((p) => p.position).filter(Boolean))].sort());
	const tiers = ['ROOKIE', 'PRO', 'ELITE', 'VANGUARD'];

	const watchlistCount = $derived(watchlist.length);
	const watchlistNewMilestones = $derived(
		watchlist.filter((p) => p.tier === 'VANGUARD' || p.tier === 'ELITE').length,
	);

	// ── Data loading ──────────────────────────────────────────────────────────

	async function loadFeed(reset = false): Promise<void> {
		if (!browser) return;
		if (reset) {
			players = [];
			lastDoc = null;
			hasMore = true;
		}
		if (!hasMore) return;
		reset ? (loading = true) : (loadingMore = true);
		error = '';

		try {
			const col = collection(db, 'public_player_profiles');
			let q = query(
				col,
				orderBy('total_xp', 'desc'),
				limit(PAGE_SIZE),
			);
			if (lastDoc) q = query(col, orderBy('total_xp', 'desc'), limit(PAGE_SIZE), startAfter(lastDoc));

			const snap = await getDocs(q);
			if (snap.empty || snap.docs.length < PAGE_SIZE) hasMore = false;
			if (!snap.empty) lastDoc = snap.docs[snap.docs.length - 1];

			// Load watched set for badge display
			const watchedUids = new Set(watchlist.map((w) => w.uid));

			const newCards: PlayerCard[] = snap.docs.map((d) => {
				const data = d.data();
				const stats = data.stats ?? {};
				return {
					uid: d.id,
					name: (data.displayName || data.name || d.id).toUpperCase(),
					position: data.position ?? data.classification ?? 'PLAYER',
					tier: data.tier ?? 'ROOKIE',
					xp: Number(data.total_xp ?? 0),
					vanRating: Number(data.vanRating ?? (parseInt(stats.VAN ?? '0', 10) || 0)),
					gpa: typeof data.gpa === 'number' ? data.gpa : null,
					teamName: data.teamName,
					clubName: data.clubDisplayName || data.clubName,
					stats,
					isWatched: watchedUids.has(d.id),
					handshakeStatus: 'none',
					verified_video_url: data.verified_video_url || null,
				};
			});

			// Load handshake statuses for visible cards
			await _hydrateHandshakes(newCards);

			players = reset ? newCards : [...players, ...newCards];
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load talent feed.';
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	async function loadWatchlist(): Promise<void> {
		if (!browser || !recruiterEmail) return;
		try {
			const col = collection(db, 'recruiter_watchlist', recruiterEmail, 'bookmarks');
			const snap = await getDocs(col);
			watchlist = snap.docs.map((d) => {
				const data = d.data() as Partial<PlayerCard>;
				return {
					uid: d.id,
					name: (data.name ?? d.id).toUpperCase(),
					position: data.position ?? 'PLAYER',
					tier: data.tier ?? 'ROOKIE',
					xp: Number(data.xp ?? 0),
					vanRating: data.vanRating ?? 0,
					gpa: data.gpa ?? null,
					teamName: data.teamName,
					clubName: data.clubName,
					stats: data.stats ?? {},
					isWatched: true,
					handshakeStatus: data.handshakeStatus ?? 'none',
					verified_video_url: data.verified_video_url || null,
				};
			});
		} catch {
			// Silent — watchlist is additive, not critical
		}
	}

	async function _hydrateHandshakes(cards: PlayerCard[]): Promise<void> {
		if (!recruiterEmail || !cards.length) return;
		await Promise.all(
			cards.map(async (card) => {
				const hsId = `${recruiterEmail}__${card.uid}`;
				const ref = doc(db, 'recruiter_handshakes', hsId);
				const snap = await getDoc(ref);
				if (snap.exists()) {
					card.handshakeStatus = snap.data().status ?? 'pending';
				}
			}),
		);
	}

	// ── Watchlist toggle ──────────────────────────────────────────────────────

	async function toggleWatch(player: PlayerCard, ev: MouseEvent): Promise<void> {
		ev.stopPropagation();
		if (!recruiterEmail) return;
		const ref = doc(db, 'recruiter_watchlist', recruiterEmail, 'bookmarks', player.uid);
		if (player.isWatched) {
			await deleteDoc(ref);
			player.isWatched = false;
			watchlist = watchlist.filter((w) => w.uid !== player.uid);
		} else {
			await setDoc(ref, {
				...player,
				savedAt: serverTimestamp(),
			});
			player.isWatched = true;
			watchlist = [...watchlist, { ...player, isWatched: true }];
		}
		// Sync feed card
		players = players.map((p) =>
			p.uid === player.uid ? { ...p, isWatched: player.isWatched } : p,
		);
	}

	// ── Detail panel ──────────────────────────────────────────────────────────

	async function openDetail(player: PlayerCard): Promise<void> {
		selectedPlayer = player;
		detailOpen = true;
		snapshots = [];
		snapshotsLoading = true;
		try {
			const col = collection(db, 'stat_history', player.uid, 'snapshots');
			const q = query(col, orderBy('capturedAt', 'asc'), limit(8));
			const snap = await getDocs(q);
			snapshots = snap.docs.map((d) => {
				const data = d.data();
				return {
					capturedAt: data.capturedAt?.toDate() ?? new Date(),
					stats: data.stats ?? {},
					xp: Number(data.xp ?? 0),
					tier: data.tier ?? 'ROOKIE',
				};
			});
		} finally {
			snapshotsLoading = false;
		}
	}

	function closeDetail(): void {
		detailOpen = false;
		selectedPlayer = null;
		snapshots = [];
	}

	// ── Digital Handshake ─────────────────────────────────────────────────────

	async function requestHandshake(player: PlayerCard): Promise<void> {
		if (!recruiterEmail || handshakeLoading) return;
		handshakeLoading = true;
		try {
			const hsId = `${recruiterEmail}__${player.uid}`;
			await setDoc(doc(db, 'recruiter_handshakes', hsId), {
				recruiterEmail,
				playerUid: player.uid,
				playerName: player.name,
				status: 'pending',
				requestedAt: serverTimestamp(),
				recruiterClubId: authStore.tenantId,
			});
			if (selectedPlayer) {
				selectedPlayer = { ...selectedPlayer, handshakeStatus: 'pending' };
			}
			players = players.map((p) =>
				p.uid === player.uid ? { ...p, handshakeStatus: 'pending' } : p,
			);
		} finally {
			handshakeLoading = false;
		}
	}

	// ── Growth chart (pure SVG sparkline) ────────────────────────────────────

	function buildSparkline(
		points: number[],
		w = 120,
		h = 36,
	): { path: string; max: number; min: number; last: number; pct: number } {
		if (!points.length) return { path: '', max: 0, min: 0, last: 0, pct: 0 };
		const max = Math.max(...points);
		const min = Math.min(...points);
		const range = max - min || 1;
		const coords = points.map((v, i) => {
			const x = (i / Math.max(points.length - 1, 1)) * w;
			const y = h - ((v - min) / range) * h;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		});
		const last = points[points.length - 1];
		const pct = points.length >= 2
			? Math.round(((last - points[0]) / Math.abs(points[0] || 1)) * 100)
			: 0;
		return { path: `M ${coords.join(' L ')}`, max, min, last, pct };
	}

	function getStatSeries(key: string): number[] {
		return snapshots.map((s) => {
			const v = s.stats[key];
			return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
		});
	}

	// ── Tier accent ───────────────────────────────────────────────────────────

	function tierAccent(tier: string): string {
		switch (tier.toUpperCase()) {
			case 'VANGUARD': return '#14b8a6';
			case 'ELITE': return '#f59e0b';
			case 'PRO': return '#a855f7';
			default: return '#64748b';
		}
	}

	function tierBg(tier: string): string {
		return `${tierAccent(tier)}18`;
	}

	// ── Eligibility colour ────────────────────────────────────────────────────

	function eligColor(gpa: number | null): string {
		if (gpa === null) return 'rgba(100,116,139,0.7)';
		if (gpa >= 3.5) return '#fbbf24';
		if (gpa >= 2.0) return '#14b8a6';
		if (gpa >= 1.5) return '#f59e0b';
		return '#ff003c';
	}

	// ── Lifecycle ─────────────────────────────────────────────────────────────

	onMount(async () => {
		await loadWatchlist();
		await loadFeed(true);
	});

	function handleKeydown(ev: KeyboardEvent): void {
		if (ev.key === 'Escape' && detailOpen) closeDetail();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

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
				class:rp-tab--active={activeTab === 'feed'}
				onclick={() => (activeTab = 'feed')}
			>
				TALENT FEED
				{#if filteredPlayers.length}
					<span class="rp-tab__count">{filteredPlayers.length}</span>
				{/if}
			</button>
			<button
				class="rp-tab"
				class:rp-tab--active={activeTab === 'watchlist'}
				onclick={() => (activeTab = 'watchlist')}
			>
				WATCHLIST
				{#if watchlistCount}
					<span class="rp-tab__count" class:rp-tab__count--alert={watchlistNewMilestones > 0}>
						{watchlistCount}
					</span>
				{/if}
			</button>
		</nav>
	</header>

	<!-- ── FILTERS ─────────────────────────────────────────────────────────────── -->
	{#if activeTab === 'feed'}
		<div class="rp-filters">
			<div class="rp-filter-group rp-filter-group--search">
				<Icon name="action.search" size={13} strokeWidth={2.2} class="rp-filter-group__icon" />
				<input
					class="rp-input"
					type="search"
					placeholder="Search by name, position, club…"
					bind:value={searchQuery}
					aria-label="Search players"
				/>
			</div>
			<select class="rp-select" bind:value={filterPosition} aria-label="Filter by position">
				<option value="">ALL POSITIONS</option>
				{#each positions as pos}
					<option value={pos}>{pos}</option>
				{/each}
			</select>
			<select class="rp-select" bind:value={filterTier} aria-label="Filter by tier">
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
					value={filterMinVan ?? ''}
					oninput={(e) => { const v = parseInt((e.target as HTMLInputElement).value); filterMinVan = isNaN(v) ? null : v; }}
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
					value={filterMinGpa ?? ''}
					oninput={(e) => { const v = parseFloat((e.target as HTMLInputElement).value); filterMinGpa = isNaN(v) ? null : v; }}
					aria-label="Minimum GPA"
				/>
			</div>
			{#if searchQuery || filterPosition || filterTier || filterMinGpa !== null || filterMinVan !== null}
				<button
					class="rp-btn-ghost"
					onclick={() => { searchQuery=''; filterPosition=''; filterTier=''; filterMinGpa=null; filterMinVan=null; }}
				>CLEAR</button>
			{/if}
		</div>
	{/if}

	<!-- ── MAIN CONTENT ─────────────────────────────────────────────────────────── -->
	<div class="rp-body">
		{#if error}
			<div class="rp-error">
				<span>⚠ {error}</span>
				<button class="rp-btn-ghost" onclick={() => loadFeed(true)}>RETRY</button>
			</div>
		{/if}

		{#if activeTab === 'feed'}
			{#if loading}
				<div class="rp-loading">
					<span class="rp-spinner" aria-label="Loading"></span>
					<span>SCANNING TALENT DATABASE…</span>
				</div>
			{:else}
				<div class="rp-grid">
					{#each filteredPlayers as player (player.uid)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="rp-card"
							class:rp-card--vanguard={player.tier === 'VANGUARD'}
							style:--card-accent={tierAccent(player.tier)}
							onclick={() => openDetail(player)}
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
									onclick={(e) => toggleWatch(player, e)}
									aria-label={player.isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
									title={player.isWatched ? 'Watching' : 'Watch'}
								>
									<svg width="13" height="13" viewBox="0 0 24 24" fill={player.isWatched ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2.2" aria-hidden="true">
										<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/>
									</svg>
								</button>
							</div>
							{#if player.verified_video_url}
								<div class="rp-card__video-badge">▶ VERIFIED TRIAL</div>
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
							{#if player.handshakeStatus === 'pending'}
								<div class="rp-card__hs rp-card__hs--pending">HANDSHAKE PENDING</div>
							{:else if player.handshakeStatus === 'accepted'}
								<div class="rp-card__hs rp-card__hs--accepted">PII UNLOCKED</div>
							{/if}

							<!-- Club attribution (no PII) -->
							{#if player.clubName}
								<div class="rp-card__club">{player.clubName}</div>
							{/if}
						</div>
					{/each}

					{#if filteredPlayers.length === 0 && !loading}
						<div class="rp-empty">
							<span>NO OPERATIVES MATCH CURRENT FILTERS</span>
						</div>
					{/if}
				</div>

				{#if hasMore && !loadingMore}
					<div class="rp-load-more">
						<button class="rp-btn-ghost rp-btn-ghost--lg" onclick={() => loadFeed()}>
							LOAD MORE OPERATIVES
						</button>
					</div>
				{/if}
				{#if loadingMore}
					<div class="rp-load-more"><span class="rp-spinner"></span></div>
				{/if}
			{/if}

		{:else if activeTab === 'watchlist'}
			{#if watchlist.length === 0}
				<div class="rp-empty rp-empty--center">
					<Icon name="game.star" size={40} class="tw-opacity-20" />
					<span>YOUR WATCHLIST IS EMPTY</span>
					<span class="rp-empty__sub">Click the ★ on any player to track milestones.</span>
				</div>
			{:else}
				<div class="rp-grid">
					{#each watchlist as player (player.uid)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="rp-card rp-card--watched"
							class:rp-card--vanguard={player.tier === 'VANGUARD'}
							style:--card-accent={tierAccent(player.tier)}
							onclick={() => openDetail(player)}
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
{#if detailOpen && selectedPlayer}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="rp-detail-backdrop" onclick={closeDetail}></div>

	<aside class="rp-detail" aria-label="Player dossier: {selectedPlayer.name}">
		<header class="rp-detail__header">
			<div class="rp-detail__id">
				<span
					class="rp-detail__tier-dot"
					style:background={tierAccent(selectedPlayer.tier)}
					style:box-shadow="0 0 8px {tierAccent(selectedPlayer.tier)}"
				></span>
				<div>
					<h2 class="rp-detail__name">{selectedPlayer.name}</h2>
					<p class="rp-detail__sub">
						{selectedPlayer.position}
						{#if selectedPlayer.clubName} · {selectedPlayer.clubName}{/if}
					</p>
				</div>
			</div>
			<button class="rp-detail__close" onclick={closeDetail} aria-label="Close detail panel">✕</button>
		</header>

		<!-- Key metrics row -->
		<div class="rp-detail__kpis">
			<div class="rp-detail__kpi">
				<span class="rp-detail__kpi-val" style:color={tierAccent(selectedPlayer.tier)}>{selectedPlayer.vanRating}</span>
				<span class="rp-detail__kpi-label">VAN RATING</span>
			</div>
			<div class="rp-detail__kpi">
				<span class="rp-detail__kpi-val" style:color={tierAccent(selectedPlayer.tier)}>
					<span class="rp-detail__kpi-chip" style:background={tierBg(selectedPlayer.tier)} style:color={tierAccent(selectedPlayer.tier)} style:border-color="{tierAccent(selectedPlayer.tier)}44">
						{selectedPlayer.tier}
					</span>
				</span>
				<span class="rp-detail__kpi-label">TIER</span>
			</div>
			<div class="rp-detail__kpi">
				<span class="rp-detail__kpi-val">{selectedPlayer.xp.toLocaleString()}</span>
				<span class="rp-detail__kpi-label">XP</span>
			</div>
			{#if selectedPlayer.gpa !== null}
				<div class="rp-detail__kpi">
					<span class="rp-detail__kpi-val" style:color={eligColor(selectedPlayer.gpa)}>
						{selectedPlayer.gpa.toFixed(2)}
						{#if selectedPlayer.gpa >= 3.5}<span title="Scholar">🎓</span>{/if}
					</span>
					<span class="rp-detail__kpi-label">GPA</span>
				</div>
			{/if}
		</div>

		<!-- Scout's Six current stats -->
		{#if Object.keys(selectedPlayer.stats).length}
			<section class="rp-detail__section">
				<h3 class="rp-detail__section-title">SCOUT'S SIX · CURRENT</h3>
				<div class="rp-detail__stats-grid">
					{#each Object.entries(selectedPlayer.stats).filter(([k]) => k !== 'VAN') as [key, value]}
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
			{#if snapshotsLoading}
				<div class="rp-detail__sparkline-loading">
					<span class="rp-spinner rp-spinner--sm"></span>
					<span>LOADING HISTORY…</span>
				</div>
			{:else if snapshots.length < 2}
				<p class="rp-detail__empty-msg">Insufficient history for growth analysis. (Requires ≥ 2 data points)</p>
			{:else}
				<div class="rp-detail__sparklines">
					{#each ['PAC', 'ACC', 'AGI', 'STM', 'POW'] as statKey}
						{@const series = getStatSeries(statKey)}
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
											<stop offset="0%" stop-color={tierAccent(selectedPlayer.tier)} stop-opacity="0.35"/>
											<stop offset="100%" stop-color={tierAccent(selectedPlayer.tier)} stop-opacity="0"/>
										</linearGradient>
									</defs>
									<path
										d="{spark.path} L 120,32 L 0,32 Z"
										fill="url(#spark-grad-{statKey})"
									/>
									<path
										d={spark.path}
										fill="none"
										stroke={tierAccent(selectedPlayer.tier)}
										stroke-width="1.5"
									/>
								</svg>
								<span class="rp-sparkline-card__last">{spark.last.toFixed(spark.last < 10 ? 2 : 0)}</span>
							</div>
						{/if}
					{/each}
				</div>
				<p class="rp-detail__history-range">
					{snapshots.length} snapshots · {snapshots[0].capturedAt.toLocaleDateString()} – {snapshots[snapshots.length - 1].capturedAt.toLocaleDateString()}
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
			{#if selectedPlayer.handshakeStatus === 'none'}
				<button
					class="rp-hs-btn"
					onclick={() => selectedPlayer && requestHandshake(selectedPlayer)}
					disabled={handshakeLoading}
				>
					{handshakeLoading ? 'SUBMITTING…' : '🤝 REQUEST DIGITAL HANDSHAKE'}
				</button>
			{:else if selectedPlayer.handshakeStatus === 'pending'}
				<div class="rp-hs-status rp-hs-status--pending">
					⏳ HANDSHAKE PENDING — Awaiting Director/Parent Approval
				</div>
			{:else if selectedPlayer.handshakeStatus === 'accepted'}
				<div class="rp-hs-status rp-hs-status--accepted">
					✓ HANDSHAKE ACCEPTED — PII Access Unlocked
				</div>
			{/if}
		</section>

		<!-- Verified Video Trial -->
		{#if selectedPlayer.verified_video_url}
			<section class="rp-detail__section">
				<h3 class="rp-detail__section-title">VERIFIED 30S TRIAL</h3>
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					src={selectedPlayer.verified_video_url}
					controls
					playsinline
					class="rp-detail__video"
				></video>
			</section>
		{/if}
	</aside>
{/if}

<style>
	/* ── Root ────────────────────────────────────────────────────────────────── */
	.rp-root {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: #010409;
		color: rgba(226, 232, 240, 0.9);
		font-family: 'JetBrains Mono', monospace;
	}

	/* ── Header ──────────────────────────────────────────────────────────────── */
	.rp-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		background: rgba(1, 4, 9, 0.95);
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		position: sticky;
		top: 0;
		z-index: 50;
	}
	.rp-header__brand {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.rp-header__icon {
		color: #14b8a6;
		opacity: 0.8;
	}
	.rp-header__title {
		font-size: 0.75rem;
		font-weight: 900;
		letter-spacing: 0.25em;
		color: #14b8a6;
	}
	.rp-header__badge {
		padding: 2px 7px;
		border-radius: 3px;
		font-size: 0.45rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		background: rgba(255, 0, 60, 0.1);
		border: 1px solid rgba(255, 0, 60, 0.3);
		color: rgba(255, 60, 80, 0.85);
	}

	/* ── Tabs ────────────────────────────────────────────────────────────────── */
	.rp-tabs {
		display: flex;
		gap: 0;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 6px;
		overflow: hidden;
	}
	.rp-tab {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 1rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.15em;
		color: rgba(255, 255, 255, 0.35);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: color 0.2s, background 0.2s;
	}
	.rp-tab:hover { color: rgba(255, 255, 255, 0.65); background: rgba(255,255,255,0.03); }
	.rp-tab--active {
		color: #14b8a6;
		background: rgba(20, 184, 166, 0.06);
		border-bottom: 2px solid #14b8a6;
	}
	.rp-tab__count {
		padding: 1px 5px;
		border-radius: 9999px;
		font-size: 0.5rem;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.5);
	}
	.rp-tab__count--alert {
		background: rgba(245, 158, 11, 0.15);
		color: rgba(245, 158, 11, 0.9);
		animation: rp-pulse 1.4s ease-in-out infinite;
	}

	/* ── Filters ─────────────────────────────────────────────────────────────── */
	.rp-filters {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(0, 0, 0, 0.2);
	}
	.rp-filter-group {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.rp-filter-group--search { flex: 1; min-width: 160px; }
	.rp-filter-group__icon { color: rgba(255,255,255,0.25); flex-shrink: 0; }
	.rp-filter-group__label {
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: rgba(255,255,255,0.3);
		white-space: nowrap;
	}
	.rp-input {
		width: 100%;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 5px;
		padding: 0.35rem 0.6rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		color: rgba(226, 232, 240, 0.9);
		outline: none;
		transition: border-color 0.2s;
	}
	.rp-input::placeholder { color: rgba(255,255,255,0.2); }
	.rp-input:focus { border-color: rgba(20, 184, 166, 0.4); }
	.rp-input--num { width: 56px; text-align: right; }
	.rp-select {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 5px;
		padding: 0.35rem 0.6rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		color: rgba(226, 232, 240, 0.7);
		outline: none;
		cursor: pointer;
		transition: border-color 0.2s;
	}
	.rp-select:focus { border-color: rgba(20, 184, 166, 0.4); }
	.rp-select option { background: #0d1117; }

	/* ── Body ────────────────────────────────────────────────────────────────── */
	.rp-body { padding: 1.25rem 1.5rem; flex: 1; }

	/* ── Grid ────────────────────────────────────────────────────────────────── */
	.rp-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
	}
	@media (max-width: 480px) {
		.rp-grid { grid-template-columns: 1fr 1fr; }
		.rp-body { padding: 0.75rem; }
	}

	/* ── Player card ─────────────────────────────────────────────────────────── */
	.rp-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.85rem 0.85rem 0.7rem;
		border-radius: var(--vanguard-radius-sm);
		border: 1px solid var(--vanguard-border);
		background: rgba(10, 14, 22, 0.85);
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		box-shadow: var(--vanguard-elev-2);
		cursor: pointer;
		overflow: hidden;
		transition: border-color 0.25s, box-shadow 0.25s, transform 0.15s;
	}
	.rp-card:hover {
		border-color: rgba(var(--card-accent, 0, 240, 255), 0.35);
		box-shadow: 0 0 24px rgba(0, 0, 0, 0.4);
		transform: translateY(-2px);
	}
	.rp-card--vanguard {
		border-color: rgba(20, 184, 166, 0.2);
		box-shadow: 0 0 20px rgba(20, 184, 166, 0.08);
	}
	.rp-card--watched { border-color: rgba(245, 158, 11, 0.2); }

	.rp-card__accent-bar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		opacity: 0.7;
	}

	.rp-card__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.4rem;
		margin-top: 4px;
	}
	.rp-card__name-block {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.rp-card__name {
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: white;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.rp-card__pos {
		font-size: 0.5rem;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.35);
		text-transform: uppercase;
	}

	.rp-watch-btn {
		padding: 4px;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.2);
		cursor: pointer;
		border-radius: 4px;
		transition: color 0.2s, background 0.2s;
		flex-shrink: 0;
		min-height: 28px;
		min-width: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.rp-watch-btn:hover { color: rgba(245, 158, 11, 0.8); background: rgba(245, 158, 11, 0.07); }
	.rp-watch-btn--active { color: rgba(245, 158, 11, 0.9); }

	.rp-card__metrics {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.rp-card__metric {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.rp-card__metric-val {
		font-size: 1.1rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.rp-card__metric-label {
		font-size: 0.45rem;
		letter-spacing: 0.15em;
		color: rgba(255, 255, 255, 0.3);
		text-transform: uppercase;
	}
	.rp-card__tier-chip {
		padding: 2px 7px;
		border-radius: 4px;
		font-size: 0.5rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		border: 1px solid;
	}
	.rp-card__scholar-star { font-size: 0.65rem; margin-left: 2px; }

	.rp-card__xp-bar-wrap {
		height: 2px;
		background: rgba(255,255,255,0.06);
		border-radius: 1px;
		overflow: hidden;
	}
	.rp-card__xp-bar { height: 100%; border-radius: 1px; transition: width 0.5s ease; }

	.rp-card__hs {
		font-size: 0.45rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		padding: 2px 6px;
		border-radius: 3px;
		align-self: flex-start;
	}
	.rp-card__hs--pending {
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.25);
		color: rgba(245, 158, 11, 0.8);
	}
	.rp-card__hs--accepted {
		background: rgba(20, 184, 166, 0.06);
		border: 1px solid rgba(20, 184, 166, 0.2);
		color: rgba(20, 184, 166, 0.8);
	}

	.rp-card__club {
		font-size: 0.45rem;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.2);
		text-transform: uppercase;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.rp-card__video-badge {
		font-size: 0.45rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		padding: 2px 6px;
		border-radius: 4px;
		background: rgba(20, 184, 166, 0.1);
		color: #14b8a6;
		border: 1px solid rgba(20, 184, 166, 0.25);
		align-self: flex-start;
		margin-bottom: 2px;
	}

	.rp-milestone-badge {
		font-size: 0.5rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: rgba(245, 158, 11, 0.9);
		animation: rp-pulse 1.4s ease-in-out infinite;
	}

	/* ── States ──────────────────────────────────────────────────────────────── */
	.rp-loading, .rp-empty, .rp-empty--center {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.25);
	}
	.rp-empty--center { flex-direction: column; }
	.rp-empty__sub { font-size: 0.55rem; color: rgba(255,255,255,0.18); }
	.rp-error {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding: 0.6rem 0.9rem;
		border-radius: 6px;
		background: rgba(255, 0, 60, 0.07);
		border: 1px solid rgba(255, 0, 60, 0.2);
		font-size: 0.6rem;
		color: rgba(255, 80, 100, 0.9);
	}
	.rp-load-more {
		display: flex;
		justify-content: center;
		padding: 1.5rem 0;
	}
	.rp-btn-ghost {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		padding: 0.4rem 0.9rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		transition: color 0.2s, border-color 0.2s;
		min-height: 36px;
	}
	.rp-btn-ghost:hover { color: rgba(20, 184, 166,0.8); border-color: rgba(20, 184, 166,0.35); }
	.rp-btn-ghost--lg { padding: 0.6rem 1.6rem; font-size: 0.6rem; }

	/* ── Spinner ─────────────────────────────────────────────────────────────── */
	.rp-spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(20, 184, 166,0.2);
		border-top-color: #14b8a6;
		border-radius: 50%;
		animation: rp-spin 0.75s linear infinite;
	}
	.rp-spinner--sm { width: 12px; height: 12px; }

	/* ── Detail panel ────────────────────────────────────────────────────────── */
	.rp-detail-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
		z-index: 200;
	}
	.rp-detail {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(520px, 96vw);
		background: rgba(8, 12, 22, 0.98);
		border-left: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: -20px 0 60px rgba(0, 0, 0, 0.5);
		z-index: 201;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		animation: rp-slide-in 0.25s ease-out;
	}
	@media (max-width: 520px) {
		.rp-detail { width: 100vw; border-left: none; border-top: 1px solid rgba(255,255,255,0.08); }
	}

	.rp-detail__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		position: sticky;
		top: 0;
		background: rgba(8, 12, 22, 0.98);
		z-index: 1;
	}
	.rp-detail__id { display: flex; align-items: flex-start; gap: 0.75rem; }
	.rp-detail__tier-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		margin-top: 6px;
	}
	.rp-detail__name {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: white;
	}
	.rp-detail__sub {
		margin: 2px 0 0;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.35);
	}
	.rp-detail__close {
		padding: 6px 10px;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 6px;
		color: rgba(255,255,255,0.4);
		cursor: pointer;
		font-size: 0.7rem;
		min-height: 36px;
		flex-shrink: 0;
		transition: color 0.2s;
	}
	.rp-detail__close:hover { color: rgba(255,255,255,0.8); }

	.rp-detail__kpis {
		display: flex;
		gap: 0;
		border-bottom: 1px solid rgba(255,255,255,0.06);
	}
	.rp-detail__kpi {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 1rem 0.5rem;
		border-right: 1px solid rgba(255,255,255,0.06);
	}
	.rp-detail__kpi:last-child { border-right: none; }
	.rp-detail__kpi-val {
		font-size: 1.25rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: white;
		line-height: 1;
	}
	.rp-detail__kpi-chip {
		padding: 3px 8px;
		border-radius: 4px;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		border: 1px solid;
	}
	.rp-detail__kpi-label {
		font-size: 0.45rem;
		letter-spacing: 0.2em;
		color: rgba(255,255,255,0.3);
		text-transform: uppercase;
	}

	.rp-detail__section {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255,255,255,0.06);
	}
	.rp-detail__section--handshake {
		background: rgba(0, 0, 0, 0.2);
	}
	.rp-detail__section-title {
		margin: 0 0 0.75rem;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.25em;
		color: rgba(255,255,255,0.3);
		text-transform: uppercase;
	}

	.rp-detail__stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}
	.rp-detail__stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 0.5rem;
		border-radius: 6px;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.05);
	}
	.rp-detail__stat-label {
		font-size: 0.45rem;
		letter-spacing: 0.15em;
		color: rgba(255,255,255,0.3);
		text-transform: uppercase;
	}
	.rp-detail__stat-value {
		font-size: 0.85rem;
		font-weight: 700;
		color: white;
		font-variant-numeric: tabular-nums;
	}

	/* ── Sparklines ──────────────────────────────────────────────────────────── */
	.rp-detail__sparklines {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 0.6rem;
	}
	@media (max-width: 400px) {
		.rp-detail__sparklines { grid-template-columns: 1fr 1fr; }
		.rp-detail__stats-grid { grid-template-columns: 1fr 1fr; }
	}
	.rp-sparkline-card {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 0.6rem;
		border-radius: 8px;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.06);
	}
	.rp-sparkline-card__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.rp-sparkline-card__key {
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: rgba(255,255,255,0.4);
	}
	.rp-sparkline-card__delta {
		font-size: 0.55rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: rgba(255,255,255,0.3);
	}
	.rp-sparkline-card__delta--up { color: rgba(20, 184, 166, 0.8); }
	.rp-sparkline-card__delta--down { color: rgba(255, 0, 60, 0.8); }
	.rp-sparkline-card__svg {
		width: 100%;
		height: 32px;
		display: block;
	}
	.rp-sparkline-card__last {
		font-size: 0.8rem;
		font-weight: 900;
		color: white;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.rp-detail__sparkline-loading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.6rem;
		color: rgba(255,255,255,0.3);
		padding: 0.5rem 0;
	}
	.rp-detail__empty-msg {
		font-size: 0.6rem;
		color: rgba(255,255,255,0.25);
		margin: 0;
	}
	.rp-detail__history-range {
		margin: 0.5rem 0 0;
		font-size: 0.5rem;
		color: rgba(255,255,255,0.2);
		letter-spacing: 0.06em;
	}

	/* ── Handshake ───────────────────────────────────────────────────────────── */
	.rp-detail__hs-desc {
		font-size: 0.6rem;
		color: rgba(255,255,255,0.35);
		line-height: 1.6;
		margin: 0 0 0.75rem;
	}
	.rp-hs-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 1.2rem;
		border-radius: 8px;
		border: 1px solid rgba(20, 184, 166, 0.35);
		background: rgba(20, 184, 166, 0.06);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: #14b8a6;
		cursor: pointer;
		transition: background 0.2s, box-shadow 0.2s;
		min-height: 44px;
	}
	.rp-hs-btn:hover:not(:disabled) {
		background: rgba(20, 184, 166, 0.12);
		box-shadow: 0 0 20px rgba(20, 184, 166, 0.2);
	}
	.rp-hs-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.rp-hs-status {
		padding: 0.6rem 0.9rem;
		border-radius: 6px;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}
	.rp-hs-status--pending {
		background: rgba(245, 158, 11, 0.07);
		border: 1px solid rgba(245, 158, 11, 0.25);
		color: rgba(245, 158, 11, 0.85);
	}
	.rp-hs-status--accepted {
		background: rgba(20, 184, 166, 0.06);
		border: 1px solid rgba(20, 184, 166, 0.25);
		color: rgba(20, 184, 166, 0.85);
	}

	/* ── Video ───────────────────────────────────────────────────────────────── */
	.rp-detail__video {
		width: 100%;
		border-radius: 8px;
		background: #000;
		border: 1px solid rgba(255,255,255,0.1);
		outline: none;
	}

	/* ── Keyframes ───────────────────────────────────────────────────────────── */
	@keyframes rp-spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}
	@keyframes rp-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.55; }
	}
	@keyframes rp-slide-in {
		from { transform: translateX(100%); opacity: 0; }
		to   { transform: translateX(0); opacity: 1; }
	}
</style>
