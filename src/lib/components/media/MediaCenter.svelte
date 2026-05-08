<script lang="ts">
	/**
	 * MediaCenter.svelte — NEXUS MEDIA HUB
	 * ─────────────────────────────────────
	 * A slide-out drawer exposing two views: NEWS and PODCASTS.
	 * Bound to the global `integrations` singleton — audio continues playing
	 * when the drawer is closed.
	 *
	 * Stark/Vanguard aesthetic:
	 *   • Obsidian glass backdrop (backdrop-blur-3xl)
	 *   • Cyan (#00f0ff) left-border on news cards
	 *   • All external images: grayscale(50%) + slight sepia — never clashes with UI
	 *   • Lazy-loaded images via loading="lazy"
	 */

	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { integrations } from '$lib/services/integrations.svelte.js';
	import type { Podcast, Episode } from '$lib/services/integrations.svelte.js';

	// ── Props ──────────────────────────────────────────────────────────────────
	interface Props {
		open?: boolean;
		onclose?: () => void;
	}
	let { open = $bindable(false), onclose }: Props = $props();

	// ── State ──────────────────────────────────────────────────────────────────
	type Tab = 'news' | 'podcasts';
	let activeTab = $state<Tab>('news');
	let expandedPodcast = $state<Podcast | null>(null);

	type NewsCategory = 'general' | 'us' | 'youth';
	const NEWS_CATS: { id: NewsCategory; label: string }[] = [
		{ id: 'general', label: 'GLOBAL' },
		{ id: 'us', label: 'US' },
		{ id: 'youth', label: 'YOUTH' },
	];

	// ── Lifecycle ──────────────────────────────────────────────────────────────
	$effect(() => {
		if (!browser || !open) return;
		// Lazy-load content on first open
		if (activeTab === 'news' && integrations.articles.length === 0 && !integrations.newsLoading) {
			integrations.fetchNews('general');
		}
		if (activeTab === 'podcasts' && integrations.podcasts.length === 0 && !integrations.podcastsLoading) {
			integrations.searchPodcasts('soccer coaching');
		}
	});

	$effect(() => {
		if (!browser) return;
		if (activeTab === 'podcasts' && integrations.podcasts.length === 0 && !integrations.podcastsLoading) {
			integrations.searchPodcasts('soccer coaching');
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
			onclose?.();
		}
	}

	// ── Podcast helpers ────────────────────────────────────────────────────────
	async function togglePodcast(podcast: Podcast) {
		if (expandedPodcast?.id === podcast.id) {
			expandedPodcast = null;
			return;
		}
		expandedPodcast = podcast;
		await integrations.loadEpisodes(podcast);
	}

	function quickPlay(episode: Episode, podcast: Podcast, e: MouseEvent) {
		e.stopPropagation();
		integrations.play(episode, podcast);
	}

	// ── News helpers ───────────────────────────────────────────────────────────
	function fmtDate(iso: string | null): string {
		if (!iso) return '';
		try {
			return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		} catch {
			return '';
		}
	}

	function fmtDuration(raw: string): string {
		if (!raw) return '';
		if (raw.includes(':')) return raw;
		const secs = parseInt(raw, 10);
		if (isNaN(secs)) return raw;
		const m = Math.floor(secs / 60);
		const s = secs % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	// Inline helper — avoids invalid $derived placement; used directly in template
	function isCurrentTrack(episodeId: string): boolean {
		return integrations.nowPlaying?.episode.id === episodeId;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="mc-backdrop"
		role="presentation"
		onclick={() => { open = false; onclose?.(); }}
		aria-hidden="true"
	></div>

	<!-- Drawer panel -->
	<aside class="mc-drawer" role="complementary" aria-label="Media Hub">
		<!-- ── Header ─────────────────────────────────────────────────────────── -->
		<header class="mc-header">
			<div class="mc-header__left">
				<span class="mc-eyebrow">NEXUS MEDIA HUB</span>
				<div class="mc-tabs" role="tablist">
					{#each ([['news', '⬡ NEWS'], ['podcasts', '▶ PODCASTS']] as const) as [id, label]}
						<button
							class="mc-tab"
							class:mc-tab--active={activeTab === id}
							role="tab"
							aria-selected={activeTab === id}
							onclick={() => { activeTab = id; }}
						>{label}</button>
					{/each}
				</div>
			</div>
			<button
				class="mc-close"
				onclick={() => { open = false; onclose?.(); }}
				aria-label="Close Media Hub"
			>✕</button>
		</header>

		<!-- ── NEWS VIEW ─────────────────────────────────────────────────────── -->
		{#if activeTab === 'news'}
			<div class="mc-news-toolbar">
				{#each NEWS_CATS as cat}
					<button
						class="mc-cat-btn"
						class:mc-cat-btn--active={integrations.newsCategory === cat.id}
						onclick={() => integrations.fetchNews(cat.id)}
					>{cat.label}</button>
				{/each}
				<div class="mc-search-wrap">
					<input
						class="mc-search"
						type="search"
						placeholder="Filter headlines…"
						bind:value={integrations.newsSearchQuery}
						aria-label="Filter news"
					/>
				</div>
			</div>

			<div class="mc-scroll">
				{#if integrations.newsLoading}
					<div class="mc-loading">
						<span class="mc-spin" aria-hidden="true"></span>
						FETCHING INTEL FEED…
					</div>
				{:else if integrations.newsError}
					<div class="mc-err" role="alert">
						<span>⚠ {integrations.newsError}</span>
						<button class="mc-retry" onclick={() => integrations.fetchNews(integrations.newsCategory)}>RETRY</button>
					</div>
				{:else if integrations.filteredArticles.length === 0}
					<div class="mc-empty">No articles found.</div>
				{:else}
					<ul class="mc-news-list" role="list">
						{#each integrations.filteredArticles as article (article.id)}
							<li class="mc-news-card">
								{#if article.image}
									<div class="mc-news-card__img-wrap" aria-hidden="true">
										<img
											class="mc-news-card__img"
											src={article.image}
											alt=""
											loading="lazy"
											referrerpolicy="no-referrer"
										/>
									</div>
								{/if}
								<div class="mc-news-card__body">
									<div class="mc-news-card__meta">
										<span class="mc-news-card__source">{article.source}</span>
										{#if article.pubDate}
											<span class="mc-news-card__date">{fmtDate(article.pubDate)}</span>
										{/if}
									</div>
									<a
										class="mc-news-card__title"
										href={article.link}
										target="_blank"
										rel="noopener noreferrer"
									>{article.title}</a>
									{#if article.description}
										<p class="mc-news-card__desc">{article.description}</p>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
					{#if integrations.newsFetchedAt}
						<p class="mc-fetch-ts">Updated {fmtDate(integrations.newsFetchedAt)}</p>
					{/if}
				{/if}
			</div>
		{/if}

		<!-- ── PODCAST VIEW ──────────────────────────────────────────────────── -->
		{#if activeTab === 'podcasts'}
			<div class="mc-news-toolbar">
				<input
					class="mc-search"
					type="search"
					placeholder="Search podcasts…"
					bind:value={integrations.podcastSearchQuery}
					aria-label="Search podcasts"
				/>
				<button
					class="mc-cat-btn mc-cat-btn--active"
					onclick={() => integrations.searchPodcasts()}
					disabled={integrations.podcastsLoading}
				>
					{integrations.podcastsLoading ? '…' : '↵ SEARCH'}
				</button>
			</div>

			<div class="mc-scroll">
				{#if integrations.podcastsLoading && integrations.podcasts.length === 0}
					<div class="mc-loading">
						<span class="mc-spin" aria-hidden="true"></span>
						SCANNING PODCAST FREQUENCIES…
					</div>
				{:else if integrations.podcastsError}
					<div class="mc-err" role="alert">
						<span>⚠ {integrations.podcastsError}</span>
						<button class="mc-retry" onclick={() => integrations.searchPodcasts()}>RETRY</button>
					</div>
				{:else if integrations.podcasts.length === 0}
					<div class="mc-empty">No podcasts found. Try a different search.</div>
				{:else}
					<div class="mc-podcast-grid">
						{#each integrations.podcasts as podcast (podcast.id)}
							<div class="mc-pod-card" class:mc-pod-card--expanded={expandedPodcast?.id === podcast.id}>
								<!-- Cover + quick info -->
								<button
									class="mc-pod-card__cover-btn"
									onclick={() => togglePodcast(podcast)}
									aria-expanded={expandedPodcast?.id === podcast.id}
								>
									{#if podcast.coverUrl}
										<img
											class="mc-pod-cover"
											src={podcast.coverUrl}
											alt={podcast.name}
											loading="lazy"
											referrerpolicy="no-referrer"
										/>
									{:else}
										<div class="mc-pod-cover mc-pod-cover--placeholder" aria-hidden="true">▶</div>
									{/if}
									<div class="mc-pod-card__label">
										<span class="mc-pod-name">{podcast.name}</span>
										<span class="mc-pod-author">{podcast.author}</span>
									</div>
								</button>

								<!-- Episode list (expanded) -->
								{#if expandedPodcast?.id === podcast.id}
									<div class="mc-episodes">
										{#if integrations.episodesLoading}
											<div class="mc-loading mc-loading--sm">
												<span class="mc-spin" aria-hidden="true"></span>
												Loading episodes…
											</div>
										{:else if integrations.episodesError}
											<div class="mc-err" role="alert">{integrations.episodesError}</div>
										{:else if integrations.episodes.length === 0}
											<div class="mc-empty">No episodes available.</div>
										{:else}
											{#each integrations.episodes as ep (ep.id)}
												{@const active = integrations.nowPlaying?.episode.id === ep.id}
												<div class="mc-ep" class:mc-ep--active={active}>
													<div class="mc-ep__info">
														<span class="mc-ep__title">{ep.title}</span>
														<span class="mc-ep__meta">
															{#if ep.pubDate}{fmtDate(ep.pubDate)} · {/if}
															{fmtDuration(ep.duration)}
														</span>
													</div>
													<button
														class="mc-ep__play"
														class:mc-ep__play--playing={active && integrations.isPlaying}
														onclick={(e) => quickPlay(ep, podcast, e)}
														aria-label={active && integrations.isPlaying ? 'Pause' : 'Play'}
													>
														{#if active && integrations.isPlaying}
															<span class="mc-ep__bars" aria-hidden="true">
																<span></span><span></span><span></span>
															</span>
														{:else}
															▶
														{/if}
													</button>
												</div>
											{/each}
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</aside>
{/if}

<style>
	/* ── Backdrop ───────────────────────────────────────────────────────────── */
	.mc-backdrop {
		position: fixed; inset: 0; z-index: 1100;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		animation: mcFadeIn 0.2s ease;
	}

	/* ── Drawer ─────────────────────────────────────────────────────────────── */
	.mc-drawer {
		position: fixed; top: 0; right: 0; bottom: 0; z-index: 1101;
		width: min(420px, 100vw);
		display: flex; flex-direction: column;
		background: rgba(5, 5, 14, 0.97);
		border-left: 1px solid rgba(0, 240, 255, 0.12);
		box-shadow: -12px 0 60px rgba(0, 0, 0, 0.6);
		animation: mcSlideIn 0.25s cubic-bezier(0.22, 1, 0.36, 1);
		overflow: hidden;
	}

	/* ── Header ─────────────────────────────────────────────────────────────── */
	.mc-header {
		display: flex; align-items: flex-start; justify-content: space-between;
		padding: 1rem 1rem 0;
		border-bottom: 1px solid rgba(0, 240, 255, 0.08);
		flex-shrink: 0;
	}
	.mc-header__left { display: flex; flex-direction: column; gap: 0.6rem; }
	.mc-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.5rem; font-weight: 800; letter-spacing: 0.25em;
		color: rgba(0, 240, 255, 0.45);
	}

	.mc-tabs { display: flex; gap: 0; }
	.mc-tab {
		padding: 0.45rem 0.875rem;
		background: transparent;
		border: none; border-bottom: 2px solid transparent;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.3);
		cursor: pointer; transition: all 0.15s;
		min-height: 44px; /* touch target */
	}
	.mc-tab--active { color: #00f0ff; border-bottom-color: #00f0ff; }
	.mc-tab:hover:not(.mc-tab--active) { color: rgba(255, 255, 255, 0.6); }

	.mc-close {
		width: 36px; height: 36px; min-height: 44px; /* touch target via padding */
		padding: 4px;
		display: flex; align-items: center; justify-content: center;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.35);
		font-size: 0.8rem;
		cursor: pointer; transition: all 0.15s;
		margin-top: 2px;
	}
	.mc-close:hover { border-color: rgba(255, 50, 80, 0.4); color: rgba(255, 50, 80, 0.8); }

	/* ── Toolbar ────────────────────────────────────────────────────────────── */
	.mc-news-toolbar {
		display: flex; align-items: center; flex-wrap: wrap; gap: 0.4rem;
		padding: 0.65rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		flex-shrink: 0;
	}
	.mc-cat-btn {
		padding: 0.3rem 0.65rem; min-height: 44px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 4px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.58rem; font-weight: 700; letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.3);
		cursor: pointer; transition: all 0.15s;
	}
	.mc-cat-btn--active {
		background: rgba(0, 240, 255, 0.08);
		border-color: rgba(0, 240, 255, 0.3);
		color: #00f0ff;
	}
	.mc-cat-btn:hover:not(:disabled):not(.mc-cat-btn--active) {
		border-color: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.6);
	}
	.mc-cat-btn:disabled { opacity: 0.4; cursor: not-allowed; }

	.mc-search-wrap { flex: 1; min-width: 0; }
	.mc-search {
		width: 100%; padding: 0.35rem 0.65rem; min-height: 44px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 4px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.68rem;
		color: rgba(255, 255, 255, 0.7);
		outline: none; transition: border-color 0.15s;
	}
	.mc-search::placeholder { color: rgba(255, 255, 255, 0.25); }
	.mc-search:focus { border-color: rgba(0, 240, 255, 0.35); }

	/* ── Scrollable body ────────────────────────────────────────────────────── */
	.mc-scroll {
		flex: 1; overflow-y: auto; overscroll-behavior: contain;
		padding: 0.5rem 0;
	}
	.mc-scroll::-webkit-scrollbar { width: 4px; }
	.mc-scroll::-webkit-scrollbar-track { background: transparent; }
	.mc-scroll::-webkit-scrollbar-thumb {
		background: rgba(0, 240, 255, 0.15); border-radius: 2px;
	}

	/* ── Loading / empty / error ─────────────────────────────────────────────── */
	.mc-loading {
		display: flex; align-items: center; justify-content: center; gap: 0.6rem;
		padding: 3rem 1rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem; letter-spacing: 0.12em;
		color: rgba(0, 240, 255, 0.4);
	}
	.mc-loading--sm { padding: 1rem; }
	.mc-spin {
		width: 14px; height: 14px;
		border: 1.5px solid rgba(0, 240, 255, 0.2);
		border-top-color: #00f0ff;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}
	.mc-empty {
		text-align: center; padding: 3rem 1rem;
		font-size: 0.72rem; color: rgba(255, 255, 255, 0.2);
	}
	.mc-err {
		display: flex; align-items: center; justify-content: center;
		flex-wrap: wrap; gap: 0.6rem;
		margin: 1rem; padding: 0.75rem;
		background: rgba(255, 50, 80, 0.07);
		border: 1px solid rgba(255, 50, 80, 0.2);
		border-radius: 6px;
		font-size: 0.68rem; color: rgba(255, 50, 80, 0.8);
	}
	.mc-retry {
		padding: 0.25rem 0.6rem; background: transparent;
		border: 1px solid rgba(255, 50, 80, 0.3);
		border-radius: 4px; font-size: 0.6rem; font-weight: 700;
		color: rgba(255, 50, 80, 0.8); cursor: pointer;
	}
	.mc-fetch-ts {
		text-align: center; padding: 0.5rem;
		font-size: 0.58rem; color: rgba(255, 255, 255, 0.15);
	}

	/* ── NEWS CARDS ─────────────────────────────────────────────────────────── */
	.mc-news-list { list-style: none; margin: 0; padding: 0 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }

	.mc-news-card {
		display: flex; gap: 0.75rem; align-items: flex-start;
		padding: 0.75rem 0.75rem 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-left: 2px solid #00f0ff;
		border-radius: 6px;
		transition: background 0.15s;
	}
	.mc-news-card:hover { background: rgba(0, 240, 255, 0.04); }

	.mc-news-card__img-wrap {
		flex-shrink: 0; width: 72px; height: 52px;
		border-radius: 4px; overflow: hidden;
	}
	.mc-news-card__img {
		width: 100%; height: 100%; object-fit: cover;
		/* Stark-tech: mute external imagery so it never clashes with the UI */
		filter: grayscale(50%) sepia(20%);
		transition: filter 0.2s;
	}
	.mc-news-card:hover .mc-news-card__img { filter: grayscale(20%) sepia(10%); }

	.mc-news-card__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; }
	.mc-news-card__meta { display: flex; align-items: center; gap: 0.5rem; }
	.mc-news-card__source {
		font-size: 0.55rem; font-weight: 700; letter-spacing: 0.15em;
		color: rgba(0, 240, 255, 0.55); font-family: 'JetBrains Mono', monospace;
	}
	.mc-news-card__date {
		font-size: 0.55rem; color: rgba(255, 255, 255, 0.25);
		font-family: 'JetBrains Mono', monospace;
	}
	.mc-news-card__title {
		font-size: 0.78rem; font-weight: 700; line-height: 1.35;
		color: rgba(255, 255, 255, 0.88);
		text-decoration: none;
		display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
		overflow: hidden;
	}
	.mc-news-card__title:hover { color: #00f0ff; }
	.mc-news-card__desc {
		margin: 0; font-size: 0.68rem; line-height: 1.5;
		color: rgba(255, 255, 255, 0.38);
		display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* ── PODCAST GRID ───────────────────────────────────────────────────────── */
	.mc-podcast-grid { display: flex; flex-direction: column; gap: 0.4rem; padding: 0 0.75rem; }

	.mc-pod-card {
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 8px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.02);
		transition: border-color 0.15s;
	}
	.mc-pod-card--expanded { border-color: rgba(0, 240, 255, 0.2); }

	.mc-pod-card__cover-btn {
		width: 100%; display: flex; align-items: center; gap: 0.75rem;
		padding: 0.65rem 0.75rem; min-height: 64px; /* touch target */
		background: transparent; border: none;
		cursor: pointer; text-align: left;
	}
	.mc-pod-card__cover-btn:hover { background: rgba(0, 240, 255, 0.03); }

	.mc-pod-cover {
		width: 48px; height: 48px; border-radius: 6px; object-fit: cover; flex-shrink: 0;
		filter: grayscale(50%) sepia(20%);
	}
	.mc-pod-cover--placeholder {
		display: flex; align-items: center; justify-content: center;
		background: rgba(0, 240, 255, 0.08);
		color: rgba(0, 240, 255, 0.4);
		font-size: 1.1rem;
	}
	.mc-pod-card__label { flex: 1; min-width: 0; }
	.mc-pod-name {
		display: block; font-size: 0.75rem; font-weight: 700;
		color: rgba(255, 255, 255, 0.82);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.mc-pod-author {
		display: block; font-size: 0.62rem;
		color: rgba(255, 255, 255, 0.3);
		font-family: 'JetBrains Mono', monospace;
	}

	/* ── EPISODE LIST ─────────────────────────────────────────────────────── */
	.mc-episodes { border-top: 1px solid rgba(0, 240, 255, 0.08); }

	.mc-ep {
		display: flex; align-items: center; gap: 0.6rem;
		padding: 0.6rem 0.75rem 0.6rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
		min-height: 56px; /* touch target */
	}
	.mc-ep--active { background: rgba(0, 240, 255, 0.04); }
	.mc-ep__info { flex: 1; min-width: 0; }
	.mc-ep__title {
		display: block; font-size: 0.72rem; font-weight: 600;
		color: rgba(255, 255, 255, 0.75);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.mc-ep--active .mc-ep__title { color: #00f0ff; }
	.mc-ep__meta {
		display: block; font-size: 0.58rem;
		font-family: 'JetBrains Mono', monospace;
		color: rgba(255, 255, 255, 0.25);
	}

	.mc-ep__play {
		width: 32px; height: 32px; min-width: 44px; min-height: 44px;
		display: flex; align-items: center; justify-content: center;
		background: rgba(0, 240, 255, 0.08);
		border: 1px solid rgba(0, 240, 255, 0.2);
		border-radius: 50%;
		color: rgba(0, 240, 255, 0.7);
		font-size: 0.65rem;
		cursor: pointer; transition: all 0.15s;
	}
	.mc-ep__play:hover { background: rgba(0, 240, 255, 0.18); box-shadow: 0 0 10px rgba(0, 240, 255, 0.2); }
	.mc-ep__play--playing { background: rgba(0, 240, 255, 0.15); border-color: rgba(0, 240, 255, 0.5); }

	.mc-ep__bars {
		display: flex; align-items: flex-end; gap: 2px; height: 12px;
	}
	.mc-ep__bars span {
		width: 3px; background: #00f0ff; border-radius: 1px;
		animation: bars 0.8s ease infinite;
	}
	.mc-ep__bars span:nth-child(2) { animation-delay: 0.2s; }
	.mc-ep__bars span:nth-child(3) { animation-delay: 0.4s; }

	/* ── Animations ─────────────────────────────────────────────────────────── */
	@keyframes mcFadeIn { from { opacity: 0; } to { opacity: 1; } }
	@keyframes mcSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
	@keyframes spin { to { transform: rotate(360deg); } }
	@keyframes bars {
		0%, 100% { height: 4px; }
		50% { height: 12px; }
	}
</style>
