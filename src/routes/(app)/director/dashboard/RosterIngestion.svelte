<script lang="ts">
  import { browser } from '$app/environment';
  import { writeBatch, doc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
  import { db } from '$lib/firebase.js';

  type Props = { currentClubId: string };
  const { currentClubId } = $props<Props>();

  type StagedRow = { playerName: string; parentEmail: string; teamId: string };

  let rawCsvContent  = $state('');
  let stagedPlayers  = $state<StagedRow[]>([]);
  let isProcessing   = $state(false);
  let commitResult   = $state<'idle' | 'success' | 'error'>('idle');
  let commitError    = $state('');
  let activeTab      = $state<'csv' | 'grid'>('csv');

  // Fast-grid draft row
  let draftName  = $state('');
  let draftEmail = $state('');
  let draftTeam  = $state('');

  // ── CSV parsing ──────────────────────────────────────────────────────────────
  function parseCsv(raw: string): StagedRow[] {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const start = /playerName|player_name|name|email/i.test(lines[0]) ? 1 : 0;
    return lines.slice(start).map(line => {
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      return { playerName: parts[0] ?? '', parentEmail: parts[1] ?? '', teamId: parts[2] ?? '' };
    }).filter(r => r.playerName.trim() && r.parentEmail.trim());
  }

  function processCSV() {
    stagedPlayers = parseCsv(rawCsvContent);
    commitResult = 'idle';
  }

  // ── Fast-grid row add ────────────────────────────────────────────────────────
  function addGridRow() {
    if (!draftName.trim() || !draftEmail.trim()) return;
    stagedPlayers = [...stagedPlayers, {
      playerName: draftName.trim(),
      parentEmail: draftEmail.trim(),
      teamId: draftTeam.trim(),
    }];
    draftName = ''; draftEmail = ''; draftTeam = '';
    commitResult = 'idle';
  }

  function removeRow(i: number) {
    stagedPlayers = stagedPlayers.filter((_, idx) => idx !== i);
  }

  // ── Token generator (browser crypto) ────────────────────────────────────────
  function genToken(): string {
    const buf = new Uint8Array(20);
    crypto.getRandomValues(buf);
    return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── Batch commit ─────────────────────────────────────────────────────────────
  async function commitStaging() {
    if (!browser || !currentClubId || !stagedPlayers.length || isProcessing) return;
    isProcessing  = true;
    commitResult  = 'idle';
    commitError   = '';

    try {
      const now     = serverTimestamp();
      const expiry  = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

      const CHUNK = 200;
      for (let i = 0; i < stagedPlayers.length; i += CHUNK) {
        const batch = writeBatch(db);
        const chunk = stagedPlayers.slice(i, i + CHUNK);

        for (const row of chunk) {
          const email = row.parentEmail.toLowerCase().trim();
          const token = genToken();

          batch.set(doc(db, 'users', email), {
            playerName:    row.playerName,
            parentEmail:   email,
            teamId:        row.teamId || null,
            clubId:        currentClubId,
            tenantId:      currentClubId,
            coppaStatus:   'pending_guardian',
            vpcStatus:     'pending',
            isMinor:       true,
            createdAt:     now,
            schemaVersion: 2,
          }, { merge: true });

          batch.set(doc(db, 'consent_tokens', token), {
            token,
            childEmail:  email,
            playerName:  row.playerName,
            teamId:      row.teamId || null,
            clubId:      currentClubId,
            consumed:    false,
            expiresAt:   expiry,
            createdAt:   now,
          });
        }
        await batch.commit();
      }

      commitResult  = 'success';
      stagedPlayers = [];
      rawCsvContent = '';
    } catch (err: unknown) {
      commitResult = 'error';
      commitError  = (err instanceof Error ? err.message : null) ?? 'Batch write failed.';
    } finally {
      isProcessing = false;
    }
  }

  const canCommit = $derived(stagedPlayers.length > 0 && !!currentClubId && !isProcessing);
</script>

<div class="ri-root">

  <!-- Header -->
  <div class="ri-header">
    <div class="ri-header__left">
      <span class="ri-badge">ROSTER INGESTION TERMINAL</span>
      <h2 class="ri-title">STAGE PLAYER NODES</h2>
    </div>
    {#if currentClubId}
      <span class="ri-club-pill">
        <span class="ri-club-pill__dot" aria-hidden="true"></span>
        CLUB: {currentClubId.toUpperCase()}
      </span>
    {/if}
  </div>

  <!-- Tab switcher -->
  <div class="ri-tabs" role="tablist">
    <button
      role="tab"
      aria-selected={activeTab === 'csv'}
      class="ri-tab"
      class:ri-tab--active={activeTab === 'csv'}
      onclick={() => (activeTab = 'csv')}
    >CSV DROP</button>
    <button
      role="tab"
      aria-selected={activeTab === 'grid'}
      class="ri-tab"
      class:ri-tab--active={activeTab === 'grid'}
      onclick={() => (activeTab = 'grid')}
    >FAST GRID</button>
  </div>

  <!-- CSV panel -->
  {#if activeTab === 'csv'}
    <div class="ri-panel" role="tabpanel">
      <p class="ri-hint">
        Paste CSV: <code class="ri-code">playerName, parentEmail, teamId</code> (header optional)
      </p>
      <textarea
        class="ri-csv-area"
        placeholder="John Smith, parent@email.com, team-alpha&#10;Jane Doe, mom@email.com, team-beta"
        rows={8}
        bind:value={rawCsvContent}
        spellcheck={false}
        aria-label="CSV roster input"
      ></textarea>
      <button
        class="ri-btn ri-btn--secondary tw-pointer-events-auto"
        onclick={processCSV}
        disabled={!rawCsvContent.trim()}
      >
        [ PARSE CSV ]
      </button>
    </div>
  {:else}
    <!-- Fast grid entry -->
    <div class="ri-panel" role="tabpanel">
      <div class="ri-grid-form">
        <input
          class="ri-input"
          placeholder="Player Name"
          bind:value={draftName}
          onkeydown={(e) => e.key === 'Enter' && addGridRow()}
          aria-label="Player name"
        />
        <input
          class="ri-input"
          placeholder="Parent Email"
          type="email"
          bind:value={draftEmail}
          onkeydown={(e) => e.key === 'Enter' && addGridRow()}
          aria-label="Parent email"
        />
        <input
          class="ri-input"
          placeholder="Team ID (opt)"
          bind:value={draftTeam}
          onkeydown={(e) => e.key === 'Enter' && addGridRow()}
          aria-label="Team ID"
        />
        <button
          class="ri-btn ri-btn--add tw-pointer-events-auto"
          onclick={addGridRow}
          disabled={!draftName.trim() || !draftEmail.trim()}
          aria-label="Add row"
        >＋</button>
      </div>
    </div>
  {/if}

  <!-- Staged queue -->
  {#if stagedPlayers.length > 0}
    <div class="ri-queue">
      <div class="ri-queue__header">
        <span class="ri-queue__label">
          STAGED QUEUE
          <span class="ri-count">{stagedPlayers.length}</span>
        </span>
        <span class="ri-queue__ttl">TTL: 7 DAYS</span>
      </div>

      <!-- Column headers -->
      <div class="ri-queue-row ri-queue-row--head" aria-hidden="true">
        <span>PLAYER</span>
        <span>PARENT EMAIL</span>
        <span>TEAM</span>
        <span></span>
      </div>

      <!-- Rows -->
      {#each stagedPlayers as row, i (i)}
        <div class="ri-queue-row">
          <span class="ri-cell ri-cell--name">{row.playerName}</span>
          <span class="ri-cell ri-cell--email">{row.parentEmail}</span>
          <span class="ri-cell ri-cell--team">{row.teamId || '—'}</span>
          <button
            class="ri-remove tw-pointer-events-auto"
            onclick={() => removeRow(i)}
            aria-label="Remove {row.playerName}"
          >✕</button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Commit controls -->
  {#if commitResult === 'success'}
    <div class="ri-success" role="status">
      <span>✓</span> NODES STAGED. INVITE TOKENS ISSUED. GUARDIAN OUTBOX ARMED.
    </div>
  {:else if commitResult === 'error'}
    <div class="ri-error" role="alert">{commitError}</div>
  {/if}

  <div class="ri-footer">
    <button
      class="ri-btn ri-btn--commit tw-pointer-events-auto"
      onclick={commitStaging}
      disabled={!canCommit}
      aria-busy={isProcessing}
    >
      {#if isProcessing}
        <span class="ri-spinner" aria-hidden="true"></span>
        WRITING TO FIRESTORE…
      {:else}
        [ COMMIT {stagedPlayers.length} NODE{stagedPlayers.length !== 1 ? 'S' : ''} ]
      {/if}
    </button>
  </div>

</div>

<style>
  .ri-root {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: rgba(4, 15, 22, 0.85);
    border: 1px solid rgba(0, 240, 255, 0.15);
    border-radius: 12px;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  }

  .ri-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .ri-badge { font-size: 0.55rem; font-weight: 700; letter-spacing: 0.2em; color: rgba(0,240,255,0.5); }
  .ri-title { margin: 0.2rem 0 0; font-size: clamp(0.9rem, 2vw, 1.1rem); font-weight: 900; letter-spacing: 0.1em; color: #e5e7eb; }
  .ri-club-pill { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; color: rgba(0,240,255,0.65); border: 1px solid rgba(0,240,255,0.2); background: rgba(0,240,255,0.04); padding: 0.3rem 0.65rem; border-radius: 999px; }
  .ri-club-pill__dot { width: 5px; height: 5px; border-radius: 50%; background: #00f0ff; box-shadow: 0 0 5px #00f0ff; animation: riPulse 1.6s ease-in-out infinite; }

  .ri-tabs { display: flex; gap: 0.25rem; border-bottom: 1px solid rgba(0,240,255,0.1); }
  .ri-tab { background: none; border: none; border-bottom: 2px solid transparent; padding: 0.5rem 1rem; font-family: inherit; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.14em; color: rgba(229,231,235,0.35); cursor: pointer; transition: color 0.15s, border-color 0.15s; }
  .ri-tab--active { color: #00f0ff; border-bottom-color: #00f0ff; }

  .ri-panel { display: flex; flex-direction: column; gap: 0.75rem; }
  .ri-hint { margin: 0; font-size: 0.62rem; color: rgba(229,231,235,0.3); letter-spacing: 0.06em; }
  .ri-code { background: rgba(0,240,255,0.07); color: rgba(0,240,255,0.65); padding: 0.1em 0.4em; border-radius: 3px; font-family: inherit; }

  .ri-csv-area {
    width: 100%; resize: vertical; min-height: 140px;
    background: rgba(2,2,2,0.8); border: 1px solid rgba(0,240,255,0.15);
    border-radius: 6px; color: #e5e7eb; font-family: inherit; font-size: 0.72rem;
    padding: 0.75rem; outline: none; transition: border-color 0.15s;
  }
  .ri-csv-area:focus { border-color: rgba(0,240,255,0.45); }
  .ri-csv-area::placeholder { color: rgba(229,231,235,0.18); }

  .ri-grid-form { display: grid; grid-template-columns: 1fr 1fr 0.7fr auto; gap: 0.5rem; align-items: center; }
  @media (max-width: 600px) { .ri-grid-form { grid-template-columns: 1fr; } }

  .ri-input {
    padding: 0.6rem 0.75rem; background: rgba(2,2,2,0.8);
    border: 1px solid rgba(0,240,255,0.15); border-radius: 5px;
    color: #e5e7eb; font-family: inherit; font-size: 0.72rem; outline: none;
    transition: border-color 0.15s;
  }
  .ri-input:focus { border-color: rgba(0,240,255,0.5); }
  .ri-input::placeholder { color: rgba(229,231,235,0.2); }

  .ri-queue { display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.5rem; }
  .ri-queue__header { display: flex; justify-content: space-between; align-items: center; }
  .ri-queue__label { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.18em; color: rgba(0,240,255,0.55); }
  .ri-count { display: inline-flex; align-items: center; justify-content: center; background: rgba(0,240,255,0.12); color: #00f0ff; border-radius: 999px; padding: 0.05rem 0.45rem; margin-left: 0.4rem; font-size: 0.6rem; }
  .ri-queue__ttl { font-size: 0.55rem; letter-spacing: 0.14em; color: rgba(251,191,36,0.55); }

  .ri-queue-row { display: grid; grid-template-columns: 1.5fr 2fr 1fr auto; gap: 0.5rem; align-items: center; padding: 0.5rem 0.75rem; border-radius: 5px; }
  .ri-queue-row--head { font-size: 0.52rem; font-weight: 700; letter-spacing: 0.16em; color: rgba(0,240,255,0.35); padding-bottom: 0.25rem; }
  .ri-queue-row:not(.ri-queue-row--head) { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.04); }
  .ri-cell { font-size: 0.68rem; color: rgba(229,231,235,0.75); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ri-cell--name { color: #e5e7eb; font-weight: 700; }
  .ri-cell--email { color: rgba(0,240,255,0.6); }

  .ri-remove { background: none; border: none; color: rgba(255,0,60,0.45); cursor: pointer; font-size: 0.7rem; padding: 0.2rem 0.4rem; border-radius: 3px; transition: color 0.15s; }
  .ri-remove:hover { color: #ff003c; }

  .ri-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.25rem; font-family: inherit; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; border-radius: 5px; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
  .ri-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .ri-btn--secondary { background: rgba(0,240,255,0.05); border-color: rgba(0,240,255,0.2); color: rgba(0,240,255,0.7); }
  .ri-btn--secondary:hover:not(:disabled) { background: rgba(0,240,255,0.1); border-color: rgba(0,240,255,0.45); }
  .ri-btn--add { background: rgba(0,240,255,0.08); border-color: rgba(0,240,255,0.25); color: #00f0ff; font-size: 1rem; padding: 0.55rem 0.85rem; }
  .ri-btn--add:hover:not(:disabled) { background: rgba(0,240,255,0.15); }
  .ri-btn--commit { width: 100%; justify-content: center; background: rgba(0,240,255,0.06); border-color: rgba(0,240,255,0.35); color: #00f0ff; font-size: 0.72rem; padding: 0.85rem; box-shadow: 0 0 20px rgba(0,240,255,0.06); }
  .ri-btn--commit:hover:not(:disabled) { background: rgba(0,240,255,0.12); border-color: rgba(0,240,255,0.6); box-shadow: 0 0 28px rgba(0,240,255,0.14); }

  .ri-footer { margin-top: 0.25rem; }
  .ri-success { padding: 0.75rem 1rem; background: rgba(0,255,102,0.05); border: 1px solid rgba(0,255,102,0.25); border-radius: 5px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; color: #00ff66; }
  .ri-error { padding: 0.75rem 1rem; background: rgba(255,0,60,0.05); border: 1px solid rgba(255,0,60,0.25); border-radius: 5px; font-size: 0.65rem; color: #ff003c; }
  .ri-spinner { display: inline-block; width: 0.85rem; height: 0.85rem; border: 2px solid rgba(0,240,255,0.2); border-top-color: #00f0ff; border-radius: 50%; animation: riSpin 0.7s linear infinite; }

  @keyframes riSpin { to { transform: rotate(360deg); } }
  @keyframes riPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.6); } }
</style>
