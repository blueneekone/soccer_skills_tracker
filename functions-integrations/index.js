'use strict';

require('./bootstrapAdmin');

const {resolveTarget} = require('./resolveTarget');
const target = resolveTarget();

if (!target || target === 'processMedia') {
  exports.processMedia = require('./processMedia').processMedia;
}

if (!target || target === 'ingestRoster') {
  exports.ingestRoster = require('./ingestRoster').ingestRoster;
}

if (!target || target === 'coachRosterIngest') {
  exports.coachRosterIngest = require('./src/domains/coachRosterIngestOps').coachRosterIngest;
}

if (
  !target ||
  target === 'getSoccerNews' ||
  target === 'searchPodcasts' ||
  target === 'getPodcastEpisodes'
) {
  const integrationHandlers = require('./integrations');
  if (!target || target === 'getSoccerNews') {
    exports.getSoccerNews = integrationHandlers.getSoccerNews;
  }
  if (!target || target === 'searchPodcasts') {
    exports.searchPodcasts = integrationHandlers.searchPodcasts;
  }
  if (!target || target === 'getPodcastEpisodes') {
    exports.getPodcastEpisodes = integrationHandlers.getPodcastEpisodes;
  }
}

if (!target || target === 'getWeatherConditions') {
  exports.getWeatherConditions = require('./weather').getWeatherConditions;
}

if (
  !target ||
  target === 'evaluateFieldWeatherLock' ||
  target === 'refreshClubWeatherLock'
) {
  const weatherLockHandlers = require('./src/domains/weatherOps');
  if (
    process.env.SCHEDULERS_ENABLED === 'true' &&
    (!target || target === 'evaluateFieldWeatherLock')
  ) {
    exports.evaluateFieldWeatherLock = weatherLockHandlers.evaluateFieldWeatherLock;
  }
  if (!target || target === 'refreshClubWeatherLock') {
    exports.refreshClubWeatherLock = weatherLockHandlers.refreshClubWeatherLock;
  }
}

if (!target || target === 'getUploadToken' || target === 'deleteAllPlayerMedia') {
  const uploadTokenHandlers = require('./uploadTokens');
  if (!target || target === 'getUploadToken') {
    exports.getUploadToken = uploadTokenHandlers.getUploadToken;
  }
  if (!target || target === 'deleteAllPlayerMedia') {
    exports.deleteAllPlayerMedia = uploadTokenHandlers.deleteAllPlayerMedia;
  }
}

if (!target || target === 'facilityWeatherWebhook') {
  exports.facilityWeatherWebhook =
    require('./src/domains/facilityWeatherWebhook').facilityWeatherWebhook;
}

if (!target || target === 'stackSportsAuthInit' || target === 'stackSportsAuthCallback' || target === 'syncStackSportsDataFn') {
  const stackSportsOps = require('./src/domains/stackSportsOps');
  if (!target || target === 'stackSportsAuthInit') {
    exports.stackSportsAuthInit = stackSportsOps.stackSportsAuthInit;
  }
  if (!target || target === 'stackSportsAuthCallback') {
    exports.stackSportsAuthCallback = stackSportsOps.stackSportsAuthCallback;
  }
  if (!target || target === 'syncStackSportsDataFn') {
    exports.syncStackSportsDataFn = stackSportsOps.syncStackSportsDataFn;
  }
}
