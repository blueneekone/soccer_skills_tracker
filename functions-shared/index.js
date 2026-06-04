'use strict';

/**
 * functions-shared — self-contained shared utilities (bundled from monolith).
 * Run `node scripts/bundle-functions.cjs` before deploy / local require.
 */
require('./bootstrapAdmin');

const gamificationWorkoutXp = require('./gamificationWorkoutXp');
const authBouncers = require('./src/middleware/authBouncers');
const formatters = require('./src/utils/formatters');
const alphaRunOptions = require('./src/utils/alphaRunOptions');

module.exports = {
  gamificationWorkoutXp,
  authBouncers,
  formatters,
  alphaRunOptions,
  ...gamificationWorkoutXp,
  ...authBouncers,
  ...formatters,
  ...alphaRunOptions,
};
