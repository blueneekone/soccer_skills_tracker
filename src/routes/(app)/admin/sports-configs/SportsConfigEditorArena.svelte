<script lang="ts">
  import type { SportsConfigEditorEngine } from './SportsConfigEditorEngine.svelte';
  import SportsConfigEditorHUD from './SportsConfigEditorHUD.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import type { IconName } from '$lib/icons/registry.js';

  type Props = { engine: SportsConfigEditorEngine };
  const { engine }: Props = $props();

  const RPG_SLOTS = ['ball_mastery', 'striking', 'pace', 'scanning', 'grit'] as const;

  const ICON_CLASS_MAP: Record<string, IconName> = {
    'ph-soccer-ball': 'sport.soccer',
    'ph-basketball':  'sport.basketball',
    'ph-baseball':    'sport.baseball',
    'ph-football':    'sport.football',
    'ph-volleyball':  'sport.volleyball',
    'ph-ice-skate':   'sport.hockey',
    'ph-tennis-ball': 'sport.lacrosse',
  };

  /** Prefer `iconName` from doc; fall back to `iconClass` bridge for legacy docs. */
  function resolveIconName(cfg: { iconName?: string; iconClass: string }): IconName {
    if (cfg.iconName) return cfg.iconName as IconName;
    return ICON_CLASS_MAP[cfg.iconClass] ?? 'sport.generic';
  }

  function updateRpgSlot(slot: string, value: string) {
    if (!engine.dirtyBuffer) return;
    const keys = value.split(',').map(s => s.trim()).filter(Boolean);
    const proj = { ...(engine.dirtyBuffer.rpgProjection as unknown as Record<string, string[]> ?? {}) };
    proj[slot] = keys;
    engine.dirtyBuffer = { ...engine.dirtyBuffer, rpgProjection: proj as unknown as typeof engine.dirtyBuffer.rpgProjection };
  }
</script>

<div class="arena-root">
  <!-- Left rail: sport list -->
  <aside class="arena-rail">
    <div class="rail-header">
      <span class="mono-label">ACTIVE</span>
      <span class="rail-count">{engine.activeConfigs.length}</span>
    </div>

    {#each engine.activeConfigs as cfg (cfg.sportId)}
      <button
        class="rail-item"
        class:rail-item--active={engine.selectedConfig?.sportId === cfg.sportId}
        onclick={() => engine.selectConfig(cfg)}
      >
        <span style="color: {cfg.palette.fg}"><Icon name={resolveIconName(cfg)} size={18} /></span>
        <span class="rail-name">{cfg.displayName}</span>
        <span class="rail-version">v{cfg.schemaVersion}</span>
      </button>
    {/each}

    {#if engine.archivedConfigs.length > 0}
      <div class="rail-header tw-mt-4">
        <span class="mono-label" style="color: rgba(255,255,255,0.2)">ARCHIVED</span>
        <span class="rail-count" style="opacity:0.4">{engine.archivedConfigs.length}</span>
      </div>
      {#each engine.archivedConfigs as cfg (cfg.sportId)}
        <button
          class="rail-item rail-item--archived"
          onclick={() => engine.selectConfig(cfg)}
        >
          <span class="rail-name tw-opacity-40">{cfg.displayName}</span>
        </button>
      {/each}
    {/if}

    <button
      class="rail-new-btn tw-mt-auto"
      onclick={() => engine.startCreate()}
    >
      + New Sport
    </button>
  </aside>

  <!-- Right pane: editor -->
  <section class="arena-editor">
    {#if engine.viewMode === 'list'}
      <div class="arena-empty">
        <Icon name={"status.shield-check" as IconName} size={36} class="tw-text-slate-600" />
        <p class="tw-text-[#A1A1AA] tw-text-sm tw-mt-2">Select a sport to edit or create a new one.</p>
      </div>

    {:else if engine.dirtyBuffer}
      <div class="editor-scroll">
        <!-- HUD -->
        <div class="tw-flex tw-justify-end tw-mb-4">
          <SportsConfigEditorHUD
            selectedConfig={engine.selectedConfig}
            saveState={engine.saveState}
            schemaBumpWarning={engine.schemaBumpWarning}
          />
        </div>

        <!-- Identity fields -->
        <div class="editor-section">
          <h3 class="editor-section-title">Identity</h3>
          <div class="editor-grid-2">
            <label class="field-block">
              <span class="field-label">sportId *</span>
              <input
                class="field-input"
                bind:value={engine.dirtyBuffer.sportId}
                placeholder="e.g. soccer"
                disabled={engine.viewMode === 'edit'}
              />
            </label>
            <label class="field-block">
              <span class="field-label">Display Name *</span>
              <input class="field-input" bind:value={engine.dirtyBuffer.displayName} placeholder="Vanguard Soccer" />
            </label>
          </div>
          <label class="field-block tw-mt-3">
            <span class="field-label">Icon Name (registry token)</span>
            <div class="tw-flex tw-gap-2 tw-items-center">
              <input
                class="field-input tw-flex-1"
                value={(engine.dirtyBuffer as Record<string, unknown>).iconName ?? resolveIconName(engine.dirtyBuffer as { iconName?: string; iconClass: string })}
                oninput={(e) => {
                  const val = (e.currentTarget as HTMLInputElement).value;
                  engine.dirtyBuffer = { ...engine.dirtyBuffer!, iconName: val };
                }}
                placeholder="sport.soccer"
              />
              {#if engine.dirtyBuffer}
                <Icon name={resolveIconName(engine.dirtyBuffer as { iconName?: string; iconClass: string })} size={20} class="tw-text-[#D4D4D8]" />
              {/if}
            </div>
          </label>
          <label class="field-block tw-mt-2">
            <span class="field-label tw-opacity-40">Icon Class (Phosphor — legacy, kept for backward compat)</span>
            <input class="field-input tw-opacity-40" bind:value={engine.dirtyBuffer.iconClass} placeholder="ph-soccer-ball" />
          </label>
          <label class="field-block tw-mt-3">
            <span class="field-label">Aliases (comma-separated)</span>
            <input
              class="field-input"
              value={(engine.dirtyBuffer.aliases ?? []).join(', ')}
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                if (engine.dirtyBuffer) engine.dirtyBuffer = { ...engine.dirtyBuffer, aliases: v.split(',').map(s => s.trim()).filter(Boolean) };
              }}
              placeholder="soccer, futbol, vanguard soccer"
            />
          </label>
        </div>

        <!-- Attribute editor — 6 rows -->
        <div class="editor-section">
          <h3 class="editor-section-title">
            Attributes (6)
            {#if engine.schemaBumpWarning}
              <span class="bump-badge">↑ SCHEMA BUMP</span>
            {/if}
          </h3>
          <div class="attr-table">
            <div class="attr-table-head">
              <span>id</span><span>name</span><span>short</span><span>color</span><span>statKey</span>
            </div>
            {#each (engine.dirtyBuffer.attributes ?? []) as attr, i (i)}
              <div class="attr-row">
                <input
                  class="field-input attr-id"
                  value={attr.id}
                  oninput={(e) => engine.updateAttribute(i, 'id', (e.target as HTMLInputElement).value)}
                />
                <input
                  class="field-input attr-name"
                  value={attr.name}
                  oninput={(e) => engine.updateAttribute(i, 'name', (e.target as HTMLInputElement).value)}
                />
                <input
                  class="field-input attr-short"
                  value={attr.shortLabel}
                  oninput={(e) => engine.updateAttribute(i, 'shortLabel', (e.target as HTMLInputElement).value)}
                  maxlength={5}
                />
                <div class="attr-color-wrap">
                  <input
                    type="color"
                    class="color-swatch"
                    value={attr.hexColor}
                    oninput={(e) => engine.updateAttribute(i, 'hexColor', (e.target as HTMLInputElement).value)}
                  />
                  <span class="color-hex">{attr.hexColor}</span>
                </div>
                <input
                  class="field-input attr-statkey"
                  value={attr.playerStatKey}
                  oninput={(e) => engine.updateAttribute(i, 'playerStatKey', (e.target as HTMLInputElement).value)}
                />
              </div>
            {/each}
          </div>
        </div>

        <!-- Palette -->
        <div class="editor-section">
          <h3 class="editor-section-title">Chip Palette</h3>
          <div class="editor-grid-3">
            {#each (['fg', 'glow', 'ring'] as const) as field}
              <label class="field-block">
                <span class="field-label">{field}</span>
                <input
                  class="field-input"
                  value={engine.dirtyBuffer.palette?.[field] ?? ''}
                  oninput={(e) => engine.updatePalette(field, (e.target as HTMLInputElement).value)}
                />
              </label>
            {/each}
          </div>
          <!-- Chip preview -->
          {#if engine.dirtyBuffer.palette}
            <div
              class="chip-preview tw-mt-3"
              style="background: radial-gradient(ellipse at center, {engine.dirtyBuffer.palette.glow}, transparent); border: 1px solid {engine.dirtyBuffer.palette.ring}; color: {engine.dirtyBuffer.palette.fg};"
            >
              <Icon name={
                engine.dirtyBuffer.iconClass === 'ph-soccer-ball' ? 'sport.soccer' :
                engine.dirtyBuffer.iconClass === 'ph-basketball' ? 'sport.basketball' :
                engine.dirtyBuffer.iconClass === 'ph-baseball' ? 'sport.baseball' :
                engine.dirtyBuffer.iconClass === 'ph-football' ? 'sport.football' :
                engine.dirtyBuffer.iconClass === 'ph-volleyball' ? 'sport.volleyball' :
                engine.dirtyBuffer.iconClass === 'ph-ice-skate' ? 'sport.hockey' :
                engine.dirtyBuffer.iconClass === 'ph-tennis-ball' ? 'sport.lacrosse' :
                'status.shield-check'
              } size={16} />
              <span>{engine.dirtyBuffer.displayName ?? 'Sport'}</span>
            </div>
          {/if}
        </div>

        <!-- RPG Projection -->
        <div class="editor-section">
          <h3 class="editor-section-title">RPG Projection (5-axis radar)</h3>
          <p class="editor-section-hint">Priority-ordered playerStatKey values per radar slot. First non-null value from player_stats wins.</p>
          <div class="rpg-grid">
            {#each RPG_SLOTS as slot}
              <label class="field-block">
                <span class="field-label">{slot}</span>
                <input
                  class="field-input"
                  value={((engine.dirtyBuffer.rpgProjection as unknown as Record<string, string[]>)?.[slot] ?? []).join(', ')}
                  oninput={(e) => updateRpgSlot(slot, (e.target as HTMLInputElement).value)}
                  placeholder="statKey1, statKey2, …"
                />
              </label>
            {/each}
          </div>
        </div>

        <!-- Error display -->
        {#if engine.saveState === 'error' && engine.saveError}
          <div class="error-banner">{engine.saveError}</div>
        {/if}

        <!-- Action buttons -->
        <div class="action-bar">
          <button class="btn-ghost" onclick={() => engine.cancelEdit()}>Cancel</button>
          {#if engine.viewMode === 'edit' && engine.selectedConfig?.status !== 'archived'}
            <button
              class="btn-archive"
              onclick={() => { if (engine.selectedConfig) engine.archive(engine.selectedConfig.sportId); }}
            >
              Archive
            </button>
          {/if}
          <button
            class="btn-save"
            class:btn-save--loading={engine.saveState === 'saving' || engine.saveState === 'validating'}
            disabled={engine.saveState === 'saving' || engine.saveState === 'validating' || engine.saveState === 'success'}
            onclick={() => engine.save()}
          >
            {engine.saveState === 'saving' ? 'Saving…' : engine.saveState === 'success' ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>
    {/if}
  </section>
</div>

<style>
  .arena-root {
    display: flex;
    gap: 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    border-radius: var(--vanguard-radius, 24px);
    border: 1px solid rgba(20, 184, 166, 0.1);
    background: rgba(2, 6, 23, 0.75);
    backdrop-filter: blur(16px);
  }

  .arena-rail {
    width: 220px;
    min-width: 180px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 1rem 0.75rem;
    border-right: 1px solid rgba(20, 184, 166, 0.08);
    overflow-y: auto;
  }
  .rail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 0.5rem;
  }
  .mono-label {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 9px;
    letter-spacing: 0.12em;
    color: rgba(20, 184, 166, 0.45);
  }
  .rail-count {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: rgba(255,255,255,0.3);
  }
  .rail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: rgba(255,255,255,0.55);
    text-align: left;
    font-size: 13px;
    transition: background 0.15s, color 0.15s;
  }
  .rail-item:hover { background: rgba(20, 184, 166,0.06); color: rgba(255,255,255,0.85); }
  .rail-item--active { background: rgba(20, 184, 166,0.1); color: #fff; border: 1px solid rgba(20, 184, 166,0.2); }
  .rail-item--archived { opacity: 0.45; }
  .rail-item span { flex-shrink: 0; display: flex; align-items: center; }
  .rail-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
  .rail-version {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 9px;
    color: rgba(20, 184, 166,0.4);
  }
  .rail-new-btn {
    margin-top: 1rem;
    padding: 0.5rem 0.75rem;
    border-radius: 10px;
    border: 1px dashed rgba(20, 184, 166,0.25);
    background: transparent;
    color: rgba(20, 184, 166,0.6);
    font-size: 12px;
    cursor: pointer;
    text-align: center;
    transition: all 0.15s;
  }
  .rail-new-btn:hover { background: rgba(20, 184, 166,0.08); color: #14b8a6; border-color: rgba(20, 184, 166,0.5); }

  .arena-editor {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .arena-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }
  .editor-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem 1.5rem;
  }

  .editor-section {
    margin-bottom: 1.75rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .editor-section:last-of-type { border-bottom: none; }
  .editor-section-title {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    letter-spacing: 0.12em;
    color: rgba(20, 184, 166,0.5);
    margin: 0 0 0.875rem;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .editor-section-hint {
    font-size: 11px;
    color: rgba(255,255,255,0.3);
    margin: -0.5rem 0 0.75rem;
  }

  .editor-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .editor-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; }

  .field-block { display: flex; flex-direction: column; gap: 0.35rem; }
  .field-label {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 9px;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.3);
    text-transform: uppercase;
  }
  .field-input {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 0.4rem 0.65rem;
    font-size: 12px;
    color: rgba(255,255,255,0.85);
    outline: none;
    transition: border-color 0.15s;
    width: 100%;
    box-sizing: border-box;
  }
  .field-input:focus { border-color: rgba(20, 184, 166,0.4); }
  .field-input:disabled { opacity: 0.45; cursor: not-allowed; }

  .attr-table { display: flex; flex-direction: column; gap: 4px; }
  .attr-table-head {
    display: grid;
    grid-template-columns: 1.2fr 2fr 0.8fr 1fr 1.6fr;
    gap: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 9px;
    color: rgba(20, 184, 166,0.35);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0 2px;
  }
  .attr-row {
    display: grid;
    grid-template-columns: 1.2fr 2fr 0.8fr 1fr 1.6fr;
    gap: 6px;
    align-items: center;
  }
  .attr-id, .attr-name, .attr-short, .attr-statkey { min-width: 0; }
  .attr-color-wrap { display: flex; align-items: center; gap: 4px; min-width: 0; }
  .color-swatch {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.15);
    cursor: pointer;
    padding: 1px;
    background: transparent;
    flex-shrink: 0;
  }
  .color-hex { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; color: rgba(255,255,255,0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .chip-preview {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.75rem;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
  }

  .rpg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

  .bump-badge {
    background: rgba(255, 204, 0, 0.15);
    color: #ffcc00;
    border: 1px solid rgba(255, 204, 0, 0.3);
    border-radius: 9999px;
    padding: 1px 8px;
    font-size: 9px;
    font-weight: 700;
  }
  .error-banner {
    background: rgba(255, 0, 85, 0.12);
    border: 1px solid rgba(255, 0, 85, 0.3);
    border-radius: 10px;
    padding: 0.625rem 1rem;
    color: #ff0055;
    font-size: 12px;
    margin-bottom: 1rem;
  }

  .action-bar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255,255,255,0.06);
    margin-top: 0.5rem;
  }
  .btn-ghost {
    padding: 0.5rem 1.1rem;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: transparent;
    color: rgba(255,255,255,0.5);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-ghost:hover { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.8); }
  .btn-archive {
    padding: 0.5rem 1.1rem;
    border-radius: 10px;
    border: 1px solid rgba(255, 0, 85, 0.3);
    background: rgba(255, 0, 85, 0.08);
    color: #ff0055;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-archive:hover { background: rgba(255, 0, 85, 0.16); }
  .btn-save {
    padding: 0.5rem 1.5rem;
    border-radius: 10px;
    border: 1px solid rgba(20, 184, 166, 0.4);
    background: rgba(20, 184, 166, 0.1);
    color: #14b8a6;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-save:hover:not(:disabled) { background: rgba(20, 184, 166, 0.2); box-shadow: 0 0 12px rgba(20, 184, 166, 0.2); }
  .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-save--loading { animation: pulse 1s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>
