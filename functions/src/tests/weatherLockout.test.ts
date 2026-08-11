import admin from 'firebase-admin';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// Import our weather lockout implementation
const weatherOps = require('../domains/weatherOps.js');

describe('Tomorrow.io Lightning Field Auto-Lockout', () => {
  let mockDb: any;
  let reservations: any[] = [];
  let facilities: any[] = [];
  let clubs: any[] = [];

  beforeEach(() => {
    reservations = [
      {
        id: 'res-alpha',
        name: 'Fields Arena Alpha',
        latitude: 40.0,
        longitude: -74.0,
        status: 'ACTIVE'
      }
    ];

    facilities = [
      {
        id: 'fac-alpha',
        name: 'Fields Arena Alpha',
        latitude: 40.0,
        longitude: -74.0,
        status: 'Active'
      }
    ];

    clubs = [
      {
        id: 'club-1',
        docs: [
          {
            id: 'fac-alpha',
            data: () => facilities[0]
          }
        ]
      }
    ];

    // Mock Firestore DB and write batch
    mockDb = {
      collection: (colName: string) => {
        if (colName === 'field_reservations') {
          return {
            get: async () => ({
              docs: reservations.map(r => ({
                id: r.id,
                ref: { id: r.id },
                data: () => r
              }))
            })
          };
        }
        if (colName === 'clubs') {
          return {
            get: async () => ({
              docs: clubs.map(c => ({
                id: c.id,
                ref: {
                  id: c.id,
                  collection: (subCol: string) => {
                    if (subCol === 'facilities') {
                      return {
                        get: async () => ({
                          docs: c.docs
                        })
                      };
                    }
                    return {};
                  }
                },
                data: () => c
              }))
            })
          };
        }
        return {};
      },
      writeBatch: () => {
        const batchUpdates: any[] = [];
        return {
          update: (ref: any, updateData: any) => {
            batchUpdates.push({ id: ref.id, updateData });
          },
          commit: async () => {
            for (const update of batchUpdates) {
              const res = reservations.find(r => r.id === update.id);
              if (res) {
                Object.assign(res, update.updateData);
              }
            }
          }
        };
      }
    };

    // Use Object.defineProperty to override admin.firestore securely without triggering FirebaseAppError
    Object.defineProperty(admin, 'firestore', {
      get: () => () => mockDb,
      configurable: true
    });
  });

  it('locks fields when strike is exactly 4 miles away', async () => {
    // 4 miles is approx 0.05797 degrees latitude difference
    const strikeLat = 40.05797;
    const strikeLng = -74.0;

    const req = {
      method: 'POST',
      body: {
        latitude: strikeLat,
        longitude: strikeLng
      },
      query: {},
      headers: {}
    } as any;

    let responseStatus = 200;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return {
          send: (msg: string) => { responseData = msg; },
          json: (data: any) => { responseData = data; }
        };
      },
      json: (data: any) => {
        responseData = data;
        return {
          send: (msg: string) => {},
          json: (d: any) => {}
        };
      }
    } as any;

    await weatherOps.processTomorrowIoAlert(req, res);

    assert.strictEqual(responseStatus, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(reservations[0].status, 'LOCKED_WEATHER_ALERT');
  });

  it('keeps fields active when strike is 15 miles away', async () => {
    // 15 miles is approx 0.21739 degrees latitude difference
    const strikeLat = 40.21739;
    const strikeLng = -74.0;

    const req = {
      method: 'POST',
      body: {
        latitude: strikeLat,
        longitude: strikeLng
      },
      query: {},
      headers: {}
    } as any;

    let responseStatus = 200;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return {
          send: (msg: string) => { responseData = msg; },
          json: (data: any) => { responseData = data; }
        };
      },
      json: (data: any) => {
        responseData = data;
        return {
          send: (msg: string) => {},
          json: (d: any) => {}
        };
      }
    } as any;

    await weatherOps.processTomorrowIoAlert(req, res);

    assert.strictEqual(responseStatus, 200);
    assert.strictEqual(reservations[0].status, 'ACTIVE');
  });
});
