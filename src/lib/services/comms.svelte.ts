/**
 * comms.svelte.ts — SafeSport Messaging Engine (Client)
 * ──────────────────────────────────────────────────────
 * Svelte 5 reactive service implementing the client-side half of the
 * Vanguard SafeSport communication policy.
 *
 * RULE OF THREE — CLIENT ENFORCEMENT
 * ────────────────────────────────────
 * 1. `broadcastMessage()` ONLY accepts team/channel targets.
 *    Passing an individual player ID throws a SafeSportViolation error.
 * 2. The function calls the `safeSportBroadcast` Cloud Function which
 *    performs server-side minor detection and parent CC enforcement.
 * 3. DMs to minors are blocked at the Firestore rules level (defence in depth).
 *
 * Note: The server (Cloud Function) is the authoritative enforcer.
 * This client layer provides early UX feedback and prevents obvious misuse.
 */

import { browser } from '$app/environment';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BroadcastTargetType = 'team' | 'channel';

export interface BroadcastTarget {
	type: BroadcastTargetType;
	/** teamId for 'team' targets; channelId for 'channel' targets. */
	id: string;
	/** Owning club / tenant ID — required for channel targets. */
	clubId?: string;
}

export interface BroadcastMessageInput {
	target: BroadcastTarget;
	body: string;
	subject?: string;
	/** Epic 4.16b — require parent read acknowledgment */
	requiresAck?: boolean;
	/** ISO string or epoch ms — optional deadline shown to parents */
	ackDeadline?: string | number;
}

/** Input for the coach→player direct message callable (adult players only). */
export interface CoachPlayerDMInput {
	/** The coach's team ID — must match the calling coach's JWT teamId. */
	teamId: string;
	/** Exact player name as it appears on the roster (used for player_lookup). */
	playerName: string;
	/** Message body, max 4000 characters. */
	body: string;
}

export interface ClubBroadcastResult {
	success: true;
	clubId: string;
	clubAuditId: string;
	teamCount: number;
	successCount: number;
	totalRecipients: number;
	totalCcParents: number;
	deliveryReport?: DeliveryReport;
	priority?: 'emergency';
	results: Array<{
		teamId: string;
		messageId?: string;
		recipientCount?: number;
		ccParentCount?: number;
		parentDeliveredCount?: number;
		deliveryReport?: DeliveryReport;
		error?: string;
	}>;
}

export interface ClubBroadcastInput {
	clubId: string;
	body: string;
	subject?: string;
	/** When empty/omitted, server fans out to all teams in the club. */
	teamIds?: string[];
	requiresAck?: boolean;
	ackDeadline?: string | number;
}

export type ParentSkipReason =
	| 'no_household'
	| 'not_on_roster'
	| 'consent_comms_declined'
	| 'consent_sponsor_declined'
	| 'not_guardian'
	| 'push_token_missing';

export type DeliveryChannel = 'in_app' | 'push' | 'email' | 'sms';

export interface ParentDeliveredRow {
	email: string;
	uid?: string;
	channels: DeliveryChannel[];
}

export interface ParentSkippedRow {
	email: string;
	reason: ParentSkipReason;
}

/** COMMS_CHANNEL_CANON §6 — normative delivery contract (Epic 4.13a). */
export interface DeliveryReport {
	messageId: string;
	audienceScope:
		| 'team_parents'
		| 'team_parents_and_adults'
		| 'club_parents'
		| 'channel_members'
		| 'household';
	rosterAthleteCount: number;
	parentDelivered: ParentDeliveredRow[];
	parentSkipped: ParentSkippedRow[];
	/** SafeSport minor CC audit — subset of parentDelivered when minors on roster */
	ccParentEmails: string[];
	auditLogId?: string;
	teamId?: string;
}

export interface BroadcastResult {
	success: true;
	messageId: string;
	auditLogId: string;
	recipientCount: number;
	parentNotified: boolean;
	ccParentCount: number;
	parentRecipientCount?: number;
	parentDeliveredCount?: number;
	parentSkippedCount?: number;
	parentRecipientEmails?: string[];
	parentDeliveredEmails?: string[];
	deliveryReport?: DeliveryReport;
}

export interface BroadcastAckStatus {
	ok: true;
	messageId: string;
	teamId: string;
	requiresAck: boolean;
	ackDeadline?: unknown;
	totalEligible: number;
	acknowledgedCount: number;
	acknowledgedEmails: string[];
	pendingEmails: string[];
}

/** Epic 4.16c — sponsor/partner digest send result */
export interface SponsorPartnerSendResult {
	ok: true;
	templateId: string;
	messageIds: string[];
	recipientCount: number;
	deliveryReport: {
		parentDelivered: ParentDeliveredRow[];
		parentSkipped: ParentSkippedRow[];
		deliveredCount: number;
		skippedCount: number;
	};
}

/** COMMS-PARENT-COACH-DM — bilateral parent↔coach send result */
export interface ParentCoachDmSendResult {
	ok: true;
	threadId: string;
	messageId: string | null;
	delivered: boolean;
	includeAdOnParentDms: boolean;
	deliveryReport?: DeliveryReport | null;
}

export interface ParentCoachDmThreadRow {
	threadId: string;
	clubId: string;
	teamId: string;
	parentEmail: string;
	coachEmail: string;
	includeAdOnParentDms: boolean;
	lastMessageAt?: unknown;
}

/** COMMS-VOICE-V1 — parent voice session schedule result */
export interface ParentVoiceSessionCreateResult {
	ok: true;
	sessionId: string;
	calendarEventId: string;
	title: string;
	deliveryReport: DeliveryReport;
	recordingEnabled: false;
}

/** COMMS-VOICE-V1 — parent voice session join/leave result */
export interface ParentVoiceSessionJoinResult {
	ok: true;
	sessionId: string;
	action: 'join' | 'leave';
	vendorToken: string | null;
	vendorEnabled: boolean;
	metadataOnly: boolean;
	recordingEnabled: false;
	disclosure: string;
}

/** Custom error thrown when a caller attempts to violate SafeSport policy. */
export class SafeSportViolation extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SafeSportViolation';
	}
}

// ── Send states ───────────────────────────────────────────────────────────────

export type SendPhase = 'idle' | 'sending' | 'success' | 'error';

// ═══════════════════════════════════════════════════════════════════════════
// CommsEngine
// ═══════════════════════════════════════════════════════════════════════════

export class CommsEngine {
	// ── Reactive state ────────────────────────────────────────────────────────
	phase = $state<SendPhase>('idle');
	lastResult = $state<BroadcastResult | null>(null);
	lastClubResult = $state<ClubBroadcastResult | null>(null);
	lastSponsorResult = $state<SponsorPartnerSendResult | null>(null);
	lastParentCoachResult = $state<ParentCoachDmSendResult | null>(null);
	lastVoiceSessionResult = $state<
		ParentVoiceSessionCreateResult | ParentVoiceSessionJoinResult | null
	>(null);
	error = $state('');

	/** True while a message is in-flight. */
	readonly isSending = $derived(this.phase === 'sending');
	/** True after the most recent send succeeded. */
	readonly lastSendSucceeded = $derived(this.phase === 'success');

	// ── Private ───────────────────────────────────────────────────────────────
	private _broadcastFn: ReturnType<typeof httpsCallable> | null = null;
	private _clubBroadcastFn: ReturnType<typeof httpsCallable> | null = null;
	private _emergencyBroadcastFn: ReturnType<typeof httpsCallable> | null = null;
	private _channelFn: ReturnType<typeof httpsCallable> | null = null;
	private _householdFn: ReturnType<typeof httpsCallable> | null = null;
	private _coachDmFn: ReturnType<typeof httpsCallable> | null = null;
	private _ackFn: ReturnType<typeof httpsCallable> | null = null;
	private _ackStatusFn: ReturnType<typeof httpsCallable> | null = null;
	private _createSponsorTemplateFn: ReturnType<typeof httpsCallable> | null = null;
	private _approveSponsorTemplateFn: ReturnType<typeof httpsCallable> | null = null;
	private _sendSponsorDigestFn: ReturnType<typeof httpsCallable> | null = null;
	private _parentCoachSendFn: ReturnType<typeof httpsCallable> | null = null;
	private _parentCoachListFn: ReturnType<typeof httpsCallable> | null = null;
	private _createVoiceSessionFn: ReturnType<typeof httpsCallable> | null = null;
	private _joinVoiceSessionFn: ReturnType<typeof httpsCallable> | null = null;

	constructor() {
		if (!browser) return;
		const fns = getFunctions(undefined, 'us-east1');
		this._broadcastFn = httpsCallable(fns, 'safeSportBroadcast');
		this._clubBroadcastFn = httpsCallable(fns, 'clubSportBroadcast');
		this._emergencyBroadcastFn = httpsCallable(fns, 'emergencyClubBroadcast');
		this._channelFn = httpsCallable(fns, 'sendChannelMessage');
		this._householdFn = httpsCallable(fns, 'sendHouseholdMessage');
		this._coachDmFn = httpsCallable(fns, 'sendCoachPlayerMessage');
		this._ackFn = httpsCallable(fns, 'acknowledgeBroadcast');
		this._ackStatusFn = httpsCallable(fns, 'getBroadcastAckStatus');
		this._createSponsorTemplateFn = httpsCallable(fns, 'createSponsorTemplate');
		this._approveSponsorTemplateFn = httpsCallable(fns, 'approveSponsorTemplate');
		this._sendSponsorDigestFn = httpsCallable(fns, 'sendSponsorPartnerDigest');
		this._parentCoachSendFn = httpsCallable(fns, 'sendParentCoachMessage');
		this._parentCoachListFn = httpsCallable(fns, 'listParentCoachDmThreads');
		this._createVoiceSessionFn = httpsCallable(fns, 'createParentVoiceSession');
		this._joinVoiceSessionFn = httpsCallable(fns, 'joinParentVoiceSession');
	}

	/**
	 * Send a team or channel broadcast message.
	 *
	 * Enforces at the client level:
	 *   • Target must be 'team' or 'channel' — never an individual player.
	 *   • Body must be non-empty and ≤ 4000 characters.
	 *
	 * All SafeSport CC logic (minor detection, parent notification) is performed
	 * server-side by the `safeSportBroadcast` Cloud Function.
	 *
	 * @throws SafeSportViolation if the target type is invalid.
	 * @throws Error if the Cloud Function call fails.
	 */
	async broadcastMessage(input: BroadcastMessageInput): Promise<BroadcastResult> {
		// ── Client-side SafeSport guard ────────────────────────────────────────
		if (!input.target || !input.target.type || !input.target.id) {
			throw new SafeSportViolation(
				'A valid team or channel target is required. ' +
				'Individual player targeting is prohibited by SafeSport policy.',
			);
		}

		if (!['team', 'channel'].includes(input.target.type)) {
			throw new SafeSportViolation(
				`Invalid target type "${input.target.type}". ` +
				'SafeSport policy only permits team or channel broadcasts.',
			);
		}

		const body = input.body?.trim() ?? '';
		if (!body) throw new Error('Message body is required.');
		if (body.length > 4000) throw new Error('Message body exceeds 4000 characters.');

		if (!this._broadcastFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}

		this.phase = 'sending';
		this.error = '';
		this.lastResult = null;

		try {
			const payload: Record<string, unknown> = {
				teamId: input.target.type === 'team' ? input.target.id : undefined,
				channelId: input.target.type === 'channel' ? input.target.id : undefined,
				body,
				subject: input.subject ?? undefined,
			};
			if (input.target.clubId) payload.clubId = input.target.clubId;
			if (input.requiresAck === true) payload.requiresAck = true;
			if (input.ackDeadline != null) payload.ackDeadline = input.ackDeadline;

			const response = await this._broadcastFn(payload);
			const result = response.data as BroadcastResult;

			this.lastResult = result;
			this.phase = 'success';
			return result;
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Failed to send message.';
			this.error = msg;
			this.phase = 'error';
			throw err;
		}
	}

	/**
	 * Director club-wide broadcast — fans out to selected or all teams via `clubSportBroadcast`.
	 */
	async clubBroadcastMessage(input: ClubBroadcastInput): Promise<ClubBroadcastResult> {
		const clubId = input.clubId?.trim() ?? '';
		const body = input.body?.trim() ?? '';
		if (!clubId) throw new Error('clubId is required.');
		if (!body) throw new Error('Message body is required.');
		if (body.length > 4000) throw new Error('Message body exceeds 4000 characters.');
		if (!this._clubBroadcastFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}

		this.phase = 'sending';
		this.error = '';
		this.lastResult = null;
		this.lastClubResult = null;

		try {
			const payload: Record<string, unknown> = {
				clubId,
				body,
				subject: input.subject?.trim() || undefined,
			};
			const teamIds = input.teamIds?.map((t) => t.trim()).filter(Boolean);
			if (teamIds && teamIds.length > 0) payload.teamIds = teamIds;

			const response = await this._clubBroadcastFn(payload);
			const result = response.data as ClubBroadcastResult;
			this.lastClubResult = result;
			this.phase = 'success';
			return result;
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to send club broadcast.';
			this.phase = 'error';
			throw err;
		}
	}

	/**
	 * Director emergency break-glass — fans out via `emergencyClubBroadcast`.
	 * Subject is required; triggers high-priority FCM + optional SMS (4.16a).
	 */
	async emergencyClubBroadcast(input: ClubBroadcastInput): Promise<ClubBroadcastResult> {
		const clubId = input.clubId?.trim() ?? '';
		const subject = input.subject?.trim() ?? '';
		const body = input.body?.trim() ?? '';
		if (!clubId) throw new Error('clubId is required.');
		if (!subject) throw new Error('Emergency broadcasts require a subject line.');
		if (!body) throw new Error('Message body is required.');
		if (body.length > 4000) throw new Error('Message body exceeds 4000 characters.');
		if (!this._emergencyBroadcastFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}

		this.phase = 'sending';
		this.error = '';
		this.lastResult = null;
		this.lastClubResult = null;

		try {
			const payload: Record<string, unknown> = {
				clubId,
				subject,
				body,
			};
			const teamIds = input.teamIds?.map((t) => t.trim()).filter(Boolean);
			if (teamIds && teamIds.length > 0) payload.teamIds = teamIds;
			if (input.requiresAck === true) payload.requiresAck = true;
			if (input.ackDeadline != null) payload.ackDeadline = input.ackDeadline;

			const response = await this._emergencyBroadcastFn(payload);
			const result = response.data as ClubBroadcastResult;
			this.lastClubResult = result;
			this.phase = 'success';
			return result;
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to send emergency broadcast.';
			this.phase = 'error';
			throw err;
		}
	}

	/** Monitored club channel path — Sprint 4.2 unified callable surface. */
	async sendChannelMessage(input: {
		clubId: string;
		channelId: string;
		text: string;
	}): Promise<{ ok: true; messageId: string }> {
		const clubId = input.clubId?.trim() ?? '';
		const channelId = input.channelId?.trim() ?? '';
		const text = input.text?.trim() ?? '';
		if (!clubId || !channelId) {
			throw new SafeSportViolation('clubId and channelId are required for monitored channels.');
		}
		if (!text) throw new Error('Message text is required.');
		if (text.length > 8000) throw new Error('Message text exceeds 8000 characters.');
		if (!this._channelFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}

		this.phase = 'sending';
		this.error = '';
		this.lastResult = null;

		try {
			const response = await this._channelFn({ clubId, channelId, text });
			this.phase = 'success';
			return response.data as { ok: true; messageId: string };
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to send channel message.';
			this.phase = 'error';
			throw err;
		}
	}

	/** Household parent↔operative thread — Sprint 4.11. */
	async sendHouseholdMessage(body: string): Promise<{ ok: true; messageId: string }> {
		const text = body?.trim() ?? '';
		if (!text) throw new Error('Message body is required.');
		if (text.length > 4000) throw new Error('Message body exceeds 4000 characters.');
		if (!this._householdFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}

		this.phase = 'sending';
		this.error = '';
		this.lastResult = null;

		try {
			const response = await this._householdFn({ body: text });
			this.phase = 'success';
			return response.data as { ok: true; messageId: string };
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to send household message.';
			this.phase = 'error';
			throw err;
		}
	}

	/**
	 * Send a coach→player direct message (adult players only).
	 *
	 * Calls the `sendCoachPlayerMessage` Cloud Function which resolves the
	 * player email via `player_lookup`, enforces the adult-only rule
	 * (`assertStaffMayDirectMessagePlayer`), and writes `in_app_messages` +
	 * `messaging_audit` in a single server-side batch.
	 *
	 * Input: `{ teamId, playerName, body }` — playerName must match the roster.
	 */
	async sendCoachPlayerMessage(input: CoachPlayerDMInput): Promise<{ ok: true; messageId: string }> {
		const teamId = input.teamId?.trim() ?? '';
		const playerName = input.playerName?.trim() ?? '';
		const body = input.body?.trim() ?? '';
		if (!teamId || !playerName) {
			throw new Error('teamId and playerName are required.');
		}
		if (!body) throw new Error('Message body is required.');
		if (body.length > 4000) throw new Error('Message body exceeds 4000 characters.');
		if (!this._coachDmFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}

		this.phase = 'sending';
		this.error = '';
		this.lastResult = null;

		try {
			const response = await this._coachDmFn({ teamId, playerName, body });
			this.phase = 'success';
			return response.data as { ok: true; messageId: string };
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to send direct message.';
			this.phase = 'error';
			throw err;
		}
	}

	/** Bilateral parent↔coach DM — COMMS-PARENT-COACH-DM. */
	async sendParentCoachMessage(input: {
		clubId: string;
		teamId: string;
		body: string;
		parentEmail?: string;
		coachEmail?: string;
		threadId?: string;
	}): Promise<ParentCoachDmSendResult> {
		const clubId = input.clubId?.trim() ?? '';
		const teamId = input.teamId?.trim() ?? '';
		const body = input.body?.trim() ?? '';
		if (!clubId || !teamId) throw new Error('clubId and teamId are required.');
		if (!body) throw new Error('Message body is required.');
		if (body.length > 4000) throw new Error('Message body exceeds 4000 characters.');
		if (!this._parentCoachSendFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}

		this.phase = 'sending';
		this.error = '';
		this.lastParentCoachResult = null;

		try {
			const payload: Record<string, unknown> = { clubId, teamId, body };
			if (input.parentEmail?.trim()) payload.parentEmail = input.parentEmail.trim();
			if (input.coachEmail?.trim()) payload.coachEmail = input.coachEmail.trim();
			if (input.threadId?.trim()) payload.threadId = input.threadId.trim();

			const response = await this._parentCoachSendFn(payload);
			const result = response.data as ParentCoachDmSendResult;
			this.lastParentCoachResult = result;
			this.phase = 'success';
			return result;
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to send coach message.';
			this.phase = 'error';
			throw err;
		}
	}

	async listParentCoachDmThreads(input: {
		clubId: string;
		teamId?: string;
	}): Promise<{
		ok: true;
		threads: ParentCoachDmThreadRow[];
		includeAdOnParentDms: boolean;
		readOnly: boolean;
	}> {
		const clubId = input.clubId?.trim() ?? '';
		if (!clubId) throw new Error('clubId is required.');
		if (!this._parentCoachListFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}
		const payload: Record<string, unknown> = { clubId };
		if (input.teamId?.trim()) payload.teamId = input.teamId.trim();
		const response = await this._parentCoachListFn(payload);
		return response.data as {
			ok: true;
			threads: ParentCoachDmThreadRow[];
			includeAdOnParentDms: boolean;
			readOnly: boolean;
		};
	}

	/** Schedule a parent info voice session linked to a calendar event — COMMS-VOICE-V1. */
	async createParentVoiceSession(input: {
		clubId: string;
		teamId: string;
		calendarEventId: string;
		title?: string;
	}): Promise<ParentVoiceSessionCreateResult> {
		const clubId = input.clubId?.trim() ?? '';
		const teamId = input.teamId?.trim() ?? '';
		const calendarEventId = input.calendarEventId?.trim() ?? '';
		if (!clubId || !teamId || !calendarEventId) {
			throw new Error('clubId, teamId, and calendarEventId are required.');
		}
		if (!this._createVoiceSessionFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}

		this.phase = 'sending';
		this.error = '';
		this.lastVoiceSessionResult = null;

		try {
			const payload: Record<string, unknown> = { clubId, teamId, calendarEventId };
			if (input.title?.trim()) payload.title = input.title.trim();
			const response = await this._createVoiceSessionFn(payload);
			const result = response.data as ParentVoiceSessionCreateResult;
			this.lastVoiceSessionResult = result;
			this.phase = 'success';
			return result;
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to schedule voice session.';
			this.phase = 'error';
			throw err;
		}
	}

	/** Join or leave a parent voice session — COMMS-VOICE-V1. */
	async joinParentVoiceSession(input: {
		clubId: string;
		sessionId: string;
		action?: 'join' | 'leave';
	}): Promise<ParentVoiceSessionJoinResult> {
		const clubId = input.clubId?.trim() ?? '';
		const sessionId = input.sessionId?.trim() ?? '';
		if (!clubId || !sessionId) {
			throw new Error('clubId and sessionId are required.');
		}
		if (!this._joinVoiceSessionFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}

		this.phase = 'sending';
		this.error = '';
		this.lastVoiceSessionResult = null;

		try {
			const response = await this._joinVoiceSessionFn({
				clubId,
				sessionId,
				action: input.action ?? 'join',
			});
			const result = response.data as ParentVoiceSessionJoinResult;
			this.lastVoiceSessionResult = result;
			this.phase = 'success';
			return result;
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to join voice session.';
			this.phase = 'error';
			throw err;
		}
	}

	/** Parent acknowledges a critical announcement — Epic 4.16b. */
	async acknowledgeBroadcast(input: {
		messageId: string;
		teamId: string;
	}): Promise<{ ok: true; messageId: string; alreadyAcked?: boolean }> {
		const messageId = input.messageId?.trim() ?? '';
		const teamId = input.teamId?.trim() ?? '';
		if (!messageId || !teamId) {
			throw new Error('messageId and teamId are required.');
		}
		if (!this._ackFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}
		const response = await this._ackFn({ messageId, teamId });
		return response.data as { ok: true; messageId: string; alreadyAcked?: boolean };
	}

	/** Staff reads acknowledgment rollup for outbox compliance — Epic 4.16b. */
	async getBroadcastAckStatus(input: {
		messageId: string;
		teamId: string;
	}): Promise<BroadcastAckStatus> {
		const messageId = input.messageId?.trim() ?? '';
		const teamId = input.teamId?.trim() ?? '';
		if (!messageId || !teamId) {
			throw new Error('messageId and teamId are required.');
		}
		if (!this._ackStatusFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}
		const response = await this._ackStatusFn({ messageId, teamId });
		return response.data as BroadcastAckStatus;
	}

	/** Director creates a sponsor/partner digest template — Epic 4.16c. */
	async createSponsorTemplate(input: {
		clubId: string;
		title: string;
		partnerName: string;
		headline: string;
		body: string;
		ctaLabel?: string;
		ctaUrl?: string;
	}): Promise<{ ok: true; templateId: string; status: string }> {
		if (!this._createSponsorTemplateFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}
		this.phase = 'sending';
		this.error = '';
		try {
			const response = await this._createSponsorTemplateFn(input);
			this.phase = 'success';
			return response.data as { ok: true; templateId: string; status: string };
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to create sponsor template.';
			this.phase = 'error';
			throw err;
		}
	}

	/** Director approves a draft template — Epic 4.16c. */
	async approveSponsorTemplate(input: {
		clubId: string;
		templateId: string;
	}): Promise<{ ok: true; templateId: string; status: string }> {
		if (!this._approveSponsorTemplateFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}
		this.phase = 'sending';
		this.error = '';
		try {
			const response = await this._approveSponsorTemplateFn(input);
			this.phase = 'success';
			return response.data as { ok: true; templateId: string; status: string };
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to approve sponsor template.';
			this.phase = 'error';
			throw err;
		}
	}

	/** Director sends approved template digest to opted-in guardians — Epic 4.16c. */
	async sendSponsorPartnerDigest(input: {
		clubId: string;
		templateId: string;
	}): Promise<SponsorPartnerSendResult> {
		if (!this._sendSponsorDigestFn) {
			throw new Error('CommsEngine not initialised (SSR context).');
		}
		this.phase = 'sending';
		this.error = '';
		this.lastSponsorResult = null;
		try {
			const response = await this._sendSponsorDigestFn(input);
			const result = response.data as SponsorPartnerSendResult;
			this.lastSponsorResult = result;
			this.phase = 'success';
			return result;
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to send sponsor digest.';
			this.phase = 'error';
			throw err;
		}
	}

	/** Reset to idle after displaying success/error feedback. */
	reset() {
		this.phase = 'idle';
		this.error = '';
		this.lastResult = null;
		this.lastClubResult = null;
		this.lastSponsorResult = null;
	}
}
