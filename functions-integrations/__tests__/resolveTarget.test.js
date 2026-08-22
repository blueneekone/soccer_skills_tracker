'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { resolveTarget, UnknownTargetError } = require('../resolveTarget');

describe('resolveTarget', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FUNCTION_TARGET;
    delete process.env.K_SERVICE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('returns empty string when both FUNCTION_TARGET and K_SERVICE are unset', () => {
    assert.equal(resolveTarget(), '');
  });

  test('resolves target from FUNCTION_TARGET (exact match)', () => {
    process.env.FUNCTION_TARGET = 'getSoccerNews';
    assert.equal(resolveTarget(), 'getSoccerNews');
  });

  test('resolves target from FUNCTION_TARGET with dot prefix', () => {
    process.env.FUNCTION_TARGET = 'integrations.processMedia';
    assert.equal(resolveTarget(), 'processMedia');
  });

  test('resolves target from FUNCTION_TARGET with hyphen prefix', () => {
    process.env.FUNCTION_TARGET = 'integrations-ingestRoster';
    assert.equal(resolveTarget(), 'ingestRoster');
  });

  test('resolves target from K_SERVICE (lowercase matching)', () => {
    process.env.K_SERVICE = 'getweatherconditions';
    assert.equal(resolveTarget(), 'getWeatherConditions');
  });

  test('prefers FUNCTION_TARGET over K_SERVICE', () => {
    process.env.FUNCTION_TARGET = 'searchPodcasts';
    process.env.K_SERVICE = 'getweatherconditions';
    assert.equal(resolveTarget(), 'searchPodcasts');
  });

  test('throws UnknownTargetError with target property when target is unknown', () => {
    process.env.FUNCTION_TARGET = 'unknownExportName';

    assert.throws(
      () => resolveTarget(),
      (err) => {
        assert.ok(err instanceof UnknownTargetError);
        assert.ok(err instanceof Error);
        assert.equal(err.name, 'UnknownTargetError');
        assert.equal(err.target, 'unknownExportName');
        assert.equal(err.message, 'Unknown FUNCTION_TARGET for integrations: unknownExportName');
        return true;
      }
    );
  });
});
