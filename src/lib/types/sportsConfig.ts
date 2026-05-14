/**
 * sportsConfig.ts
 * ───────────────
 * Phase 3, Epic 4 — Sports_Configs Dynamic Trees
 *
 * Canonical TypeScript types for the `sports_configs/{sportId}` Firestore
 * collection.  This collection is the single source of truth for every
 * sport-specific attribute, icon, palette, and label in the platform.
 *
 * Write path: super_admin callables only (upsertSportsConfig, archiveSportsConfig).
 * Read path:  all authenticated users via onSnapshot in sportsConfigStore.svelte.js.
 *
 * Soft-delete only: status → 'archived'; hard delete is blocked in Firestore rules.
 * Schema versioning: schemaVersion auto-increments when attribute IDs or
 *   playerStatKey values change; display-only edits do NOT bump the version.
 */

type AnyTimestamp = { toDate(): Date; seconds: number; nanoseconds: number } | Date | string | null;

// ── Status ────────────────────────────────────────────────────────────────────

/**
 * Lifecycle state of a sports_configs document.
 *   active   — visible to consumers and in the CRUD list.
 *   archived — soft-deleted; hidden from consumers but retained for audit.
 *   draft    — not yet published; super_admin only (reserved for future UI).
 */
export type SportsConfigStatus = 'active' | 'archived' | 'draft';

// ── Core building blocks ──────────────────────────────────────────────────────

/**
 * One of the six canonical attributes that define a sport's skill tree.
 *
 * `playerStatKey` is the exact Firestore key used in `player_stats/{uid}` and
 * `skills` sub-objects.  Changing this key bumps `schemaVersion`.
 *
 * `shortLabel` is the abbreviated form used in chart axis ticks (≤ 5 chars).
 */
export interface SportAttribute {
  /** Stable machine key (snake_case, unique within the sport). */
  id: string;
  /** Full display name, e.g. "Striking & Finishing". */
  name: string;
  /** Short axis label for radar charts, e.g. "STR". ≤ 5 chars recommended. */
  shortLabel: string;
  /** Neon accent hex for radar vertex dots + labels, e.g. "#00f0ff". */
  hexColor: string;
  /**
   * Key on `player_stats/{uid}` (or `skills` sub-object) that stores the
   * 0-99 numeric rating for this attribute.  Must be unique within the sport.
   * Changing this field triggers a schemaVersion bump.
   */
  playerStatKey: string;
}

/**
 * Three-token colour palette for sport chip rendering in org tables and
 * workspace switchers.  Mirrors the legacy `SPORT_ACCENT` record in
 * `src/lib/utils/sport-icon.js`.
 */
export interface SportPalette {
  /** Icon fill colour (WCAG AA on #09090B backgrounds). */
  fg: string;
  /** rgba used in a 2-stop radial-gradient chip background. */
  glow: string;
  /** 1px border for the chip. */
  ring: string;
}

/**
 * Priority-ordered attribute resolution for the 5-attribute RPG radar view
 * (AttributeRadar.svelte).  Each RPG slot lists the `playerStatKey` values
 * to try in order; the first non-null value from `player_stats` wins.
 *
 * This projection eliminates the legacy `DEFAULT_SPORT_CONFIG` shape while
 * keeping the 5-vertex radar fully functional for all sports.
 *
 *   ball_mastery → dribbling, ball_mastery, ...
 *   striking     → shooting, striking, ...
 *   pace         → pace, speed, athletics, ...
 *   scanning     → passing, scanning, vision, ...
 *   grit         → physical, grit, defending, ...
 */
export interface RpgAttributeProjection {
  ball_mastery: string[];
  striking:     string[];
  pace:         string[];
  scanning:     string[];
  grit:         string[];
}

// ── Main document ─────────────────────────────────────────────────────────────

/**
 * Canonical Firestore document shape for `sports_configs/{sportId}`.
 *
 * Document ID = sportId (stable, snake_case, e.g. 'soccer', 'basketball').
 *
 * Invariants:
 *   - `attributes` always has exactly 6 entries.
 *   - `schemaVersion` is a positive integer; bumped on structural change.
 *   - `status` must be 'active' for consumer reads; archived docs are ignored.
 */
export interface SportsConfigDoc {
  /** Document ID, e.g. 'soccer'. Written into the doc for denormalisation. */
  sportId: string;
  /** Human-readable display name, e.g. 'Vanguard Soccer'. */
  displayName: string;
  /**
   * Monotonically increasing schema version.  Auto-incremented by
   * `upsertSportsConfig` when attribute IDs or playerStatKey values change.
   * Consumers memoise derived state (radar values, palette gradients) on this.
   */
  schemaVersion: number;
  /** Lifecycle state. Consumers only read 'active' docs. */
  status: SportsConfigStatus;
  /**
   * Six canonical attributes.  Order is significant: index 0 = first radar
   * axis.  The RPG projection collapses these to 5 via `rpgProjection`.
   */
  attributes: [
    SportAttribute,
    SportAttribute,
    SportAttribute,
    SportAttribute,
    SportAttribute,
    SportAttribute,
  ];
  /** Sport chip colour palette. */
  palette: SportPalette;
  /**
   * Phosphor icon class suffix, e.g. 'ph-soccer-ball'.
   * Full class = `ph ${iconClass}`.
   * @deprecated Use {@link iconName} (Lucide registry token) instead.
   *   Kept for backward compatibility and read-repair lazy migration.
   */
  iconClass: string;
  /**
   * Lucide icon registry token, e.g. 'sport.soccer'.
   * Populated on first read if missing (lazy migration from `iconClass`).
   * Consumers should prefer this field over `iconClass`.
   */
  iconName?: string;
  /**
   * Legacy normalization aliases.  Any of these raw strings (lowercased) will
   * resolve to this sport via `resolveActiveConfig`.  Used for read-repair of
   * clubs whose `sport` field contains older or locale-specific strings.
   */
  aliases: string[];
  /**
   * Priority lists for the 5-attribute RPG radar projection.
   * Embedded on the doc so the projection works offline without code changes.
   */
  rpgProjection: RpgAttributeProjection;
  /** UID of the super_admin who last wrote this doc. */
  updatedByUid?: string;
  /** Server timestamp of the last write. */
  updatedAt?: AnyTimestamp;
  /** Server timestamp of the initial creation. */
  createdAt?: AnyTimestamp;
}

// ── Callable I/O types ────────────────────────────────────────────────────────

/** Input to `upsertSportsConfig` onCall. */
export interface UpsertSportsConfigInput {
  /** Must be a valid snake_case sportId. */
  sportId: string;
  displayName: string;
  /** Must have exactly 6 entries. */
  attributes: SportAttribute[];
  palette: SportPalette;
  /**
   * @deprecated Use {@link iconName} (Lucide registry token) instead.
   * Kept for backward compatibility.
   */
  iconClass: string;
  /** Lucide icon registry token, e.g. 'sport.soccer'. Written on upsert. */
  iconName?: string;
  aliases: string[];
  rpgProjection: RpgAttributeProjection;
  /** If provided, allows creating in 'draft' status. */
  status?: SportsConfigStatus;
}

/** Result from `upsertSportsConfig`. */
export interface UpsertSportsConfigResult {
  sportId: string;
  schemaVersion: number;
  /** True when a structural change caused a version bump. */
  schemaBumped: boolean;
}

/** Input to `listSportsConfigs` onCall. */
export interface ListSportsConfigsInput {
  /** When true, include archived docs. Defaults to false. */
  includeArchived?: boolean;
}

/** Result from `listSportsConfigs`. */
export interface ListSportsConfigsResult {
  configs: SportsConfigDoc[];
}

/** Input to `archiveSportsConfig` onCall. */
export interface ArchiveSportsConfigInput {
  sportId: string;
}

/** Result from `archiveSportsConfig`. */
export interface ArchiveSportsConfigResult {
  sportId: string;
  status: 'archived';
}
