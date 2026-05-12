<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth.svelte.js';
  import { SportsConfigEditorEngine } from './SportsConfigEditorEngine.svelte';
  import SportsConfigEditorArena from './SportsConfigEditorArena.svelte';

  const engine = new SportsConfigEditorEngine();

  onMount(() => {
    engine.loadConfigs();
    engine.loadLatestAuditReport();
  });
</script>

<svelte:head>
  <title>Sports Configs · Admin</title>
</svelte:head>

{#if !authStore.isSuper}
  <div class="tw-flex tw-items-center tw-justify-center tw-min-h-[60vh] tw-text-slate-500">
    <p>Super-admin access required.</p>
  </div>
{:else}
  <div class="sc-shell">
    <!-- Breadcrumb header -->
    <div class="sc-header">
      <span class="sc-eyebrow">[ ADMIN CONSOLE ]</span>
      <h1 class="sc-title">Sports Configuration Registry</h1>
      <p class="sc-subtitle">
        Manage the canonical 6-attribute schemas, palettes, and icons for every sport on the platform.
        Changes are reflected in all consumer components within seconds via Firestore onSnapshot.
      </p>
    </div>

    <!-- Orphan banner — shown when the latest audit report has orphans -->
    {#if engine.latestAuditReport && engine.latestAuditReport.orphanCount > 0}
      <div class="sc-orphan-banner">
        <span class="sc-orphan-icon">⚠</span>
        <div class="sc-orphan-text">
          <strong>{engine.latestAuditReport.orphanCount} club{engine.latestAuditReport.orphanCount !== 1 ? 's' : ''} reference an unknown or archived sport</strong>
          — last audit report <code>{engine.latestAuditReport.reportId}</code>.
          Affected: {engine.latestAuditReport.orphans.map((o) => o.clubId).join(', ')}.
          Create or restore the sport config to resolve.
        </div>
      </div>
    {/if}

    <!-- Loading state -->
    {#if engine.isLoading && engine.configs.length === 0}
      <div class="sc-loading">
        <span class="sc-loading-pulse"></span>
        <span class="tw-text-slate-500 tw-text-sm">Loading sport configs…</span>
      </div>
    {:else}
      <div class="sc-arena-wrap">
        <SportsConfigEditorArena {engine} />
      </div>
    {/if}
  </div>
{/if}

<style>
  .sc-shell {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 2rem 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    min-height: 0;
  }
  .sc-header { display: flex; flex-direction: column; gap: 0.25rem; }
  .sc-eyebrow {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    letter-spacing: 0.14em;
    color: rgba(0, 240, 255, 0.45);
  }
  .sc-title {
    font-size: 1.5rem;
    font-weight: 900;
    color: #fff;
    margin: 0;
    letter-spacing: -0.02em;
  }
  .sc-subtitle {
    font-size: 13px;
    color: rgba(255,255,255,0.35);
    margin: 0.25rem 0 0;
    max-width: 600px;
    line-height: 1.6;
  }
  .sc-loading {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
  }
  .sc-loading-pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #00f0ff;
    animation: pulse 1s ease-in-out infinite;
  }
  .sc-arena-wrap {
    flex: 1;
    min-height: 600px;
    max-height: calc(100vh - 220px);
  }
  .sc-orphan-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem 1.125rem;
    background: rgba(255, 204, 0, 0.08);
    border: 1px solid rgba(255, 204, 0, 0.3);
    border-radius: 14px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
  }
  .sc-orphan-icon { font-size: 18px; color: #ffcc00; flex-shrink: 0; margin-top: 1px; }
  .sc-orphan-text strong { color: #ffcc00; font-weight: 700; }
  .sc-orphan-text code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    background: rgba(255,204,0,0.1);
    padding: 1px 4px;
    border-radius: 4px;
    color: #ffcc00;
  }

  @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
</style>
