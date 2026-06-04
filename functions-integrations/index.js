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
