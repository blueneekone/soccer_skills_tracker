/**
 * integrations.svelte.ts — External Media Integration Engine
 * ────────────────────────────────────────────────────────────
 * Svelte 5 reactive service for soccer news, coaching podcasts, and a
 * global HTML5 audio player that persists across route navigations.
 *
 * Architecture:
 *   • `getSoccerNews` / `searchPodcasts` / `getPodcastEpisodes` are Cloud
 *     Function proxies — secrets and external network calls never touch the browser.
 *   • News articles and podcast metadata are cached client-side in $state.
 *   • Audio playback is managed by a single <audio> element owned by
 *     MiniPlayer.svelte; this service owns the *state* (play/pause/position),
 *     MiniPlayer binds to it.
 *   • All external text content is sanitised server-side (Cloud Function)
 *     before reaching this service.
 *
 * Usage:
 *   import { integrations } from '$lib/services/integrations.svelte.js';
 *   integrations.fetchNews('us');
 *   integrations.play(episode, podcast);
 */

import { browser } from '$app/environment';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ── Public types ─────────────────────────────────────────────────────────────

export type NewsCategory = 'general' | 'us' | 'youth';

export interface NewsArticle {
	id: string;
	title: string;
	description: string;
	link: string;
	source: string;
	image: string | null;
	pubDate: string | null;
}

export interface Podcast {
	id: string;
	name: string;
	author: string;
	feedUrl: string | null;
	coverUrl: string | null;
	genre: string;
	episodeCount: number | null;
	itunesUrl: string | null;
}

export interface Episode {
	id: string;
	title: string;
	description: string;
	audioUrl: string;
	duration: string;
	pubDate: string | null;
}

export interface NowPlaying {
	episode: Episode;
	podcast: Podcast;
	startedAt: number;
}

// ── Internal CF callables (lazily initialised when browser is available) ─────

function makeCaller(name: string) {
	if (!browser) return null;
	return httpsCallable(getFunctions(undefined, 'us-central1'), name);
}

// ═══════════════════════════════════════════════════════════════════════════
// IntegrationManager
// ═══════════════════════════════════════════════════════════════════════════

class IntegrationManager {
	// ── News state ────────────────────────────────────────────────────────────
	articles = $state<NewsArticle[]>([]);
	newsLoading = $state(false);
	newsError = $state('');
	newsCategory = $state<NewsCategory>('general');
	newsFetchedAt = $state<string | null>(null);

	/** Filtered view — client-side substring filter on title + description. */
	newsSearchQuery = $state('');
	filteredArticles = $derived.by(() => {
		const q = this.newsSearchQuery.toLowerCase().trim();
		if (!q) return this.articles;
		return this.articles.filter(
			(a) =>
				a.title.toLowerCase().includes(q) ||
				a.description.toLowerCase().includes(q) ||
				a.source.toLowerCase().includes(q),
		);
	});

	// ── Podcast state ─────────────────────────────────────────────────────────
	podcasts = $state<Podcast[]>([]);
	podcastsLoading = $state(false);
	podcastsError = $state('');
	podcastSearchQuery = $state('soccer coaching');

	// Episodes for the currently expanded podcast.
	episodePodcastId = $state<string | null>(null);
	episodes = $state<Episode[]>([]);
	episodesLoading = $state(false);
	episodesError = $state('');

	// ── Audio player state ────────────────────────────────────────────────────
	nowPlaying = $state<NowPlaying | null>(null);
	isPlaying = $state(false);
	currentTime = $state(0);
	duration = $state(0);
	volume = $state(0.85);
	playerError = $state('');

	/** True when a track is loaded (playing or paused). */
	readonly hasActiveSession = $derived(this.nowPlaying !== null);

	/** Progress 0–1 for the progress bar. */
	readonly progress = $derived(
		this.duration > 0 ? Math.min(this.currentTime / this.duration, 1) : 0,
	);

	// ── CF callables ──────────────────────────────────────────────────────────
	private _getNewsF = makeCaller('getSoccerNews');
	private _searchPodcastsF = makeCaller('searchPodcasts');
	private _getEpisodesF = makeCaller('getPodcastEpisodes');

	// ── News methods ──────────────────────────────────────────────────────────

	/**
	 * Fetch soccer news for the given category.
	 * Results are cached; call again to refresh.
	 */
	async fetchNews(category: NewsCategory = 'general', limit = 20): Promise<void> {
		if (!this._getNewsF) return;
		this.newsLoading = true;
		this.newsError = '';
		this.newsCategory = category;
		try {
			const res = await this._getNewsF({ category, limit });
			const data = res.data as { articles: NewsArticle[]; fetchedAt: string };
			this.articles = data.articles ?? [];
			this.newsFetchedAt = data.fetchedAt;
		} catch (err: unknown) {
			this.newsError =
				err instanceof Error ? err.message : 'Failed to load news.';
		} finally {
			this.newsLoading = false;
		}
	}

	// ── Podcast methods ───────────────────────────────────────────────────────

	/** Search for podcasts matching `query`. */
	async searchPodcasts(query?: string, limit = 24): Promise<void> {
		if (!this._searchPodcastsF) return;
		const q = (query ?? this.podcastSearchQuery).trim() || 'soccer coaching';
		this.podcastsLoading = true;
		this.podcastsError = '';
		this.podcastSearchQuery = q;
		try {
			const res = await this._searchPodcastsF({ query: q, limit });
			const data = res.data as { podcasts: Podcast[] };
			this.podcasts = data.podcasts ?? [];
		} catch (err: unknown) {
			this.podcastsError =
				err instanceof Error ? err.message : 'Podcast search failed.';
		} finally {
			this.podcastsLoading = false;
		}
	}

	/** Load episodes for a specific podcast feedUrl. */
	async loadEpisodes(podcast: Podcast): Promise<void> {
		if (!this._getEpisodesF || !podcast.feedUrl) return;
		this.episodePodcastId = podcast.id;
		this.episodesLoading = true;
		this.episodesError = '';
		this.episodes = [];
		try {
			const res = await this._getEpisodesF({ feedUrl: podcast.feedUrl, limit: 20 });
			const data = res.data as { episodes: Episode[] };
			this.episodes = data.episodes ?? [];
		} catch (err: unknown) {
			this.episodesError =
				err instanceof Error ? err.message : 'Failed to load episodes.';
		} finally {
			this.episodesLoading = false;
		}
	}

	// ── Audio player methods ──────────────────────────────────────────────────

	/**
	 * Start or resume playback of an episode.
	 * MiniPlayer.svelte's <audio> element observes `nowPlaying` to load the src.
	 */
	play(episode: Episode, podcast: Podcast): void {
		if (this.nowPlaying?.episode.id === episode.id) {
			// Already loaded — toggle instead of reloading.
			this.isPlaying = true;
			return;
		}
		this.nowPlaying = { episode, podcast, startedAt: Date.now() };
		this.isPlaying = true;
		this.currentTime = 0;
		this.duration = 0;
		this.playerError = '';
	}

	pause(): void {
		this.isPlaying = false;
	}

	togglePlay(): void {
		this.isPlaying = !this.isPlaying;
	}

	seek(fraction: number): void {
		if (this.duration <= 0) return;
		this.currentTime = Math.max(0, Math.min(fraction * this.duration, this.duration));
	}

	skipForward(seconds = 30): void {
		this.currentTime = Math.min(this.currentTime + seconds, this.duration);
	}

	skipBack(seconds = 15): void {
		this.currentTime = Math.max(this.currentTime - seconds, 0);
	}

	stop(): void {
		this.nowPlaying = null;
		this.isPlaying = false;
		this.currentTime = 0;
		this.duration = 0;
	}
}

// ── Singleton export ──────────────────────────────────────────────────────────
// Instantiated once; shared across all components via import.
export const integrations = new IntegrationManager();
