<script lang="ts">
  import { browser } from '$app/environment';
  import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
  import { db, functions } from '$lib/firebase.js';
  import { httpsCallable } from 'firebase/functions';
  import { SvelteSet } from 'svelte/reactivity';
  import Icon from '$lib/components/ui/Icon.svelte';
  import type { IconName } from '$lib/icons/registry.js';

  type Props = { currentClubId: string };
  const { currentClubId }: Props = $props();

  type PendingNode = {
    email: string;
    playerName: string;
    teamId: string;
    parentEmail: string;
    createdAt: Date | null;
    tokenExpiry: Date | null;
  };

  let pendingNodes = $state<PendingNode[]>([]);
  let isLoading    = $state(true);
  let now          = $state(Date.now());

  // Per-row action state — SvelteSet enables fine-grained reactive tracking
  let blasting = new SvelteSet<string>();
  let blastOk  = new SvelteSet<string>();

  // Override modal
  let overrideTarget    = $state<PendingNode | null>(null);
  let overrideAttesting = $state(false);
  let overrideError     = $state('');
  let overrideConfirmed = $state(false);

  const outOfBandClearance = httpsCallable(functions, 'directorOutOfBandClearance');

  // Tick every second for TTL countdown
  $effect(() => {
    const id = setInterval(() => { now = Date.now(); }, 1000);
    return () => clearInterval(id);
  });

  // Real-time Firestore query — exception-only (pending_guardian)
  $effect(() => {
    if (!browser || !currentClubId) {
      pendingNodes = [];
      isLoading = false;
      return;
    }

    const q = query(
      collection(db, 'users'),
      where('clubId', '==', currentClubId),
      where('coppaStatus', '==', 'pending_guardian'),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        pendingNodes = snap.docs.map(d => {
          const data = d.data();
          const createdAt: Date | null = data.createdAt?.toDate?.() ?? null;
          const tokenExpiry = createdAt
            ? new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
            : null;
          return {
            email:       d.id,
            playerName:  String(data.playerName || data.displayName || d.id),
            teamId:      String(data.teamId || ''),
            parentEmail: String(data.parentEmail || data.email || '—'),
            createdAt,
            tokenExpiry,
          };
        });
        isLoading = false;
      },
      (err) => {
        console.error('[VpcPanopticon]', err);
        isLoading = false;
      },
    );

    return () => unsub();
  });

  function fmtTTL(expiry: Date | null): string {
    if (!expiry) return '—';
    const ms = expiry.getTime() - now;
    if (ms <= 0) return 'EXPIRED';
    const totalH = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return totalH >= 24 ? `${Math.floor(totalH / 24)}d ${totalH % 24}h` : `${totalH}h ${m}m`;
  }

  function ttlUrgency(expiry: Date | null): 'ok' | 'warn' | 'critical' | 'expired' {
    if (!expiry) return 'ok';
    const h = (expiry.getTime() - now) / 3_600_000;
    if (h <= 0) return 'expired';
    if (h < 12) return 'critical';
    if (h < 48) return 'warn';
    return 'ok';
  }

  async function blastNudge(node: PendingNode) {
    if (blasting.has(node.email)) return;
    blasting.add(node.email);

    try {
      await addDoc(collection(db, 'mail'), {
        to: node.parentEmail,
        message: {
          subject: `Action Required: COPPA Consent for ${node.playerName}`,
          html: `<p>Hi,</p><p>Your guardian consent for <strong>${node.playerName}</strong>'s player profile is still pending. Please complete verification to unlock their dashboard.</p>`,
          text: `Consent for ${node.playerName} is pending. Please complete verification.`,
        },
        type:        'vpc_nudge',
        playerEmail: node.email,
        clubId:      currentClubId,
        sentAt:      serverTimestamp(),
      });
      blastOk.add(node.email);
      setTimeout(() => { blastOk.delete(node.email); }, 4000);
    } catch (err) {
      console.error('[VpcPanopticon] blastNudge', err);
    } finally {
      blasting.delete(node.email);
    }
  }

  function openOverride(node: PendingNode) {
    overrideTarget    = node;
    overrideError     = '';
    overrideAttesting = false;
    overrideConfirmed = false;
  }

  async function confirmOverride() {
    if (!overrideTarget || overrideAttesting || !overrideConfirmed) return;
    overrideAttesting = true;
    overrideError     = '';
    try {
      await outOfBandClearance({
        targetEmail: overrideTarget.email,
        clubId:      currentClubId,
      });
      overrideTarget = null;
    } catch (err: unknown) {
      overrideError = (err instanceof Error ? err.message : null) ?? 'Override failed. Try again.';
    } finally {
      overrideAttesting = false;
    }
  }
</script>

<div class="vp-root">

  <!-- Header -->
  <div class="vp-header">
    <div>
      <span class="vp-badge">EXCEPTION-ONLY PANOPTICON · VPC/COPPA</span>
      <h2 class="vp-title">PENDING HOUSEHOLD NODES</h2>
    </div>
    <div class="vp-header__right">
      <span class="vp-count-pill">
        <span class="vp-count-dot" aria-hidden="true"></span>
        {#if isLoading}
          SCANNING…
        {:else}
          {pendingNodes.length} ACTIVE LOCKS
        {/if}
      </span>
    </div>
  </div>

  <!-- Loading -->
  {#if isLoading}
    <div class="vp-loading" aria-busy="true">
      <span class="vp-spinner" aria-hidden="true"></span>
      <span>QUERYING FIRESTORE…</span>
    </div>

  <!-- Empty state -->
  {:else if pendingNodes.length === 0}
    <div class="vp-empty" role="status">
      <Icon name="status.verified" size={40} class="vp-empty__icon" />
      <p class="vp-empty__label">ALL HOUSEHOLD NODES VERIFIED</p>
      <p class="vp-empty__sub">No pending guardian consent locks.</p>
    </div>

  {:else}
    <!-- Column headers -->
    <div class="vp-grid-head" aria-hidden="true">
      <span>PLAYER</span>
      <span>TEAM</span>
      <span>GUARDIAN EMAIL</span>
      <span>INVITE TTL</span>
      <span>STATUS</span>
      <span>ACTIONS</span>
    </div>

    <!-- Data rows -->
    {#each pendingNodes as node (node.email)}
      {@const urgency = ttlUrgency(node.tokenExpiry)}
      <div class="vp-row" class:vp-row--critical={urgency === 'critical' || urgency === 'expired'}>

        <div class="vp-cell vp-cell--name">
          <span class="vp-player-name">{node.playerName}</span>
          <span class="vp-email-sub">{node.email}</span>
        </div>

        <div class="vp-cell">
          <span class="vp-mono">{node.teamId || '—'}</span>
        </div>

        <div class="vp-cell">
          <span class="vp-mono vp-cyan">{node.parentEmail}</span>
        </div>

        <div class="vp-cell">
          <span
            class="vp-ttl"
            class:vp-ttl--warn={urgency === 'warn'}
            class:vp-ttl--critical={urgency === 'critical'}
            class:vp-ttl--expired={urgency === 'expired'}
          >
            {fmtTTL(node.tokenExpiry)}
          </span>
        </div>

        <div class="vp-cell">
          <span class="vp-status-badge">
            <span class="vp-status-dot" aria-hidden="true"></span>
            LOCKED: AWAITING WEBAUTHN
          </span>
        </div>

        <div class="vp-cell vp-cell--actions">
          <!-- Blast nudge -->
          <button
            class="vp-btn vp-btn--nudge tw-pointer-events-auto"
            class:vp-btn--ok={blastOk.has(node.email)}
            onclick={() => blastNudge(node)}
            disabled={blasting.has(node.email)}
            aria-label="Send nudge to {node.parentEmail}"
          >
            {#if blasting.has(node.email)}
              <span class="vp-spinner vp-spinner--sm" aria-hidden="true"></span>
            {:else if blastOk.has(node.email)}
              ✓ SENT
            {:else}
              [ BLAST NUDGE ]
            {/if}
          </button>

          <!-- Out-of-band override -->
          <button
            class="vp-btn vp-btn--override tw-pointer-events-auto"
            onclick={() => openOverride(node)}
            aria-label="Out-of-band clearance for {node.playerName}"
          >
            [ OUT-OF-BAND CLEARANCE ]
          </button>
        </div>

      </div>
    {/each}
  {/if}

</div>

<!-- Override confirmation modal -->
{#if overrideTarget}
  <div
    class="vp-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="vp-modal-title"
    tabindex="-1"
    onclick={(e) => { if (e.target === e.currentTarget) overrideTarget = null; }}
    onkeydown={(e) => { if (e.key === 'Escape') overrideTarget = null; }}
  >
    <div class="vp-modal">
      <div class="vp-modal__header">
        <span class="vp-modal__badge">DIRECTOR ATTESTATION REQUIRED</span>
        <h3 id="vp-modal-title" class="vp-modal__title">OUT-OF-BAND VPC CLEARANCE</h3>
      </div>

      <div class="vp-modal__body">
        <p class="vp-modal__copy">
          You are about to manually clear COPPA consent for:
        </p>
        <div class="vp-modal__target">
          <span class="vp-modal__player">{overrideTarget.playerName}</span>
          <span class="vp-modal__email">{overrideTarget.email}</span>
        </div>
        <p class="vp-modal__warning">
          This action writes an IMMUTABLE audit record
          (<code>attestedVia: 'director_out_of_band'</code>) and immediately
          unlocks the player node. Only proceed if you have physically verified
          parental consent in-person or via documented alternative process.
        </p>

        <label class="vp-modal__check">
          <input
            type="checkbox"
            bind:checked={overrideConfirmed}
            class="vp-checkbox"
          />
          <span>
            I, Director <strong>{currentClubId}</strong>, attest that parental consent
            has been physically verified and this override is legally authorized.
          </span>
        </label>

        {#if overrideError}
          <p class="vp-modal__err" role="alert">{overrideError}</p>
        {/if}
      </div>

      <div class="vp-modal__footer">
        <button
          class="vp-btn vp-btn--cancel tw-pointer-events-auto"
          onclick={() => (overrideTarget = null)}
        >
          CANCEL
        </button>
        <button
          class="vp-btn vp-btn--confirm tw-pointer-events-auto"
          onclick={confirmOverride}
          disabled={!overrideConfirmed || overrideAttesting}
          aria-busy={overrideAttesting}
        >
          {#if overrideAttesting}
            <span class="vp-spinner vp-spinner--sm" aria-hidden="true"></span>
            APPLYING…
          {:else}
            [ CONFIRM OVERRIDE ]
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Root */
  .vp-root {
    display: flex; flex-direction: column; gap: 0.75rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  }

  /* Header */
  .vp-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
  .vp-badge { font-size: 0.52rem; font-weight: 700; letter-spacing: 0.2em; color: rgba(20, 184, 166,0.45); display: block; margin-bottom: 0.25rem; }
  .vp-title { margin: 0; font-size: clamp(0.9rem, 2vw, 1.1rem); font-weight: 900; letter-spacing: 0.1em; color: #e5e7eb; }
  .vp-header__right { display: flex; align-items: center; }
  .vp-count-pill { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.8rem; border: 1px solid rgba(20, 184, 166,0.25); background: rgba(20, 184, 166,0.05); border-radius: 999px; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; color: rgba(20, 184, 166,0.7); }
  .vp-count-dot { width: 6px; height: 6px; border-radius: 50%; background: #14b8a6; box-shadow: 0 0 6px #14b8a6; animation: vpPulse 1.4s ease-in-out infinite; }

  /* States */
  .vp-loading { display: flex; align-items: center; gap: 0.75rem; padding: 2rem; justify-content: center; font-size: 0.65rem; letter-spacing: 0.14em; color: rgba(20, 184, 166,0.45); }
  .vp-empty { display: flex; flex-direction: column; align-items: center; gap: 0.65rem; padding: 2.5rem; text-align: center; }
  .vp-empty__icon { width: 2.5rem; height: 2.5rem; color: rgba(20, 184, 166,0.4); }
  .vp-empty__label { margin: 0; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; color: #e5e7eb; }
  .vp-empty__sub { margin: 0; font-size: 0.6rem; color: rgba(229,231,235,0.3); }

  /* Grid */
  .vp-grid-head {
    display: grid; grid-template-columns: 1.8fr 1fr 2fr 1fr 1.6fr 2fr;
    gap: 0.5rem; padding: 0.4rem 0.75rem;
    font-size: 0.52rem; font-weight: 700; letter-spacing: 0.16em;
    color: rgba(20, 184, 166,0.3); border-bottom: 1px solid rgba(20, 184, 166,0.08);
  }
  @media (max-width: 900px) {
    .vp-grid-head { display: none; }
    .vp-row { grid-template-columns: 1fr; }
  }

  .vp-row {
    display: grid; grid-template-columns: 1.8fr 1fr 2fr 1fr 1.6fr 2fr;
    gap: 0.5rem; padding: 0.65rem 0.75rem; border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.04);
    background: rgba(4, 15, 22, 0.7);
    backdrop-filter: blur(var(--vanguard-blur)) saturate(180%); -webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
    box-shadow: var(--vanguard-elev-2);
    transition: border-color 0.15s, background 0.15s;
  }
  .vp-row:hover { border-color: rgba(20, 184, 166,0.18); background: rgba(4,15,22,0.9); }
  .vp-row--critical { border-color: rgba(255,0,60,0.25); }

  .vp-cell { display: flex; flex-direction: column; justify-content: center; min-width: 0; overflow: hidden; }
  .vp-cell--name { gap: 0.15rem; }
  .vp-cell--actions { flex-direction: row; gap: 0.4rem; flex-wrap: wrap; align-items: center; }

  .vp-player-name { font-size: 0.72rem; font-weight: 700; color: #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vp-email-sub   { font-size: 0.56rem; color: rgba(229,231,235,0.3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vp-mono        { font-size: 0.65rem; color: rgba(229,231,235,0.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vp-cyan        { color: rgba(20, 184, 166,0.65); }

  /* TTL */
  .vp-ttl         { font-size: 0.65rem; font-weight: 700; color: rgba(20, 184, 166,0.7); letter-spacing: 0.08em; }
  .vp-ttl--warn     { color: #ffcc00; }
  .vp-ttl--critical { color: #ff6600; animation: vpFlash 1s ease-in-out infinite; }
  .vp-ttl--expired  { color: #ff003c; }

  /* Status badge */
  .vp-status-badge { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.54rem; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,204,0,0.75); border: 1px solid rgba(255,204,0,0.2); background: rgba(255,204,0,0.04); padding: 0.25rem 0.55rem; border-radius: 3px; white-space: nowrap; }
  .vp-status-dot { width: 5px; height: 5px; border-radius: 50%; background: #ffcc00; box-shadow: 0 0 5px #ffcc00; animation: vpPulse 1.4s ease-in-out infinite; }

  /* Buttons */
  .vp-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.7rem; font-family: inherit; font-size: 0.58rem; font-weight: 700; letter-spacing: 0.1em; border-radius: 4px; cursor: pointer; transition: all 0.15s; white-space: nowrap; border: 1px solid transparent; }
  .vp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .vp-btn--nudge { background: rgba(20, 184, 166,0.05); border-color: rgba(20, 184, 166,0.2); color: rgba(20, 184, 166,0.7); }
  .vp-btn--nudge:hover:not(:disabled) { background: rgba(20, 184, 166,0.1); border-color: rgba(20, 184, 166,0.5); }
  .vp-btn--ok { background: rgba(0,255,102,0.07); border-color: rgba(0,255,102,0.3); color: #00ff66; }
  .vp-btn--override { background: rgba(255,0,60,0.05); border-color: rgba(255,0,60,0.25); color: rgba(255,0,60,0.75); }
  .vp-btn--override:hover:not(:disabled) { background: rgba(255,0,60,0.1); border-color: rgba(255,0,60,0.5); }
  .vp-btn--cancel  { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.12); color: rgba(229,231,235,0.5); }
  .vp-btn--confirm { background: rgba(20, 184, 166,0.06); border-color: rgba(20, 184, 166,0.4); color: #14b8a6; padding: 0.5rem 1.25rem; }
  .vp-btn--confirm:hover:not(:disabled) { background: rgba(20, 184, 166,0.14); box-shadow: 0 0 18px rgba(20, 184, 166,0.15); }

  /* Spinners */
  .vp-spinner { display: inline-block; width: 1rem; height: 1rem; border: 2px solid rgba(20, 184, 166,0.15); border-top-color: rgba(20, 184, 166,0.7); border-radius: 50%; animation: vpSpin 0.7s linear infinite; }
  .vp-spinner--sm { width: 0.7rem; height: 0.7rem; }

  /* Overlay / Modal */
  .vp-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.75); backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%); -webkit-backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
    display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .vp-modal {
    width: 100%; max-width: 520px;
    background: rgba(4,15,22,0.97); border: 1px solid rgba(255,0,60,0.3);
    border-radius: var(--vanguard-radius); padding: 1.75rem;
    display: flex; flex-direction: column; gap: 1.25rem;
    box-shadow: var(--vanguard-elev-ares);
  }
  .vp-modal__badge { font-size: 0.52rem; font-weight: 700; letter-spacing: 0.18em; color: rgba(255,0,60,0.6); margin-bottom: 0.25rem; display: block; }
  .vp-modal__title { margin: 0; font-size: 1rem; font-weight: 900; letter-spacing: 0.1em; color: #e5e7eb; }
  .vp-modal__body { display: flex; flex-direction: column; gap: 0.85rem; }
  .vp-modal__copy { margin: 0; font-size: 0.68rem; color: rgba(229,231,235,0.5); }
  .vp-modal__target { padding: 0.65rem 0.9rem; background: rgba(255,0,60,0.04); border: 1px solid rgba(255,0,60,0.18); border-radius: 5px; }
  .vp-modal__player { display: block; font-size: 0.78rem; font-weight: 700; color: #e5e7eb; }
  .vp-modal__email  { display: block; font-size: 0.62rem; color: rgba(20, 184, 166,0.55); margin-top: 0.15rem; }
  .vp-modal__warning { margin: 0; font-size: 0.62rem; line-height: 1.65; color: rgba(229,231,235,0.4); }
  .vp-modal__warning code { background: rgba(255,0,60,0.08); color: rgba(255,0,60,0.7); padding: 0.1em 0.35em; border-radius: 3px; }
  .vp-modal__check { display: flex; align-items: flex-start; gap: 0.65rem; font-size: 0.65rem; line-height: 1.6; color: rgba(229,231,235,0.65); cursor: pointer; }
  .vp-modal__check strong { color: rgba(20, 184, 166,0.75); }
  .vp-checkbox { accent-color: #14b8a6; margin-top: 0.2rem; flex-shrink: 0; }
  .vp-modal__err { margin: 0; font-size: 0.65rem; color: #ff003c; }
  .vp-modal__footer { display: flex; justify-content: flex-end; gap: 0.65rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.06); }

  @keyframes vpSpin  { to { transform: rotate(360deg); } }
  @keyframes vpPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.35; transform:scale(0.55); } }
  @keyframes vpFlash { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
</style>
