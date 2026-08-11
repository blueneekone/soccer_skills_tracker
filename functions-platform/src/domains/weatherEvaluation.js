'use strict';

/**
 * weatherEvaluation.js — shared AEGIS weather + lightning evaluation (Open-Meteo + NWS).
 * Used by getWeatherConditions (onCall) and evaluateFieldWeatherLock (scheduled).
 */

const logger = require('firebase-functions/logger');
const https = require('https');
const http = require('http');

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

const THUNDER_AT_LOCATION = new Set([95, 96, 99]);
const THUNDER_NEARBY = new Set([17, 29, 91, 92, 93, 94]);

const NWS_DANGER_EVENTS = [
  'severe thunderstorm warning',
  'tornado warning',
  'flash flood emergency',
  'extreme wind warning',
];
const NWS_CAUTION_EVENTS = [
  'severe thunderstorm watch',
  'tornado watch',
  'thunderstorm watch',
  'special weather statement',
  'lightning safety awareness',
];

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

function windDir(deg) {
  if (!isFinite(deg)) return '—';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

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
    if (!highestLevel || (level === 'DANGER' && highestLevel === 'CAUTION')) {
      highestLevel = level;
      highestEvent = props.event || null;
      highestDesc = description.slice(0, 400).replace(/\s+/g, ' ').trim();
      highestExpires = props.expires || null;
    }
  }

  return {level: highestLevel, event: highestEvent, description: highestDesc, expires: highestExpires};
}

function estimateLightningMiles(wmoCode, nwsLevel) {
  if (THUNDER_AT_LOCATION.has(wmoCode)) return 2;
  if (THUNDER_NEARBY.has(wmoCode)) return 15;
  if (nwsLevel === 'DANGER') return 5;
  if (nwsLevel === 'CAUTION') return 14;
  return null;
}

async function evaluateWeatherAtCoords(lat, lng) {
  const latRound = Math.round(lat * 10000) / 10000;
  const lngRound = Math.round(lng * 10000) / 10000;

  const openMeteoUrl = [
    'https://api.open-meteo.com/v1/forecast',
    `?latitude=${latRound}&longitude=${lngRound}`,
    '&current=temperature_2m,relative_humidity_2m,precipitation,',
    'precipitation_probability,weather_code,wind_speed_10m,',
    'wind_direction_10m,uv_index,surface_pressure',
    '&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto',
  ].join('');

  const nwsUrl =
    `https://api.weather.gov/alerts/active?point=${latRound},${lngRound}` +
    '&status=actual&message_type=alert';

  const [omResult, nwsResult] = await Promise.allSettled([
    fetchJson(openMeteoUrl),
    fetchJson(nwsUrl),
  ]);

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
    logger.warn('[weatherEvaluation] Open-Meteo failed', {err: omResult.reason?.message});
  }

  const nwsAlert = nwsResult.status === 'fulfilled' ?
    parseNwsAlerts(nwsResult.value) :
    {level: null, event: null, description: null, expires: null};

  if (nwsResult.status === 'rejected') {
    logger.warn('[weatherEvaluation] NWS failed', {err: nwsResult.reason?.message});
  }

  let alertLevel = 'NORMAL';
  if (THUNDER_AT_LOCATION.has(wmoCode) || nwsAlert.level === 'DANGER') {
    alertLevel = 'DANGER';
  } else if (THUNDER_NEARBY.has(wmoCode) || nwsAlert.level === 'CAUTION') {
    alertLevel = 'CAUTION';
  }

  const lightningMiles = estimateLightningMiles(wmoCode, nwsAlert.level);
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
      alertLevel,
      estimatedMiles: lightningMiles,
      nwsEvent: nwsAlert.event,
      nwsDescription: nwsAlert.description,
      nwsExpires: nwsAlert.expires,
      detectedAt: alertLevel !== 'NORMAL' ? new Date().toISOString() : null,
    },
    deploymentStatus,
    fetchedAt: new Date().toISOString(),
    lat: latRound,
    lng: lngRound,
  };
}

function mapSnapshotToFieldStatus(snapshot) {
  const miles = snapshot?.lightning?.estimatedMiles;
  const distanceKm = miles != null ? Math.round(miles * 1.60934 * 10) / 10 : undefined;
  const nwsEvent = snapshot?.lightning?.nwsEvent;
  const conditions = snapshot?.current?.conditionsLabel;

  if (snapshot?.lightning?.alertLevel === 'DANGER' || snapshot?.deploymentStatus === 'NO-GO') {
    const reason = nwsEvent ||
      (miles != null ? `Lightning/storm risk ~${miles} mi (${conditions || 'AEGIS'})` :
        `Unsafe conditions (${conditions || 'AEGIS'})`);
    return {status: 'locked', lockReason: reason, distanceKm, provider: 'aegis'};
  }

  if (snapshot?.lightning?.alertLevel === 'CAUTION' || snapshot?.deploymentStatus === 'HOLD') {
    const reason = nwsEvent || 'Storm watch — monitor before deploying';
    return {status: 'advisory', lockReason: reason, distanceKm, provider: 'aegis'};
  }

  return {status: 'clear', provider: 'aegis'};
}

module.exports = {
  evaluateWeatherAtCoords,
  mapSnapshotToFieldStatus,
  parseNwsAlerts,
  estimateLightningMiles,
};
