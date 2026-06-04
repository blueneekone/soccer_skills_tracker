import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types';

export type LoginStartPayload = {
  options: PublicKeyCredentialRequestOptionsJSON;
  uid: string | null;
};

/** Normalize webauthnLoginStart callable data (handles legacy raw-options responses). */
export function parseLoginStartData(data: unknown): LoginStartPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid passkey login response from server.');
  }
  const record = data as Record<string, unknown>;

  if (record.options && typeof record.options === 'object') {
    const uid =
      record.uid === undefined || record.uid === null
        ? null
        : String(record.uid);
    return {
      options: record.options as PublicKeyCredentialRequestOptionsJSON,
      uid,
    };
  }

  if (typeof record.challenge === 'string') {
    return {
      options: record as PublicKeyCredentialRequestOptionsJSON,
      uid: null,
    };
  }

  throw new Error('Invalid passkey login response from server.');
}

export function loginStartUserMessage(uid: string | null, options: PublicKeyCredentialRequestOptionsJSON): string | null {
  if (!uid) {
    return 'No account or passkey found for this email. Try a magic link or sign in with Google, then enroll a passkey.';
  }
  const creds = options.allowCredentials;
  if (!Array.isArray(creds) || creds.length === 0) {
    return 'No passkeys registered for this account. Sign in with a magic link or Google, then enroll a passkey.';
  }
  return null;
}
