'use strict';

/**
 * Firebase Admin bootstrap for split function codebases.
 * Canonical source — copied into each deploy package by scripts/bundle-functions.cjs.
 *
 * Resolves `firebase-admin` from the host codebase index (functions-platform, etc.)
 * so initializeApp() applies to the same singleton domain modules use.
 */
const path = require('path');

/** @returns {string[]} */
function hostRoots() {
  /** @type {string[]} */
  const roots = [];
  if (module.parent && module.parent.filename) {
    roots.push(path.dirname(module.parent.filename));
  }
  roots.push(process.cwd());
  if (__dirname.includes(`${path.sep}node_modules${path.sep}functions-shared`)) {
    roots.push(path.join(__dirname, '..', '..'));
  } else {
    roots.push(path.join(__dirname, '..'));
  }
  return [...new Set(roots)];
}

/** @returns {typeof import('firebase-admin')} */
function resolveFirebaseAdmin() {
  for (const root of hostRoots()) {
    try {
      return require(require.resolve('firebase-admin', {paths: [root]}));
    } catch {
      // try next host root
    }
  }
  return require('firebase-admin');
}

const admin = resolveFirebaseAdmin();
let initialized = false;

function initAdmin() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }

  let credential;
  const fs = require('fs');
  let keyPath = path.resolve(__dirname, '../serviceAccountKey.json'); if (!fs.existsSync(keyPath)) { keyPath = path.resolve(__dirname, '../../serviceAccountKey.json'); }
  try {
    fs.writeFileSync('C:/Users/ewaec/Documents/Soccer Skills Developent Tracker/soccer_skills_tracker/deploy-debug.log', 'Dirname: ' + __dirname + ' keyPath: ' + keyPath + ' exists: ' + fs.existsSync(keyPath) + '\n', {flag: 'a'});
  } catch (err) {
    try {
      fs.writeFileSync(path.resolve(__dirname, '../deploy-debug.log'), 'Dirname: ' + __dirname + ' keyPath: ' + keyPath + ' exists: ' + fs.existsSync(keyPath) + '\n', {flag: 'a'});
    } catch (e) {
      // ignore silently if neither is writable
    }
  }
  
  if (fs.existsSync(keyPath)) {
    try {
      const certObj = require(keyPath);
      credential = admin.credential.cert(certObj);
      if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = certObj.project_id;
      if (!process.env.GCP_PROJECT) process.env.GCP_PROJECT = certObj.project_id;
      if (!process.env.FIREBASE_CONFIG) process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: certObj.project_id });
      admin.initializeApp({ credential, projectId: certObj.project_id });
      initialized = true;
      return;
    } catch (e) {
      // Ignore invalid cert errors during bootstrap
    }
  }

  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  initialized = true;
}

// Global initialization is strictly forbidden to prevent deployment timeouts
// The Proxy below will lazily initialize the Admin SDK when first accessed.

const adminProxy = new Proxy(admin, {
  get(target, prop) {
    initAdmin();
    const value = target[prop];
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  }
});

module.exports = adminProxy;
