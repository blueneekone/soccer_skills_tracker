'use strict';

/**
 * DEPLOY-O-bundle — copy monolith `functions/` closures into all split codebases.
 * Run from repo root: node scripts/bundle-functions.cjs
 *
 * Optional filter: node scripts/bundle-functions.cjs rl commerce
 */

const path = require('node:path');
const {bundleCodebase} = require('./bundle-functions-lib.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');

/** @type {Record<string, { folder: string, seeds: string[] }>} */
const CODEBASES = {
  shared: {
    folder: 'functions-shared',
    seeds: [
      'gamificationWorkoutXp.js',
      'src/middleware/authBouncers.js',
      'src/utils/formatters.js',
      'src/utils/alphaRunOptions.js',
    ],
  },
  core: {
    folder: 'functions-core',
    seeds: [
      'src/domains/trainingOps.js',
      'src/domains/scheduleOps.js',
      'src/domains/registrationOps.js',
      'src/domains/rosterOps.js',
      'src/domains/tryoutsOps.js',
      'src/domains/eligibilityOps.js',
    ],
  },
  rl: {
    folder: 'functions-rl',
    seeds: [
      'rlOps.js',
      'src/ml/transitionRecorder.js',
      'src/ml/trainer.js',
    ],
  },
  commerce: {
    folder: 'functions-commerce',
    seeds: [
      'commerce.js',
      'ticketing.js',
      'ticketReceipts.js',
      'subscription.js',
      'legacyBillingOps.js',
      'hotelRebates.js',
      'hotelPartnerOps.js',
      'recruiterBilling.js',
      'pricingPolicyOps.js',
      'src/domains/webhooksOps.js',
    ],
  },
  compliance: {
    folder: 'functions-compliance',
    seeds: [
      'src/domains/vaultOps.js',
      'src/domains/shredOps.js',
      'coppa.js',
      'webauthn.js',
      'compliance.js',
      'verifyDocument.js',
      'src/domains/complianceOps.js',
      'src/domains/operativeOps.js',
    ],
  },
  integrations: {
    folder: 'functions-integrations',
    seeds: [
      'processMedia.js',
      'ingestRoster.js',
      'integrations.js',
      'weather.js',
      'uploadTokens.js',
      'src/domains/facilityWeatherWebhook.js',
    ],
    preserve: ['resolveTarget.js'],
  },
  platform: {
    folder: 'functions-platform',
    seeds: [
      'tenantUtils.js',
      'cellRouter.js',
      'cellBootstrap.js',
      'cellProvisioning.js',
      'cellMigration.js',
      'cellObservability.js',
      'cellSeed.js',
      'apiGateway.js',
      'analytics.js',
      'src/domains/adminOps.js',
      'src/domains/operativeOps.js',
    ],
  },
};

const ORDER = [
  'shared',
  'core',
  'rl',
  'commerce',
  'compliance',
  'integrations',
  'platform',
];

const filter = process.argv.slice(2);
const targets = filter.length > 0 ?
  ORDER.filter((name) => filter.includes(name)) :
  ORDER;

if (targets.length === 0) {
  console.error(
      'Unknown codebase filter. Valid: ' + ORDER.join(', '),
  );
  process.exit(1);
}

for (const name of targets) {
  const {folder, seeds, preserve} = CODEBASES[name];
  const count = bundleCodebase(REPO_ROOT, folder, seeds, preserve || []);
  console.log(`bundle-functions: ${folder} ${count} file(s)`);
}
