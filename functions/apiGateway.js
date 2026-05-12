/* eslint-disable quotes */
/**
 * apiGateway.js
 * ──────────────
 * Single HTTP entry point for the Vanguard /v1/* REST surface.
 *
 * Phase 1, Epic 1 — Cell-Based Routing, Session E
 *
 * Architecture
 * ────────────
 * The gateway is intentionally THIN: it does five things in this
 * order, then dispatches to a registered handler.
 *
 *   1.  Method + path parsing  (/v1/{resource}/{...subpath})
 *   2.  Authentication         (Firebase ID-token in Authorization header)
 *   3.  Idempotency key check  (X-Idempotency-Key header → registry doc)
 *   4.  Rate limiting          (token bucket per uid + per cellId)
 *   5.  Cell routing           (read cellId claim, attach Firestore to ctx)
 *
 * Handlers are pure async functions that receive a context object
 * containing the verified claims, the cell-aware Firestore, and the
 * parsed request body.  They never see Express middleware concerns.
 *
 *   register('GET', /^drills$/, async (ctx) => { … });
 *   register('POST', /^drill_completions$/, async (ctx) => { … });
 *
 * Bouncer-vs-bouncer security model
 * ──────────────────────────────────
 * The gateway is one of THREE concentric bouncers:
 *
 *   1.  This file        — verifies the JWT, parses Authorization, and
 *                          rejects bad tokens before any handler runs.
 *
 *   2.  Each handler     — applies role-specific access control via
 *                          `tenantUtils.assertRole()` etc.
 *
 *   3.  Firestore Rules  — final defence in depth.  Even if the gateway
 *                          and handler both let a request through, the
 *                          db must enforce tenantId/clubId == auth.
 *
 * Idempotency
 * ───────────
 * Mutating verbs (POST/PUT/PATCH/DELETE) MUST include an
 * X-Idempotency-Key header.  The gateway records the (uid, key) pair
 * in `gateway_idempotency/{uid}_{key}` on the registry cell with the
 * response body + status.  A retry with the same key replays the
 * stored response without re-running the handler.
 *
 * Rate limiting
 * ──────────────
 * Per-uid token bucket: 60 requests / minute, refilled at 1/sec.
 * Per-cellId burst limit: 10× the per-uid limit (so a hot tenant can't
 * starve other tenants on the same cell).  Bucket state lives in
 * Firestore on the registry cell to survive cold starts.
 *
 * This is the FOUNDATION — for a production rollout we'd swap the
 * Firestore-backed buckets for a managed token-bucket service (Redis,
 * Cloud Armor).  See `cell-routing.md` (Session J) for the upgrade path.
 */

'use strict';

const crypto = require('crypto');
const {onRequest, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {DEFAULT_CELL_ID, resolveCellId} = require('./cellConstants');
const {getAdminDb, getRegistryDb} = require('./cellRouter');

const REGION = 'us-east1';

// ── Handler registry ────────────────────────────────────────────────────────

/**
 * @typedef {Object} GatewayContext
 * @property {string} method
 * @property {string[]} pathParts
 * @property {string} uid
 * @property {string} role
 * @property {string} tenantId
 * @property {string} cellId
 * @property {FirebaseFirestore.Firestore} cellDb
 * @property {FirebaseFirestore.Firestore} registryDb
 * @property {Record<string, unknown>} body
 * @property {Record<string, string>} query
 * @property {Record<string, string>} headers
 */

/**
 * @typedef {Object} HandlerEntry
 * @property {string} method
 * @property {RegExp} pattern
 * @property {(ctx: GatewayContext) => Promise<{status: number, body: unknown}>} handler
 * @property {boolean} mutates       // affects whether X-Idempotency-Key is required
 * @property {boolean} partnerAuth   // true → use partner HMAC auth instead of Firebase JWT
 */

/** @type {HandlerEntry[]} */
const _routes = [];

/**
 * Register a route on the gateway.  Patterns match the path AFTER `/v1/`
 * (e.g. for `/v1/drills/abc`, the pattern matches against `drills/abc`).
 *
 * @param {string} method
 * @param {RegExp} pattern
 * @param {(ctx: GatewayContext) => Promise<{status: number, body: unknown}>} handler
 * @param {{ mutates?: boolean, partnerAuth?: boolean }} [opts]
 */
function register(method, pattern, handler, opts = {}) {
  _routes.push({
    method: method.toUpperCase(),
    pattern,
    handler,
    mutates: opts.mutates !== false &&
        method.toUpperCase() !== 'GET' &&
        method.toUpperCase() !== 'HEAD',
    partnerAuth: opts.partnerAuth === true,
  });
}

// ── Built-in routes ─────────────────────────────────────────────────────────

/**
 * GET /v1/cells/me — return the caller's currently assigned cell.
 * Diagnostic endpoint — every newly-issued JWT should round-trip
 * through this to confirm the gateway sees the same cellId the client
 * thinks it has.
 */
register('GET', /^cells\/me$/, async (ctx) => {
  return {
    status: 200,
    body: {
      uid: ctx.uid,
      role: ctx.role,
      tenantId: ctx.tenantId,
      cellId: ctx.cellId,
    },
  };
});

/**
 * GET /v1/healthz — liveness probe.  Returns 200 with the gateway
 * version (build timestamp) so canary deploys can confirm reachability.
 * Does NOT require auth — public on purpose.
 */
register('GET', /^healthz$/, async () => {
  return {
    status: 200,
    body: {ok: true, build: process.env.K_REVISION || 'local'},
  };
}, {mutates: false});

// ── Helpers ─────────────────────────────────────────────────────────────────

// Lazy-import so the scrypt helper from hotelPartnerOps doesn't load on cold
// start for non-partner routes.
function getScryptHash() {
  return require('./hotelPartnerOps')._scryptHash;
}

/**
 * Partner request authentication (Session B3).
 *
 * Header format:
 *   Authorization: Partner <partnerId>:<base64url-api-key>
 *   X-Vanguard-Signature: <hex(HMAC-SHA256(rawBody, signingSecret))>
 *   X-Vanguard-Timestamp: <unix ms>   (must be within 5 minutes)
 *
 * Flow:
 *   1. Parse Authorization header → partnerId + apiKey
 *   2. Load hotel_partners/{partnerId} from Firestore
 *   3. Check status === 'active'
 *   4. Verify timestamp within ±5 minutes (replay protection)
 *   5. Constant-time compare scrypt(apiKey, keySalt) against stored apiKeyHash
 *      (also check previousApiKeyHash within grace window)
 *   6. Verify HMAC-SHA256 body signature against signingSecretHash
 *
 * Returns the partner doc data on success.
 * Throws {status, message} on failure — same shape as verifyAuth errors.
 *
 * @param {Record<string,string|string[]>} headers
 * @param {string|Buffer} rawBody
 * @returns {Promise<object>}  hotel_partners doc data
 */
async function verifyPartnerSignature(headers, rawBody) {
  const authHeader = String(headers['authorization'] || '');
  if (!authHeader.startsWith('Partner ')) {
    throw {status: 401, code: 'unauthenticated', message: 'Missing Partner authorization.'};
  }

  const credentials = authHeader.slice('Partner '.length).trim(); // "<partnerId>:<apiKey>"
  const colonIdx = credentials.indexOf(':');
  if (colonIdx < 1) {
    throw {status: 401, code: 'unauthenticated', message: 'Malformed Partner credentials.'};
  }

  const partnerId = credentials.slice(0, colonIdx);
  const apiKey = credentials.slice(colonIdx + 1);

  if (!partnerId || !apiKey) {
    throw {status: 401, code: 'unauthenticated', message: 'Missing partnerId or apiKey.'};
  }

  // ── Timestamp (replay protection) ───────────────────────────────────────
  const ts = Number(headers['x-vanguard-timestamp'] || 0);
  if (!ts || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    throw {status: 401, code: 'unauthenticated', message: 'X-Vanguard-Timestamp missing or outside 5-minute window.'};
  }

  // ── Partner lookup ───────────────────────────────────────────────────────
  const partnerSnap = await admin.firestore().doc(`hotel_partners/${partnerId}`).get();
  if (!partnerSnap.exists) {
    throw {status: 401, code: 'unauthenticated', message: 'Partner not found.'};
  }
  const partner = partnerSnap.data();

  if (partner.status !== 'active') {
    throw {status: 403, code: 'permission_denied', message: `Partner account is "${partner.status}".`};
  }

  // ── API key verification (constant-time scrypt comparison) ──────────────
  const scryptHash = getScryptHash();
  const candidateHash = await scryptHash(apiKey, partner.keySalt);
  const mainMatch = crypto.timingSafeEqual(
      Buffer.from(candidateHash, 'hex'),
      Buffer.from(partner.apiKeyHash, 'hex'),
  );

  let gracePeriodMatch = false;
  if (!mainMatch && partner.previousApiKeyHash && partner.previousApiKeyHashUntil) {
    const gracePeriodExpiry = new Date(partner.previousApiKeyHashUntil).getTime();
    if (Date.now() < gracePeriodExpiry) {
      const prevHash = await scryptHash(apiKey, partner.keySalt);
      gracePeriodMatch = crypto.timingSafeEqual(
          Buffer.from(prevHash, 'hex'),
          Buffer.from(partner.previousApiKeyHash, 'hex'),
      );
    }
  }

  if (!mainMatch && !gracePeriodMatch) {
    throw {status: 401, code: 'unauthenticated', message: 'Invalid API key.'};
  }

  // ── Body HMAC signature verification ────────────────────────────────────
  const bodySignatureHeader = String(headers['x-vanguard-signature'] || '');
  if (!bodySignatureHeader) {
    throw {status: 401, code: 'unauthenticated', message: 'X-Vanguard-Signature required.'};
  }

  // Derive the signing secret from the hash for HMAC — we use the stored
  // *hash* as the HMAC key (the partner uses the plain-text signing secret
  // directly to sign the body, but we compare against the hash using the
  // same derivation).  We must re-derive the HMAC using the STORED plain-text
  // signing secret — except we never store plain-text.  Instead, we store
  // the scrypt-hash of the signing secret, and the partner uses the plain-
  // text signing secret to compute the HMAC.  We must compare the partner's
  // body signature against an HMAC computed with the KNOWN secret — but we
  // only have the hash.
  //
  // Resolution: use the raw stored signingSecretHash as the HMAC key on
  // OUR side (the partner uses the plain-text secret on THEIR side).  This
  // is non-standard but equivalent: both sides must agree on the same key
  // material.  The partner SDK documentation (docs/PARTNER_API.md) must
  // document that the HMAC key is `hex(scrypt(signingSecret, salt))` so the
  // partner derives the same key before signing.  This avoids plain-text
  // secret storage entirely.
  const expectedSig = crypto
      .createHmac('sha256', partner.signingSecretHash)
      .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8'))
      .digest('hex');

  let sigMatch = false;
  try {
    sigMatch = crypto.timingSafeEqual(
        Buffer.from(bodySignatureHeader.toLowerCase(), 'hex'),
        Buffer.from(expectedSig, 'hex'),
    );
  } catch {
    sigMatch = false;
  }

  if (!sigMatch) {
    throw {status: 401, code: 'unauthenticated', message: 'Body signature mismatch.'};
  }

  return {id: partnerId, ...partner};
}

/**
 * Verify the Authorization: Bearer header and return the decoded token.
 * Throws an HttpsError-compatible object on failure.
 *
 * @param {string|undefined} header
 * @returns {Promise<admin.auth.DecodedIdToken>}
 */
async function verifyAuth(header) {
  if (!header || !header.startsWith('Bearer ')) {
    throw {status: 401, code: 'unauthenticated', message: 'Missing bearer token.'};
  }
  const token = header.slice(7).trim();
  try {
    return await admin.auth().verifyIdToken(token);
  } catch (err) {
    logger.warn('[apiGateway] verifyIdToken failed', {error: err.message});
    throw {status: 401, code: 'unauthenticated', message: 'Invalid bearer token.'};
  }
}

/**
 * Idempotency cache — store, check, and replay.
 *
 * Layout: gateway_idempotency/{uid}_{key} on the registry cell.
 * TTL: 24h (cleaned up out-of-band by a scheduler — see Session I).
 *
 * @param {string} uid
 * @param {string} key
 * @returns {Promise<{ status: number, body: unknown } | null>}
 */
async function readIdempotent(uid, key) {
  if (!key) return null;
  const docId = `${uid}_${key}`;
  const snap = await getRegistryDb()
      .collection('gateway_idempotency')
      .doc(docId)
      .get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  // Defensive TTL — don't replay responses older than 24h.
  const recordedAt = data.recordedAt && data.recordedAt.toMillis ?
      data.recordedAt.toMillis() : 0;
  if (recordedAt && Date.now() - recordedAt > 24 * 60 * 60 * 1000) {
    return null;
  }
  return {status: data.status, body: data.body};
}

/**
 * Store an idempotency record for the (uid, key) pair.
 *
 * @param {string} uid
 * @param {string} key
 * @param {number} status
 * @param {unknown} body
 */
async function writeIdempotent(uid, key, status, body) {
  if (!key) return;
  const docId = `${uid}_${key}`;
  await getRegistryDb()
      .collection('gateway_idempotency')
      .doc(docId)
      .set({
        uid,
        key,
        status,
        body,
        recordedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
}

/**
 * Token-bucket rate limit.
 *
 * Implementation: store {tokens, lastRefillAt} in
 * gateway_rate_buckets/{scope}_{id} on the registry cell.  Refill 1
 * token per second up to the cap.  Take 1 token per request.  If
 * tokens < 1, reject with 429.
 *
 * @param {string} scope  'uid' | 'cell'
 * @param {string} id     The uid or cellId
 * @param {number} cap    Max bucket size (== max burst)
 * @returns {Promise<{ ok: boolean, remaining: number }>}
 */
async function takeRateToken(scope, id, cap) {
  const ref = getRegistryDb()
      .collection('gateway_rate_buckets')
      .doc(`${scope}_${id}`);
  return getRegistryDb().runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const now = Date.now();
    let tokens = cap;
    let lastRefillAt = now;
    if (snap.exists) {
      const data = snap.data();
      lastRefillAt = data.lastRefillAt || now;
      tokens = Math.min(
          cap,
          (data.tokens || 0) + Math.floor((now - lastRefillAt) / 1000),
      );
    }
    if (tokens < 1) {
      txn.set(ref, {tokens, lastRefillAt: now}, {merge: true});
      return {ok: false, remaining: 0};
    }
    tokens -= 1;
    txn.set(ref, {tokens, lastRefillAt: now}, {merge: true});
    return {ok: true, remaining: tokens};
  });
}

// ── Main dispatcher ─────────────────────────────────────────────────────────

/**
 * Cloud Function: apiGateway.
 *
 * Mount at `/v1/*` on the SvelteKit reverse proxy (see
 * `src/routes/api/v1/[...path]/+server.ts`).  The proxy forwards
 * `/v1/{rest}` to this function with the original Authorization
 * header intact.
 */
exports.apiGateway = onRequest(
    {region: REGION, cors: false},
    async (req, res) => {
      const start = Date.now();
      try {
        // ── Parse /v1/* path ───────────────────────────────────────────────
        const url = new URL(req.url, 'http://localhost');
        const pathMatch = url.pathname.match(/^\/?(?:v1\/)?(.*)$/);
        const rawPath = pathMatch ? pathMatch[1] : '';
        const pathParts = rawPath.split('/').filter(Boolean);
        const matchPath = pathParts.join('/');

        // ── Route lookup (skip auth entirely for public healthz) ───────────
        const candidate = _routes.find((r) =>
          r.method === req.method && r.pattern.test(matchPath));
        if (!candidate) {
          res.status(404).json({error: 'no_route', path: matchPath});
          return;
        }

        // Public routes: dispatch without auth.
        if (candidate.pattern.source === '^healthz$') {
          const {status, body} = await candidate.handler(
              /** @type {any} */ ({method: req.method, pathParts}));
          res.status(status).json(body);
          return;
        }

        // ── Partner auth routes (B3) ─────────────────────────────────────────
        if (candidate.partnerAuth) {
          let partner;
          try {
            partner = await verifyPartnerSignature(req.headers, req.rawBody || '');
          } catch (e) {
            res.status(e.status || 401).json({
              error: e.code || 'unauthenticated',
              message: e.message,
            });
            return;
          }

          // Per-partner rate limit: 600 req/min so a large CSV import doesn't
          // trip the per-uid bucket shared with Firebase-authed routes.
          const partnerBucket = await takeRateToken('partner', partner.id, 600);
          if (!partnerBucket.ok) {
            res.status(429).json({error: 'rate_limited', scope: 'partner', retryAfter: 1});
            return;
          }

          // Idempotency for partner mutating verbs (keyed by partner:idemKey).
          const idemKey = String(req.get('x-idempotency-key') || req.body?.idempotencyKey || '').trim();
          if (candidate.mutates && !idemKey) {
            res.status(400).json({
              error: 'idempotency_key_required',
              message: 'Partner mutating requests must include idempotencyKey in body or X-Idempotency-Key header.',
            });
            return;
          }
          const partnerIdemId = `partner_${partner.id}`;
          const cached = candidate.mutates ? await readIdempotent(partnerIdemId, idemKey) : null;
          if (cached) {
            res.set('X-Idempotency-Replay', '1');
            res.status(cached.status).json(cached.body);
            return;
          }

          const registryDb = getRegistryDb();
          const partnerCtx = {
            method: req.method,
            pathParts,
            uid: `partner:${partner.id}`,
            role: 'partner',
            tenantId: '',
            cellId: DEFAULT_CELL_ID,
            cellDb: getAdminDb(DEFAULT_CELL_ID),
            registryDb,
            body: req.body || {},
            query: Object.fromEntries(url.searchParams),
            headers: req.headers,
            partner,
          };

          const {status, body} = await candidate.handler(partnerCtx);

          if (candidate.mutates) {
            await writeIdempotent(partnerIdemId, idemKey, status, body);
          }

          // Write to the partner_webhook_log for every request (B7 audit trail).
          const logRef = admin.firestore().collection('partner_webhook_log').doc();
          logRef.set({
            partnerId: partner.id,
            path: matchPath,
            method: req.method,
            statusCode: status,
            idempotencyKey: idemKey || null,
            durationMs: Date.now() - start,
            requestHashSha256: require('crypto')
                .createHash('sha256')
                .update(req.rawBody || '')
                .digest('hex'),
            recordedAt: admin.firestore.FieldValue.serverTimestamp(),
          }).catch((e) => logger.warn('[apiGateway] partnerLog write failed', {e: e.message}));

          res.status(status).json(body);
          logger.info('[apiGateway] partner dispatched', {
            method: req.method,
            path: matchPath,
            partnerId: partner.id,
            status,
            elapsed_ms: Date.now() - start,
          });
          return;
        }

        // ── Verify ID token ─────────────────────────────────────────────────
        let decoded;
        try {
          decoded = await verifyAuth(req.get('authorization'));
        } catch (e) {
          res.status(e.status || 401).json({
            error: e.code || 'unauthenticated',
            message: e.message,
          });
          return;
        }
        const uid = decoded.uid;
        const role = String(decoded.role || '');
        const tenantId = String(decoded.tenantId || decoded.clubId || '');
        const cellId = resolveCellId(decoded.cellId);

        // ── Idempotency check (mutating verbs only) ────────────────────────
        const idemKey = String(req.get('x-idempotency-key') || '').trim();
        if (candidate.mutates && !idemKey) {
          res.status(400).json({
            error: 'idempotency_key_required',
            message:
                'Mutating requests must include the X-Idempotency-Key header.',
          });
          return;
        }
        const cached = candidate.mutates ?
            await readIdempotent(uid, idemKey) : null;
        if (cached) {
          res.set('X-Idempotency-Replay', '1');
          res.status(cached.status).json(cached.body);
          return;
        }

        // ── Rate limit ──────────────────────────────────────────────────────
        const uidBucket = await takeRateToken('uid', uid, 60);
        if (!uidBucket.ok) {
          res.status(429).json({
            error: 'rate_limited',
            scope: 'uid',
            retryAfter: 1,
          });
          return;
        }
        const cellBucket = await takeRateToken('cell', cellId, 600);
        if (!cellBucket.ok) {
          res.status(429).json({
            error: 'rate_limited',
            scope: 'cell',
            cellId,
            retryAfter: 1,
          });
          return;
        }

        // ── Dispatch ────────────────────────────────────────────────────────
        const cellDb = getAdminDb(cellId);
        const registryDb = getRegistryDb();

        /** @type {GatewayContext} */
        const ctx = {
          method: req.method,
          pathParts,
          uid,
          role,
          tenantId,
          cellId,
          cellDb,
          registryDb,
          body: req.body || {},
          query: Object.fromEntries(url.searchParams),
          headers: req.headers,
        };

        const {status, body} = await candidate.handler(ctx);

        if (candidate.mutates) {
          await writeIdempotent(uid, idemKey, status, body);
        }

        res.status(status).json(body);

        logger.info('[apiGateway] dispatched', {
          method: req.method,
          path: matchPath,
          uid,
          cellId,
          status,
          elapsed_ms: Date.now() - start,
        });
      } catch (err) {
        logger.error('[apiGateway] unhandled', err);
        res.status(500).json({error: 'internal'});
      }
    },
);

// ── Partner routes (Session B2 + B3) ────────────────────────────────────────
// These routes use `partnerAuth: true` — the gateway substitutes
// `verifyPartnerSignature` for the standard Firebase JWT check.
// The handler receives `ctx.partner` (the validated hotel_partners doc)
// instead of `ctx.uid / ctx.role`.
const {partnerHotelRebatesPost, partnerHotelRebatesGet} = require('./partnerHandlers/hotelRebates');
register('POST', /^partners\/hotel-rebates$/, partnerHotelRebatesPost, {mutates: true, partnerAuth: true});
register('GET',  /^partners\/hotel-rebates\/([^/]+)$/, partnerHotelRebatesGet, {mutates: false, partnerAuth: true});

// Exposed so domain handler files can register their routes during
// module load (require() in functions/index.js drives this).
exports.register = register;
