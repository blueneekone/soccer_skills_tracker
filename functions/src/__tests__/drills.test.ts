import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as admin from 'firebase-admin';
import { seedPublicDrills, DRILLS } from '../scripts/seedPublicDrills.js';

// Setting up the Firestore Emulator connection.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// Initialize admin app if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'sst-drills-test' });
}
const db = admin.firestore();

describe('Core Public Drills Database Seeding Script', () => {
  beforeAll(async () => {
    // Run the seeding script directly
    await seedPublicDrills();
  });

  afterAll(async () => {
    // Cleanup the seeded mock data
    const snapshot = await db.collection('public_drills').get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  });

  it('should seed public_drills collection correctly', async () => {
    const snapshot = await db.collection('public_drills').get();
    expect(snapshot.empty).toBe(false);

    // Verify we have all the drills from the script
    expect(snapshot.size).toBe(DRILLS.length);

    // Grab one specific drill to verify fields
    const doc = snapshot.docs.find(d => d.id === 'soc-pass-y');
    expect(doc).toBeDefined();

    if (doc) {
      const data = doc.data();
      expect(data.title).toBe('Passing Y-Drill');
      expect(data.sport).toBe('soccer');
      expect(data.category).toBe('passing');
      expect(data.isPublic).toBe(true);
      expect(data.diagramData).toBeDefined();

      // Verify diagramData coordinates structure
      expect(data.diagramData.players).toBeInstanceOf(Array);
      expect(data.diagramData.cones).toBeInstanceOf(Array);

      if (data.diagramData.players.length > 0) {
        expect(data.diagramData.players[0].x).toBeDefined();
        expect(data.diagramData.players[0].y).toBeDefined();
        expect(data.diagramData.players[0].role).toBeDefined();
      }
    }
  });

  it('should have 3 sports categories', async () => {
    const snapshot = await db.collection('public_drills').get();
    const sports = new Set();
    snapshot.docs.forEach((doc) => {
      sports.add(doc.data().sport);
    });

    expect(sports.has('soccer')).toBe(true);
    expect(sports.has('basketball')).toBe(true);
    expect(sports.has('football')).toBe(true);
  });
});
