'use strict';

/**
 * DEPLOY-O-deps-split — verify split function codebases declare npm deps
 * for every non-relative require() in bundled .js files under each folder.
 *
 * Run from repo root:
 *   node scripts/verify-codebase-deps.cjs
 *   node scripts/verify-codebase-deps.cjs commerce integrations
 */

const fs = require('node:fs');
const path = require('node:path');
const {builtinModules} = require('node:module');

const REPO_ROOT = path.resolve(__dirname, '..');

/** Deployable split codebases (functions-shared is a library — not scanned). */
/** @type {Record<string, string>} */
const CODEBASE_FOLDERS = {
  core: 'functions-core',
  rl: 'functions-rl',
  commerce: 'functions-commerce',
  compliance: 'functions-compliance',
  integrations: 'functions-integrations',
  platform: 'functions-platform',
};

const BUILTIN = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);

const REQUIRE_RE =
    /require\s*\(\s*['"]([^'"/][^'"]*)['"]\s*\)/g;

/** Scoped or bare package name from require path. */
function packageNameFromRequire(spec) {
  if (spec.startsWith('node:')) {
    const bare = spec.slice(5);
    return bare.includes('/') ? bare.split('/')[0] : bare;
  }
  if (spec.startsWith('@')) {
    const parts = spec.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
  }
  return spec.split('/')[0];
}

/** @param {string} dir @returns {string[]} */
function listJsFiles(dir) {
  /** @type {string[]} */
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue;
      out.push(...listJsFiles(abs));
    } else if (ent.isFile() && ent.name.endsWith('.js')) {
      out.push(abs);
    }
  }
  return out;
}

/**
 * @param {string} folderRel e.g. functions-commerce
 * @return {{ missing: Map<string, Set<string>>, externals: Set<string> }}
 */
function scanCodebase(folderRel) {
  const root = path.join(REPO_ROOT, folderRel);
  const pkgPath = path.join(root, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`Missing package.json: ${folderRel}`);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const declared = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ]);

  /** @type {Map<string, Set<string>>} */
  const missing = new Map();
  const externals = new Set();

  for (const file of listJsFiles(root)) {
    const relFile = path.relative(root, file).split(path.sep).join('/');
    if (relFile === 'index.js' || relFile === 'bootstrapAdmin.js') continue;
    const content = fs.readFileSync(file, 'utf8');
    let m;
    REQUIRE_RE.lastIndex = 0;
    while ((m = REQUIRE_RE.exec(content)) !== null) {
      const spec = m[1];
      if (spec.startsWith('.') || spec.startsWith('/')) continue;
      const pkgName = packageNameFromRequire(spec);
      if (BUILTIN.has(pkgName) || BUILTIN.has(spec)) continue;
      externals.add(pkgName);
      if (!declared.has(pkgName)) {
        if (!missing.has(pkgName)) missing.set(pkgName, new Set());
        missing.get(pkgName).add(relFile);
      }
    }
  }

  return {missing, externals};
}

/** Integrations-specific wiring guards (DEPLOY-O-deps-split). */
function assertIntegrationsWiring() {
  const indexSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'functions-integrations', 'index.js'),
      'utf8',
  );
  if (/require\s*\(\s*['"]\.\/src\/domains\/webhooksOps['"]\s*\)/.test(indexSrc)) {
    throw new Error(
        'functions-integrations/index.js must not require webhooksOps ' +
        '(loads Stripe); use facilityWeatherWebhook.js',
    );
  }
  if (!/require\s*\(\s*['"]\.\/src\/domains\/facilityWeatherWebhook['"]\s*\)/.test(
      indexSrc,
  )) {
    throw new Error(
        'functions-integrations/index.js must require facilityWeatherWebhook',
    );
  }

  const bundledWebhooks = path.join(
      REPO_ROOT,
      'functions-integrations',
      'src',
      'domains',
      'webhooksOps.js',
  );
  if (fs.existsSync(bundledWebhooks)) {
    throw new Error(
        'functions-integrations must not bundle webhooksOps.js (Stripe dep)',
    );
  }

  const weatherPath = path.join(
      REPO_ROOT,
      'functions-integrations',
      'src',
      'domains',
      'facilityWeatherWebhook.js',
  );
  if (!fs.existsSync(weatherPath)) {
    throw new Error(
        'functions-integrations missing bundled facilityWeatherWebhook.js — ' +
        'run npm run bundle:functions',
    );
  }
  const weatherSrc = fs.readFileSync(weatherPath, 'utf8');
  if (/require\s*\(\s*['"]stripe['"]\s*\)/.test(weatherSrc)) {
    throw new Error('facilityWeatherWebhook.js must not require stripe');
  }
}

function main() {
  const filter = process.argv.slice(2);
  const names = filter.length > 0 ?
    filter.filter((n) => CODEBASE_FOLDERS[n]) :
    Object.keys(CODEBASE_FOLDERS);

  if (names.length === 0) {
    console.error(
        'Unknown filter. Valid: ' + Object.keys(CODEBASE_FOLDERS).join(', '),
    );
    process.exit(1);
  }

  let failed = false;

  for (const name of names) {
    const folder = CODEBASE_FOLDERS[name];
    const {missing} = scanCodebase(folder);
    if (missing.size > 0) {
      failed = true;
      console.error(`\n${folder}: undeclared dependencies`);
      for (const [pkg, files] of [...missing.entries()].sort()) {
        console.error(`  ${pkg} ← ${[...files].sort().join(', ')}`);
      }
    } else {
      console.log(`${folder}: deps OK`);
    }
  }

  if (names.includes('integrations') || filter.length === 0) {
    try {
      assertIntegrationsWiring();
      console.log('functions-integrations: wiring OK');
    } catch (err) {
      failed = true;
      console.error(String(err instanceof Error ? err.message : err));
    }
  }

  if (failed) process.exit(1);
}

main();
