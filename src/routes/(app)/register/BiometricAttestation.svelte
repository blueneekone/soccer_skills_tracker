<script lang="ts">
  import { browser } from '$app/environment';
  import { functions } from '$lib/firebase.js';
  import { httpsCallable } from 'firebase/functions';
  import Icon from '$lib/components/ui/Icon.svelte';

  type Props = {
    inviteToken?: string;
    childEmail?: string;
    onComplete: () => void;
  };

  const { inviteToken = '', childEmail = '', onComplete }: Props = $props();

  type FlowStatus = 'checking' | 'ready' | 'authenticating' | 'verifying' | 'success' | 'error' | 'fallback';


  // Resolved once at mount time — browser & PublicKeyCredential never change
  const webAuthnSupported = browser ? !!(window as any).PublicKeyCredential : false;

  let flowStatus       = $state<FlowStatus>(
    !browser ? 'checking' : webAuthnSupported ? 'ready' : 'fallback'
  );
  let attestationError = $state<string | null>(null);

  let pinValue      = $state('');
  let pinError      = $state<string | null>(null);
  let pinSubmitting = $state(false);

  const generateChallenge = httpsCallable(functions, 'generateWebAuthnChallenge');
  const verifyBiometric   = httpsCallable(functions, 'verifyBiometricConsent');
  const verifyPin         = httpsCallable(functions, 'verifyParentalConsent');

  function b64urlDecode(s: string): Uint8Array {
    const pad = s.length % 4 === 0 ? '' : '===='.slice(s.length % 4);
    const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  }

  function ab2b64url(buf: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  async function invokeBiometricEnclave() {
    if (flowStatus === 'authenticating' || flowStatus === 'verifying') return;
    flowStatus = 'authenticating';
    attestationError = null;

    try {
      const res = await generateChallenge({}) as { data: { challenge: string; rpName: string; userId: string } };
      const { challenge, rpName, userId } = res.data;

      const challengeBytes = b64urlDecode(challenge);
      const userIdBytes    = new TextEncoder().encode(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challengeBytes as any,
          rp: { name: rpName, id: window.location.hostname },
          user: {
            id: userIdBytes,
            name: 'guardian@nexuscommand.app',
            displayName: 'Legal Guardian Attestation',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7   },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'direct',
        },
      }) as PublicKeyCredential | null;

      if (!credential) throw new Error('Biometric attestation cancelled by OS.');

      const response = credential.response as AuthenticatorAttestationResponse;

      flowStatus = 'verifying';
      await verifyBiometric({
        clientDataJSON:    ab2b64url(response.clientDataJSON),
        attestationObject: ab2b64url(response.attestationObject),
        credentialId:      credential.id,
        childEmail:        childEmail  || null,
        inviteToken:       inviteToken || null,
      });

      flowStatus = 'success';
      setTimeout(() => onComplete(), 1400);

    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (/cancel|abort|NotAllowed/i.test(msg)) {
        attestationError = 'Biometric verification was cancelled. Tap the button to try again.';
      } else {
        attestationError = msg || 'Biometric verification failed. Use the PIN fallback below.';
      }
      flowStatus = 'ready';
    }
  }

  async function submitPin() {
    const code = pinValue.trim();
    if (!code || pinSubmitting) return;
    pinSubmitting = true;
    pinError = null;

    try {
      await verifyPin({ token: code, action: 'granted' });
      flowStatus = 'success';
      setTimeout(() => onComplete(), 1400);
    } catch (err: any) {
      pinError = err?.message ?? 'Invalid or expired consent code. Check your email.';
    } finally {
      pinSubmitting = false;
    }
  }
</script>

<div class="ba-root">

  {#if flowStatus === 'success'}
    <div class="ba-success" role="status">
      <Icon name="status.verified" size={56} class="ba-success__icon" />
      <p class="ba-success__label">CONSENT VERIFIED</p>
      <p class="ba-success__sub">Redirecting to War Room…</p>
    </div>

  {:else if flowStatus === 'ready' || flowStatus === 'authenticating' || flowStatus === 'verifying'}
    <div class="ba-card vanguard-card">

      <div class="ba-card__header">
        <Icon name="status.shield-check" size={40} class="ba-card__shield" />
        <div>
          <p class="ba-card__badge">LEGAL GUARDIAN ATTESTATION · WEBAUTHN</p>
          <h2 class="ba-card__title">BIOMETRIC ENCLAVE AUTHORIZATION</h2>
        </div>
      </div>

      <p class="ba-card__body">
        Nexus Command uses your device's secure enclave (Face ID, Touch ID, or Windows Hello)
        as a zero-cost COPPA "Email Plus" safe harbor attestation. No biometric data ever
        leaves your device — only a signed cryptographic proof is transmitted.
      </p>

      <ul class="ba-card__claims" aria-label="Verification claims">
        <li class="ba-claim">
          <span class="ba-claim__dot" aria-hidden="true"></span>
          FCRA-compliant · No PII transmitted
        </li>
        <li class="ba-claim">
          <span class="ba-claim__dot" aria-hidden="true"></span>
          Platform biometrics only (authenticatorAttachment: platform)
        </li>
        <li class="ba-claim">
          <span class="ba-claim__dot" aria-hidden="true"></span>
          Single-use challenge · 10-minute TTL · Anti-replay enforced
        </li>
      </ul>

      {#if attestationError}
        <div class="ba-error" role="alert">
          <Icon name="status.warning" size={18} />
          <span>{attestationError}</span>
        </div>
      {/if}

      <button
        class="ba-btn-primary vanguard-btn-primary"
        onclick={invokeBiometricEnclave}
        disabled={flowStatus === 'authenticating' || flowStatus === 'verifying'}
        aria-busy={flowStatus === 'authenticating' || flowStatus === 'verifying'}
      >
        {#if flowStatus === 'authenticating'}
          <span class="ba-spinner" aria-hidden="true"></span>
          ENGAGING SECURE ENCLAVE…
        {:else if flowStatus === 'verifying'}
          <span class="ba-spinner" aria-hidden="true"></span>
          VERIFYING ATTESTATION…
        {:else}
          [&nbsp;ATTEST VIA ON-DEVICE BIOMETRICS&nbsp;]
        {/if}
      </button>

      <button
        class="ba-fallback-link"
        onclick={() => { flowStatus = 'fallback'; attestationError = null; }}
      >
        Device lacks biometrics? Use consent PIN →
      </button>

    </div>

  {:else if flowStatus === 'fallback'}
    <div class="ba-card vanguard-card">

      <div class="ba-card__header">
        <Icon name="status.shield-alert" size={40} class="ba-card__shield ba-card__shield--amber" />
        <div>
          <p class="ba-card__badge ba-card__badge--amber">PITCH-SIDE ACTIVATION PIN · EMAIL FALLBACK</p>
          <h2 class="ba-card__title">ENTER CONSENT CODE</h2>
        </div>
      </div>

      <p class="ba-card__body">
        Enter the activation code from the consent email sent to the guardian's address.
        The code is valid for 72 hours and can only be used once.
      </p>

      {#if pinError}
        <div class="ba-error" role="alert">
          <Icon name="status.warning" size={18} />
          <span>{pinError}</span>
        </div>
      {/if}

      <div class="ba-pin-group">
        <label class="ba-pin-label" for="ba-pin-input">CONSENT ACTIVATION CODE</label>
        <input
          id="ba-pin-input"
          class="ba-pin-input"
          type="text"
          inputmode="text"
          autocomplete="one-time-code"
          maxlength="64"
          placeholder="Paste code from guardian email…"
          bind:value={pinValue}
          onkeydown={(e) => e.key === 'Enter' && submitPin()}
          disabled={pinSubmitting}
          aria-invalid={!!pinError}
          aria-describedby={pinError ? 'ba-pin-err' : undefined}
        />
      </div>

      <button
        class="ba-btn-primary vanguard-btn-primary"
        onclick={submitPin}
        disabled={!pinValue.trim() || pinSubmitting}
        aria-busy={pinSubmitting}
      >
        {#if pinSubmitting}
          <span class="ba-spinner" aria-hidden="true"></span>
          VERIFYING CODE…
        {:else}
          [&nbsp;SUBMIT CONSENT CODE&nbsp;]
        {/if}
      </button>

      {#if webAuthnSupported}
        <button
          class="ba-fallback-link"
          onclick={() => { flowStatus = 'ready'; pinError = null; pinValue = ''; }}
        >
          ← Use biometric enclave instead
        </button>
      {/if}

    </div>

  {:else}
    <div class="ba-checking" aria-busy="true" aria-label="Checking device capabilities">
      <span class="ba-spinner ba-spinner--lg" aria-hidden="true"></span>
    </div>
  {/if}

</div>

<style>
  .ba-root {
    width: 100%;
    max-width: 560px;
    margin-inline: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  /* ── Success ─────────────────────────────────────────────────────────────── */
  .ba-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem 2rem;
    text-align: center;
    animation: baFadeIn 0.4s ease;
  }

  .ba-success__label {
    margin: 0;
    font-size: 1rem;
    font-weight: 900;
    letter-spacing: 0.18em;
    color: var(--vanguard-cyan, #14b8a6);
    text-shadow: 0 0 16px rgba(20, 184, 166, 0.45);
  }
  .ba-success__sub {
    margin: 0;
    font-size: 0.65rem;
    color: rgba(229, 231, 235, 0.4);
    letter-spacing: 0.1em;
  }

  /* ── Card ────────────────────────────────────────────────────────────────── */
  .ba-card {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.75rem 1.5rem;
    animation: baFadeIn 0.35s ease;
  }
  .ba-card__header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .ba-card__badge {
    margin: 0 0 0.25rem;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: rgba(20, 184, 166, 0.6);
  }
  .ba-card__badge--amber {
    color: rgba(251, 191, 36, 0.7);
  }
  .ba-card__title {
    margin: 0;
    font-size: clamp(0.85rem, 2.5vw, 1.05rem);
    font-weight: 900;
    letter-spacing: 0.1em;
    color: #e5e7eb;
  }
  .ba-card__body {
    margin: 0;
    font-size: 0.7rem;
    line-height: 1.7;
    color: rgba(229, 231, 235, 0.55);
    letter-spacing: 0.03em;
  }

  /* ── Claim list ──────────────────────────────────────────────────────────── */
  .ba-card__claims {
    list-style: none;
    margin: 0;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    border: 1px solid rgba(20, 184, 166, 0.08);
    border-radius: 4px;
    background: rgba(20, 184, 166, 0.025);
  }
  .ba-claim {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    color: rgba(229, 231, 235, 0.4);
  }
  .ba-claim__dot {
    flex-shrink: 0;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--vanguard-cyan, #14b8a6);
    box-shadow: 0 0 4px var(--vanguard-cyan, #14b8a6);
  }

  /* ── Error alert ─────────────────────────────────────────────────────────── */
  .ba-error {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    border: 1px solid rgba(255, 0, 60, 0.3);
    background: rgba(255, 0, 60, 0.04);
    border-radius: 5px;
    font-size: 0.68rem;
    color: var(--vanguard-red, #ff003c);
    animation: baFadeIn 0.25s ease;
  }

  .ba-error span {
    line-height: 1.5;
  }

  /* ── Primary button ──────────────────────────────────────────────────────── */
  .ba-btn-primary {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.9rem 1.5rem;
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.15s, box-shadow 0.15s;
  }
  .ba-btn-primary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none !important;
  }

  /* ── Spinner ─────────────────────────────────────────────────────────────── */
  .ba-spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.15);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: baSpin 0.7s linear infinite;
    flex-shrink: 0;
  }
  .ba-spinner--lg {
    width: 2rem;
    height: 2rem;
  }

  /* ── Fallback link ───────────────────────────────────────────────────────── */
  .ba-fallback-link {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: 0.62rem;
    letter-spacing: 0.1em;
    color: rgba(20, 184, 166, 0.45);
    cursor: pointer;
    text-align: center;
    transition: color 0.15s;
  }
  .ba-fallback-link:hover {
    color: var(--vanguard-cyan, #14b8a6);
  }

  /* ── PIN group ───────────────────────────────────────────────────────────── */
  .ba-pin-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .ba-pin-label {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: rgba(20, 184, 166, 0.55);
  }
  .ba-pin-input {
    width: 100%;
    padding: 0.7rem 0.85rem;
    background: rgba(1, 4, 9, 0.8);
    border: 1px solid rgba(20, 184, 166, 0.2);
    border-radius: 4px;
    color: #e5e7eb;
    font-family: inherit;
    font-size: 0.78rem;
    letter-spacing: 0.05em;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ba-pin-input::placeholder {
    color: rgba(229, 231, 235, 0.2);
  }
  .ba-pin-input:focus {
    border-color: rgba(20, 184, 166, 0.5);
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.08);
  }
  .ba-pin-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .ba-pin-input[aria-invalid='true'] {
    border-color: rgba(255, 0, 60, 0.45);
  }

  /* ── Checking spinner ────────────────────────────────────────────────────── */
  .ba-checking {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 3rem;
    color: var(--vanguard-cyan, #14b8a6);
  }

  /* ── Keyframes ───────────────────────────────────────────────────────────── */
  @keyframes baSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes baFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: none; }
  }
</style>
