/**
 * Allowlisted live-stream URL parsing for YouTube, Vimeo, and Mux embeds.
 * Used by coach schedule/match-day saves and parent Watch live surfaces.
 */

export type LiveStreamProvider = 'youtube' | 'vimeo' | 'mux';

export type ParsedLiveStream = {
	provider: LiveStreamProvider;
	embedUrl: string;
	originalUrl: string;
};

const ALLOWED_HOSTS: Readonly<Record<string, LiveStreamProvider>> = {
	'youtube.com': 'youtube',
	'www.youtube.com': 'youtube',
	'm.youtube.com': 'youtube',
	'youtu.be': 'youtube',
	'vimeo.com': 'vimeo',
	'player.vimeo.com': 'vimeo',
	'stream.mux.com': 'mux',
	'player.mux.com': 'mux',
};

const MAX_URL_LENGTH = 512;

function hostProvider(hostname: string): LiveStreamProvider | null {
	const host = hostname.toLowerCase().replace(/\.$/, '');
	return ALLOWED_HOSTS[host] ?? null;
}

function youtubeId(pathname: string, searchParams: URLSearchParams): string | null {
	const v = searchParams.get('v');
	if (v && /^[\w-]{6,64}$/.test(v)) return v;
	const embed = pathname.match(/^\/embed\/([\w-]{6,64})/);
	if (embed) return embed[1];
	const live = pathname.match(/^\/live\/([\w-]{6,64})/);
	if (live) return live[1];
	const short = pathname.match(/^\/([\w-]{6,64})$/);
	if (short && short[1] !== 'watch' && short[1] !== 'embed' && short[1] !== 'live') {
		return short[1];
	}
	return null;
}

function vimeoId(pathname: string): string | null {
	const m = pathname.match(/\/(?:video\/)?(\d{5,20})/);
	return m ? m[1] : null;
}

function muxId(pathname: string): string | null {
	const stripped = pathname.replace(/^\/+/, '').replace(/\.m3u8$/i, '');
	if (/^[\w-]{8,128}$/.test(stripped)) return stripped;
	return null;
}

/**
 * Returns a parsed embed descriptor when the URL is on the allowlist; otherwise null.
 */
export function parseLiveStreamUrl(raw: string): ParsedLiveStream | null {
	const trimmed = raw.trim();
	if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return null;
	}

	if (url.protocol !== 'https:') return null;

	const provider = hostProvider(url.hostname);
	if (!provider) return null;

	let embedUrl: string | null = null;

	if (provider === 'youtube') {
		const id = youtubeId(url.pathname, url.searchParams);
		if (id) embedUrl = `https://www.youtube.com/embed/${id}`;
	} else if (provider === 'vimeo') {
		const id = vimeoId(url.pathname);
		if (id) embedUrl = `https://player.vimeo.com/video/${id}`;
	} else if (provider === 'mux') {
		const id = muxId(url.pathname);
		if (id) embedUrl = `https://player.mux.com/${id}`;
	}

	if (!embedUrl) return null;

	return { provider, embedUrl, originalUrl: trimmed };
}

/** Validates coach/parent paste input — returns normalized original URL or null. */
export function normalizeLiveStreamUrl(raw: string): string | null {
	const parsed = parseLiveStreamUrl(raw);
	return parsed?.originalUrl ?? null;
}

/** Hostnames permitted in iframe src (defense-in-depth with parseLiveStreamUrl). */
export function isAllowlistedEmbedUrl(src: string): boolean {
	try {
		const host = new URL(src).hostname.toLowerCase();
		return (
			host === 'www.youtube.com' ||
			host === 'youtube.com' ||
			host === 'player.vimeo.com' ||
			host === 'player.mux.com'
		);
	} catch {
		return false;
	}
}
