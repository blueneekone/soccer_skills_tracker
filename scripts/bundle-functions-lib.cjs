'use strict';

/**
 * Shared closure collector for DEPLOY-O bundle scripts.
 * Copies monolith `functions/` sources into split codebase folders.
 */

const fs = require('node:fs');
const path = require('node:path');

const REL_REQUIRE_RE = /require\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;

/** @param {string} abs */
function listRelativeRequires(abs) {
  const content = fs.readFileSync(abs, 'utf8');
  const reqs = [];
  let m;
  while ((m = REL_REQUIRE_RE.exec(content)) !== null) {
    reqs.push(m[1]);
  }
  return reqs;
}

/**
 * @param {string} monolithRoot
 * @param {string} fromRel path relative to monolith root
 * @param {string} req require path from source file
 * @returns {string} path relative to monolith root
 */
function resolveMonolithRel(monolithRoot, fromRel, req) {
  const dir = path.dirname(fromRel);
  let resolved = path.normalize(path.join(dir, req)).split(path.sep).join('/');
  if (resolved.startsWith('..')) {
    throw new Error(`require escapes monolith: ${fromRel} -> ${req}`);
  }
  const abs = path.join(monolithRoot, resolved);
  if (!fs.existsSync(abs)) {
    const withJs = `${resolved}.js`;
    if (fs.existsSync(path.join(monolithRoot, withJs))) {
      resolved = withJs;
    }
  }
  return resolved;
}

/**
 * @param {string} monolithRoot
 * @param {string[]} seedRels
 * @returns {Set<string>}
 */
function collectClosure(monolithRoot, seedRels) {
  const queue = [...seedRels];
  const seen = new Set();

  while (queue.length > 0) {
    const rel = queue.shift();
    if (!rel || seen.has(rel)) continue;

    const abs = path.join(monolithRoot, rel);
    if (!fs.existsSync(abs)) {
      throw new Error(`Missing monolith source: functions/${rel}`);
    }

    seen.add(rel);
    for (const req of listRelativeRequires(abs)) {
      queue.push(resolveMonolithRel(monolithRoot, rel, req));
    }
  }

  return seen;
}

/** @param {string} monolithRoot @param {string} destRoot @param {Set<string>} rels */
function copyClosure(monolithRoot, destRoot, rels) {
  for (const rel of rels) {
    const src = path.join(monolithRoot, rel);
    const dest = path.join(destRoot, rel);
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    fs.copyFileSync(src, dest);
  }
}

/**
 * @param {string} repoRoot
 * @param {string} destFolder e.g. functions-rl
 * @param {string[]} seedRels
 * @returns {number} files copied
 */
function bundleCodebase(repoRoot, destFolder, seedRels) {
  const monolithRoot = path.join(repoRoot, 'functions');
  const destRoot = path.join(repoRoot, destFolder);
  const rels = collectClosure(monolithRoot, seedRels);
  copyClosure(monolithRoot, destRoot, rels);
  return rels.size;
}

module.exports = {
  collectClosure,
  copyClosure,
  bundleCodebase,
};
