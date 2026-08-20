/* eslint-disable quotes */
/**
 * integrations.js â€” External Media Proxy Functions
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Cloud Function proxies that keep API secrets and external network calls
 * out of the browser bundle. All content is sanitised server-side before
 * returning to the client, eliminating XSS risk from external sources.
 *
 * RSS feeds used (all public, no key required):
 *   BBC Sport Football  â€” https://feeds.bbci.co.uk/sport/football/rss.xml
 *   The Guardian        â€” https://www.theguardian.com/football/rss
 *   ESPN Soccer         â€” https://www.espn.com/espn/rss/soccer/news
 *   World Soccer Talk   â€” https://worldsoccertalk.com/feed/
 *
 * Podcast search via iTunes Search API (free, no key):
 *   https://itunes.apple.com/search?media=podcast&entity=podcast
 *
 * Exports:
 *   getSoccerNews    â€” onCall: fetch + parse RSS feeds, return normalised articles
 *   searchPodcasts   â€” onCall: search iTunes for soccer/coaching podcasts
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const https = require('https');
const http = require('http');

const REGION = 'us-east1';

// â”€â”€ RSS Feed sources â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RSS_SOURCES = {
  general: [
    {
      label: 'BBC Sport',
      url: 'https://feeds.bbci.co.uk/sport/football/rss.xml',
    },
    {
      label: 'Guardian Football',
      url: 'https://www.theguardian.com/football/rss',
    },
  ],
  us: [
    {
      label: 'ESPN Soccer',
      url: 'https://www.espn.com/espn/rss/soccer/news',
    },
    {
      label: 'World Soccer Talk',
      url: 'https://worldsoccertalk.com/feed/',
    },
  ],
  youth: [
    {
      label: 'US Youth Soccer',
      url: 'https://www.usyouthsoccer.org/feed/',
    },
    {
      label: 'TopDrawer Soccer',
      url: 'https://www.topdrawersoccer.com/feed/',
    },
  ],
};

// â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Fetch a URL and return the body as a string.
 * Follows one redirect. Times out after 8 seconds.
 * @param {string} url
 * @return {Promise<string>}
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {timeout: 8000}, (res) => {
      // Follow single redirect.
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
    req.on('error', reject);
  });
}

/**
 * Strip all HTML tags and decode common HTML entities.
 * Server-side sanitisation â€” eliminates XSS risk before sending to client.
 * @param {string} raw
 * @return {string}
 */
function stripHtml(raw) {
  if (typeof raw !== 'string') return '';
  return raw
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
}

/**
 * Parse a minimal RSS 2.0 / Atom feed XML string into an array of article objects.
 * Uses regex parsing to avoid bundling an XML library.
 * Returns at most `limit` items.
 * @param {string} xml
 * @param {string} source
 * @param {number} limit
 * @return {Array<object>}
 */
function parseRss(xml, source, limit) {
  const items = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemPattern.exec(xml)) !== null && items.length < limit) {
    const block = match[1];

    const title = stripHtml(extractTag(block, 'title'));
    const link = extractTag(block, 'link') || extractTag(block, 'guid');
    const descRaw = extractTag(block, 'description') || extractTag(block, 'summary');
    const description = stripHtml(descRaw).slice(0, 280);
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published');
    const imgMatch = block.match(/url="([^"]+\.(?:jpg|jpeg|png|webp))"/i)
        || block.match(/<media:thumbnail[^>]+url="([^"]+)"/i)
        || descRaw.match(/<img[^>]+src="([^"]+)"/i);
    const image = imgMatch ? imgMatch[1] : null;

    if (!title || !link) continue;

    items.push({
      id: Buffer.from(link).toString('base64').slice(0, 20),
      title,
      description,
      link: link.trim(),
      source,
      image: image || null,
      pubDate: pubDate ? new Date(pubDate).toISOString() : null,
    });
  }

  return items;
}

/**
 * Extract the text content of a single XML tag (case-insensitive, no namespaces).
 * @param {string} xml
 * @param {string} tag
 * @return {string}
 */
function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  if (!m) return '';
  // Handle CDATA sections.
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// getSoccerNews â€” onCall
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Fetch and proxy soccer news from public RSS feeds.
 * Caller must be authenticated.
 *
 * Input: { category?: 'general' | 'us' | 'youth', limit?: number }
 * Returns: { articles: NewsArticle[], fetchedAt: string }
 */
exports.getSoccerNews = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const category = ['general', 'us', 'youth'].includes(request.data?.category)
      ? request.data.category
      : 'general';
  const limit = Math.min(typeof request.data?.limit === 'number' ? request.data.limit : 20, 40);
  const perSource = Math.ceil(limit / 2);

  const sources = RSS_SOURCES[category] ?? RSS_SOURCES.general;
  const fetchPromises = sources.map(async ({label, url}) => {
    try {
      const xml = await fetchUrl(url);
      return parseRss(xml, label, perSource);
    } catch (err) {
      logger.warn('[getSoccerNews] feed failed', {label, url, err: err.message});
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  const articles = results
      .flat()
      .sort((a, b) => {
        const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return tb - ta;
      })
      .slice(0, limit);

  return {
    articles,
    category,
    fetchedAt: new Date().toISOString(),
  };
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// searchPodcasts â€” onCall
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Search podcasts via the iTunes Search API (free, no key required).
 * Normalises the response into a flat podcast list.
 *
 * Input: { query?: string, limit?: number }
 * Returns: { podcasts: Podcast[] }
 */
exports.searchPodcasts = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const rawQuery = typeof request.data?.query === 'string'
      ? request.data.query.trim().slice(0, 100)
      : 'soccer coaching';
  const term = encodeURIComponent(rawQuery || 'soccer coaching');
  const limit = Math.min(typeof request.data?.limit === 'number' ? request.data.limit : 24, 48);

  const url = `https://itunes.apple.com/search?term=${term}&media=podcast&entity=podcast&limit=${limit}&country=us`;

  let body;
  try {
    body = await fetchUrl(url);
  } catch (err) {
    logger.error('[searchPodcasts] iTunes API failed', {err: err.message});
    throw new HttpsError('unavailable', 'Podcast search unavailable. Try again later.');
  }

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new HttpsError('internal', 'Invalid response from podcast service.');
  }

  const podcasts = (parsed.results || []).map((r) => ({
    id: String(r.collectionId || r.trackId || ''),
    name: stripHtml(r.collectionName || r.trackName || ''),
    author: stripHtml(r.artistName || ''),
    feedUrl: r.feedUrl || null,
    coverUrl: (r.artworkUrl600 || r.artworkUrl100 || null),
    genre: (r.genres?.[0] || ''),
    episodeCount: r.trackCount ?? null,
    country: r.country || '',
    itunesUrl: r.collectionViewUrl || r.trackViewUrl || null,
  }));

  return {podcasts};
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// getPodcastEpisodes â€” onCall
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Fetch the episode list for a specific podcast feed URL.
 * Parses the podcast RSS feed and returns the first 20 episodes.
 *
 * Input: { feedUrl: string, limit?: number }
 * Returns: { episodes: Episode[] }
 */
exports.getPodcastEpisodes = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const feedUrl = typeof request.data?.feedUrl === 'string'
      ? request.data.feedUrl.trim()
      : '';
  if (!feedUrl || (!feedUrl.startsWith('http://') && !feedUrl.startsWith('https://'))) {
    throw new HttpsError('invalid-argument', 'A valid feedUrl is required.');
  }

  const limit = Math.min(typeof request.data?.limit === 'number' ? request.data.limit : 20, 40);

  let xml;
  try {
    xml = await fetchUrl(feedUrl);
  } catch (err) {
    logger.warn('[getPodcastEpisodes] feed fetch failed', {feedUrl, err: err.message});
    throw new HttpsError('unavailable', 'Episode feed unavailable.');
  }

  // Parse <item> blocks as podcast episodes.
  const episodes = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let m;

  while ((m = itemPattern.exec(xml)) !== null && episodes.length < limit) {
    const block = m[1];
    const title = stripHtml(extractTag(block, 'title'));
    const pubDate = extractTag(block, 'pubDate');
    const duration = extractTag(block, 'itunes:duration') || '';
    const description = stripHtml(
        extractTag(block, 'itunes:summary') || extractTag(block, 'description'),
    ).slice(0, 300);

    // Find enclosure (the audio file URL).
    const enclosure = block.match(/<enclosure[^>]+url="([^"]+)"/i);
    const audioUrl = enclosure ? enclosure[1] : null;
    if (!audioUrl || !title) continue;

    episodes.push({
      id: Buffer.from(audioUrl).toString('base64').slice(0, 20),
      title,
      description,
      audioUrl,
      duration: duration.trim(),
      pubDate: pubDate ? new Date(pubDate).toISOString() : null,
    });
  }

  return {episodes};
});
