/**
 * Client mirror of docs/vision/COMMS_CHANNEL_CANON.md §3 Channel Type Registry.
 * Epic 4.14 — typed coordination channels.
 */
import {
	DEFAULT_TEAM_CHANNELS,
	type MessagesTabChannel,
} from '$lib/coach/comms/messagesTabChannels.js';

export type CommsChannelTypeId =
	| 'announcements'
	| 'parent_lounge'
	| 'household'
	| 'team_logistics'
	| 'registration'
	| 'tryouts_events'
	| 'match_day'
	| 'club_wide'
	| 'emergency'
	| 'compliance'
	| 'outbox'
	| 'direct_mail';

export type CommsPersonaRole =
	| 'coach'
	| 'director'
	| 'registrar'
	| 'team_manager'
	| 'parent'
	| 'player'
	| 'admin';

export type CommsReplyModel = 'none' | 'threaded_group' | 'bilateral' | 'optional_thread';

export type CommsChannelTypeDef = {
	id: CommsChannelTypeId;
	label: string;
	description: string;
	whoCanPost: CommsPersonaRole[];
	whoCanRead: CommsPersonaRole[];
	minorVisibility: 'none' | 'hq_calendar_mirror' | 'hq_match_day' | 'linked_household';
	replyModel: CommsReplyModel;
};

/** Phase 2 hub rail + registry type_ids (excludes outbox/direct_mail UI-only ids). */
export const COMMS_CHANNEL_TYPE_REGISTRY: Record<
	Exclude<
		CommsChannelTypeId,
		'outbox' | 'direct_mail'
	>,
	CommsChannelTypeDef
> = {
	announcements: {
		id: 'announcements',
		label: 'Announcements',
		description: 'One-way staff→families team news',
		whoCanPost: ['coach', 'director', 'admin'],
		whoCanRead: ['parent', 'coach', 'director', 'registrar'],
		minorVisibility: 'hq_calendar_mirror',
		replyModel: 'none',
	},
	parent_lounge: {
		id: 'parent_lounge',
		label: 'Parent Lounge',
		description: 'Monitored parent↔coach group context',
		whoCanPost: ['parent', 'coach', 'director'],
		whoCanRead: ['parent', 'coach', 'director'],
		minorVisibility: 'none',
		replyModel: 'threaded_group',
	},
	household: {
		id: 'household',
		label: 'Household',
		description: 'Parent↔linked operative only',
		whoCanPost: ['parent', 'player'],
		whoCanRead: ['parent', 'player'],
		minorVisibility: 'linked_household',
		replyModel: 'bilateral',
	},
	team_logistics: {
		id: 'team_logistics',
		label: 'Team logistics',
		description: 'Coach/TM event ops — field change, equipment, car pool',
		whoCanPost: ['coach', 'director', 'team_manager'],
		whoCanRead: ['parent', 'coach', 'director', 'registrar', 'team_manager'],
		minorVisibility: 'hq_calendar_mirror',
		replyModel: 'optional_thread',
	},
	registration: {
		id: 'registration',
		label: 'Registration',
		description: 'Registrar/director transactional — fees, deadlines, eligibility',
		whoCanPost: ['registrar', 'director'],
		whoCanRead: ['parent', 'registrar', 'director'],
		minorVisibility: 'none',
		replyModel: 'none',
	},
	tryouts_events: {
		id: 'tryouts_events',
		label: 'Tryouts & events',
		description: 'Program-scoped tryout and eval comms',
		whoCanPost: ['director', 'coach'],
		whoCanRead: ['parent', 'director', 'coach'],
		minorVisibility: 'none',
		replyModel: 'none',
	},
	match_day: {
		id: 'match_day',
		label: 'Match day',
		description: 'Short-lived gameday — call time, field, lineup note',
		whoCanPost: ['coach', 'team_manager', 'director'],
		whoCanRead: ['parent', 'coach', 'director', 'team_manager'],
		minorVisibility: 'hq_match_day',
		replyModel: 'none',
	},
	club_wide: {
		id: 'club_wide',
		label: 'Club-wide broadcast',
		description: 'Director fan-out to all or selected teams — parents read per-team copies in Announcements',
		whoCanPost: ['director', 'admin'],
		whoCanRead: ['parent', 'director', 'admin'],
		minorVisibility: 'hq_calendar_mirror',
		replyModel: 'none',
	},
	emergency: {
		id: 'emergency',
		label: 'Emergency',
		description: 'Director break-glass — weather, safety, lockdown; high-priority push + SMS when enabled',
		whoCanPost: ['director', 'admin'],
		whoCanRead: ['parent', 'director', 'admin'],
		minorVisibility: 'hq_calendar_mirror',
		replyModel: 'none',
	},
	compliance: {
		id: 'compliance',
		label: 'Compliance',
		description: 'VPC, clearance, and incident notices — household-scoped for parents',
		whoCanPost: ['director', 'registrar', 'admin'],
		whoCanRead: ['parent', 'director', 'registrar', 'admin'],
		minorVisibility: 'none',
		replyModel: 'none',
	},
};

/** All Phase 2 typed channel type_ids for guard tests. */
export const PHASE2_CHANNEL_TYPE_IDS: CommsChannelTypeId[] = [
	'team_logistics',
	'registration',
	'tryouts_events',
	'match_day',
];

export function channelTypeFromClubDoc(data: Record<string, unknown>): CommsChannelTypeId | null {
	const raw =
		typeof data.channelType === 'string'
			? data.channelType.trim()
			: typeof data.type_id === 'string'
				? data.type_id.trim()
				: '';
	if (!raw) {
		const id = typeof data.id === 'string' ? data.id : '';
		if (id.startsWith('parent-lounge-')) return 'parent_lounge';
		if (id.startsWith('registration-')) return 'registration';
		if (id.startsWith('tryouts-events-')) return 'tryouts_events';
		if (id.startsWith('match-day-')) return 'match_day';
		if (id.startsWith('compliance-')) return 'compliance';
		return null;
	}
	if (raw in COMMS_CHANNEL_TYPE_REGISTRY) return raw as CommsChannelTypeId;
	return null;
}

/** Default team_logistics sub-channels (game-day, practice-sessions, general). */
export function defaultTeamLogisticsSubchannels(): MessagesTabChannel[] {
	return DEFAULT_TEAM_CHANNELS;
}

export function canPersonaReadChannel(
	typeId: CommsChannelTypeId,
	role: string | null | undefined,
): boolean {
	if (!role) return false;
	if (role === 'super_admin' || role === 'global_admin') return true;
	const def = COMMS_CHANNEL_TYPE_REGISTRY[typeId as keyof typeof COMMS_CHANNEL_TYPE_REGISTRY];
	if (!def) return false;
	return def.whoCanRead.includes(role as CommsPersonaRole);
}

export function canPersonaPostChannel(
	typeId: CommsChannelTypeId,
	role: string | null | undefined,
): boolean {
	if (!role) return false;
	if (role === 'super_admin' || role === 'global_admin') return true;
	const def = COMMS_CHANNEL_TYPE_REGISTRY[typeId as keyof typeof COMMS_CHANNEL_TYPE_REGISTRY];
	if (!def) return false;
	return def.whoCanPost.includes(role as CommsPersonaRole);
}
