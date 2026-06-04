'use strict';

/** @type {readonly string[]} */
const EXPORT_NAMES = Object.freeze([
  'processMedia',
  'ingestRoster',
  'getSoccerNews',
  'searchPodcasts',
  'getPodcastEpisodes',
  'getWeatherConditions',
  'getUploadToken',
  'deleteAllPlayerMedia',
  'facilityWeatherWebhook',
]);

/** @type {Map<string, string>} lowercase service id → camelCase export */
const LOWER_TO_EXPORT = new Map(
    EXPORT_NAMES.map((name) => [name.toLowerCase(), name]),
);

/**
 * Strip Firebase codebase prefix (`integrations.<export>` or `integrations-<export>`).
 *
 * @param {string} raw
 * @returns {string}
 */
function stripIntegrationsPrefix(raw) {
  const prefixed = raw.match(/^integrations[.-](.+)$/i);
  return prefixed ? prefixed[1] : raw;
}

/**
 * Map a single env fragment to a camelCase export name, or '' if unknown.
 *
 * @param {string} raw
 * @returns {string}
 */
function mapRawToExport(raw) {
  const normalized = stripIntegrationsPrefix(raw);
  if (EXPORT_NAMES.includes(normalized)) {
    return normalized;
  }
  return LOWER_TO_EXPORT.get(normalized.toLowerCase()) || '';
}

/**
 * Resolve active export from Cloud Run / Firebase env.
 * Cloud Run sets K_SERVICE to the lowercase service id; Firebase may set
 * FUNCTION_TARGET (camelCase or codebase-prefixed with `.` or `-`). When both
 * are set, try FUNCTION_TARGET first then K_SERVICE so hyphen-prefixed targets
 * still resolve. Return '' only when both are unset (Firebase CLI discovery).
 *
 * @returns {string}
 */
function resolveTarget() {
  const functionTarget = process.env.FUNCTION_TARGET || '';
  const kService = process.env.K_SERVICE || '';

  if (!functionTarget && !kService) {
    return '';
  }

  /** @type {string[]} */
  const candidates = [];
  if (functionTarget) {
    candidates.push(functionTarget);
  }
  if (kService) {
    candidates.push(kService);
  }

  for (const raw of candidates) {
    const mapped = mapRawToExport(raw);
    if (mapped) {
      return mapped;
    }
  }

  const label = functionTarget || kService;
  throw new Error(`Unknown FUNCTION_TARGET for integrations: ${label}`);
}

module.exports = {resolveTarget, EXPORT_NAMES, LOWER_TO_EXPORT};
