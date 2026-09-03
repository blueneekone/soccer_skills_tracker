import { getToken } from 'firebase/app-check';
import { appCheck } from '$lib/firebase/config';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { db } from '$lib/firebase/config';

export class LightningRadarEngine {
  strikes = $state([]);

  constructor() {
    this.init();
  }

  async init() {
    if (typeof window === 'undefined') return;

    if (!isFirestoreReady()) return;

    if (appCheck) {
      try { await getToken(appCheck); } catch (e) { console.error('App Check failed', e); }
    }
  }

  async sendCoordinate(lat, lng) {
    if (appCheck) {
      try { await getToken(appCheck); } catch (e) { console.error('App Check failed', e); }
      // Backend call goes here. For now we just get the token.
    }
  }
}

export function createLightningRadarEngine() {
  return new LightningRadarEngine();
}
