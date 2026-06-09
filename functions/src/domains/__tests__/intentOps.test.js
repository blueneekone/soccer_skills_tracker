/**
 * intentOps.test.js
 * ─────────────────
 * Phase 3, Epic 8 — Intent-Based Homework Triggers
 * Unit tests for secureDeployIntent, secureCancelIntent, and
 * the onUserXpUpdateIntentLifecycle trigger.
 *
 * All Firebase Admin SDK calls are mocked. No real Firestore or Auth
 * connections are made.
 *
 * Run via: cd functions && node --experimental-vm-modules node_modules/.bin/jest
 * (or: npx jest src/domains/__tests__/intentOps.test.js)
 */

'use strict';

// ── Admin SDK mock setup ──────────────────────────────────────────────────────
// We mock the admin module before requiring the module under test.

const mockTimestampNow = { toMillis: () => Date.now(), toDate: () => new Date() };
const mockTimestampFromMillis = jest.fn((ms) => ({
  toMillis: () => ms,
  toDate: () => new Date(ms),
}));
const mockServerTimestamp = {};
const mockFieldValue = { serverTimestamp: () => mockServerTimestamp };

let mockCapturedDocWrites = [];
let mockDocGet = jest.fn();
let mockDocUpdate = jest.fn();
let mockDocSet = jest.fn();
let mockCollectionAdd = jest.fn();
let mockQueryGet = jest.fn();

jest.mock('firebase-admin', () => ({
  firestore: Object.assign(
    () => ({
      collection: (name) => ({
        doc: (id) => ({
          get: mockDocGet,
          set: (data) => {
            mockCapturedDocWrites.push({ collection: name, id, data });
            return mockDocSet(data);
          },
          update: mockDocUpdate,
          id: id || `mock-${Math.random().toString(36).slice(2)}`,
        }),
        add: (data) => {
          mockCollectionAdd(data);
          return Promise.resolve({ id: 'audit-id' });
        },
        where: () => ({ where: () => ({ get: mockQueryGet }) }),
      }),
      batch: () => ({
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      }),
    }),
    {
      Timestamp: {
        now: () => mockTimestampNow,
        fromMillis: mockTimestampFromMillis,
        fromDate: (d) => ({ toMillis: () => d.getTime() }),
      },
      FieldValue: mockFieldValue,
    }
  ),
  auth: () => ({
    getUserByEmail: jest.fn(),
  }),
}));

jest.mock('firebase-functions/v2/https', () => ({
  onCall: (opts, fn) => fn,
  HttpsError: class HttpsError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  },
}));

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: jest.fn(() => jest.fn()),
  onDocumentUpdated: jest.fn(() => jest.fn()),
  onDocumentWritten: jest.fn(() => jest.fn()),
}));

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn(),
}));

jest.mock('firebase-functions/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: () => ({ value: () => 'test-secret' }),
  defineString: (_name, opts = {}) => ({ value: () => opts.default ?? '' }),
}));

// Stub all other dependencies that trainingOps.js pulls in.
jest.mock('../../gamificationWorkoutXp', () => ({}), { virtual: true });
jest.mock('../../gamificationWorkoutXp.js', () => ({}), { virtual: true });
jest.mock('../middleware/authBouncers', () => ({
  assertCanSecureAddPlayer: jest.fn().mockResolvedValue({ clubId: 'club-abc' }),
  assertClubSubscriptionWritable: jest.fn().mockResolvedValue(undefined),
  assertParent: jest.fn(),
  assertCoachMessageSender: jest.fn(),
  assertActorCanAccessTeam: jest.fn(),
  assertPlayer: jest.fn(),
}), { virtual: true });

jest.mock('../middleware/authBouncers.js', () => ({
  assertCanSecureAddPlayer: jest.fn().mockResolvedValue({ clubId: 'club-abc' }),
  assertClubSubscriptionWritable: jest.fn().mockResolvedValue(undefined),
  assertParent: jest.fn(),
  assertCoachMessageSender: jest.fn(),
  assertActorCanAccessTeam: jest.fn(),
  assertPlayer: jest.fn(),
}), { virtual: true });

jest.mock('../utils/formatters', () => ({
  normEmail: (e) => e,
  workoutAttestationHmac: jest.fn(),
  leaderboardPublicPlayerKey: jest.fn(),
  isLeaderboardPlayerRow: jest.fn(),
  computeAgeYears: jest.fn(),
  utcYmdAddDays: jest.fn(),
  lastActivityToUtcYmd: jest.fn(),
  utcWeekMondayKey: jest.fn(),
}), { virtual: true });

jest.mock('../utils/formatters.js', () => ({
  normEmail: (e) => e,
  workoutAttestationHmac: jest.fn(),
  leaderboardPublicPlayerKey: jest.fn(),
  isLeaderboardPlayerRow: jest.fn(),
  computeAgeYears: jest.fn(),
  utcYmdAddDays: jest.fn(),
  lastActivityToUtcYmd: jest.fn(),
  utcWeekMondayKey: jest.fn(),
}), { virtual: true });

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));

// ── Build valid coach request fixture ─────────────────────────────────────────

function makeCoachRequest(dataOverrides = {}) {
  return {
    auth: {
      uid: 'coach-uid-1',
      token: { email: 'coach@example.com', clubId: 'club-abc', role: 'coach', teamId: 'team-xyz' },
    },
    data: {
      teamId: 'team-xyz',
      tenantId: 'club-abc',
      clubId: 'club-abc',
      targetAttributeId: 'pace',
      requiredXp: 200,
      durationDays: 7,
      scope: 'team',
      targetUids: [],
      priority: 100,
      ...dataOverrides,
    },
  };
}

// ── Import the module under test ─────────────────────────────────────────────
// Must be required AFTER mocks are declared.
let trainingOps;

beforeAll(() => {
  trainingOps = require('../trainingOps');
});

beforeEach(() => {
  mockCapturedDocWrites = [];
  jest.clearAllMocks();
  // Re-wire the resolvers used by default.
  mockDocGet.mockResolvedValue({
    exists: true,
    data: () => ({ status: 'active', teamId: 'team-xyz', tenantId: 'club-abc', clubId: 'club-abc' }),
  });
  mockDocSet.mockResolvedValue(undefined);
  mockDocUpdate.mockResolvedValue(undefined);
  mockCollectionAdd.mockResolvedValue({ id: 'audit-id' });
  mockQueryGet.mockResolvedValue({ docs: [] });
  const authBouncers = require('../middleware/authBouncers');
  authBouncers.assertCanSecureAddPlayer.mockResolvedValue({ clubId: 'club-abc' });
});

// ─────────────────────────────────────────────────────────────────────────────
// secureDeployIntent
// ─────────────────────────────────────────────────────────────────────────────

describe('secureDeployIntent', () => {
  it('throws unauthenticated when no auth', async () => {
    const req = { auth: null, data: {} };
    await expect(trainingOps.secureDeployIntent(req)).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('throws invalid-argument when teamId is missing', async () => {
    const req = makeCoachRequest({ teamId: '' });
    await expect(trainingOps.secureDeployIntent(req)).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('throws invalid-argument when durationDays > 90', async () => {
    const req = makeCoachRequest({ durationDays: 91 });
    await expect(trainingOps.secureDeployIntent(req)).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('throws invalid-argument when scope=players and targetUids is empty', async () => {
    const req = makeCoachRequest({ scope: 'players', targetUids: [] });
    await expect(trainingOps.secureDeployIntent(req)).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('throws permission-denied when clubId does not match verifiedClubId', async () => {
    const req = makeCoachRequest({ clubId: 'different-club' });
    await expect(trainingOps.secureDeployIntent(req)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('deploys a team-wide intent and returns intentId + status', async () => {
    const req = makeCoachRequest();
    const result = await trainingOps.secureDeployIntent(req);
    expect(result.status).toBe('active');
    expect(typeof result.intentId).toBe('string');
    expect(typeof result.expiresAt).toBe('string');
    expect(result.targetCount).toBe(0); // 'team' scope → 0
  });

  it('writes a security_audit row', async () => {
    const req = makeCoachRequest();
    await trainingOps.secureDeployIntent(req);
    expect(mockCollectionAdd).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'secureDeployIntent' }),
    );
  });

  it('persists optional prescription on deploy', async () => {
    const req = makeCoachRequest({
      prescription: {
        drillTitle: 'Wall passes',
        sets: 3,
        repsPerSet: 10,
        bilateral: true,
        targetRpe: 7,
      },
    });
    await trainingOps.secureDeployIntent(req);
    const teamAssignWrite = mockCapturedDocWrites.find((w) => w.collection === 'team_assignments');
    expect(teamAssignWrite?.data.prescription).toEqual({
      drillTitle: 'Wall passes',
      sets: 3,
      repsPerSet: 10,
      bilateral: true,
      targetRpe: 7,
    });
    expect(mockCollectionAdd).toHaveBeenCalledWith(
      expect.objectContaining({ hasPrescription: true }),
    );
  });

  it('allows time-only prescription without repsPerSet', async () => {
    const req = makeCoachRequest({
      prescription: { sets: 1, targetDurationMin: 15, bilateral: false },
    });
    await trainingOps.secureDeployIntent(req);
    const teamAssignWrite = mockCapturedDocWrites.find((w) => w.collection === 'team_assignments');
    expect(teamAssignWrite?.data.prescription).toEqual({
      sets: 1,
      bilateral: false,
      targetDurationMin: 15,
    });
  });

  it('throws invalid-argument when prescription.targetRpe is out of range', async () => {
    const req = makeCoachRequest({ prescription: { sets: 1, targetRpe: 11 } });
    await expect(trainingOps.secureDeployIntent(req)).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('throws invalid-argument when prescription.sets is invalid', async () => {
    const req = makeCoachRequest({ prescription: { sets: 0 } });
    await expect(trainingOps.secureDeployIntent(req)).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('persists valid videoUrl and cues on deploy', async () => {
    const req = makeCoachRequest({
      prescription: {
        sets: 2,
        bilateral: false,
        videoUrl: 'https://example.com/demo.mp4',
        cues: 'Keep your head up.',
      },
    });
    await trainingOps.secureDeployIntent(req);
    const teamAssignWrite = mockCapturedDocWrites.find((w) => w.collection === 'team_assignments');
    expect(teamAssignWrite?.data.prescription.videoUrl).toBe('https://example.com/demo.mp4');
    expect(teamAssignWrite?.data.prescription.cues).toBe('Keep your head up.');
  });

  it('drops a non-http videoUrl (security boundary)', async () => {
    const req = makeCoachRequest({
      prescription: {
        sets: 1,
        bilateral: false,
        videoUrl: 'javascript:alert(1)',
        cues: 'Legit cues.',
      },
    });
    await trainingOps.secureDeployIntent(req);
    const teamAssignWrite = mockCapturedDocWrites.find((w) => w.collection === 'team_assignments');
    expect(teamAssignWrite?.data.prescription.videoUrl).toBeUndefined();
    expect(teamAssignWrite?.data.prescription.cues).toBe('Legit cues.');
  });

  it('drops a ftp:// videoUrl (only http/https allowed)', async () => {
    const req = makeCoachRequest({
      prescription: { sets: 1, bilateral: false, videoUrl: 'ftp://files.example.com/video.mp4' },
    });
    await trainingOps.secureDeployIntent(req);
    const teamAssignWrite = mockCapturedDocWrites.find((w) => w.collection === 'team_assignments');
    expect(teamAssignWrite?.data.prescription.videoUrl).toBeUndefined();
  });

  it('truncates cues to 2000 chars', async () => {
    const longCues = 'x'.repeat(3000);
    const req = makeCoachRequest({
      prescription: { sets: 1, bilateral: false, cues: longCues },
    });
    await trainingOps.secureDeployIntent(req);
    const teamAssignWrite = mockCapturedDocWrites.find((w) => w.collection === 'team_assignments');
    expect(teamAssignWrite?.data.prescription.cues).toHaveLength(2000);
  });

  it('drops empty cues string', async () => {
    const req = makeCoachRequest({
      prescription: { sets: 1, bilateral: false, cues: '   ' },
    });
    await trainingOps.secureDeployIntent(req);
    const teamAssignWrite = mockCapturedDocWrites.find((w) => w.collection === 'team_assignments');
    expect(teamAssignWrite?.data.prescription.cues).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// secureCancelIntent
// ─────────────────────────────────────────────────────────────────────────────

describe('secureCancelIntent', () => {
  it('throws unauthenticated when no auth', async () => {
    await expect(trainingOps.secureCancelIntent({ auth: null, data: {} })).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('throws not-found when intent doc does not exist', async () => {
    mockDocGet.mockResolvedValueOnce({ exists: false });
    const req = makeCoachRequest();
    req.data = { intentId: 'x', teamId: 'team-xyz', tenantId: 'club-abc' };
    await expect(trainingOps.secureCancelIntent(req)).rejects.toMatchObject({ code: 'not-found' });
  });

  it('throws permission-denied on cross-tenant cancel', async () => {
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ status: 'active', teamId: 'team-xyz', tenantId: 'DIFFERENT' }),
    });
    const req = makeCoachRequest();
    req.data = { intentId: 'x', teamId: 'team-xyz', tenantId: 'club-abc' };
    await expect(trainingOps.secureCancelIntent(req)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('throws failed-precondition when intent is not active', async () => {
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ status: 'expired', teamId: 'team-xyz', tenantId: 'club-abc' }),
    });
    const req = makeCoachRequest();
    req.data = { intentId: 'x', teamId: 'team-xyz', tenantId: 'club-abc' };
    await expect(trainingOps.secureCancelIntent(req)).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('cancels an active intent and writes audit row', async () => {
    const req = makeCoachRequest();
    req.data = { intentId: 'x', teamId: 'team-xyz', tenantId: 'club-abc' };
    const result = await trainingOps.secureCancelIntent(req);
    expect(result.status).toBe('cancelled');
    expect(mockDocUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    expect(mockCollectionAdd).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'secureCancelIntent' }),
    );
  });
});
