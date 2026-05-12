<script lang="ts">
  import type { SportsConfigDoc } from '$lib/types/sportsConfig';
  import type { SaveState } from './SportsConfigEditorEngine.svelte';

  type Props = {
    selectedConfig?: SportsConfigDoc | null;
    saveState?: SaveState;
    schemaBumpWarning?: boolean;
  };

  const { selectedConfig = null, saveState = 'idle', schemaBumpWarning = false }: Props = $props();

  const statusLabel = $derived(
    saveState === 'saving' ? 'SAVING…'
    : saveState === 'success' ? 'SAVED ✓'
    : saveState === 'error' ? 'ERROR'
    : saveState === 'validating' ? 'VALIDATING…'
    : 'READY'
  );

  const statusColor = $derived(
    saveState === 'success' ? '#00ff66'
    : saveState === 'error' ? '#ff0055'
    : (saveState === 'saving' || saveState === 'validating') ? '#ffcc00'
    : '#00f0ff'
  );
</script>

<div class="hud-strip">
  {#if selectedConfig}
    <span class="hud-field">
      <span class="hud-label">SPORT</span>
      <span class="hud-value">{selectedConfig.sportId.toUpperCase()}</span>
    </span>
    <span class="hud-sep">·</span>
    <span class="hud-field">
      <span class="hud-label">V</span>
      <span class="hud-value">{selectedConfig.schemaVersion}</span>
    </span>
    {#if selectedConfig.updatedByUid}
      <span class="hud-sep">·</span>
      <span class="hud-field">
        <span class="hud-label">BY</span>
        <span class="hud-value">{selectedConfig.updatedByUid.slice(0, 8)}</span>
      </span>
    {/if}
  {/if}
  {#if schemaBumpWarning}
    <span class="hud-sep">·</span>
    <span class="hud-warn">⚠ SCHEMA BUMP ON SAVE</span>
  {/if}
  <span class="hud-sep">·</span>
  <span class="hud-status" style="color: {statusColor};">{statusLabel}</span>
</div>

<style>
  .hud-strip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.875rem;
    background: rgba(2, 6, 23, 0.85);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 240, 255, 0.12);
    border-radius: 9999px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.4);
    flex-wrap: wrap;
  }
  .hud-label { color: rgba(0, 240, 255, 0.4); margin-right: 0.2rem; }
  .hud-value { color: rgba(255, 255, 255, 0.75); }
  .hud-sep { color: rgba(255, 255, 255, 0.15); }
  .hud-warn { color: #ffcc00; font-weight: 700; }
  .hud-status { font-weight: 800; }
</style>
