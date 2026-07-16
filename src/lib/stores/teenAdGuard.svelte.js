/**
 * teenAdGuard.svelte.js
 * ─────────────────────
 * Phase 2, Epic 3 — COPPA 2.0 Client-Side Teen 13-16 Ad-Block Guard
 *
 * Provides a reactive store and a `loadThirdPartyScript` helper that any
 * component loading third-party ad-tech SDKs MUST use instead of directly
 * injecting script tags.
 *
 * ── Usage pattern ──────────────────────────────────────────────────────────
 *
 *   import { loadThirdPartyScript, isTeenAdBlocked } from '$lib/stores/teenAdGuard.svelte.js';
 *
 *   // In a $effect block (browser only):
 *   loadThirdPartyScript(
 *     'https://connect.facebook.net/en_US/fbevents.js',
 *     'fb-pixel'
 *   );
 *
 *   // Gate UI sections:
 *   {#if !isTeenAdBlocked.current}
 *     <AdBanner />
 *   {/if}
 *
 * ── Known ad hosts blocked for teen subjects ───────────────────────────────
 *
 *   Any URL whose hostname matches one of these patterns is blocked
 *   when `isTeenAdBlocked` is true:
 *
 *   connect.facebook.net       — Facebook Pixel / Meta SDK
 *   googletagmanager.com       — Google Tag Manager
 *   google-analytics.com       — GA4 / Universal Analytics
 *   doubleclick.net            — Google Display Network
 *   tiktok.com                 — TikTok Pixel
 *   linkedin.com/li            — LinkedIn Insight (partial match)
 *   snap.licdn.com             — LinkedIn Insight SDK
 *   bat.bing.com               — Microsoft Advertising UET
 *   ads.twitter.com            — X (Twitter) Pixel
 *   static.ads-twitter.com     — X Pixel SDK
 *   clarity.ms                 — Microsoft Clarity (heatmap / session recording)
 *   cdn.amplitude.com          — Amplitude Analytics (ad attribution)
 *   cdn.segment.com            — Segment CDP (if routing to ad partners)
 *
 * ── Important: Any new third-party SDK must route through loadThirdPartyScript.
 *    See src/app.html for a project-wide notice.
 *
 * ── Server-side enforcement ────────────────────────────────────────────────
 *
 *   This client guard is Layer 3 of a four-layer zero-trust stack:
 *     Layer 1: Firestore rules (isTeen13to16 / ageBandBlocksAdShare)
 *     Layer 2: Cloud Function validators (teenAdInterceptor.js)
 *     Layer 3: Client pixel suppression ← YOU ARE HERE
 *     Layer 4: Cell-level egress whitelist (egressGuard.js)
 *
 *   Never rely solely on this client guard — it can be bypassed by
 *   a non-compliant component.  Layers 1, 2, and 4 are the hard stops.
 */

import { browser } from '$app/environment';
import { authStore } from '$lib/stores/auth.svelte.js';
import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js';

// ── Known ad-tech host patterns (string fragments to match against URL host) ─
const AD_HOST_BLOCKLIST = [
  'connect.facebook.net',
  'googletagmanager.com',
  'google-analytics.com',
  'doubleclick.net',
  'tiktok.com',
  'snap.licdn.com',
  'bat.bing.com',
  'ads.twitter.com',
  'static.ads-twitter.com',
  'clarity.ms',
  'cdn.amplitude.com',
  'cdn.segment.com',
];

/**
 * True when the authenticated user's age band is 'teen13to16'.
 * Derived reactively from the auth store — updates when the JWT refreshes.
 *
 * Usage: `if (isTeenAdBlocked) { ... }`
 */
export const isTeenAdBlocked = {
  get current() {
    return authStore.isTeenRestricted;
  },
};

/**
 * Returns true if the given URL matches a known ad-tech host.
 * @param {string} src
 * @returns {boolean}
 */
function isAdTechUrl(src) {
  try {
    const host = new URL(src).hostname.toLowerCase();
    return AD_HOST_BLOCKLIST.some((pattern) => host.includes(pattern));
  } catch {
    return false;
  }
}

/**
 * logTeenAdBlock — lightweight callable that writes to ad_block_audit.
 * Lazy-initialized (only constructed when a block is actually triggered).
 */
let _logBlockFn = /** @type {ReturnType<typeof httpsCallable> | null} */ (null);
function logBlock(src, marker) {
  if (!browser) return;
  try {
    if (!_logBlockFn) {
      const fns = functions;
      _logBlockFn = httpsCallable(fns, 'logTeenAdBlock');
    }
    _logBlockFn({ src, marker }).catch(() => {
      // Fire-and-forget; console fallback below is always applied.
    });
  } catch {
    // Ignore callable errors in the guard path.
  }
  console.warn(
    `[teenAdGuard] Blocked ad-tech script for teen subject: ${marker} (${src})`,
  );
}

/**
 * loadThirdPartyScript — guarded script injection.
 *
 * Before appending a `<script src="...">` tag to the document head, this
 * function checks:
 *   1. `isTeenAdBlocked.current` — blocks ALL ad-tech scripts for teen subjects.
 *   2. `isAdTechUrl(src)` — double-check even if the caller didn't identify it
 *      as ad-tech (defense-in-depth).
 *
 * When blocked: logs to console + posts a beacon to `logTeenAdBlock` CF.
 * When allowed: appends the script tag with `data-teen-ad-guard="${marker}"`.
 *
 * @param {string} src             — full URL of the third-party script
 * @param {string} marker          — stable identifier (e.g. 'fb-pixel', 'gtag')
 * @param {{ async?: boolean }} [opts]
 * @returns {HTMLScriptElement | null}  the inserted element, or null if blocked
 */
export function loadThirdPartyScript(src, marker, opts = {}) {
  if (!browser) return null;

  const blocked = isTeenAdBlocked.current || isAdTechUrl(src);
  if (blocked) {
    logBlock(src, marker);
    return null;
  }

  const existing = document.querySelector(`script[data-teen-ad-guard="${marker}"]`);
  if (existing) return /** @type {HTMLScriptElement} */ (existing);

  const s = document.createElement('script');
  s.src = src;
  s.async = opts.async !== false;
  s.setAttribute('data-teen-ad-guard', marker);
  document.head.appendChild(s);
  return s;
}
