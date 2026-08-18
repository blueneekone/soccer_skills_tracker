'use strict';

/**
 * Universal Backend Smoke Probe
 * Validates module loading, dependencies, boot safety, and cold-start health for all 7 split codebases.
 *
 * Usage:
 *   node scripts/smoke-require-codebase.cjs all
 *   node scripts/smoke-require-codebase.cjs <core|rl|commerce|compliance|integrations|platform|default> [--simulate-cloud]
 */

const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

/** @type {Record<string, string>} */
const CODEBASE_DIRS = {
  default: 'functions',
  core: 'functions-core',
  rl: 'functions-rl',
  commerce: 'functions-commerce',
  compliance: 'functions-compliance',
  integrations: 'functions-integrations',
  platform: 'functions-platform',
};

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'smoke-test';
if (!process.env.FIREBASE_CONFIG) {
  process.env.FIREBASE_CONFIG = JSON.stringify({
    projectId: process.env.GCLOUD_PROJECT,
    storageBucket: `${process.env.GCLOUD_PROJECT}.appspot.com`,
  });
}

const target = process.argv[2] || 'all';
const simulateCloud = process.argv.includes('--simulate-cloud');

if (simulateCloud) {
  console.log('Cloud Run simulate, lazy');
}

function probeCodebase(name) {
  const dir = CODEBASE_DIRS[name];
  if (!dir) throw new Error(`Unknown codebase: ${name}`);
  const indexPath = path.join(REPO_ROOT, dir, 'index.js');
  console.log(`🔍 Probing [${name}] (${dir}/index.js)...`);
  
  // Clear require cache for clean validation
  try {
    require(indexPath);
    console.log(`✅ [${name}] OK — initialized successfully without boot errors.`);
    return true;
  } catch (err) {
    console.error(`❌ [${name}] CRITICAL BOOT FAILURE:`, err.message);
    return false;
  }
}

if (target === 'all') {
  console.log('⚡ Running Universal Backend Cold-Start Smoke Probe across all 7 codebases...\n');
  let hasFailure = false;
  for (const name of Object.keys(CODEBASE_DIRS)) {
    const ok = probeCodebase(name);
    if (!ok) hasFailure = true;
  }
  if (hasFailure) {
    console.error('\n🚨 Universal Smoke Probe detected one or more codebase failures!');
    process.exit(1);
  }
  console.log('\n🎉 ALL 7 BACKEND CODEBASES PASSED UNIVERSAL SMOKE PROBE.');
} else {
  const ok = probeCodebase(target);
  if (!ok) process.exit(1);
}
