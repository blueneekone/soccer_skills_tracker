// 🛡️ SafeSport Compliance Mandate: Strict Shadow CC Guard
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const {
  assertFails,
  initializeTestEnvironment
} = require('@firebase/rules-unit-testing');
const { describe, it, before, beforeEach, after } = require('node:test');

const RULES = readFileSync(resolve('../firestore.rules'), 'utf8');
const PROJECT = 'sst-shadow-cc-rules';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] ?? '127.0.0.1';
const FIRESTORE_PORT = Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] ?? 8080);

function token(overrides) {
  return {
    email: 'actor@test.com',
    role: 'player',
    clubId: null,
    teamId: null,
    householdId: null,
    minor: false,
    isCleared: false,
    ...overrides,
  };
}

describe('shadow-cc', () => {
    let env;

    before(async () => {
      env = await initializeTestEnvironment({
        projectId: PROJECT,
        firestore: { rules: RULES, host: FIRESTORE_HOST, port: FIRESTORE_PORT },
      });
    }, 60000);

    after(async () => {
      if (env) await env.cleanup();
    });

    beforeEach(async () => {
      await env.clearFirestore();
      await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        const { doc, setDoc } = require('firebase/firestore');
        await setDoc(doc(db, 'clubs/club-a'), { name: 'Club A' });
      });
    });

    it('client-side attempts to manually set ccParentEmails are blocked', async () => {
      const db = env
        .authenticatedContext('coach-uid', token({
          email: 'coach@test.com',
          role: 'coach',
          clubId: 'club-a',
          teamId: 'team-a',
        }))
        .firestore();

      const { doc, setDoc } = require('firebase/firestore');

      await assertFails(
        setDoc(doc(db, 'clubs/club-a/channels/channel-new'), {
          type: 'channel',
          name: 'Test Channel',
          memberIds: ['coach@test.com'],
          channelStatus: 'ACTIVE',
          ccParentEmails: ['parent@test.com'], // The payload attempting to bypass
        }),
      );
    });
  }
);
