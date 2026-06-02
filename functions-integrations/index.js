'use strict';

/**
 * functions-integrations — media processing, roster ingest, feeds, weather, uploads.
 * Domain sources are copied into this package by scripts/bundle-functions.cjs.
 * processMedia uses GEMINI_API_KEY + sharp; ingestRoster uses pdf-parse.
 */
const processMediaHandlers = require('./processMedia');
exports.processMedia = processMediaHandlers.processMedia;

const ingestHandlers = require('./ingestRoster');
exports.ingestRoster = ingestHandlers.ingestRoster;

const integrationHandlers = require('./integrations');
exports.getSoccerNews = integrationHandlers.getSoccerNews;
exports.searchPodcasts = integrationHandlers.searchPodcasts;
exports.getPodcastEpisodes = integrationHandlers.getPodcastEpisodes;

const weatherHandlers = require('./weather');
exports.getWeatherConditions = weatherHandlers.getWeatherConditions;

const uploadTokenHandlers = require('./uploadTokens');
exports.getUploadToken = uploadTokenHandlers.getUploadToken;
exports.deleteAllPlayerMedia = uploadTokenHandlers.deleteAllPlayerMedia;

const webhooksOps = require('./src/domains/webhooksOps');
exports.facilityWeatherWebhook = webhooksOps.facilityWeatherWebhook;
