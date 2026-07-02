// SportsConfigEditorEngine.svelte.ts
// Vanguard Trinity Brain — manages all state for the sports-configs CRUD UI.

import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { app, getActiveDb } from '$lib/firebase';
import type {
  SportsConfigDoc,
  UpsertSportsConfigInput,
  UpsertSportsConfigResult,
  ListSportsConfigsResult,
  ArchiveSportsConfigResult,
} from '$lib/types/sportsConfig';

export interface OrphanEntry {
  clubId: string;
  sport: string | null;
  resolvedKey: string;
  orphan: boolean;
}

export interface AuditReport {
  reportId: string;
  generatedAt: unknown;
  totalClubs: number;
  orphanCount: number;
  orphans: OrphanEntry[];
  activeSportIds: string[];
}

export type ViewMode = 'list' | 'edit' | 'create' | 'preview';
export type SaveState = 'idle' | 'validating' | 'saving' | 'success' | 'error';

export class SportsConfigEditorEngine {
  viewMode = $state<ViewMode>('list');
  selectedConfig = $state<SportsConfigDoc | null>(null);
  dirtyBuffer = $state<Partial<UpsertSportsConfigInput> | null>(null);
  saveState = $state<SaveState>('idle');
  saveError = $state<string | null>(null);
  configs = $state<SportsConfigDoc[]>([]);
  isLoading = $state(false);
  showArchived = $state(false);
  schemaBumpWarning = $state(false);
  latestAuditReport = $state<AuditReport | null>(null);

  private fns = getFunctions(app);
  private db = getActiveDb();
  private _listFn = httpsCallable<{ includeArchived?: boolean }, ListSportsConfigsResult>(this.fns, 'listSportsConfigs');
  private _upsertFn = httpsCallable<UpsertSportsConfigInput, UpsertSportsConfigResult>(this.fns, 'upsertSportsConfig');
  private _archiveFn = httpsCallable<{ sportId: string }, ArchiveSportsConfigResult>(this.fns, 'archiveSportsConfig');

  async loadConfigs() {
    this.isLoading = true;
    try {
      const res = await this._listFn({ includeArchived: this.showArchived });
      this.configs = res.data.configs as SportsConfigDoc[];
    } catch (e: unknown) {
      console.error('[SportsConfigEditorEngine] loadConfigs error', e);
    } finally {
      this.isLoading = false;
    }
  }

  selectConfig(cfg: SportsConfigDoc) {
    this.selectedConfig = cfg;
    this.dirtyBuffer = JSON.parse(JSON.stringify(cfg)) as UpsertSportsConfigInput;
    this.viewMode = 'edit';
    this.saveState = 'idle';
    this.saveError = null;
    this.schemaBumpWarning = false;
  }

  startCreate() {
    this.selectedConfig = null;
    this.dirtyBuffer = {
      sportId: '',
      displayName: '',
      attributes: Array.from({ length: 6 }, (_, i) => ({
        id: `attr_${i + 1}`,
        name: `Attribute ${i + 1}`,
        shortLabel: `A${i + 1}`,
        hexColor: '#14b8a6',
        playerStatKey: `stat_${i + 1}`,
      })) as UpsertSportsConfigInput['attributes'],
      palette: { fg: '#a1a1aa', glow: 'rgba(161,161,170,0.18)', ring: 'rgba(161,161,170,0.4)' },
      iconClass: 'ph-shield-check',
      iconName: 'sport.generic',
      aliases: [],
      rpgProjection: { ball_mastery: [], striking: [], pace: [], scanning: [], grit: [] },
      status: 'active',
    };
    this.viewMode = 'create';
    this.saveState = 'idle';
    this.saveError = null;
    this.schemaBumpWarning = false;
  }

  cancelEdit() {
    this.dirtyBuffer = null;
    this.selectedConfig = null;
    this.viewMode = 'list';
    this.saveState = 'idle';
    this.schemaBumpWarning = false;
  }

  updateAttribute(index: number, field: string, value: string) {
    if (!this.dirtyBuffer?.attributes) return;
    const attrs = (this.dirtyBuffer.attributes as unknown as Record<string, string>[]).map((a) => ({ ...a }));
    attrs[index] = { ...attrs[index], [field]: value };
    this.dirtyBuffer = { ...this.dirtyBuffer, attributes: attrs as unknown as UpsertSportsConfigInput['attributes'] };
    this.checkSchemaBump();
  }

  updatePalette(field: 'fg' | 'glow' | 'ring', value: string) {
    if (!this.dirtyBuffer?.palette) return;
    this.dirtyBuffer = { ...this.dirtyBuffer, palette: { ...this.dirtyBuffer.palette, [field]: value } };
  }

  private checkSchemaBump() {
    if (!this.selectedConfig || !this.dirtyBuffer?.attributes) {
      this.schemaBumpWarning = false;
      return;
    }
    const orig = this.selectedConfig.attributes;
    const next = this.dirtyBuffer.attributes;
    const bumped = orig.some((a, i) => a.id !== next[i]?.id || a.playerStatKey !== next[i]?.playerStatKey);
    this.schemaBumpWarning = bumped;
  }

  async save() {
    if (!this.dirtyBuffer) return;
    this.saveState = 'validating';
    this.saveError = null;

    if (!this.dirtyBuffer.sportId?.trim()) {
      this.saveState = 'error';
      this.saveError = 'sportId is required.';
      return;
    }
    if (!this.dirtyBuffer.displayName?.trim()) {
      this.saveState = 'error';
      this.saveError = 'displayName is required.';
      return;
    }
    if (!this.dirtyBuffer.attributes || this.dirtyBuffer.attributes.length !== 6) {
      this.saveState = 'error';
      this.saveError = 'Exactly 6 attributes are required.';
      return;
    }

    this.saveState = 'saving';
    try {
      await this._upsertFn(this.dirtyBuffer as UpsertSportsConfigInput);
      this.saveState = 'success';
      await this.loadConfigs();
      setTimeout(() => {
        if (this.saveState === 'success') {
          this.viewMode = 'list';
          this.saveState = 'idle';
          this.dirtyBuffer = null;
          this.schemaBumpWarning = false;
        }
      }, 1500);
    } catch (e: unknown) {
      this.saveState = 'error';
      this.saveError = e instanceof Error ? e.message : 'Save failed.';
    }
  }

  async archive(sportId: string) {
    try {
      await this._archiveFn({ sportId });
      if (this.selectedConfig?.sportId === sportId) this.cancelEdit();
      await this.loadConfigs();
    } catch (e: unknown) {
      console.error('[SportsConfigEditorEngine] archive error', e);
    }
  }

  get activeConfigs() {
    return this.configs.filter((c) => c.status !== 'archived');
  }

  get archivedConfigs() {
    return this.configs.filter((c) => c.status === 'archived');
  }

  async loadLatestAuditReport() {
    try {
      const q = query(
        collection(this.db, 'sport_audit_report'),
        orderBy('generatedAt', 'desc'),
        limit(1),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        this.latestAuditReport = snap.docs[0].data() as AuditReport;
      }
    } catch (e: unknown) {
      console.error('[SportsConfigEditorEngine] loadLatestAuditReport error', e);
    }
  }
}
