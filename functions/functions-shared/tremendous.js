/* eslint-disable max-len */
/**
 * tremendous.js
 * ─────────────
 * Thin REST client for the Tremendous Rewards API.
 *
 * Tremendous is a pay-as-you-go rewards platform — no pre-funded cash pools
 * required.  Parents link a bank account / credit card as a funding source;
 * when a bounty is verified, the platform creates an order that charges the
 * parent's linked source and delivers the reward directly.
 *
 * API base: https://www.tremendous.com/api/v2  (production)
 *           https://testflight.tremendous.com/api/v2  (sandbox)
 *
 * Auth: Bearer token via Secret Manager.
 *
 * Pattern: Follows the same `defineSecret` convention as commerce.js (Stripe).
 */

const logger = require('firebase-functions/logger');
const {defineSecret, defineString} = require('firebase-functions/params');

/** API key provisioned at: https://app.tremendous.com/settings/api */
const TREMENDOUS_API_KEY = defineSecret('TREMENDOUS_API_KEY');

/** 'production' or 'sandbox' — defaults to sandbox for safety */
const TREMENDOUS_ENV = defineString('TREMENDOUS_ENV', {default: 'sandbox'});

const PROD_BASE  = 'https://www.tremendous.com/api/v2';
const SAND_BASE  = 'https://testflight.tremendous.com/api/v2';

/**
 * Resolve the base URL from the environment param.
 * @return {string}
 */
function baseUrl() {
  return TREMENDOUS_ENV.value() === 'production' ? PROD_BASE : SAND_BASE;
}

/**
 * Shared fetch wrapper.
 * @param {string} path  API path (e.g. '/orders')
 * @param {'GET'|'POST'|'PATCH'|'DELETE'} method
 * @param {object|null} body
 * @return {Promise<object>}
 */
async function tremendousRequest(path, method, body) {
  const apiKey = TREMENDOUS_API_KEY.value();
  const url = `${baseUrl()}${path}`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    logger.error('Tremendous fetch error', {path, method, err});
    throw new Error(`Tremendous network error: ${err.message}`);
  }

  let json;
  try {
    json = await res.json();
  } catch (_) {
    logger.error('Tremendous non-JSON response', {path, status: res.status});
    throw new Error(`Tremendous returned non-JSON (${res.status})`);
  }

  if (!res.ok) {
    logger.error('Tremendous API error', {path, status: res.status, body: json});
    const msg = (json && json.errors && JSON.stringify(json.errors)) ||
      (json && json.message) ||
      `HTTP ${res.status}`;
    throw new Error(`Tremendous error: ${msg}`);
  }

  return json;
}

// ── Funding Sources ───────────────────────────────────────────────────────────

/**
 * List funding sources available on the platform account.
 * Returns the raw Tremendous `funding_sources` array.
 * @return {Promise<Array<object>>}
 */
async function listFundingSources() {
  const json = await tremendousRequest('/funding_sources', 'GET', null);
  return Array.isArray(json.funding_sources) ? json.funding_sources : [];
}

/**
 * Retrieve a single funding source by ID.
 * @param {string} fundingSourceId
 * @return {Promise<object>}
 */
async function getFundingSource(fundingSourceId) {
  const json = await tremendousRequest(
      `/funding_sources/${fundingSourceId}`, 'GET', null);
  return json.funding_source || json;
}

// ── Recipients ────────────────────────────────────────────────────────────────

/**
 * Upsert a Tremendous recipient for the player.
 * If the recipient already exists (same email), Tremendous returns the existing
 * record — safe to call idempotently.
 *
 * @param {{ name: string, email: string }} recipient
 * @return {Promise<object>} Tremendous recipient object
 */
async function upsertRecipient(recipient) {
  const json = await tremendousRequest('/recipients', 'POST', {recipient});
  return json.recipient || json;
}

// ── Orders ────────────────────────────────────────────────────────────────────

/**
 * Create an order that charges the parent's funding source and delivers a
 * reward to the child player.
 *
 * @param {{
 *   fundingSourceId: string,
 *   recipientName: string,
 *   recipientEmail: string,
 *   valueCents: number,
 *   currency: string,
 *   bountyId: string,
 *   bountyTitle: string,
 * }} params
 * @return {Promise<{ orderId: string, recipientId: string }>}
 */
async function createBountyOrder(params) {
  const {
    fundingSourceId,
    recipientName,
    recipientEmail,
    valueCents,
    currency = 'USD',
    bountyId,
    bountyTitle,
  } = params;

  const valueDecimal = valueCents / 100;

  const body = {
    payment: {
      funding_source_id: fundingSourceId,
    },
    rewards: [
      {
        value: {
          denomination: valueDecimal,
          currency_code: currency,
        },
        recipient: {
          name: recipientName,
          email: recipientEmail,
        },
        delivery: {
          method: 'EMAIL',
        },
        // Use a broad digital rewards catalog by default.
        // Campaign ID can be configured per-tenant in a future sub-epic.
        products: ['FANTASTIC_FIXINS'],
        message: `Congratulations! You earned your bounty: ${bountyTitle}`,
      },
    ],
    external_id: bountyId,
  };

  const json = await tremendousRequest('/orders', 'POST', body);
  const order = json.order || json;
  const reward = (order.rewards || [])[0] || {};
  return {
    orderId: order.id || '',
    recipientId: (reward.recipient || {}).id || '',
  };
}

/**
 * Retrieve an existing order by ID.
 * @param {string} orderId
 * @return {Promise<object>}
 */
async function getOrder(orderId) {
  const json = await tremendousRequest(`/orders/${orderId}`, 'GET', null);
  return json.order || json;
}

// ── Webhook signature verification ───────────────────────────────────────────

/**
 * Verify the HMAC-SHA256 signature on an incoming Tremendous webhook.
 * Throws if the signature is invalid.
 *
 * @param {string} rawBody   Raw request body string (before JSON.parse)
 * @param {string} signature Value of the `tremendous-webhook-signature` header
 * @param {string} secret    Webhook signing secret from Secret Manager
 */
function verifyWebhookSignature(rawBody, signature, secret) {
  const crypto = require('crypto');
  const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

  const sigParts = signature.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {});

  const received = sigParts.v1 || signature;

  if (!crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(received.padEnd(expected.length, '0').slice(0, expected.length), 'hex'),
  )) {
    throw new Error('Tremendous webhook signature mismatch');
  }
}

module.exports = {
  listFundingSources,
  getFundingSource,
  upsertRecipient,
  createBountyOrder,
  getOrder,
  verifyWebhookSignature,
  TREMENDOUS_API_KEY,
  TREMENDOUS_ENV,
};
