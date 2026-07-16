/**
 * UplinkRedeemEngine.svelte.ts
 * ─────────────────────────────
 * Phase 2, Epic 3 — Passwordless Magic Uplinks.
 *
 * Brain — reactive state machine for the public uplink redemption flow.
 * Consumed by UplinkRedeemArena.svelte (Glass) and driven by
 * /uplink/[token]/+page.svelte (Shell).
 *
 * Possible states:
 *   idle            — engine constructed, not yet started
 *   redeeming       — calling redeemMagicUplink CF
 *   signing_in      — calling signInWithCustomToken
 *   success         — signed in; redirecting
 *   expired         — uplink TTL elapsed
 *   consumed_elsewhere — already used by another session
 *   revoked         — director revoked this link
 *   invalid_token   — malformed / wrong secret / not found
 *   error           — unexpected server error
 */

import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js';
import { goto } from '$app/navigation';
import { untrack } from 'svelte';
import { auth } from '$lib/firebase.js';
import type { RedeemMagicUplinkPayload, RedeemMagicUplinkResult } from '$lib/types/magicUplink.js';

export type RedeemState =
	| 'idle'
	| 'redeeming'
	| 'signing_in'
	| 'success'
	| 'expired'
	| 'consumed_elsewhere'
	| 'revoked'
	| 'invalid_token'
	| 'error';

export class UplinkRedeemEngine {
	state = $state<RedeemState>('idle');
	errorMessage = $state('');
	redirectTo = $state('/');

	readonly #redeemFn = httpsCallable<RedeemMagicUplinkPayload, RedeemMagicUplinkResult>(
		functions,
		'redeemMagicUplink',
	);

	/**
	 * Begin the redemption flow.
	 * @param token Full `<tokenId>.<secret>` string from the URL.
	 */
	async redeem(token: string): Promise<void> {
		if (this.state !== 'idle') return;
		this.state = 'redeeming';

		try {
			const result = await this.#redeemFn({ token });
			const { customToken, redirectTo } = result.data;

			this.state = 'signing_in';
			await signInWithCustomToken(auth, customToken);

			this.redirectTo = redirectTo;
			this.state = 'success';

			// Wrap goto() in untrack() per .cursorrules reactivity rules.
			untrack(() => goto(redirectTo));
		} catch (err: unknown) {
			const code = (err as { code?: string }).code ?? '';
			const msg  = (err as { message?: string }).message ?? 'Unknown error';

			if (code === 'functions/failed-precondition') {
				if (msg.includes('already been used')) {
					this.state = 'consumed_elsewhere';
				} else if (msg.includes('revoked')) {
					this.state = 'revoked';
				} else if (msg.includes('expired')) {
					this.state = 'expired';
				} else {
					this.state = 'invalid_token';
				}
			} else if (
				code === 'functions/not-found' ||
				code === 'functions/invalid-argument' ||
				code === 'functions/unauthenticated'
			) {
				this.state = 'invalid_token';
			} else {
				this.state = 'error';
				this.errorMessage = msg;
			}
		}
	}
}
