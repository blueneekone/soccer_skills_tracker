/**
 * functionsDeploy.guard.test.js — multi-codebase export wiring regression guards.
 *
 * Run from repo root:
 *   node --test functions/__tests__/functionsDeploy.guard.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FUNCTIONS_ROOT = path.join(REPO_ROOT, 'functions');

/** @param {string} rel @returns {string} */
function readRepo(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

/** @param {string} exportName @param {string} src */
function assertExportLine(exportName, src) {
  const re = new RegExp(
      `exports\\.${exportName}\\s*=`,
  );
  assert.match(src, re, `missing exports.${exportName}`);
}

const ADMIN_BOOTSTRAP_RE =
    /require\s*\(\s*['"](?:\.\/bootstrapAdmin|functions-shared\/bootstrapAdmin)['"]\s*\)|admin\.initializeApp\s*\(/;

/** @param {string} rel */
function assertAdminBootstrapBeforeDomains(rel) {
  const src = readRepo(rel);
  assert.match(
      src,
      ADMIN_BOOTSTRAP_RE,
      `${rel} must require ./bootstrapAdmin or call admin.initializeApp()`,
  );

  const requireRe = /^\s*(?:const|let|var)?\s*.*require\s*\(\s*['"](\.\/[^'"]+)['"]\s*\)/;
  let sawBootstrap = false;
  for (const line of src.split('\n')) {
    if (ADMIN_BOOTSTRAP_RE.test(line)) {
      sawBootstrap = true;
      continue;
    }
    const m = line.match(requireRe);
    if (!m) continue;
    const target = m[1];
    if (
      target === './bootstrapAdmin' ||
      target === 'functions-shared/bootstrapAdmin'
    ) {
      continue;
    }
    assert.ok(
        sawBootstrap,
        `${rel} must bootstrap Firebase Admin before require('${target}')`,
    );
    return;
  }
}

describe('functionsDeploy guard — codebase indexes', () => {
  const SPLIT_INDEXES = [
    'functions-core/index.js',
    'functions-rl/index.js',
    'functions-commerce/index.js',
    'functions-compliance/index.js',
    'functions-integrations/index.js',
    'functions-platform/index.js',
    'functions-shared/index.js',
  ];

  for (const rel of SPLIT_INDEXES) {
    it(`${rel} does not require ../functions/`, () => {
      const src = readRepo(rel);
      assert.doesNotMatch(
          src,
          /require\(['"]\.\.\/functions\//,
          `${rel} must use local bundled paths`,
      );
    });
  }

  const DEPLOY_INDEXES = SPLIT_INDEXES.filter(
      (rel) => rel !== 'functions-shared/index.js',
  );

  for (const rel of DEPLOY_INDEXES) {
    it(`${rel} bootstraps Firebase Admin before domain requires`, () => {
      assertAdminBootstrapBeforeDomains(rel);
    });
  }

  it('functions-platform/index.js preloads tenantUtils + cellRouter after bootstrap', () => {
    const src = readRepo('functions-platform/index.js');
    const bootstrapIdx = src.search(ADMIN_BOOTSTRAP_RE);
    const tenantIdx = src.indexOf("require('./tenantUtils')");
    const routerIdx = src.indexOf("require('./cellRouter')");
    const gatewayIdx = src.indexOf("require('./apiGateway')");
    assert.ok(bootstrapIdx >= 0, 'missing bootstrapAdmin');
    assert.ok(tenantIdx > bootstrapIdx, 'tenantUtils must follow bootstrap');
    assert.ok(routerIdx > tenantIdx, 'cellRouter must follow tenantUtils');
    assert.ok(gatewayIdx > routerIdx, 'apiGateway must follow cellRouter preload');
    assert.match(
        src,
        /require\s*\(\s*['"]\.\/bootstrapAdmin['"]\s*\)/,
        'platform must require ./bootstrapAdmin before apiGateway',
    );
  });

  it('functions-core/index.js exports launch training + intent callables', () => {
    const src = readRepo('functions-core/index.js');
    for (const name of [
      'logTrainingSession',
      'secureDeployIntent',
      'secureCancelIntent',
      'secureExtendIntent',
    ]) {
      assertExportLine(name, src);
    }
    assert.match(
        src,
        /require\(['"]\.\/src\/domains\/trainingOps['"]\)/,
        'functions-core must require bundled local trainingOps',
    );
  });

  it('functions-rl/index.js exports launch RL callables + triggers', () => {
    const src = readRepo('functions-rl/index.js');
    for (const name of [
      'getAdaptiveWorkoutPolicy',
      'initRlPolicy',
      'rlOnWorkoutLogCreated',
      'rlOnPhysioReportCreated',
      'submitPhysioSelfReport',
    ]) {
      assertExportLine(name, src);
    }
    assert.match(src, /require\(['"]\.\/rlOps['"]\)/);
    assert.match(
        src,
        /require\(['"]\.\/src\/ml\/transitionRecorder['"]\)/,
    );
  });

  it('functions-compliance/index.js exports launch household + VPC + operative login', () => {
    const src = readRepo('functions-compliance/index.js');
    for (const name of [
      'linkHousehold',
      'parentGrantVpcConsent',
      'parentSignCoppaWaiver',
      'parentProvisionOperative',
      'operativeSignInWithDispatch',
      'generatePlayerOTP',
      'validatePlayerOTP',
    ]) {
      assertExportLine(name, src);
    }
    assert.match(
        src,
        /require\(['"]\.\/src\/domains\/complianceOps['"]\)/,
        'functions-compliance must require bundled local complianceOps',
    );
    assert.match(
        src,
        /require\(['"]\.\/src\/domains\/operativeOps['"]\)/,
        'functions-compliance must require bundled local operativeOps',
    );
  });
});

describe('functionsDeploy guard — DEPLOY-O bundle scripts', () => {
  const BUNDLE_SCRIPTS = [
    'scripts/bundle-functions-lib.cjs',
    'scripts/bundle-functions.cjs',
    'scripts/bundle-functions-core.cjs',
  ];

  for (const rel of BUNDLE_SCRIPTS) {
    it(`${rel} exists`, () => {
      assert.ok(
          fs.existsSync(path.join(REPO_ROOT, rel)),
          `missing ${rel}`,
      );
    });
  }

  it('bundle-functions.cjs copies closures into split codebases', () => {
    execFileSync(
        process.execPath,
        ['scripts/bundle-functions.cjs'],
        {cwd: REPO_ROOT, stdio: 'pipe'},
    );
    const samples = [
      'functions-core/bootstrapAdmin.js',
      'functions-core/src/domains/trainingOps.js',
      'functions-rl/bootstrapAdmin.js',
      'functions-rl/rlOps.js',
      'functions-rl/src/ml/trainer.js',
      'functions-commerce/bootstrapAdmin.js',
      'functions-commerce/commerce.js',
      'functions-compliance/bootstrapAdmin.js',
      'functions-compliance/src/domains/vaultOps.js',
      'functions-compliance/src/domains/operativeOps.js',
      'functions-integrations/bootstrapAdmin.js',
      'functions-integrations/processMedia.js',
      'functions-platform/bootstrapAdmin.js',
      'functions-platform/apiGateway.js',
      'functions-shared/src/utils/alphaRunOptions.js',
    ];
    for (const rel of samples) {
      assert.ok(
          fs.existsSync(path.join(REPO_ROOT, rel)),
          `expected ${rel} after bundle`,
      );
    }
  });
});

describe('functionsDeploy guard — firebase.json codebases', () => {
  const EXPECTED_CODEBASES = [
    'default',
    'core',
    'rl',
    'commerce',
    'compliance',
    'integrations',
    'platform',
  ];

  it('registers all split codebases with bundle predeploy', () => {
    const firebase = JSON.parse(readRepo('firebase.json'));
    const entries = firebase.functions;
    assert.ok(Array.isArray(entries), 'firebase.json must have functions array');
    const codebases = entries.map((e) => e.codebase);
    for (const name of EXPECTED_CODEBASES) {
      assert.ok(codebases.includes(name), `missing codebase "${name}"`);
    }
    assert.equal(
        entries.find((e) => e.codebase === 'core')?.source,
        'functions-core',
    );
    assert.equal(
        entries.find((e) => e.codebase === 'platform')?.source,
        'functions-platform',
    );
    for (const name of ['core', 'rl', 'commerce', 'compliance', 'integrations', 'platform']) {
      const entry = entries.find((e) => e.codebase === name);
      assert.ok(entry?.predeploy?.length, `${name} must have predeploy bundle hook`);
      assert.match(
          entry.predeploy.join(' '),
          /bundle-functions\.cjs/,
          `${name} predeploy must run bundle-functions.cjs`,
      );
    }
  });
});

describe('functionsDeploy guard — monolith slim (DEPLOY-N)', () => {
  const MIGRATED_FROM_DEFAULT = [
    'logTrainingSession',
    'secureDeployIntent',
    'secureCancelIntent',
    'secureExtendIntent',
    'initRlPolicy',
    'getAdaptiveWorkoutPolicy',
    'rlOnWorkoutLogCreated',
    'apiGateway',
    'createStripeCheckoutSession',
    'stripeWebhook',
    'vaultSealPii',
    'processMedia',
    'webauthnRegisterStart',
    'linkHousehold',
    'parentGrantVpcConsent',
    'parentSignCoppaWaiver',
    'parentProvisionOperative',
    'operativeSignInWithDispatch',
    'generatePlayerOTP',
    'validatePlayerOTP',
  ];

  it('functions/index.js does not export symbols owned by split codebases', () => {
    const src = readRepo('functions/index.js');
    for (const name of MIGRATED_FROM_DEFAULT) {
      assert.doesNotMatch(
          src,
          new RegExp(`exports\\.${name}\\s*=`),
          `default index must not export ${name}`,
      );
    }
    assert.match(
        src,
        /logger\.warn\([\s\S]*Legacy monolith index/,
        'default index should warn that split codebases own production surfaces',
    );
  });

  it('all functions package.json engines.node are 20', () => {
    const pkgs = [
      'functions/package.json',
      'functions-shared/package.json',
      'functions-core/package.json',
      'functions-rl/package.json',
      'functions-commerce/package.json',
      'functions-compliance/package.json',
      'functions-integrations/package.json',
      'functions-platform/package.json',
    ];
    for (const rel of pkgs) {
      const pkg = JSON.parse(readRepo(rel));
      assert.equal(
          pkg.engines?.node,
          '20',
          `${rel} engines.node must be "20"`,
      );
    }
  });
});

describe('functionsDeploy guard — dependency isolation', () => {
  it('functions-core/package.json excludes @tensorflow/tfjs-node', () => {
    const pkg = JSON.parse(readRepo('functions-core/package.json'));
    const deps = {...pkg.dependencies, ...pkg.devDependencies};
    assert.equal(
        deps['@tensorflow/tfjs-node'],
        undefined,
        'functions-core must not depend on tfjs-node',
    );
  });

  it('functions-rl/package.json includes @tensorflow/tfjs-node', () => {
    const pkg = JSON.parse(readRepo('functions-rl/package.json'));
    assert.ok(
        pkg.dependencies?.['@tensorflow/tfjs-node'],
        'functions-rl must depend on @tensorflow/tfjs-node',
    );
  });
});

describe('functionsDeploy guard — DEPLOY-O-platform-init', () => {
  const DEPLOY_INDEXES = [
    'functions-core/index.js',
    'functions-rl/index.js',
    'functions-commerce/index.js',
    'functions-compliance/index.js',
    'functions-integrations/index.js',
    'functions-platform/index.js',
  ];

  it('functions-shared/bootstrapAdmin.js initializes host firebase-admin singleton', () => {
    const src = readRepo('functions-shared/bootstrapAdmin.js');
    assert.match(src, /admin\.apps\.length\s*===\s*0/);
    assert.match(src, /admin\.initializeApp\s*\(/);
    assert.match(
        src,
        /module\.parent|require\.resolve\s*\(\s*['"]firebase-admin['"]/,
        'bootstrap must resolve firebase-admin from the host codebase',
    );
  });

  for (const rel of DEPLOY_INDEXES) {
    it(`${rel} bootstraps admin via ./bootstrapAdmin before domain requires`, () => {
      const src = readRepo(rel);
      assert.match(
          src,
          /require\s*\(\s*['"]\.\/bootstrapAdmin['"]\s*\)/,
          `${rel} must require ./bootstrapAdmin first (Cloud Run has no functions-shared package)`,
      );
      assert.doesNotMatch(
          src,
          /require\s*\(\s*['"]functions-shared\/bootstrapAdmin['"]\s*\)/,
          `${rel} must not require functions-shared/bootstrapAdmin — parent folder is not uploaded`,
      );
      assertAdminBootstrapBeforeDomains(rel);
    });
  }

  it('split indexes must not require functions-shared/bootstrapAdmin (grep guard)', () => {
    const indexes = [
      'functions-core/index.js',
      'functions-rl/index.js',
      'functions-commerce/index.js',
      'functions-compliance/index.js',
      'functions-integrations/index.js',
      'functions-platform/index.js',
    ];
    for (const rel of indexes) {
      const src = readRepo(rel);
      assert.doesNotMatch(
          src,
          /require\s*\(\s*['"]functions-shared\/bootstrapAdmin['"]\s*\)/,
          `${rel} still uses functions-shared/bootstrapAdmin`,
      );
    }
  });

  it('platform, core, and rl indexes load for Firebase discovery (smoke require)', () => {
    execFileSync(process.execPath, ['scripts/bundle-functions.cjs'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
    for (const folder of [
      'functions-platform',
      'functions-core',
      'functions-rl',
    ]) {
      const dir = path.join(REPO_ROOT, folder);
      execFileSync('npm', ['install', '--no-audit', '--no-fund'], {
        cwd: dir,
        stdio: 'pipe',
        shell: true,
      });
    }
    const platformOut = execFileSync(
        process.execPath,
        ['-e', "require('./index.js'); console.log('platform discovery OK')"],
        {cwd: path.join(REPO_ROOT, 'functions-platform'), encoding: 'utf8'},
    );
    assert.match(platformOut, /platform discovery OK/);
    const coreOut = execFileSync(
        process.execPath,
        ['-e', "require('./index.js'); console.log('core OK')"],
        {cwd: path.join(REPO_ROOT, 'functions-core'), encoding: 'utf8'},
    );
    assert.match(coreOut, /core OK/);
    const rlOut = execFileSync(
        process.execPath,
        ['-e', "require('./index.js'); console.log('rl OK')"],
        {cwd: path.join(REPO_ROOT, 'functions-rl'), encoding: 'utf8'},
    );
    assert.match(rlOut, /rl OK/);
  });
});

describe('functionsDeploy guard — DEPLOY-O-deps-split', () => {
  it('verify-codebase-deps.cjs passes after bundle', () => {
    execFileSync(process.execPath, ['scripts/bundle-functions.cjs'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
    execFileSync(process.execPath, ['scripts/verify-codebase-deps.cjs'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  });

  it('functions-integrations index.js requires facilityWeatherWebhook not webhooksOps', () => {
    const src = readRepo('functions-integrations/index.js');
    assert.match(
        src,
        /require\(['"]\.\/src\/domains\/facilityWeatherWebhook['"]\)/,
    );
    assert.doesNotMatch(
        src,
        /require\(['"]\.\/src\/domains\/webhooksOps['"]\)/,
        'integrations must not load webhooksOps (Stripe)',
    );
  });

  it('functions-commerce/package.json declares qrcode and @sendgrid/mail', () => {
    const pkg = JSON.parse(readRepo('functions-commerce/package.json'));
    assert.ok(pkg.dependencies?.qrcode, 'qrcode required for ticketReceipts');
    assert.ok(
        pkg.dependencies?.['@sendgrid/mail'],
        '@sendgrid/mail required for ticketReceipts',
    );
  });

  it('functions-integrations index.js uses resolveTarget for Cloud Run env', () => {
    const src = readRepo('functions-integrations/index.js');
    assert.match(
        src,
        /require\s*\(\s*['"]\.\/resolveTarget['"]\s*\)/,
        'integrations index must resolve target from env',
    );
    assert.doesNotMatch(
        src,
        /LAZY_EXPORTS/,
        'integrations must use per-export pattern, not LAZY_EXPORTS map',
    );
    assert.ok(
        fs.existsSync(path.join(REPO_ROOT, 'functions-integrations/resolveTarget.js')),
        'resolveTarget.js must exist',
    );
  });

  /** @param {Record<string, string|undefined>} env @param {string} expectLabel */
  function smokeIntegrationsIndex(env, expectLabel) {
    execFileSync(process.execPath, ['scripts/bundle-functions.cjs'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
    const integrationsDir = path.join(REPO_ROOT, 'functions-integrations');
    const childEnv = {
      ...process.env,
      GCLOUD_PROJECT: 'smoke-test',
      FIREBASE_CONFIG: JSON.stringify({
        projectId: 'smoke-test',
        storageBucket: 'smoke-test.appspot.com',
      }),
    };
    delete childEnv.FUNCTION_TARGET;
    delete childEnv.K_SERVICE;
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) {
        delete childEnv[key];
      } else {
        childEnv[key] = value;
      }
    }
    const out = execFileSync(
        process.execPath,
        [
          '-e',
          "require('./index.js');" +
          "const sharpLoaded=Object.keys(require.cache).some(k=>/[/\\\\]sharp[/\\\\]/.test(k));" +
          "if(sharpLoaded) { console.error('sharp loaded'); process.exit(1); }" +
          `console.log('${expectLabel}');`,
        ],
        {
          cwd: integrationsDir,
          encoding: 'utf8',
          env: childEnv,
        },
    );
    assert.match(out, new RegExp(expectLabel));
  }

  it('functions-integrations lazy index loads getWeatherConditions without sharp', () => {
    smokeIntegrationsIndex(
        {FUNCTION_TARGET: 'getWeatherConditions'},
        'lazy OK',
    );
  });

  it('functions-integrations resolves lowercase FUNCTION_TARGET getweatherconditions', () => {
    smokeIntegrationsIndex(
        {FUNCTION_TARGET: 'getweatherconditions'},
        'lowercase OK',
    );
  });

  it('functions-integrations resolves K_SERVICE getweatherconditions without FUNCTION_TARGET', () => {
    smokeIntegrationsIndex(
        {K_SERVICE: 'getweatherconditions', FUNCTION_TARGET: undefined},
        'kservice OK',
    );
  });

  it('functions-integrations resolves integrations.getWeatherConditions prefix', () => {
    smokeIntegrationsIndex(
        {FUNCTION_TARGET: 'integrations.getWeatherConditions'},
        'prefixed OK',
    );
  });

  it('functions-integrations resolves Cloud Run dual env (K_SERVICE + hyphen FUNCTION_TARGET)', () => {
    smokeIntegrationsIndex(
        {
          K_SERVICE: 'getweatherconditions',
          FUNCTION_TARGET: 'integrations-getWeatherConditions',
        },
        'dual env OK',
    );
  });

  it('smoke-require-codebase.cjs --simulate-cloud does not load sharp', () => {
    execFileSync(process.execPath, ['scripts/bundle-functions.cjs'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
    const out = execFileSync(
        process.execPath,
        ['scripts/smoke-require-codebase.cjs', 'integrations', '--simulate-cloud'],
        {cwd: REPO_ROOT, encoding: 'utf8'},
    );
    assert.match(out, /Cloud Run simulate, lazy/);
  });

  it('integrations and commerce indexes load after npm install (smoke require)', () => {
    execFileSync(process.execPath, ['scripts/bundle-functions.cjs'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
    const integrationsDir = path.join(REPO_ROOT, 'functions-integrations');
    const commerceDir = path.join(REPO_ROOT, 'functions-commerce');
    execFileSync('npm', ['install', '--no-audit', '--no-fund'], {
      cwd: integrationsDir,
      stdio: 'pipe',
      shell: true,
    });
    execFileSync('npm', ['install', '--no-audit', '--no-fund'], {
      cwd: commerceDir,
      stdio: 'pipe',
      shell: true,
    });
    const integrationsOut = execFileSync(
        process.execPath,
        ['-e', "require('./index.js'); console.log('integrations OK')"],
        {
          cwd: integrationsDir,
          encoding: 'utf8',
          env: {
            ...process.env,
            GCLOUD_PROJECT: 'smoke-test',
            FIREBASE_CONFIG: JSON.stringify({
              projectId: 'smoke-test',
              storageBucket: 'smoke-test.appspot.com',
            }),
          },
        },
    );
    assert.match(integrationsOut, /integrations OK/);
    const commerceOut = execFileSync(
        process.execPath,
        ['-e', "require('./index.js'); console.log('commerce OK')"],
        {cwd: commerceDir, encoding: 'utf8'},
    );
    assert.match(commerceOut, /commerce OK/);
  });
});

describe('functionsDeploy guard — WebAuthn RP env', () => {
  it('functions/.env.example documents WEBAUTHN_RP_ID and WEBAUTHN_RP_ORIGIN', () => {
    const example = readRepo('functions/.env.example');
    assert.match(example, /^WEBAUTHN_RP_ID=sstracker\.app/m);
    assert.match(example, /^WEBAUTHN_RP_ORIGIN=https:\/\/sstracker\.app/m);
  });

  it('functions/webauthn.js reads WEBAUTHN_RP_ID from process.env', () => {
    const src = fs.readFileSync(
        path.join(FUNCTIONS_ROOT, 'webauthn.js'),
        'utf8',
    );
    assert.match(src, /process\.env\.WEBAUTHN_RP_ID/);
    assert.match(src, /process\.env\.WEBAUTHN_RP_ORIGIN/);
  });

  it('webauthnLoginStart returns normalized { options, uid } for unknown email', () => {
    const src = fs.readFileSync(
        path.join(FUNCTIONS_ROOT, 'webauthn.js'),
        'utf8',
    );
    assert.match(
        src,
        /return\s*\{options,\s*uid:\s*null\}/,
        'unknown-email branch must not return raw options',
    );
    assert.match(
        src,
        /return\s*\{options,\s*uid\}/,
        'known-user branch must return options + uid',
    );
  });

  it('docs/FUNCTIONS_DEPLOY.md documents WebAuthn RP identity', () => {
    const doc = readRepo('docs/FUNCTIONS_DEPLOY.md');
    assert.match(doc, /WEBAUTHN_RP_ID/);
    assert.match(doc, /WEBAUTHN_RP_ORIGIN/);
    assert.match(doc, /functions-compliance\/\.env/);
  });
});

describe('functionsDeploy guard — launch callable memory', () => {
  const LAUNCH_CALLABLES = [
    'logTrainingSession',
    'secureDeployIntent',
    'secureCancelIntent',
    'secureExtendIntent',
  ];

  it('trainingOps launch callables use 512MiB (LAUNCH_CORE_CALLABLE_OPTS)', () => {
    const src = fs.readFileSync(
        path.join(FUNCTIONS_ROOT, 'src/domains/trainingOps.js'),
        'utf8',
    );
    assert.match(
        src,
        /LAUNCH_CORE_CALLABLE_OPTS\s*=\s*\{[^}]*memory:\s*['"]512MiB['"][^}]*invoker:\s*['"]public['"]/,
        'LAUNCH_CORE_CALLABLE_OPTS must set memory 512MiB and invoker public',
    );
    for (const name of LAUNCH_CALLABLES) {
      const block = src.match(
          new RegExp(
              `exports\\.${name}\\s*=\\s*onCall\\([\\s\\S]*?async\\s*\\(`,
          ),
      );
      assert.ok(block, `${name} onCall block not found`);
      assert.match(
          block[0],
          /LAUNCH_CORE_CALLABLE_OPTS/,
          `${name} must use LAUNCH_CORE_CALLABLE_OPTS`,
      );
    }
  });
});
