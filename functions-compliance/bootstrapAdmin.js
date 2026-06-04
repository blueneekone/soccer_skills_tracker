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

if (admin.apps.length === 0) {
  admin.initializeApp();
}

module.exports = admin;
