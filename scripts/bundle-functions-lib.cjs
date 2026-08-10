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
  // These patterns open background gRPC/socket connections at module load time,
  // causing the Firebase CLI's 10-second initialization timeout.
  // We replace them with lazy getters so connections are deferred to first use.
  const LAZY_TRANSFORMS = [
    {
      pattern: /^const db = admin\.firestore\(\);/gm,
      replacement: "const db = new Proxy({}, { get: (t, p) => { const _fs = admin.firestore(); const v = _fs[p]; return typeof v === 'function' ? v.bind(_fs) : v; } });",
    },
    {
      pattern: /^const auth = admin\.auth\(\);/gm,
      replacement: "const auth = new Proxy({}, { get: (t, p) => { const _a = admin.auth(); const v = _a[p]; return typeof v === 'function' ? v.bind(_a) : v; } });",
    },
    {
      pattern: /^const messaging = admin\.messaging\(\);/gm,
      replacement: "const messaging = new Proxy({}, { get: (t, p) => { const _m = admin.messaging(); const v = _m[p]; return typeof v === 'function' ? v.bind(_m) : v; } });",
    },
    {
      pattern: /^const storage = admin\.storage\(\);/gm,
      replacement: "const storage = new Proxy({}, { get: (t, p) => { const _st = admin.storage(); const v = _st[p]; return typeof v === 'function' ? v.bind(_st) : v; } });",
    },
    {
      pattern: /^const database = admin\.database\(\);/gm,
      replacement: "const database = new Proxy({}, { get: (t, p) => { const _db2 = admin.database(); const v = _db2[p]; return typeof v === 'function' ? v.bind(_db2) : v; } });",
    },
  ];

  for (const rel of rels) {
    const src = path.join(monolithRoot, rel);
    const dest = path.join(destRoot, rel);
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    let content = fs.readFileSync(src, 'utf8');
    for (const {pattern, replacement} of LAZY_TRANSFORMS) {
      content = content.replace(pattern, replacement);
    }
    fs.writeFileSync(dest, content, 'utf8');
  }
}

/**
 * @param {string} repoRoot
 * @param {string} destFolder e.g. functions-rl
 * @param {string[]} seedRels
 * @returns {number} files copied
 */
/** @param {string} repoRoot @param {string} destFolder */
function copyBootstrapAdmin(repoRoot, destFolder) {
  const src = path.join(repoRoot, 'functions-shared', 'bootstrapAdmin.js');
  const dest = path.join(repoRoot, destFolder, 'bootstrapAdmin.js');
  fs.copyFileSync(src, dest);
}

/** Remove bundled monolith copies no longer in the current closure. */
function pruneOrphanBundles(destRoot, rels, preserveRels = []) {
  const keep = new Set([...rels, 'bootstrapAdmin.js', ...preserveRels]);
  /** @param {string} dir @param {string} prefix */
  function walk(dir, prefix) {
    for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules') continue;
        walk(abs, rel);
        if (fs.readdirSync(abs).length === 0) {
          fs.rmdirSync(abs);
        }
      } else if (ent.isFile() && ent.name.endsWith('.js') && rel !== 'index.js') {
        if (!keep.has(rel)) {
          fs.unlinkSync(abs);
        }
      }
    }
  }
  if (fs.existsSync(destRoot)) walk(destRoot, '');
}

function bundleCodebase(repoRoot, destFolder, seedRels, preserveRels = []) {
  const monolithRoot = path.join(repoRoot, 'functions');
  const destRoot = path.join(repoRoot, destFolder);
  const rels = collectClosure(monolithRoot, seedRels);
  pruneOrphanBundles(destRoot, rels, preserveRels);
  copyClosure(monolithRoot, destRoot, rels);
  copyBootstrapAdmin(repoRoot, destFolder);
  return rels.size;
}

module.exports = {
  collectClosure,
  copyClosure,
  copyBootstrapAdmin,
  bundleCodebase,
};
