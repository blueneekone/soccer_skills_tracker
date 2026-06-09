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

export interface BroadcastResult {
	success: true;
	messageId: string;
	auditLogId: string;
	recipientCount: number;
	parentNotified: boolean;
	ccParentCount: number;
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
	error = $state('');

	/** True while a message is in-flight. */
	readonly isSending = $derived(this.phase === 'sending');
	/** True after the most recent send succeeded. */
	readonly lastSendSucceeded = $derived(this.phase === 'success');

	// ── Private ───────────────────────────────────────────────────────────────
	private _broadcastFn: ReturnType<typeof httpsCallable> | null = null;
	private _channelFn: ReturnType<typeof httpsCallable> | null = null;
	private _householdFn: ReturnType<typeof httpsCallable> | null = null;
	private _coachDmFn: ReturnType<typeof httpsCallable> | null = null;

	constructor() {
		if (!browser) return;
		const fns = getFunctions(undefined, 'us-east1');
		this._broadcastFn = httpsCallable(fns, 'safeSportBroadcast');
		this._channelFn = httpsCallable(fns, 'sendChannelMessage');
		this._householdFn = httpsCallable(fns, 'sendHouseholdMessage');
		this._coachDmFn = httpsCallable(fns, 'sendCoachPlayerMessage');
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

	/** Reset to idle after displaying success/error feedback. */
	reset() {
		this.phase = 'idle';
		this.error = '';
		this.lastResult = null;
	}
}
