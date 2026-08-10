import { browser } from '$app/environment';
import { untrack } from 'svelte';
import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js';

export class VpcEngine {
  challenge = $state<string | null>(null);
  isVerified = $state(false);
  mutating = $state(false);
  error = $state<string | null>(null);

  constructor() {
    $effect(() => {
      if (!browser) return;
      if (!this.challenge && !this.isVerified && !this.mutating) {
        untrack(() => {
          this.initChallenge();
        });
      }
    });
  }

  async initChallenge() {
    this.mutating = true;
    try {
      const genFn = httpsCallable<{ tempUserId?: string }, { challenge: string }>(functions, 'generateVpcChallenge');
      const res = await genFn({});
      this.challenge = res.data.challenge;
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.mutating = false;
    }
  }

  async verify(payload: { attestationObjectB64: string, clientDataJSONB64: string, credentialIdB64: string }) {
    this.mutating = true;
    this.error = null;
    try {
      const verifyFn = httpsCallable<typeof payload, { success: boolean, vpcVerified: boolean }>(functions, 'verifyVpcSignature');
      const res = await verifyFn(payload);
      if (res.data.success) {
        this.isVerified = true;
      }
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.mutating = false;
    }
  }
}
