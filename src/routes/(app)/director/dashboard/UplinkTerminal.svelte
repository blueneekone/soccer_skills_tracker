<script lang="ts">
  import { browser } from '$app/environment';
  import { httpsCallable } from 'firebase/functions';
  import { functions } from '$lib/firebase.js';

  type Props = {
    currentClubId: string;
    clubTeams: Array<{ id: string; name: string }>;
  };

  const { currentClubId, clubTeams } = $props<Props>();

  let selectedTeamId    = $state('');
  let activeUplinkToken = $state<string | null>(null);
  let uplinkUrl         = $state<string | null>(null);
  let isGenerating      = $state(false);
  let generateError     = $state<string | null>(null);
  let copySuccess       = $state(false);

  const qrSrc = $derived(
    uplinkUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?format=png&size=220x220&data=${encodeURIComponent(uplinkUrl)}&color=00f0ff&bgcolor=010409&margin=4`
      : null
  );

  const generateInviteCode = httpsCallable(functions, 'generateInviteCode');

  async function generateTeamUplink() {
    if (!selectedTeamId || isGenerating) return;
    isGenerating      = true;
    generateError     = null;
    activeUplinkToken = null;
    uplinkUrl         = null;

    try {
      const result = await generateInviteCode({
        teamId:      selectedTeamId,
        clubId:      currentClubId,
        usageLimit:  150,
        expiryHours: 168,
      });
      const data = result.data as { code: string };
      const code = data.code;
      activeUplinkToken = code;
      if (browser) {
        uplinkUrl = `${window.location.origin}/join?code=${code}`;
      }
    } catch (err: unknown) {
      generateError = (err instanceof Error ? err.message : null) ?? 'Uplink generation failed.';
    } finally {
      isGenerating = false;
    }
  }

  async function copyUplinkBlast() {
    if (!uplinkUrl || !browser) return;
    const selectedTeam = clubTeams.find(t => t.id === selectedTeamId);
    const teamName = selectedTeam?.name ?? 'your team';
    const blastText =
      `🔐 NEXUS COMMAND — SECURE ROSTER ACCESS\n\nYou have been invited to join the active roster for *${teamName}*.\n\nComplete mandatory on-device clearance here:\n${uplinkUrl}\n\n⏱ This link expires in 7 days. Do not share publicly.`;

    await navigator.clipboard.writeText(blastText);
    copySuccess = true;
    setTimeout(() => { copySuccess = false; }, 2500);
  }
</script>

<div class="ut-root">

  <!-- ── Header ────────────────────────────────────────────────────────────── -->
  <div class="ut-header">
    <div class="tw-flex tw-flex-col tw-gap-1">
      <span class="ut-badge">SECURE TEAM UPLINK GENERATOR</span>
      <h2 class="ut-title">SECURE TEAM UPLINK GENERATOR</h2>
      <p class="ut-subtitle">ZERO-ENTRY CRYPTOGRAPHIC ACCESS KEY MATRIX</p>
    </div>
    <div class="tw-flex tw-flex-col tw-items-end tw-gap-1 tw-shrink-0">
      <span class="ut-status-dot" aria-hidden="true"></span>
      {#if activeUplinkToken}
        <span class="ut-ttl-badge">[ 7-DAY TTL ACTIVE ]</span>
      {/if}
    </div>
  </div>

  <!-- ── Team Selector ─────────────────────────────────────────────────────── -->
  <div class="ut-section">
    <label class="ut-label" for="ut-team-select">TARGET TEAM</label>
    <div class="tw-relative">
      <select
        id="ut-team-select"
        class="ut-select tw-w-full tw-bg-[#010409] tw-border tw-border-[#00f0ff]/30 tw-text-gray-200 tw-font-mono tw-text-sm tw-rounded-lg tw-px-4 tw-py-3 tw-cursor-pointer tw-pointer-events-auto focus:tw-outline-none focus:tw-border-[#00f0ff] tw-appearance-none"
        bind:value={selectedTeamId}
      >
        <option value="" disabled selected>SELECT TARGET TEAM...</option>
        {#each clubTeams as team (team.id)}
          <option value={team.id}>{team.name}</option>
        {/each}
      </select>
      <!-- Custom dropdown chevron -->
      <span class="ut-chevron" aria-hidden="true">▾</span>
    </div>
  </div>

  <!-- ── Generate Button ───────────────────────────────────────────────────── -->
  <button
    class="ut-generate-btn tw-w-full tw-pointer-events-auto"
    class:ut-generate-btn--disabled={!selectedTeamId || isGenerating}
    disabled={!selectedTeamId || isGenerating}
    onclick={generateTeamUplink}
    aria-busy={isGenerating}
  >
    {#if isGenerating}
      <svg class="ut-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/>
      </svg>
      GENERATING UPLINK…
    {:else}
      <span class="tw-text-[#00f0ff]" aria-hidden="true">◈</span>
      GENERATE SECURE TEAM UPLINK
    {/if}
  </button>

  <!-- ── Result Panel ──────────────────────────────────────────────────────── -->
  {#if activeUplinkToken && uplinkUrl}
    <div class="ut-result-card">
      <div class="ut-result-grid">

        <!-- Left: URL + blast preview + copy button -->
        <div class="tw-flex tw-flex-col tw-gap-3 tw-min-w-0">
          <div>
            <p class="ut-label">UPLINK ENDPOINT</p>
            <div class="ut-url-display tw-bg-[#010409] tw-border tw-border-[#00f0ff]/20 tw-rounded tw-px-4 tw-py-3 tw-font-mono tw-text-[#00f0ff] tw-text-sm tw-break-all">
              {uplinkUrl}
            </div>
          </div>

          <div>
            <p class="ut-label">TOKEN</p>
            <div class="ut-token tw-font-mono tw-text-xs tw-tracking-widest tw-text-[#00f0ff]/60 tw-break-all">
              {activeUplinkToken}
            </div>
          </div>

          <div>
            <p class="ut-label">BLAST PREVIEW</p>
            <pre class="ut-blast-preview">🔐 NEXUS COMMAND — SECURE ROSTER ACCESS

You have been invited to join the active roster for
*{clubTeams.find(t => t.id === selectedTeamId)?.name ?? 'your team'}*.

Complete mandatory on-device clearance here:
{uplinkUrl}

⏱ This link expires in 7 days. Do not share publicly.</pre>
          </div>

          <button
            class="ut-copy-btn tw-pointer-events-auto"
            class:ut-copy-btn--success={copySuccess}
            onclick={copyUplinkBlast}
          >
            {#if copySuccess}
              [ ✓ BLAST COPIED ]
            {:else}
              [ COPY UPLINK BLAST ]
            {/if}
          </button>
        </div>

        <!-- Right: QR Code -->
        <div class="ut-qr-wrap">
          <p class="ut-label tw-text-center tw-mb-2">QR ACCESS MATRIX</p>
          {#if qrSrc}
            <div class="ut-qr-frame tw-border-2 tw-border-[#00f0ff]/40 tw-rounded-xl tw-p-2 tw-bg-[#010409]">
              <img
                src={qrSrc}
                alt="QR code for team join link"
                width="220"
                height="220"
                class="tw-block tw-rounded-lg"
                loading="lazy"
              />
            </div>
          {/if}
          <p class="tw-text-center tw-font-mono tw-text-[0.55rem] tw-tracking-widest tw-text-[#00f0ff]/35 tw-mt-2">SCAN TO DEPLOY</p>
        </div>

      </div>
    </div>
  {/if}

  <!-- ── Error ─────────────────────────────────────────────────────────────── -->
  {#if generateError}
    <div class="ut-error" role="alert">
      <span class="ut-error__icon" aria-hidden="true">⚠</span>
      {generateError}
    </div>
  {/if}

</div>

<style>
  .ut-root {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.75rem;
    background: rgba(2, 4, 9, 0.88);
    border: 1px solid rgba(0, 240, 255, 0.14);
    border-radius: 14px;
    backdrop-filter: blur(36px);
    -webkit-backdrop-filter: blur(36px);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    position: relative;
    overflow: hidden;
  }

  /* Subtle ambient glow behind the card */
  .ut-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 60% 40% at 50% -10%, rgba(0,240,255,0.055) 0%, transparent 70%);
    pointer-events: none;
  }

  /* ── Header ─── */
  .ut-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .ut-badge {
    font-size: 0.52rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    color: rgba(0, 240, 255, 0.45);
    text-transform: uppercase;
  }

  .ut-title {
    /* visually hidden – badge doubles as visual title */
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .ut-subtitle {
    margin: 0;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: rgba(229, 231, 235, 0.28);
    text-transform: uppercase;
  }

  .ut-status-dot {
    display: block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #00f0ff;
    box-shadow: 0 0 8px #00f0ff, 0 0 20px rgba(0, 240, 255, 0.4);
    animation: utPulse 2s ease-in-out infinite;
    margin-top: 0.25rem;
  }

  .ut-ttl-badge {
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: rgba(251, 191, 36, 0.8);
    background: rgba(251, 191, 36, 0.07);
    border: 1px solid rgba(251, 191, 36, 0.25);
    border-radius: 4px;
    padding: 0.2rem 0.55rem;
    white-space: nowrap;
  }

  /* ── Section / Label ─── */
  .ut-section {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .ut-label {
    margin: 0;
    font-size: 0.52rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: rgba(0, 240, 255, 0.45);
    text-transform: uppercase;
  }

  /* ── Select ─── */
  .ut-select {
    transition: border-color 0.18s, box-shadow 0.18s;
  }

  .ut-select:focus {
    box-shadow: 0 0 0 1px rgba(0, 240, 255, 0.35), 0 0 16px rgba(0, 240, 255, 0.08);
  }

  .ut-select option {
    background: #010409;
    color: #e5e7eb;
  }

  .ut-chevron {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(0, 240, 255, 0.5);
    font-size: 0.85rem;
    pointer-events: none;
  }

  /* ── Generate Button ─── */
  .ut-generate-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.9rem 1.5rem;
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #00f0ff;
    background: rgba(0, 240, 255, 0.06);
    border: 1px solid rgba(0, 240, 255, 0.38);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.18s, border-color 0.18s, box-shadow 0.18s, opacity 0.18s;
    box-shadow: 0 0 18px rgba(0, 240, 255, 0.06), inset 0 1px 0 rgba(0, 240, 255, 0.07);
  }

  .ut-generate-btn:hover:not(:disabled) {
    background: rgba(0, 240, 255, 0.12);
    border-color: rgba(0, 240, 255, 0.65);
    box-shadow: 0 0 28px rgba(0, 240, 255, 0.18), inset 0 1px 0 rgba(0, 240, 255, 0.1);
  }

  .ut-generate-btn--disabled,
  .ut-generate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Spinner SVG animation */
  .ut-spinner {
    width: 1rem;
    height: 1rem;
    animation: utSpin 0.75s linear infinite;
    color: #00f0ff;
  }

  /* ── Result Card ─── */
  .ut-result-card {
    background: rgba(0, 240, 255, 0.025);
    border: 1px solid rgba(0, 240, 255, 0.22);
    border-radius: 10px;
    padding: 1.25rem;
    animation: utFadeIn 0.35s ease;
  }

  .ut-result-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 640px) {
    .ut-result-grid {
      grid-template-columns: 1fr;
    }
  }

  /* ── URL display ─── */
  .ut-url-display {
    transition: border-color 0.15s;
  }

  /* ── Token ─── */
  .ut-token {
    padding: 0.4rem 0;
    color: rgba(0, 240, 255, 0.5);
  }

  /* ── Blast preview ─── */
  .ut-blast-preview {
    margin: 0;
    padding: 0.75rem 1rem;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.65rem;
    line-height: 1.6;
    color: rgba(229, 231, 235, 0.55);
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* ── Copy button ─── */
  .ut-copy-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.6rem 1.2rem;
    font-family: inherit;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(0, 240, 255, 0.8);
    background: rgba(0, 240, 255, 0.05);
    border: 1px solid rgba(0, 240, 255, 0.25);
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    width: 100%;
  }

  .ut-copy-btn:hover {
    background: rgba(0, 240, 255, 0.1);
    border-color: rgba(0, 240, 255, 0.5);
    color: #00f0ff;
  }

  .ut-copy-btn--success {
    color: #00ff66;
    border-color: rgba(0, 255, 102, 0.4);
    background: rgba(0, 255, 102, 0.05);
  }

  /* ── QR wrap ─── */
  .ut-qr-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .ut-qr-frame {
    box-shadow:
      0 0 0 1px rgba(0, 240, 255, 0.12),
      0 0 24px rgba(0, 240, 255, 0.12),
      0 0 56px rgba(0, 240, 255, 0.06);
    animation: qrPulse 3s ease-in-out infinite;
  }

  /* ── Error ─── */
  .ut-error {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 0, 60, 0.05);
    border: 1px solid rgba(255, 0, 60, 0.25);
    border-radius: 6px;
    font-size: 0.66rem;
    color: #ff5577;
    letter-spacing: 0.06em;
  }

  .ut-error__icon {
    flex-shrink: 0;
    color: #ff003c;
    font-size: 0.8rem;
    margin-top: 0.05rem;
  }

  /* ── Animations ─── */
  @keyframes utSpin {
    to { transform: rotate(360deg); }
  }

  @keyframes utPulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 8px #00f0ff, 0 0 20px rgba(0, 240, 255, 0.4); }
    50%       { opacity: 0.45; box-shadow: 0 0 4px #00f0ff, 0 0 8px rgba(0, 240, 255, 0.2); }
  }

  @keyframes qrPulse {
    0%, 100% { box-shadow: 0 0 0 1px rgba(0,240,255,0.12), 0 0 24px rgba(0,240,255,0.12), 0 0 56px rgba(0,240,255,0.06); }
    50%       { box-shadow: 0 0 0 1px rgba(0,240,255,0.22), 0 0 36px rgba(0,240,255,0.2), 0 0 72px rgba(0,240,255,0.1); }
  }

  @keyframes utFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
