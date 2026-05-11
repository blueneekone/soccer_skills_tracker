<script lang="ts">
  import { db, functions } from '$lib/firebase.js';
  import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
  import { httpsCallable } from 'firebase/functions';
  import { SvelteSet } from 'svelte/reactivity';
  import { browser } from '$app/environment';

  interface PendingNode {
    id: string;
    displayName: string;
    teamName: string;
    guardianEmail: string;
    createdAt: number;
    tokenExpiry: number;
    coppaStatus: string;
  }

  let { currentClubId }: { currentClubId: string } = $props();

  let pendingNodes    = $state<PendingNode[]>([]);
  let isLoading       = $state(true);
  let now             = $state(Date.now());
  const pingingSet    = new SvelteSet<string>();
  const pingOkSet     = new SvelteSet<string>();
  let overrideTarget  = $state<PendingNode | null>(null);
  let overrideAttesting = $state(false);
  let overrideError   = $state<string | null>(null);
  let overrideConfirmed = $state(false);

  // Real-time 1-second clock for TTL countdowns
  $effect(() => {
    if (!browser) return;
    const timer = setInterval(() => { now = Date.now(); }, 1000);
    return () => clearInterval(timer);
  });

  // Firestore real-time listener — exception-only: pending_guardian nodes only
  $effect(() => {
    if (!browser || !currentClubId) { isLoading = false; return; }
    isLoading = true;
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
          const createdMs: number =
            data.createdAt?.toMillis?.() ??
            (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now());
          return {
            id:            d.id,
            displayName:   data.displayName || data.firstName || d.id,
            teamName:      data.teamName || data.team || '',
            guardianEmail: data.guardianEmail || data.email || '',
            createdAt:     createdMs,
            tokenExpiry:   createdMs + 7 * 24 * 60 * 60 * 1000,
            coppaStatus:   data.coppaStatus,
          };
        });
        isLoading = false;
      },
      () => { isLoading = false; },
    );
    return () => unsub();
  });

  function fmtTtl(expiry: number): string {
    const diff = expiry - now;
    if (diff <= 0) return 'EXPIRED';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    return `${h}h ${m}m`;
  }

  function ttlClass(expiry: number): string {
    const diff = expiry - now;
    if (diff <= 0) return 'ip-ttl--dead';
    if (diff < 3_600_000) return 'ip-ttl--critical';
    if (diff < 86_400_000) return 'ip-ttl--warn';
    return 'ip-ttl--ok';
  }

  async function pingNudge(node: PendingNode) {
    if (pingingSet.has(node.id)) return;
    pingingSet.add(node.id);
    try {
      await addDoc(collection(db, 'mail'), {
        to: node.guardianEmail,
        message: {
          subject: 'Reminder: Complete Secure Player Onboarding',
          text: `This is a reminder to complete the mandatory secure on-device verification for ${node.displayName}. Please use your original link to finish the process.`,
        },
        meta: {
          triggeredBy: 'director_ping_nudge',
          clubId:      currentClubId,
          playerEmail: node.id,
          timestamp:   serverTimestamp(),
        },
      });
      pingOkSet.add(node.id);
      setTimeout(() => {
        pingOkSet.delete(node.id);
        pingingSet.delete(node.id);
      }, 3000);
    } catch (err) {
      console.error('[IntakePanopticon] pingNudge', err);
      pingingSet.delete(node.id);
    }
  }

  function openOverride(node: PendingNode) {
    overrideTarget    = node;
    overrideError     = null;
    overrideConfirmed = false;
  }

  function closeOverride() {
    overrideTarget    = null;
    overrideAttesting = false;
    overrideError     = null;
    overrideConfirmed = false;
  }

  async function confirmOverride() {
    if (!overrideTarget || overrideAttesting || !overrideConfirmed) return;
    overrideAttesting = true;
    overrideError     = null;
    try {
      const fn = httpsCallable(functions, 'directorOutOfBandClearance');
      await fn({
        targetEmail:   overrideTarget.id,
        clubId:        currentClubId,
        attestationType: 'director_physical_escrow',
      });
      closeOverride();
    } catch (err: unknown) {
      overrideError = (err instanceof Error ? err.message : null) ?? 'Override failed.';
    } finally {
      overrideAttesting = false;
    }
  }
</script>

<div class="ip-root vanguard-card">

  <!-- ═══ HEADER ═══ -->
  <div class="ip-header">
    <div class="ip-title-row">
      <span class="ip-icon" aria-hidden="true">⊕</span>
      <div>
        <h2 class="ip-title">INTAKE PANOPTICON</h2>
        <p class="ip-subtitle">EXCEPTION-ONLY NODE STREAM · PENDING GUARDIAN CLEARANCE</p>
      </div>
    </div>
    {#if !isLoading}
      <div class="ip-count-badge" role="status" aria-live="polite">
        {pendingNodes.length} NODE{pendingNodes.length !== 1 ? 'S' : ''} PENDING
      </div>
    {/if}
  </div>

  <!-- ═══ LOADING ═══ -->
  {#if isLoading}
    <div class="ip-loading" aria-busy="true">
      <svg class="ip-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="rgba(0,240,255,0.18)" stroke-width="2.5"/>
        <path d="M12 3a9 9 0 0 1 9 9" stroke="#00f0ff" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <span>SCANNING INTAKE STREAM...</span>
    </div>

  <!-- ═══ EMPTY STATE ═══ -->
  {:else if pendingNodes.length === 0}
    <div class="ip-empty" role="status">
      <svg class="ip-empty-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="21" stroke="currentColor" stroke-width="2"/>
        <polyline points="14,24 21,31 34,16" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <h3 class="ip-empty-title">ALL NODES CLEARED</h3>
      <p class="ip-empty-sub">No pending guardian verifications.</p>
    </div>

  <!-- ═══ DATA GRID ═══ -->
  {:else}
    <div class="ip-grid-header" aria-hidden="true">
      <span>PLAYER NODE</span>
      <span>TARGET TEAM</span>
      <span>CLAIMING GUARDIAN</span>
      <span>LINK TTL</span>
      <span>CLEARANCE STATUS</span>
      <span>OVERRIDE</span>
    </div>

    {#each pendingNodes as node (node.id)}
      <div class="ip-row">

        <!-- Player node -->
        <div class="ip-cell ip-cell--player">
          <span class="ip-name">{node.displayName}</span>
          <span class="ip-email-sm">{node.id}</span>
        </div>

        <!-- Team -->
        <div class="ip-cell">
          {#if node.teamName}
            <span class="ip-team-badge">{node.teamName}</span>
          {:else}
            <span class="ip-unassigned">UNASSIGNED</span>
          {/if}
        </div>

        <!-- Guardian -->
        <div class="ip-cell">
          <span class="ip-guardian">{node.guardianEmail}</span>
        </div>

        <!-- TTL -->
        <div class="ip-cell">
          <span class={ttlClass(node.tokenExpiry)}>{fmtTtl(node.tokenExpiry)}</span>
        </div>

        <!-- Status -->
        <div class="ip-cell">
          <span class="ip-status-badge">⬡ AWAITING ON-DEVICE WEBAUTHN</span>
        </div>

        <!-- Actions -->
        <div class="ip-cell ip-cell--actions">
          <button
            class="ip-btn ip-btn--nudge tw-pointer-events-auto"
            onclick={() => pingNudge(node)}
            disabled={pingingSet.has(node.id)}
            aria-label="Send nudge email to {node.guardianEmail}"
          >
            {#if pingOkSet.has(node.id)}
              [ ✓ SENT ]
            {:else if pingingSet.has(node.id)}
              [ PINGING... ]
            {:else}
              [ PING NUDGE ]
            {/if}
          </button>
          <button
            class="ip-btn ip-btn--override tw-pointer-events-auto"
            onclick={() => openOverride(node)}
            aria-label="Force physical clearance for {node.displayName}"
          >
            [ FORCE PHYSICAL ]
          </button>
        </div>

      </div>
    {/each}
  {/if}

</div>

<!-- ═══ OVERRIDE CONFIRMATION MODAL ═══ -->
{#if overrideTarget}
  <div
    class="ip-modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="ip-modal-title"
    tabindex="-1"
    onclick={(e) => { if (e.target === e.currentTarget) closeOverride(); }}
    onkeydown={(e) => { if (e.key === 'Escape') closeOverride(); }}
  >
    <div class="ip-modal">

      <div class="ip-modal-header">
        <span class="ip-modal-icon" aria-hidden="true">⚠</span>
        <h3 id="ip-modal-title" class="ip-modal-title">FORCE PHYSICAL CLEARANCE</h3>
      </div>

      <p class="ip-modal-body">
        You are attesting that <strong>{overrideTarget.displayName}</strong>
        ({overrideTarget.guardianEmail}) has completed mandatory physical signature
        verification in your presence. This action is immutable and will be logged
        with your credentials.
      </p>

      <div class="ip-modal-attest">
        <label class="ip-attest-label">
          <input
            type="checkbox"
            bind:checked={overrideConfirmed}
            class="ip-checkbox tw-pointer-events-auto"
          />
          <span>I physically verified and attest to this clearance.</span>
        </label>
      </div>

      {#if overrideError}
        <p class="ip-modal-error" role="alert">{overrideError}</p>
      {/if}

      <div class="ip-modal-actions">
        <button
          class="ip-btn ip-btn--cancel tw-pointer-events-auto"
          onclick={closeOverride}
        >
          [ ABORT ]
        </button>
        <button
          class="ip-btn ip-btn--confirm tw-pointer-events-auto"
          disabled={!overrideConfirmed || overrideAttesting}
          onclick={confirmOverride}
          aria-busy={overrideAttesting}
        >
          {overrideAttesting ? '[ PROCESSING... ]' : '[ EXECUTE PHYSICAL ESCROW ]'}
        </button>
      </div>

    </div>
  </div>
{/if}

<style>
  /* ── Root ────────────────────────────────────────────────────── */
  .ip-root {
    display: flex;
    flex-direction: column;
    gap: 0;
    background: rgba(2, 2, 2, 0.92);
    border: 1px solid rgba(0, 240, 255, 0.15);
    border-radius: 12px;
    overflow: hidden;
    backdrop-filter: blur(36px);
    -webkit-backdrop-filter: blur(36px);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  /* ── Header ──────────────────────────────────────────────────── */
  .ip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid rgba(0, 240, 255, 0.1);
    flex-wrap: wrap;
    background: rgba(4, 15, 22, 0.6);
  }
  .ip-title-row {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }
  .ip-icon {
    font-size: 1.6rem;
    color: #00f0ff;
    filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.6));
    line-height: 1;
    flex-shrink: 0;
  }
  .ip-title {
    margin: 0;
    font-size: clamp(0.85rem, 2vw, 1rem);
    font-weight: 900;
    letter-spacing: 0.15em;
    color: #00f0ff;
    text-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
  }
  .ip-subtitle {
    margin: 0.2rem 0 0;
    font-size: 0.5rem;
    letter-spacing: 0.14em;
    color: rgba(0, 240, 255, 0.45);
    text-transform: uppercase;
  }
  .ip-count-badge {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: rgba(0, 240, 255, 0.8);
    border: 1px solid rgba(0, 240, 255, 0.3);
    background: rgba(0, 240, 255, 0.06);
    border-radius: 999px;
    padding: 0.3rem 0.9rem;
    white-space: nowrap;
  }

  /* ── Loading ─────────────────────────────────────────────────── */
  .ip-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.85rem;
    padding: 3rem 1.5rem;
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    color: rgba(0, 240, 255, 0.45);
  }
  .ip-spinner {
    width: 1.5rem;
    height: 1.5rem;
    animation: ipSpin 0.8s linear infinite;
    flex-shrink: 0;
  }

  /* ── Empty state ─────────────────────────────────────────────── */
  .ip-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.65rem;
    padding: 3rem 1.5rem;
    text-align: center;
  }
  .ip-empty-icon {
    width: 3rem;
    height: 3rem;
    color: rgba(0, 255, 102, 0.5);
    filter: drop-shadow(0 0 8px rgba(0, 255, 102, 0.3));
  }
  .ip-empty-title {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    color: #00ff66;
  }
  .ip-empty-sub {
    margin: 0;
    font-size: 0.6rem;
    color: rgba(229, 231, 235, 0.3);
  }

  /* ── Grid header ─────────────────────────────────────────────── */
  .ip-grid-header {
    display: grid;
    grid-template-columns: 1.8fr 1fr 2fr 1fr 1.8fr 2fr;
    gap: 0.5rem;
    padding: 0.5rem 1.25rem;
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(0, 240, 255, 0.35);
    border-bottom: 1px solid rgba(0, 240, 255, 0.08);
    background: rgba(4, 15, 22, 0.5);
  }

  /* ── Data rows ───────────────────────────────────────────────── */
  .ip-row {
    display: grid;
    grid-template-columns: 1.8fr 1fr 2fr 1fr 1.8fr 2fr;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid rgba(0, 240, 255, 0.05);
    background: rgba(4, 15, 22, 0.7);
    transition: background 0.15s, border-color 0.15s;
  }
  .ip-row:last-child { border-bottom: none; }
  .ip-row:hover {
    background: rgba(0, 240, 255, 0.03);
    border-bottom-color: rgba(0, 240, 255, 0.12);
  }

  /* ── Cells ───────────────────────────────────────────────────── */
  .ip-cell {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    overflow: hidden;
  }
  .ip-cell--player { gap: 0.2rem; }
  .ip-cell--actions {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  /* ── Cell content ────────────────────────────────────────────── */
  .ip-name {
    font-size: 0.72rem;
    font-weight: 700;
    color: #f3f4f6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ip-email-sm {
    font-size: 0.56rem;
    color: rgba(255, 255, 255, 0.28);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ip-team-badge {
    display: inline-block;
    font-size: 0.54rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: rgba(0, 240, 255, 0.7);
    border: 1px solid rgba(0, 240, 255, 0.25);
    background: rgba(0, 240, 255, 0.06);
    border-radius: 3px;
    padding: 0.15rem 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .ip-unassigned {
    font-size: 0.58rem;
    font-style: italic;
    color: rgba(156, 163, 175, 0.4);
  }
  .ip-guardian {
    font-size: 0.62rem;
    color: rgba(209, 213, 219, 0.65);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── TTL states ──────────────────────────────────────────────── */
  .ip-ttl--ok       { font-size: 0.65rem; font-weight: 700; color: #00ff66; letter-spacing: 0.06em; }
  .ip-ttl--warn     { font-size: 0.65rem; font-weight: 700; color: #ffcc00; letter-spacing: 0.06em; }
  .ip-ttl--critical {
    font-size: 0.65rem;
    font-weight: 700;
    color: #ff3c00;
    letter-spacing: 0.06em;
    animation: ipFlash 0.5s step-end infinite;
  }
  .ip-ttl--dead {
    font-size: 0.65rem;
    font-weight: 700;
    color: #ff0040;
    letter-spacing: 0.06em;
    text-decoration: line-through;
  }

  /* ── Status badge ────────────────────────────────────────────── */
  .ip-status-badge {
    display: inline-flex;
    align-items: center;
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #00f0ff;
    border: 1px solid rgba(0, 240, 255, 0.3);
    background: rgba(0, 240, 255, 0.04);
    border-radius: 3px;
    padding: 0.25rem 0.55rem;
    white-space: nowrap;
    animation: ipStatusPulse 2s ease-in-out infinite;
  }

  /* ── Buttons ─────────────────────────────────────────────────── */
  .ip-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.7rem;
    font-family: inherit;
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    border-radius: 4px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
    white-space: nowrap;
    pointer-events: auto;
  }
  .ip-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .ip-btn--nudge {
    background: rgba(0, 240, 255, 0.04);
    border-color: rgba(0, 240, 255, 0.35);
    color: rgba(0, 240, 255, 0.8);
  }
  .ip-btn--nudge:hover:not(:disabled) {
    background: rgba(0, 240, 255, 0.1);
    border-color: rgba(0, 240, 255, 0.6);
  }

  .ip-btn--override {
    background: rgba(255, 100, 0, 0.04);
    border-color: rgba(255, 100, 0, 0.45);
    color: rgba(255, 150, 50, 0.9);
  }
  .ip-btn--override:hover:not(:disabled) {
    background: rgba(255, 100, 0, 0.1);
    border-color: rgba(255, 100, 0, 0.7);
  }

  .ip-btn--cancel {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(156, 163, 175, 0.65);
  }
  .ip-btn--cancel:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .ip-btn--confirm {
    background: rgba(255, 165, 0, 0.06);
    border-color: rgba(255, 165, 0, 0.45);
    color: rgba(255, 165, 0, 0.9);
    padding: 0.45rem 1.1rem;
  }
  .ip-btn--confirm:hover:not(:disabled) {
    background: rgba(255, 165, 0, 0.12);
    border-color: rgba(255, 165, 0, 0.7);
    box-shadow: 0 0 16px rgba(255, 165, 0, 0.15);
  }
  .ip-btn--confirm:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Modal backdrop ──────────────────────────────────────────── */
  .ip-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  /* ── Modal card ──────────────────────────────────────────────── */
  .ip-modal {
    width: 100%;
    max-width: 480px;
    background: rgba(2, 2, 2, 0.97);
    border: 1px solid rgba(0, 240, 255, 0.2);
    border-radius: 14px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    box-shadow:
      0 0 60px rgba(0, 240, 255, 0.08),
      0 30px 60px rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(36px);
    -webkit-backdrop-filter: blur(36px);
  }
  .ip-modal-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .ip-modal-icon {
    font-size: 1.4rem;
    color: #ffaa00;
    filter: drop-shadow(0 0 8px rgba(255, 170, 0, 0.55));
    line-height: 1;
    flex-shrink: 0;
  }
  .ip-modal-title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 900;
    letter-spacing: 0.15em;
    color: #ffaa00;
    text-transform: uppercase;
  }
  .ip-modal-body {
    margin: 0;
    font-size: 0.68rem;
    line-height: 1.65;
    color: rgba(209, 213, 219, 0.75);
  }
  .ip-modal-body strong {
    color: #f3f4f6;
    font-weight: 700;
  }
  .ip-modal-attest {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    padding: 0.85rem 1rem;
    border: 1px solid rgba(255, 165, 0, 0.18);
    background: rgba(255, 165, 0, 0.04);
    border-radius: 6px;
  }
  .ip-attest-label {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    cursor: pointer;
    font-size: 0.65rem;
    line-height: 1.6;
    color: rgba(229, 231, 235, 0.75);
  }
  .ip-checkbox {
    accent-color: #ffaa00;
    margin-top: 0.15rem;
    flex-shrink: 0;
    width: 14px;
    height: 14px;
  }
  .ip-modal-error {
    margin: 0;
    font-size: 0.62rem;
    font-weight: 600;
    color: #ff4060;
    letter-spacing: 0.06em;
  }
  .ip-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.65rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  /* ── Responsive: stacked cards on narrow screens ─────────────── */
  @media (max-width: 768px) {
    .ip-grid-header { display: none; }

    .ip-row {
      grid-template-columns: 1fr;
      gap: 0.6rem;
      padding: 1rem 1rem 1.1rem;
      background: rgba(4, 15, 22, 0.85);
      border: 1px solid rgba(0, 240, 255, 0.1);
      border-radius: 8px;
      margin: 0.35rem 0.75rem;
    }
    .ip-row:last-child { border-bottom: 1px solid rgba(0, 240, 255, 0.1); }

    .ip-cell::before {
      content: attr(data-label);
      display: block;
      font-size: 0.46rem;
      letter-spacing: 0.18em;
      color: rgba(0, 240, 255, 0.35);
      margin-bottom: 0.2rem;
      text-transform: uppercase;
    }
    .ip-cell--actions { flex-direction: row; flex-wrap: wrap; gap: 0.5rem; }
    .ip-cell--actions::before { width: 100%; }
  }

  /* ── Keyframes ───────────────────────────────────────────────── */
  @keyframes ipSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes ipStatusPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.45; }
  }
  @keyframes ipFlash {
    0%, 100% { opacity: 1; color: #ff3c00; }
    50%       { opacity: 0.2; color: #ff0040; }
  }
</style>
