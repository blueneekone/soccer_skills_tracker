/**
 * LoginEngine.svelte.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Vanguard Trinity Auth Brain — phased passwordless rollout
 *
 * Exposes flows:
 *   sendMagicLink         → Firebase email-link sign-in (sendSignInLinkToEmail)
 *   loginWithPasskey      → WebAuthn assertion → custom token
 *   loginWithEmailPassword→ Legacy escape hatch (paired with mandatory passkey enrollment)
 *   registerPasskey       → WebAuthn registration (mandatory gate for legacy / magic-link)
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
  signInWithEmailAndPassword,
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
import {
  loginStartUserMessage,
  parseLoginStartData,
} from '$lib/auth/passkeys.js';

// ── Callable references ──────────────────────────────────────────────────────
const webauthnLoginStartFn = httpsCallable<
  { email: string },
  { options: PublicKeyCredentialRequestOptionsJSON; uid: string | null }
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

/** Human-readable copy for Firebase/Functions objects and odd throwables. */
export function userFacingErrorMessage(err: unknown, fallback: string): string {
  // TypeError is an Error — handle typical "Failed to fetch" before the generic branch
  if (err instanceof TypeError && browser) {
    const m = String(err.message || '');
    if (/fetch|network|load failed|failed to fetch/i.test(m)) {
      return 'Network error. Check your connection and try again.';
    }
  }
  if (err instanceof Error) {
    const m = err.message;
    if (typeof m === 'string' && m.trim()) return m;
    return fallback;
  }
  if (typeof err === 'string' && err.trim()) return err;
  if (err !== null && typeof err === 'object') {
    const o = err as { message?: unknown };
    if (typeof o.message === 'string' && o.message.trim()) return o.message;
  }
  return fallback;
}

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
      const startResult = await webauthnLoginStartFn({ email: trimmedEmail });
      const { options, uid } = parseLoginStartData(startResult.data);

      const startBlock = loginStartUserMessage(uid, options);
      if (startBlock) {
        this.error = startBlock;
        return;
      }

      const authResp = await startAuthentication({ optionsJSON: options });

      const finishResult = await webauthnLoginFinishFn({ uid: uid!, authResp });
      const { customToken } = finishResult.data;

      // 4. Sign in with custom token (mirrors validatePlayerOTP flow)
      await signInWithCustomToken(auth, customToken);
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        // User dismissed the passkey prompt — not an error state
        this.error = '';
      } else {
        this.error = userFacingErrorMessage(
          err,
          'Passkey sign-in failed. Try again or use a magic link.',
        );
      }
    } finally {
      this.busy = false;
    }
  }

  /**
   * Legacy email + password (escape hatch until every account has enrolled a passkey).
   */
  async loginWithEmailPassword(email: string, password: string): Promise<void> {
    if (!browser) return;
    const em = email.trim();
    const pw = password.trim();
    if (!em || !pw) {
      this.error = 'Enter your email and password.';
      return;
    }
    this.busy = true;
    this.error = '';
    try {
      await signInWithEmailAndPassword(auth, em, pw);
    } catch (err) {
      this.error =
        err instanceof Error
          ? err.message
          : 'Sign-in failed. Check your credentials or reset your password.';
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
      let options: PublicKeyCredentialCreationOptionsJSON;
      try {
        const startResult = await webauthnRegisterStartFn({});
        options = startResult.data;
      } catch (err) {
        this.error = userFacingErrorMessage(
          err,
          'Could not start passkey registration. Check your connection and try again.',
        );
        return;
      }

      // 2. Trigger browser native passkey creation
      let attResp: unknown;
      try {
        attResp = await startRegistration({ optionsJSON: options });
      } catch (err) {
        if (err instanceof Error && err.name === 'NotAllowedError') {
          this.error = '';
        } else {
          this.error = userFacingErrorMessage(
            err,
            'Passkey registration was interrupted. Try again.',
          );
        }
        return;
      }

      // 3. Verify and persist on server
      try {
        await webauthnRegisterFinishFn({ attResp });
      } catch (err) {
        this.error = userFacingErrorMessage(
          err,
          'Could not save your passkey. Check your connection and try again.',
        );
        return;
      }
      this.passkeyRegistered = true;
    } catch (err) {
      // Defensive: nested try/catch above should cover normal paths
      if (err instanceof Error && err.name === 'NotAllowedError') {
        this.error = '';
      } else {
        this.error = userFacingErrorMessage(
          err,
          'Passkey registration failed. Try again.',
        );
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
