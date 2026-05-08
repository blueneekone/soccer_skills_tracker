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

	constructor() {
		if (!browser) return;
		const fns = getFunctions(undefined, 'us-central1');
		this._broadcastFn = httpsCallable(fns, 'safeSportBroadcast');
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

	/** Reset to idle after displaying success/error feedback. */
	reset() {
		this.phase = 'idle';
		this.error = '';
		this.lastResult = null;
	}
}
