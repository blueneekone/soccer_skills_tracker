/* eslint-disable quotes */
/**
 * weather.js â€” AEGIS Weather & Safety Protocol
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Cloud Function proxy for real-time weather and lightning risk data.
 *
 * Data sources (100% free, no API keys required):
 *   1. Open-Meteo API  â€” current conditions, WMO weather codes, precipitation
 *      https://api.open-meteo.com/v1/forecast
 *   2. NWS API         â€” official US weather alerts (severe thunderstorm warnings)
 *      https://api.weather.gov/alerts/active?point={lat},{lng}
 *
 * Lightning risk is inferred from:
 *   â€¢ NWS active alert event type (WARNING > WATCH > ADVISORY)
 *   â€¢ WMO weather code (95/96/99 = thunderstorm at location)
 *   â€¢ Precipitation intensity combined with thunderstorm codes
 *
 * AlertLevel mapping returned to client:
 *   NORMAL  â€” no thunder indicators, all clear
 *   CAUTION â€” thunderstorm watch / distant storm (10-20 mi estimated range)
 *   DANGER  â€” thunderstorm warning / storm at location (<10 mi estimated range)
 *
 * Exports:
 *   getWeatherConditions â€” onCall: fetch conditions for a lat/lng coordinate
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const https = require('https');
const http = require('http');

const REGION = 'us-east1';

// â”€â”€ WMO weather code reference â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// https://open-meteo.com/en/docs#weathervariables

const WMO_LABELS = {
  0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Rime Fog',
  51: 'Light Drizzle', 53: 'Drizzle', 55: 'Dense Drizzle',
  61: 'Slight Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Slight Snow', 73: 'Snow', 75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Slight Showers', 81: 'Showers', 82: 'Violent Showers',
  85: 'Snow Showers', 86: 'Heavy Snow Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + Hail', 99: 'Heavy Thunderstorm + Hail',
};

// WMO codes that indicate an active thunderstorm at the measurement location.
const THUNDER_AT_LOCATION = new Set([95, 96, 99]);
// WMO codes that indicate possible distant/overhead storm.
const THUNDER_NEARBY = new Set([17, 29, 91, 92, 93, 94]);

// â”€â”€ NWS alert severity mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Event names that represent the DANGER threshold.
const NWS_DANGER_EVENTS = [
  'severe thunderstorm warning',
  'tornado warning',
  'flash flood emergency',
  'extreme wind warning',
];
// Event names that represent the CAUTION threshold.
const NWS_CAUTION_EVENTS = [
  'severe thunderstorm watch',
  'tornado watch',
  'thunderstorm watch',
  'special weather statement',
  'lightning safety awareness',
];

// â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      timeout: 8000,
      headers: {'User-Agent': 'VanguardSSTRacker/2.0 (contact@sstracker.app)'},
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchJson(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
        } catch (e) {
          reject(new Error(`JSON parse error for ${url}: ${e.message}`));
        }
      });
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
    req.on('error', reject);
  });
}

/**
 * Convert wind direction degrees to cardinal label.
 * @param {number} deg
 * @return {string}
 */
function windDir(deg) {
  if (!isFinite(deg)) return 'â€”';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/**
 * Parse NWS alert JSON and return the highest-severity thunderstorm alert.
 * @param {object} nwsJson
 * @return {{ level: 'DANGER'|'CAUTION'|null, event: string|null, description: string|null, expires: string|null }}
 */
function parseNwsAlerts(nwsJson) {
  const features = nwsJson?.features || [];

  let highestLevel = null;
  let highestEvent = null;
  let highestDesc = null;
  let highestExpires = null;

  for (const feature of features) {
    const props = feature?.properties || {};
    const eventName = (props.event || '').toLowerCase();
    const description = props.description || props.headline || '';

    let level = null;
    if (NWS_DANGER_EVENTS.some((e) => eventName.includes(e))) {
      level = 'DANGER';
    } else if (NWS_CAUTION_EVENTS.some((e) => eventName.includes(e))) {
      level = 'CAUTION';
    } else if (eventName.includes('thunder') || eventName.includes('lightning')) {
      level = 'CAUTION';
    }

    if (!level) continue;

    // Higher level always wins; DANGER beats CAUTION.
    if (!highestLevel || (level === 'DANGER' && highestLevel === 'CAUTION')) {
      highestLevel = level;
      highestEvent = props.event || null;
      highestDesc = description.slice(0, 400).replace(/\s+/g, ' ').trim();
      highestExpires = props.expires || null;
    }
  }

  return {level: highestLevel, event: highestEvent, description: highestDesc, expires: highestExpires};
}

/**
 * Estimate lightning distance in miles from available signals.
 * Returns null if no lightning detected, or an estimated distance.
 * @param {number} wmoCode
 * @param {string|null} nwsLevel
 * @return {number|null}
 */
function estimateLightningMiles(wmoCode, nwsLevel) {
  if (THUNDER_AT_LOCATION.has(wmoCode)) return 2; // at / near location
  if (THUNDER_NEARBY.has(wmoCode)) return 15;      // in vicinity
  if (nwsLevel === 'DANGER') return 5;             // NWS warning â†’ close
  if (nwsLevel === 'CAUTION') return 14;           // NWS watch â†’ area threat
  return null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// getWeatherConditions â€” onCall
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Fetch live weather conditions and lightning risk for a coordinate.
 *
 * Input:  { lat: number, lng: number }
 * Returns: WeatherSnapshot (see type below)
 *
 * Role gate: only coaches, directors, and admins may call this function
 * to minimise API usage (players are excluded).
 */
exports.getWeatherConditions = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const callerRole = request.auth.token.role || '';
  const allowedRoles = ['coach', 'director', 'global_admin', 'super_admin'];
  if (!allowedRoles.includes(callerRole)) {
    throw new HttpsError(
        'permission-denied',
        'Weather monitoring is restricted to coaches and directors.',
    );
  }

  const lat = typeof request.data?.lat === 'number' ? request.data.lat : null;
  const lng = typeof request.data?.lng === 'number' ? request.data.lng : null;
  if (lat === null || lng === null || !isFinite(lat) || !isFinite(lng)) {
    throw new HttpsError('invalid-argument', 'Valid lat and lng are required.');
  }

  const latRound = Math.round(lat * 10000) / 10000;
  const lngRound = Math.round(lng * 10000) / 10000;

  // â”€â”€ Fetch in parallel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openMeteoUrl = [
    `https://api.open-meteo.com/v1/forecast`,
    `?latitude=${latRound}&longitude=${lngRound}`,
    `&current=temperature_2m,relative_humidity_2m,precipitation,`,
    `precipitation_probability,weather_code,wind_speed_10m,`,
    `wind_direction_10m,uv_index,surface_pressure`,
    `&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto`,
  ].join('');

  const nwsUrl = `https://api.weather.gov/alerts/active?point=${latRound},${lngRound}&status=actual&message_type=alert`;

  const [omResult, nwsResult] = await Promise.allSettled([
    fetchJson(openMeteoUrl),
    fetchJson(nwsUrl),
  ]);

  // â”€â”€ Parse Open-Meteo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let current = null;
  let wmoCode = 0;
  if (omResult.status === 'fulfilled') {
    const c = omResult.value?.current || {};
    wmoCode = Number(c.weather_code ?? 0);
    current = {
      temperatureF: Math.round(Number(c.temperature_2m ?? 0)),
      humidity: Math.round(Number(c.relative_humidity_2m ?? 0)),
      precipMm: Number(c.precipitation ?? 0),
      precipProbability: Math.round(Number(c.precipitation_probability ?? 0)),
      windMph: Math.round(Number(c.wind_speed_10m ?? 0)),
      windDirection: windDir(Number(c.wind_direction_10m ?? 0)),
      uvIndex: Math.round(Number(c.uv_index ?? 0)),
      weatherCode: wmoCode,
      conditionsLabel: WMO_LABELS[wmoCode] ?? 'Unknown',
    };
  } else {
    logger.warn('[getWeatherConditions] Open-Meteo failed', {err: omResult.reason?.message});
  }

  // â”€â”€ Parse NWS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const nwsAlert = nwsResult.status === 'fulfilled'
      ? parseNwsAlerts(nwsResult.value)
      : {level: null, event: null, description: null, expires: null};

  if (nwsResult.status === 'rejected') {
    logger.warn('[getWeatherConditions] NWS failed', {err: nwsResult.reason?.message});
  }

  // â”€â”€ Determine alert level â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let alertLevel = 'NORMAL';
  if (THUNDER_AT_LOCATION.has(wmoCode) || nwsAlert.level === 'DANGER') {
    alertLevel = 'DANGER';
  } else if (THUNDER_NEARBY.has(wmoCode) || nwsAlert.level === 'CAUTION') {
    alertLevel = 'CAUTION';
  }

  const lightningMiles = estimateLightningMiles(wmoCode, nwsAlert.level);

  // â”€â”€ Build GO/NO-GO deployment status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const tempF = current?.temperatureF ?? 72;
  const windMph = current?.windMph ?? 0;
  const precipProb = current?.precipProbability ?? 0;
  let deploymentStatus = 'GO';
  if (alertLevel === 'DANGER') {
    deploymentStatus = 'NO-GO';
  } else if (alertLevel === 'CAUTION') {
    deploymentStatus = 'HOLD';
  } else if (windMph > 25 || precipProb >= 65 || tempF >= 100 || tempF <= 20) {
    deploymentStatus = 'NO-GO';
  }

  return {
    current,
    lightning: {
      alertLevel,        // 'NORMAL' | 'CAUTION' | 'DANGER'
      estimatedMiles: lightningMiles,
      nwsEvent: nwsAlert.event,
      nwsDescription: nwsAlert.description,
      nwsExpires: nwsAlert.expires,
      detectedAt: alertLevel !== 'NORMAL' ? new Date().toISOString() : null,
    },
    deploymentStatus,  // 'GO' | 'HOLD' | 'NO-GO'
    fetchedAt: new Date().toISOString(),
    lat: latRound,
    lng: lngRound,
  };
});
