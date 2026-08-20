/* eslint-disable quotes */
/**
 * cellRouter.js
 * ──────────────
 * Server-side cell-aware Firestore accessors.
 *
 * Phase 1, Epic 1 — Cell-Based Routing, Session D
 *
 * The Admin SDK supports Firebase Multi-Database via
 * `getFirestore(app, cellId)` (firebase-admin >= 11.2.0).  This module
 * centralises three accessors so the rest of the Cloud Functions
 * codebase never has to know which Firestore database its tenant
 * lives on:
 *
 *   • getRegistryDb()    — the (default) cell only.  Use for ALL
 *                          reads/writes against the cell registry,
 *                          organizations/*, invites/*, license_*,
 *                          and any other control-plane collection
 *                          that must remain centralised.
 *
 *   • getAdminDb(cellId) — explicit cell-targeted accessor.  Use when
 *                          the caller already knows the cellId (e.g.
 *                          migration jobs that iterate cells/*).
 *
 *   • getRequestDb(request) — read the caller's cellId from their JWT
 *                          and return the matching Firestore.  Use in
 *                          every onCall handler that touches tenant-
 *                          scoped data (players, drills, fixtures,
 *                          media, missions, etc.).
 *
 * Caching
 * ───────
 * Firestore instances are cached per cellId for the lifetime of the
 * function instance.  Cloud Functions Gen 2 keeps an instance hot for
 * up to 15 minutes between invocations, so amortising the
 * `getFirestore(app, cellId)` call is a measurable win — even though
 * each call is cheap, instance reuse keeps the underlying gRPC
 * channels warm.
 *
 * Guardrail
 * ─────────
 * `getRequestDb()` is hard-coded to call `assertAuthenticated()` first.
 * No anonymous caller can route to a dedicated cell — the only path
 * to a non-default Firestore from a request is via a verified JWT
 * `cellId` claim, and unauthenticated calls fall back to the registry
 * (default) cell which is the safe default.
 */

'use strict';

const admin = require('firebase-admin');
const {DEFAULT_CELL_ID, resolveCellId} = require('./cellConstants');
const {assertAuthenticated} = require('./tenantUtils');

/**
 * Cache of Firestore Admin instances keyed by cellId.
 * @type {Map<string, FirebaseFirestore.Firestore>}
 */
const _cache = new Map();

/**
 * Resolve a Firestore Admin instance for the supplied cellId.
 *
 * The (default) cell falls through to `admin.firestore()` so we never
 * call `getFirestore(app, '(default)')` (the Admin SDK accepts it but
 * pre-11.2.0 versions don't recognise the literal string — defensive).
 *
 * @param {string} [cellId]
 * @returns {FirebaseFirestore.Firestore}
 */
function getAdminDb(cellId) {
  const resolved = resolveCellId(cellId);
  const cached = _cache.get(resolved);
  if (cached) return cached;

  let instance;
  if (resolved === DEFAULT_CELL_ID) {
    instance = admin.firestore();
  } else {
    // firebase-admin >= 11.2 exposes `admin.firestore(app, databaseId)`.
    // The 2-arg form, however, requires explicit App.  Use the default
    // app and let the SDK target the named database.
    instance = admin.firestore(admin.app(), resolved);
  }
  _cache.set(resolved, instance);
  return instance;
}

/**
 * Get the registry / control-plane Firestore — always the (default)
 * cell.  Use for the `cells/*` collection itself, organizations/*,
 * invites/*, and any other cross-cell control-plane data.
 *
 * Equivalent to `getAdminDb(DEFAULT_CELL_ID)` but named for clarity at
 * call sites that need a self-documenting "this lives on the
 * registry" signal.
 *
 * @returns {FirebaseFirestore.Firestore}
 */
function getRegistryDb() {
  return getAdminDb(DEFAULT_CELL_ID);
}

/**
 * Read the caller's verified cellId claim and return the matching
 * Firestore.  This is the primary entry point for tenant-scoped
 * onCall handlers — they replace any `admin.firestore()` call with
 * `getRequestDb(request)`.
 *
 * Throws `unauthenticated` if the caller has no Auth context.  An
 * unauthenticated caller MUST never reach a dedicated cell — the
 * security model requires a verified JWT to make the routing
 * decision.
 *
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 * @returns {FirebaseFirestore.Firestore}
 */
function getRequestDb(request) {
  assertAuthenticated(request);
  const cellId = resolveCellId(request.auth?.token?.cellId);
  return getAdminDb(cellId);
}

/**
 * Read a cellId from an organizations/{tenantId} doc on the registry
 * and return that cell's Firestore.  Used by migration tooling
 * (Session G) when it needs to operate on a tenant whose cellId is
 * not the caller's own.
 *
 * Returns the (default) Firestore if the doc is missing or has no
 * cellId — preserving the invariant that unmigrated tenants are
 * always on the shared cell.
 *
 * @param {string} tenantId
 * @returns {Promise<{ cellId: string, db: FirebaseFirestore.Firestore }>}
 */
async function getTenantDb(tenantId) {
  const registry = getRegistryDb();
  const snap = await registry.collection('organizations').doc(tenantId).get();
  const cellId = snap.exists ? resolveCellId(snap.get('cellId')) : DEFAULT_CELL_ID;
  return {cellId, db: getAdminDb(cellId)};
}

module.exports = {
  getAdminDb,
  getRegistryDb,
  getRequestDb,
  getTenantDb,
};
