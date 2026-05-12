/* eslint-disable quotes */
/**
 * egressGuard.js
 * ──────────────
 * Phase 2, Epic 3 — Cell-Level Egress Guard (Layer 4)
 *
 * Wraps `globalThis.fetch` to intercept ALL outbound network calls from Cloud
 * Functions.  When a request-scoped "teen-tainted" context flag is set (via
 * markPayloadTainted in teenAdInterceptor.js), any outbound call to a host
 * NOT in `EGRESS_WHITELIST` is blocked before any byte leaves the network.
 *
 * Blocked calls write an immutable `egress_block_audit/{logId}` entry and
 * throw an `EgressBlockedError` (not an HttpsError — callers must handle it).
 *
 * ── Architecture ──────────────────────────────────────────────────────────
 *
 *   1. `egressContext = new AsyncLocalStorage()`
 *      Holds per-request context: { teenTainted, callerUid, integrationType }
 *
 *   2. `wrapFetch(fetch)` — installs the intercepting fetch wrapper.
 *      Called ONCE from functions/index.js before any other module loads.
 *
 *   3. `egressContext.run({ teenTainted: true }, handler)` — any CF handler
 *      that processes teen data sets teenTainted=true in its context store
 *      before calling any external SDK.  The wrapper reads from the store.
 *
 *   4. `integrations.js` (RSS / iTunes) explicitly marks its context as
 *      { teenTainted: false } since it never reads user data.
 *
 * ── EGRESS_WHITELIST ──────────────────────────────────────────────────────
 *
 *   Hosts allowed even for teen-tainted requests:
 *     *.googleapis.com          — Firebase, Cloud Functions internal calls
 *     *.firebaseio.com          — Firebase Realtime Database
 *     api.stripe.com            — Payment processing (no ad data)
 *     *.sendgrid.net            — Transactional email delivery
 *     api.checkr.com            — Background check provider
 *     api.open-meteo.com        — Weather (no user data)
 *     api.weather.gov           — Weather (no user data)
 *     fcm.googleapis.com        — Firebase Cloud Messaging
 *     securetoken.googleapis.com — Firebase Auth token verification
 *
 * ── EGRESS_AD_BLOCKLIST ───────────────────────────────────────────────────
 *
 *   These hosts are blocked even for non-teen-tainted requests when the
 *   context is set (defense-in-depth, not currently enforced for adults).
 *   They are blocked unconditionally for teen-tainted requests:
 *     connect.facebook.net
 *     googletagmanager.com
 *     google-analytics.com
 *     www.google-analytics.com
 *     doubleclick.net
 *     tiktok.com
 *     snap.licdn.com
 *     bat.bing.com
 *     ads.twitter.com
 *     clarity.ms
 *     cdn.amplitude.com
 *     cdn.segment.com
 *
 * ── Smoke test ────────────────────────────────────────────────────────────
 *
 *   See functions/__tests__/egressGuard.test.js
 */

const {AsyncLocalStorage} = require('async_hooks');
const admin    = require('firebase-admin');
const logger   = require('firebase-functions/logger');

// ── Whitelist / Blocklist ─────────────────────────────────────────────────────

/**
 * Hosts allowed for outbound fetch even when a request is teen-tainted.
 * Supports exact domain and wildcard prefix (*.googleapis.com → any subdomain).
 * @type {readonly string[]}
 */
const EGRESS_WHITELIST = Object.freeze([
  'googleapis.com',          // covers *.googleapis.com
  'firebaseio.com',          // covers *.firebaseio.com
  'firebase.google.com',
  'api.stripe.com',
  'sendgrid.net',            // covers *.sendgrid.net
  'api.checkr.com',
  'api.open-meteo.com',
  'api.weather.gov',
  'fcm.googleapis.com',
  'securetoken.googleapis.com',
  'storage.googleapis.com',
  'identitytoolkit.googleapis.com',
]);

/**
 * Hosts unconditionally blocked for teen-tainted requests.
 * @type {readonly string[]}
 */
const EGRESS_AD_BLOCKLIST = Object.freeze([
  'connect.facebook.net',
  'googletagmanager.com',
  'google-analytics.com',
  'www.google-analytics.com',
  'analytics.google.com',
  'doubleclick.net',
  'tiktok.com',
  'snap.licdn.com',
  'bat.bing.com',
  'ads.twitter.com',
  'static.ads-twitter.com',
  'clarity.ms',
  'cdn.amplitude.com',
  'cdn.segment.com',
]);

// ── Per-request context ───────────────────────────────────────────────────────

/**
 * AsyncLocalStorage context for per-request teen-taint flag.
 *
 * Shape: { teenTainted: boolean, callerUid?: string, integrationType?: string }
 *
 * Usage in a CF handler:
 *   const {egressContext} = require('./egressGuard');
 *   const result = await egressContext.run({ teenTainted: true, callerUid: uid }, async () => {
 *     // ... calls fetch internally or via SDK ...
 *   });
 *
 * @type {AsyncLocalStorage<{teenTainted: boolean, callerUid?: string, integrationType?: string}>}
 */
const egressContext = new AsyncLocalStorage();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the hostname from a URL string or Request.
 * @param {string | URL | Request} input
 * @returns {string}
 */
function extractHost(input) {
  try {
    const urlStr = typeof input === 'string' ? input :
        (input instanceof URL ? input.href : input.url);
    return new URL(urlStr).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Returns true if the host is in the whitelist.
 * Supports suffix matching (e.g. 'googleapis.com' matches 'foo.googleapis.com').
 * @param {string} host
 * @returns {boolean}
 */
function isWhitelisted(host) {
  if (!host) return false;
  return EGRESS_WHITELIST.some(
      (w) => host === w || host.endsWith('.' + w),
  );
}

/**
 * Returns true if the host is in the ad blocklist.
 * @param {string} host
 * @returns {boolean}
 */
function isAdBlocklisted(host) {
  if (!host) return false;
  return EGRESS_AD_BLOCKLIST.some(
      (b) => host === b || host.endsWith('.' + b),
  );
}

/** @param {{host: string, callerUid?: string, integrationType?: string, stackFrame?: string}} p */
function writeEgressBlockAudit({host, callerUid, integrationType, stackFrame}) {
  const fs = admin.firestore();
  fs.collection('egress_block_audit').add({
    host,
    callerUid:       callerUid       || 'unknown',
    integrationType: integrationType || 'unknown',
    stackFrame:      stackFrame      || '',
    at: admin.firestore.FieldValue.serverTimestamp(),
  }).catch((err) => {
    logger.error('[egressGuard] egress_block_audit write failed', err.message);
  });
}

// ── Custom error class ────────────────────────────────────────────────────────

class EgressBlockedError extends Error {
  /**
   * @param {string} host
   * @param {string} reason
   */
  constructor(host, reason) {
    super(`[egressGuard] Outbound fetch to "${host}" blocked: ${reason}`);
    this.name  = 'EgressBlockedError';
    this.host  = host;
    this.code  = 'EGRESS_BLOCKED';
  }
}

// ── wrapFetch ─────────────────────────────────────────────────────────────────

/**
 * Install the egress guard by replacing globalThis.fetch with an intercepting
 * wrapper.  Call this ONCE from functions/index.js at module load time, before
 * any other module is required.
 *
 * The original fetch is preserved as `globalThis.__originalFetch` for SDK
 * internals that cache the reference at import time.
 *
 * @param {typeof globalThis.fetch} [originalFetch]  defaults to globalThis.fetch
 */
function wrapFetch(originalFetch) {
  const _fetch = originalFetch || globalThis.fetch;
  if (!_fetch) {
    logger.warn('[egressGuard] wrapFetch: globalThis.fetch not available — guard not installed.');
    return;
  }

  // Preserve original for internal use.
  if (!globalThis.__originalFetch) {
    globalThis.__originalFetch = _fetch;
  }

  /**
   * @param {string | URL | Request} input
   * @param {RequestInit} [init]
   */
  globalThis.fetch = async function guardedFetch(input, init) {
    const host = extractHost(input);
    const ctx  = egressContext.getStore();
    const teenTainted   = ctx?.teenTainted   === true;
    const callerUid     = ctx?.callerUid;
    const integrationType = ctx?.integrationType;

    // Non-tainted requests: apply ad-blocklist as defense-in-depth (log only; do not throw).
    if (!teenTainted && isAdBlocklisted(host)) {
      logger.warn('[egressGuard] Non-tainted request to ad-blocklisted host (not blocked)', {
        host, callerUid,
      });
    }

    // Teen-tainted requests: block non-whitelisted or ad-blocklisted hosts.
    if (teenTainted) {
      const blocked = !isWhitelisted(host) || isAdBlocklisted(host);
      if (blocked) {
        const reason = isAdBlocklisted(host) ? 'ad-blocklisted' : 'not-whitelisted';
        const stack  = new Error().stack?.split('\n')[2]?.trim() || '';

        writeEgressBlockAudit({host, callerUid, integrationType, stackFrame: stack});

        logger.error('[egressGuard] BLOCKED outbound fetch for teen-tainted request', {
          host, reason, callerUid, integrationType,
        });

        throw new EgressBlockedError(host, reason);
      }
    }

    return _fetch(input, init);
  };

  logger.info('[egressGuard] globalThis.fetch wrapped — teen-taint egress guard active.');
}

module.exports = {
  egressContext,
  wrapFetch,
  EgressBlockedError,
  EGRESS_WHITELIST,
  EGRESS_AD_BLOCKLIST,
};
