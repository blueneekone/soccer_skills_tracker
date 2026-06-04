'use strict';

/**
 * Alpha/dev Cloud Run scaling defaults — scale to zero, cap burst instances.
 * Production may reinstate minInstances > 0 for latency-sensitive callables.
 */
const ALPHA_CALLABLE_OPTS = {minInstances: 0, maxInstances: 10};
const ALPHA_HTTP_OPTS = {minInstances: 0, maxInstances: 20, cors: false};

module.exports = {ALPHA_CALLABLE_OPTS, ALPHA_HTTP_OPTS};
