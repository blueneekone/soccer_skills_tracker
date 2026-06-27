/**
 * COMMS-NAV-2.0 — hub rail category registry
 * Authority: docs/vision/COMMS_UX_NAV_SPEC.md §2–§3
 */
import type { CommsChannelTypeId } from '$lib/comms/channelTypes.js';

export type CommsNavCategoryId = 'families' | 'game_day' | 'logistics' | 'staff' | 'club_ops';

export type CommsNavCategoryDef = {
	id: CommsNavCategoryId;
	label: string;
	iconChar: string;
	channelTypeIds: readonly CommsChannelTypeId[];
};

/** Sidebar category order per COMMS_UX_NAV_SPEC §2 */
export const COMMS_NAV_CATEGORY_ORDER: readonly CommsNavCategoryId[] = [
	'families',
	'game_day',
	'logistics',
	'staff',
	'club_ops',
];

/** Five hub categories — each channel type maps to exactly one category */
export const COMMS_NAV_CATEGORIES: Record<CommsNavCategoryId, CommsNavCategoryDef> = {
	families: {
		id: 'families',
		label: 'Families',
		iconChar: '◆',
		channelTypeIds: [
			'announcements',
			'parent_lounge',
			'household',
			'parent_coach_dm',
			'parent_voice_session',
		],
	},
	game_day: {
		id: 'game_day',
		label: 'Game day',
		iconChar: '⚡',
		channelTypeIds: ['match_day'],
	},
	logistics: {
		id: 'logistics',
		label: 'Logistics',
		iconChar: '▣',
		channelTypeIds: ['team_logistics', 'registration', 'tryouts_events'],
	},
	staff: {
		id: 'staff',
		label: 'Staff',
		iconChar: '▤',
		channelTypeIds: ['staff_internal'],
	},
	club_ops: {
		id: 'club_ops',
		label: 'Club ops',
		iconChar: '◎',
		channelTypeIds: ['club_wide', 'emergency', 'compliance', 'sponsor_partner'],
	},
};

/** UI-only hub ids — not sidebar categories (outbox = main-pane tab per spec §2) */
export const COMMS_NAV_MAIN_TAB_IDS = ['outbox'] as const;

/** Staff/coach direct-mail inbox — grouped under Staff when visible */
export const COMMS_NAV_STAFF_EXTRA_IDS = ['direct_mail'] as const;

export type CommsSpaceKind = 'club' | 'team' | 'household';

export type CommsSpaceRef = {
	kind: CommsSpaceKind;
	id: string;
	label: string;
};

export type CommsNavChannelRef = {
	id: CommsChannelTypeId | (typeof COMMS_NAV_MAIN_TAB_IDS)[number] | 'direct_mail';
	label: string;
};

export type CommsNavCategoryGroup = {
	category: CommsNavCategoryDef;
	channels: CommsNavChannelRef[];
};

const CATEGORY_BY_CHANNEL = (() => {
	const map = new Map<
		CommsChannelTypeId | 'direct_mail',
		CommsNavCategoryId
	>();
	for (const catId of COMMS_NAV_CATEGORY_ORDER) {
		const cat = COMMS_NAV_CATEGORIES[catId];
		for (const typeId of cat.channelTypeIds) {
			map.set(typeId, catId);
		}
	}
	for (const id of COMMS_NAV_STAFF_EXTRA_IDS) {
		map.set(id, 'staff');
	}
	return map;
})();

export function getChannelNavCategory(
	channelId: CommsNavChannelRef['id'],
): CommsNavCategoryId | null {
	if ((COMMS_NAV_MAIN_TAB_IDS as readonly string[]).includes(channelId)) return null;
	return CATEGORY_BY_CHANNEL.get(channelId as CommsChannelTypeId | 'direct_mail') ?? null;
}

export function sortNavChannels(channels: CommsNavChannelRef[]): CommsNavChannelRef[] {
	return [...channels].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

/** Group visible sidebar channels under spec categories; outbox excluded (main tab). */
export function groupChannelsByCategory(channels: CommsNavChannelRef[]): CommsNavCategoryGroup[] {
	const buckets = new Map<CommsNavCategoryId, CommsNavChannelRef[]>();

	for (const ch of channels) {
		if ((COMMS_NAV_MAIN_TAB_IDS as readonly string[]).includes(ch.id)) continue;
		const catId = getChannelNavCategory(ch.id);
		if (!catId) continue;
		const list = buckets.get(catId) ?? [];
		list.push(ch);
		buckets.set(catId, list);
	}

	return COMMS_NAV_CATEGORY_ORDER.filter((id) => buckets.has(id)).map((id) => ({
		category: COMMS_NAV_CATEGORIES[id],
		channels: sortNavChannels(buckets.get(id)!),
	}));
}

export function parseCommsSpaceParam(raw: string | null | undefined): CommsSpaceRef | null {
	if (!raw) return null;
	const match = /^([a-z]+):(.+)$/.exec(raw.trim());
	if (!match) return null;
	const kind = match[1] as CommsSpaceKind;
	if (kind !== 'club' && kind !== 'team' && kind !== 'household') return null;
	const id = match[2]?.trim();
	if (!id) return null;
	return { kind, id, label: id };
}

export function formatCommsSpaceParam(space: Pick<CommsSpaceRef, 'kind' | 'id'>): string {
	return `${space.kind}:${space.id}`;
}

export function resolveActiveSpace(
	spaces: CommsSpaceRef[],
	param: string | null | undefined,
): CommsSpaceRef | null {
	const parsed = parseCommsSpaceParam(param);
	if (parsed) {
		const hit = spaces.find((s) => s.kind === parsed.kind && s.id === parsed.id);
		if (hit) return hit;
	}
	return spaces[0] ?? null;
}
