/**
 * LoginEngine.svelte.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Phase 2 Epic 3 — Passwordless Auth Brain (Vanguard Trinity: The Brain)
 *
 * Exposes three auth flows:
 *   sendMagicLink    → Firebase email-link sign-in (sendSignInLinkToEmail)
 *   loginWithPasskey → WebAuthn assertion via @simplewebauthn/browser
 *   registerPasskey  → WebAuthn registration (post-sign-in passkey enrolment)
 *
 * Follows .cursorrules mandates:
 *   - Svelte 5 Runes strictly ($state, $derived, untrack)
 *   - Zero side-effects at module scope; all Firebase calls are async methods
 *   - Custom token pattern mirrors validatePlayerOTP (signInWithCustomToken)
 */

import { browser } from '$app/environment';
import { auth, functions } from '$lib/firebase.js';
import {
  sendSignInLinkToEmail,
  signInWithCustomToken,
  type ActionCodeSettings,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

// ── Callable references ──────────────────────────────────────────────────────
const webauthnLoginStartFn = httpsCallable<
  { email: string },
  { options: PublicKeyCredentialRequestOptionsJSON; uid: string }
>(functions, 'webauthnLoginStart');

const webauthnLoginFinishFn = httpsCallable<
  { uid: string; authResp: unknown },
  { customToken: string }
>(functions, 'webauthnLoginFinish');

const webauthnRegisterStartFn = httpsCallable<
  Record<string, never>,
  PublicKeyCredentialCreationOptionsJSON
>(functions, 'webauthnRegisterStart');

const webauthnRegisterFinishFn = httpsCallable<
  { attResp: unknown },
  { verified: boolean }
>(functions, 'webauthnRegisterFinish');

// ── Engine class ─────────────────────────────────────────────────────────────
class LoginEngine {
  email = $state('');
  busy = $state(false);
  error = $state('');
  magicLinkSent = $state(false);
  passkeyRegistered = $state(false);

  /**
   * Send a Firebase email-link (magic link) to the supplied address.
   * The callback URL must be added to Firebase Console → Auth → Authorized domains.
   */
  async sendMagicLink(): Promise<void> {
    if (!browser) return;
    const trimmedEmail = this.email.trim();
    if (!trimmedEmail) {
      this.error = 'Enter your email address to receive a sign-in link.';
      return;
    }
    this.busy = true;
    this.error = '';
    try {
      const actionCodeSettings: ActionCodeSettings = {
        url: `${window.location.origin}/auth/magic-link/callback`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, trimmedEmail, actionCodeSettings);
      // Persist email so the callback page can complete sign-in without re-prompting
      try {
        window.localStorage.setItem('sstrack_magic_email', trimmedEmail);
      } catch {
        // Private-mode / storage denied — callback will prompt for email
      }
      this.magicLinkSent = true;
    } catch (err) {
      this.error =
        err instanceof Error
          ? err.message
          : 'Failed to send magic link. Try again.';
    } finally {
      this.busy = false;
    }
  }

  /**
   * WebAuthn passkey sign-in.
   * Returns the Firebase Auth User on success (caller handles waterfall routing).
   */
  async loginWithPasskey(): Promise<void> {
    if (!browser) return;
    const trimmedEmail = this.email.trim();
    if (!trimmedEmail) {
      this.error = 'Enter your email address to sign in with a passkey.';
      return;
    }
    this.busy = true;
    this.error = '';
    try {
      // 1. Get authentication options from server
      const startResult = await webauthnLoginStartFn({ email: trimmedEmail });
      const { options, uid } = startResult.data;

      // 2. Trigger browser native passkey prompt
      const authResp = await startAuthentication({ optionsJSON: options });

      // 3. Verify on server → receive custom token
      const finishResult = await webauthnLoginFinishFn({ uid, authResp });
      const { customToken } = finishResult.data;

      // 4. Sign in with custom token (mirrors validatePlayerOTP flow)
      await signInWithCustomToken(auth, customToken);
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        // User dismissed the passkey prompt — not an error state
        this.error = '';
      } else {
        this.error =
          err instanceof Error
            ? err.message
            : 'Passkey sign-in failed. Try again or use a magic link.';
      }
    } finally {
      this.busy = false;
    }
  }

  /**
   * Register a new passkey for the currently signed-in user.
   * Should be called from account settings after initial Google / magic-link sign-in.
   */
  async registerPasskey(): Promise<void> {
    if (!browser) return;
    this.busy = true;
    this.error = '';
    this.passkeyRegistered = false;
    try {
      // 1. Get registration options from server
      const startResult = await webauthnRegisterStartFn({});
      const options = startResult.data;

      // 2. Trigger browser native passkey creation
      const attResp = await startRegistration({ optionsJSON: options });

      // 3. Verify and persist on server
      await webauthnRegisterFinishFn({ attResp });
      this.passkeyRegistered = true;
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        this.error = '';
      } else {
        this.error =
          err instanceof Error
            ? err.message
            : 'Passkey registration failed. Try again.';
      }
    } finally {
      this.busy = false;
    }
  }

  reset(): void {
    this.email = '';
    this.busy = false;
    this.error = '';
    this.magicLinkSent = false;
    this.passkeyRegistered = false;
  }
}

export const loginEngine = new LoginEngine();
